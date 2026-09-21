const TYPES=new Set(['PHONE','URL','REFERENCE']);
const MAX_ROWS=250;

const text=(value,max)=>typeof value==='string'?value.trim().slice(0,max):'';

export function sanitizeContingencyChannels(rows){
 if(!Array.isArray(rows))return[];
 const out=[];
 for(const row of rows.slice(0,MAX_ROWS)){
  if(!row||typeof row!=='object')continue;
  const tenantId=text(row.tenant_id,80),center=text(row.center,160),channelType=text(row.channel_type,20),label=text(row.label,160),target=text(row.target,500),updatedAt=text(row.updated_at,64);
  if(!tenantId||!center||!TYPES.has(channelType)||!label||!target)continue;
  out.push({tenant_id:tenantId,center,channel_type:channelType,label,target,active:row.active===true,updated_at:updatedAt});
 }
 return out;
}

export function readContingencyCache(storage,key){
 if(!storage||!key)return[];
 try{return sanitizeContingencyChannels(JSON.parse(storage.getItem(key)||'[]'));}catch{return[];}
}

export function writeContingencyCache(storage,key,rows){
 const safe=sanitizeContingencyChannels(rows);
 if(storage&&key)storage.setItem(key,JSON.stringify(safe));
 return safe;
}
