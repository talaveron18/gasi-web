import assert from "node:assert/strict";
import test from "node:test";
import {auditTenantId,auditTenantLockKey,lockAuditTenant,previousAuditHashForTenant,ZERO_HASH} from "../functions/internal-audit-tenant-chain.mts";

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
