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

export async function appendAuditEventForTenant(client:any,worker:any,action:string,safeMetadata:any,canonical:(value:any)=>string,at=new Date().toISOString()){
  const tenant=auditTenantId(worker);
  await lockAuditTenant(client,tenant);
  const previous=await previousAuditHashForTenant(client,tenant);
  const metadata={...(safeMetadata||{}),actor_tenant_id:tenant};
  const episodeId=typeof metadata.episode_id==="string"?metadata.episode_id:null;
  const payload={at,actor_id:String(worker.id),actor_role:String(worker.role),action:String(action),episode_id:episodeId,metadata};
  const eventHash=crypto.createHash("sha256").update(previous+":"+canonical(payload)).digest("hex");
  // tenant_id is a GENERATED ALWAYS column derived from authenticated actor_tenant_id metadata.
  // Do not write it explicitly: PostgreSQL rejects explicit values for generated columns.
  await client.query(
    "INSERT INTO internal_clinical_audit(at,actor_id,actor_role,action,episode_id,metadata,previous_hash,event_hash) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
    [at,payload.actor_id,payload.actor_role,payload.action,episodeId,metadata,previous,eventHash],
  );
  return {tenant_id:tenant,previous_hash:previous,event_hash:eventHash,...payload};
}

export function validAuditChainsByTenant(rows:any[],canonical:(value:any)=>string){
  const groups=new Map<string,any[]>();
  for(const row of rows||[]){
    const tenant=String(row?.tenant_id||"").trim();
    const metadataTenant=String(row?.metadata?.actor_tenant_id||"").trim();
    if(!tenant||metadataTenant!==tenant)return false;
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

export async function restoreAuditRowsByTenant(client:any,rows:any[],canonical:(value:any)=>string){
  if(!validAuditChainsByTenant(rows,canonical))throw new Error("invalid_audit_chain");
  const ordered=[...(rows||[])].sort((a:any,b:any)=>Number(a.seq)-Number(b.seq));
  for(const row of ordered){
    // tenant_id is regenerated from metadata.actor_tenant_id by storage. This prevents a restore payload
    // from claiming one tenant in the generated column while hashing another tenant in metadata.
    await client.query(
      "INSERT INTO internal_clinical_audit(seq,at,actor_id,actor_role,action,episode_id,metadata,previous_hash,event_hash) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)",
      [Number(row.seq),String(row.at),String(row.actor_id),String(row.actor_role),String(row.action),row.episode_id==null?null:String(row.episode_id),row.metadata||{},String(row.previous_hash),String(row.event_hash)],
    );
  }
}

export {ZERO_HASH};
