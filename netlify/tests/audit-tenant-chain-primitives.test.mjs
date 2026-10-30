import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import {appendAuditEventForTenant,auditTenantId,auditTenantLockKey,lockAuditTenant,previousAuditHashForTenant,validAuditChainsByTenant,ZERO_HASH} from "../functions/internal-audit-tenant-chain.mts";

const canonical=(value)=>{if(value===null||typeof value!=="object")return JSON.stringify(value);if(Array.isArray(value))return "["+value.map(canonical).join(",")+"]";return "{"+Object.keys(value).sort().map(k=>JSON.stringify(k)+":"+canonical(value[k])).join(",")+"}";};
function row(tenant,seq,previous,action){const payload={at:`2026-10-29T15:00:0${seq}.000Z`,actor_id:`${tenant}-USER`,actor_role:"admin",action,episode_id:null,metadata:{actor_tenant_id:tenant}};const event_hash=crypto.createHash("sha256").update(previous+":"+canonical(payload)).digest("hex");return {tenant_id:tenant,seq,previous_hash:previous,event_hash,...payload};}

test("tenant audit chain fails closed without authenticated tenant",()=>{
  assert.throws(()=>auditTenantId({tenant_id:""}),/audit_tenant_required/);
  assert.throws(()=>auditTenantId({}),/audit_tenant_required/);
});

test("tenant lock key is stable and separated between tenants",()=>{
  assert.equal(auditTenantLockKey("TENANT-A"),auditTenantLockKey("TENANT-A"));
  assert.notEqual(auditTenantLockKey("TENANT-A"),auditTenantLockKey("TENANT-B"));
});

test("previous hash lookup is explicitly tenant scoped",async()=>{
  const calls=[];
  const client={query:async(sql,args)=>{calls.push([sql,args]);return {rows:[]};}};
  assert.equal(await previousAuditHashForTenant(client,"TENANT-A"),ZERO_HASH);
  assert.match(calls[0][0],/WHERE tenant_id=\$1/);
  assert.deepEqual(calls[0][1],["TENANT-A"]);
  assert.doesNotMatch(calls[0][0],/FROM internal_clinical_audit ORDER BY seq DESC LIMIT 1/);
});

test("advisory lock is derived from tenant rather than one global constant",async()=>{
  const calls=[];
  const client={query:async(sql,args)=>{calls.push([sql,args]);return {rows:[]};}};
  await lockAuditTenant(client,"TENANT-A");
  await lockAuditTenant(client,"TENANT-B");
  assert.match(calls[0][0],/pg_advisory_xact_lock/);
  assert.notEqual(calls[0][1][0],calls[1][1][0]);
});

test("atomic append locks, links and lets storage derive the authenticated tenant",async()=>{
  const calls=[];
  const prior="a".repeat(64);
  const client={query:async(sql,args)=>{calls.push([sql,args]);if(/SELECT event_hash/.test(sql))return {rows:[{event_hash:prior}]};return {rows:[]};}};
  const at="2026-10-29T17:00:00.000Z";
  const event=await appendAuditEventForTenant(client,{id:"A-1",role:"admin",tenant_id:"TENANT-A"},"READ",{scope:"audit"},canonical,at);
  assert.equal(event.tenant_id,"TENANT-A");
  assert.equal(event.previous_hash,prior);
  assert.equal(event.metadata.actor_tenant_id,"TENANT-A");
  assert.match(calls[0][0],/pg_advisory_xact_lock/);
  assert.match(calls[1][0],/WHERE tenant_id=\$1/);
  assert.deepEqual(calls[1][1],["TENANT-A"]);
  assert.match(calls[2][0],/^INSERT INTO internal_clinical_audit/);
  assert.doesNotMatch(calls[2][0],/tenant_id\) VALUES/);
  assert.match(calls[2][0],/event_hash\) VALUES\([^)]*\$8\)$/);
  assert.equal(calls[2][1].length,8);
  assert.equal(calls[2][1][5].actor_tenant_id,"TENANT-A");
  assert.equal(calls[2][1][6],prior);
  assert.equal(calls[2][1][7],event.event_hash);
});

test("atomic append fails before any query when tenant identity is missing",async()=>{
  let queried=false;
  const client={query:async()=>{queried=true;return {rows:[]};}};
  await assert.rejects(()=>appendAuditEventForTenant(client,{id:"A-1",role:"admin"},"READ",{},canonical),/audit_tenant_required/);
  assert.equal(queried,false);
});

test("snapshot verification accepts independent interleaved tenant chains",()=>{
  const a1=row("TENANT-A",1,ZERO_HASH,"LOGIN"),b1=row("TENANT-B",2,ZERO_HASH,"LOGIN"),a2=row("TENANT-A",3,a1.event_hash,"READ"),b2=row("TENANT-B",4,b1.event_hash,"READ");
  assert.equal(validAuditChainsByTenant([a1,b1,a2,b2],canonical),true);
});

test("snapshot verification fails closed for missing tenant or cross-tenant linkage",()=>{
  const a1=row("TENANT-A",1,ZERO_HASH,"LOGIN"),b1=row("TENANT-B",2,ZERO_HASH,"LOGIN");
  assert.equal(validAuditChainsByTenant([{...a1,tenant_id:""}],canonical),false);
  assert.equal(validAuditChainsByTenant([a1,{...b1,previous_hash:a1.event_hash}],canonical),false);
});
