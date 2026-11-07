import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import {appendAuditEventForTenant,auditTenantId,tenantAuditLockId,lockAuditTenant,previousAuditHashForTenant,restoreAuditRowsByTenant,validAuditChainsByTenant,ZERO_HASH,LEGACY_TENANT} from "../functions/internal-audit-tenant-chain.mts";

const canonical=(value)=>{if(value===null||typeof value!=="object")return JSON.stringify(value);if(Array.isArray(value))return "["+value.map(canonical).join(",")+"]";return "{"+Object.keys(value).sort().map(k=>JSON.stringify(k)+":"+canonical(value[k])).join(",")+"}";};
function row(tenant,seq,previous,action){const payload={at:`2026-10-29T15:00:0${seq}.000Z`,actor_id:`${tenant}-USER`,actor_role:"admin",action,episode_id:null,metadata:{actor_tenant_id:tenant}};const event_hash=crypto.createHash("sha256").update(previous+":"+canonical(payload)).digest("hex");return {tenant_id:tenant,seq,previous_hash:previous,event_hash,...payload};}
function legacyRow(seq,previous,action){const payload={at:`2026-10-20T15:00:0${seq}.000Z`,actor_id:"LEGACY-USER",actor_role:"admin",action,episode_id:null,metadata:{}};const event_hash=crypto.createHash("sha256").update(previous+":"+canonical(payload)).digest("hex");return {tenant_id:LEGACY_TENANT,seq,previous_hash:previous,event_hash,...payload};}

test("tenant audit chain fails closed without authenticated tenant",()=>{
  assert.throws(()=>auditTenantId({tenant_id:""}),/audit_tenant_required/);
  assert.throws(()=>auditTenantId({}),/audit_tenant_required/);
});

test("tenant lock key is stable and separated between tenants",()=>{
  assert.equal(tenantAuditLockId("TENANT-A"),tenantAuditLockId("TENANT-A"));
  assert.notEqual(tenantAuditLockId("TENANT-A"),tenantAuditLockId("TENANT-B"));
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

test("snapshot verifier canonicalizes PostgreSQL Date timestamps to the original ISO hash input",()=>{
  const written=row("TENANT-A",1,ZERO_HASH,"LOGIN");
  const readFromPostgres={...written,at:new Date(written.at)};
  assert.equal(validAuditChainsByTenant([readFromPostgres],canonical),true);
  assert.equal(validAuditChainsByTenant([{...readFromPostgres,at:new Date("invalid")}],canonical),false);
});

test("snapshot verification accepts independent interleaved tenant chains",()=>{
  const a1=row("TENANT-A",1,ZERO_HASH,"LOGIN"),b1=row("TENANT-B",2,ZERO_HASH,"LOGIN"),a2=row("TENANT-A",3,a1.event_hash,"READ"),b2=row("TENANT-B",4,b1.event_hash,"READ");
  assert.equal(validAuditChainsByTenant([a1,b1,a2,b2],canonical),true);
});

test("legacy tenant accepts only matching explicit tenant metadata",()=>{
  const activeLegacy=row(LEGACY_TENANT,1,ZERO_HASH,"LOGIN");
  assert.equal(validAuditChainsByTenant([activeLegacy],canonical),true);
  assert.equal(validAuditChainsByTenant([{...activeLegacy,tenant_id:"TENANT-A"}],canonical),false);
});

test("snapshot verification preserves the historical GASI-LEGACY chain separately",()=>{
  const legacy1=legacyRow(1,ZERO_HASH,"LOGIN"),legacy2=legacyRow(3,legacy1.event_hash,"READ"),current=row("TENANT-A",2,ZERO_HASH,"LOGIN");
  assert.equal(validAuditChainsByTenant([legacy1,current,legacy2],canonical),true);
  assert.equal(validAuditChainsByTenant([{...legacy1,metadata:{actor_tenant_id:"TENANT-A"}}],canonical),false);
});

test("snapshot verification fails closed for missing, mismatched or cross-tenant identity",()=>{
  const a1=row("TENANT-A",1,ZERO_HASH,"LOGIN"),b1=row("TENANT-B",2,ZERO_HASH,"LOGIN");
  assert.equal(validAuditChainsByTenant([{...a1,tenant_id:""}],canonical),false);
  assert.equal(validAuditChainsByTenant([{...a1,tenant_id:"TENANT-B"}],canonical),false);
  assert.equal(validAuditChainsByTenant([a1,{...b1,previous_hash:a1.event_hash}],canonical),false);
});

test("restore validates all tenant chains before writing and lets storage regenerate tenant_id",async()=>{
  const a1=row("TENANT-A",1,ZERO_HASH,"LOGIN"),b1=row("TENANT-B",2,ZERO_HASH,"LOGIN"),calls=[];
  const client={query:async(sql,args)=>{calls.push([sql,args]);return {rows:[]};}};
  await restoreAuditRowsByTenant(client,[b1,a1],canonical);
  assert.equal(calls.length,2);
  assert.match(calls[0][0],/^INSERT INTO internal_clinical_audit\(seq,at/);
  assert.doesNotMatch(calls[0][0],/tenant_id/);
  assert.equal(calls[0][1][0],1);
  assert.equal(calls[0][1][6].actor_tenant_id,"TENANT-A");
  assert.equal(calls[1][1][0],2);
  assert.equal(calls[1][1][6].actor_tenant_id,"TENANT-B");
});

test("restore preserves legacy rows without manufacturing authenticated tenant metadata",async()=>{
  const legacy=legacyRow(1,ZERO_HASH,"LOGIN"),calls=[];
  const client={query:async(sql,args)=>{calls.push([sql,args]);return {rows:[]};}};
  await restoreAuditRowsByTenant(client,[legacy],canonical);
  assert.equal(calls.length,1);
  assert.deepEqual(calls[0][1][6],{});
  assert.doesNotMatch(calls[0][0],/tenant_id/);
});

test("restore fails closed before writing when snapshot tenant identity is forged",async()=>{
  let queried=false;
  const client={query:async()=>{queried=true;return {rows:[]};}};
  const forged={...row("TENANT-A",1,ZERO_HASH,"LOGIN"),tenant_id:"TENANT-B"};
  await assert.rejects(()=>restoreAuditRowsByTenant(client,[forged],canonical),/invalid_audit_chain/);
  assert.equal(queried,false);
});
