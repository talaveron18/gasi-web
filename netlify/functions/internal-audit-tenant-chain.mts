import crypto from "node:crypto";

const ZERO_HASH="0".repeat(64);

export function auditTenantId(worker:any){
  const tenant=String(worker?.tenant_id||"").trim();
  if(!tenant) throw new Error("audit_tenant_required");
  return tenant;
}

export function auditTenantLockKey(tenantId:string){
  const tenant=String(tenantId||"").trim();
  if(!tenant) throw new Error("audit_tenant_required");
  // Stable signed 64-bit key for pg_advisory_xact_lock; independent tenants do not share one global lock.
  return BigInt.asIntN(64,BigInt(`0x${crypto.createHash("sha256").update(`gasi:audit:${tenant}`).digest("hex").slice(0,16)}`));
}

export async function previousAuditHashForTenant(client:any,tenantId:string){
  const tenant=String(tenantId||"").trim();
  if(!tenant) throw new Error("audit_tenant_required");
  const result=await client.query(
    "SELECT event_hash FROM internal_clinical_audit WHERE tenant_id=$1 ORDER BY seq DESC LIMIT 1",
    [tenant],
  );
  return String(result.rows[0]?.event_hash||ZERO_HASH);
}

export async function lockAuditTenant(client:any,tenantId:string){
  await client.query("SELECT pg_advisory_xact_lock($1::bigint)",[auditTenantLockKey(tenantId).toString()]);
}

export function validAuditChainsByTenant(rows:any[],canonical:(value:any)=>string){
  const groups=new Map<string,any[]>();
  for(const row of rows||[]){
    const tenant=String(row?.tenant_id||"").trim();
    if(!tenant)return false;
    groups.set(tenant,[...(groups.get(tenant)||[]),row]);
  }
  for(const tenantRows of groups.values()){
    const ordered=[...tenantRows].sort((a:any,b:any)=>Number(a.seq)-Number(b.seq));
    let previous=ZERO_HASH;
    for(const x of ordered){
      if(String(x.previous_hash||"")!==previous)return false;
      const payload={at:String(x.at),actor_id:String(x.actor_id),actor_role:String(x.actor_role),action:String(x.action),episode_id:x.episode_id==null?null:String(x.episode_id),metadata:x.metadata||{}};
      const expected=crypto.createHash("sha256").update(previous+":"+canonical(payload)).digest("hex");
      if(String(x.event_hash||"")!==expected)return false;
      previous=expected;
    }
  }
  return true;
}

export {ZERO_HASH};
