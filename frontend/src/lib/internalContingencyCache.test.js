import{readContingencyCache,sanitizeContingencyChannels,writeContingencyCache}from'./internalContingencyCache';

describe('internal contingency cache',()=>{
 test('strips clinical narrative, patient references, tokens and unknown fields before caching',()=>{
  const rows=sanitizeContingencyChannels([{
   tenant_id:'TENANT-A',center:'HQ',channel_type:'PHONE',label:'Backup',target:'+34910000011',active:true,updated_at:'2026-09-20T16:10:00Z',
   patient_ref:'PATIENT-X',summary:'clinical narrative',text:'clinical note',token:'secret',authorization:'Bearer secret'
  }]);
  expect(rows).toEqual([{tenant_id:'TENANT-A',center:'HQ',channel_type:'PHONE',label:'Backup',target:'+34910000011',active:true,updated_at:'2026-09-20T16:10:00Z'}]);
  const serialized=JSON.stringify(rows);
  expect(serialized).not.toMatch(/PATIENT-X|clinical narrative|clinical note|secret|authorization|token/i);
 });

 test('rejects malformed or unknown channel rows fail-closed',()=>{
  expect(sanitizeContingencyChannels(null)).toEqual([]);
  expect(sanitizeContingencyChannels([
   null,
   {tenant_id:'TENANT-A',center:'HQ',channel_type:'EMAIL',label:'Unsupported',target:'x',active:true},
   {tenant_id:'TENANT-A',center:'',channel_type:'PHONE',label:'Missing center',target:'+34910000011',active:true},
  ])).toEqual([]);
 });

 test('writes and reads only the sanitized allowlist from session storage',()=>{
  const data=new Map();
  const storage={getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value)};
  writeContingencyCache(storage,'gasi-contingency:TENANT-A:HQ',[{
   tenant_id:'TENANT-A',center:'HQ',channel_type:'REFERENCE',label:'Procedimiento',target:'CALL-DESK-A',active:true,updated_at:'2026-09-20T16:10:00Z',summary:'must not persist'
  }]);
  const raw=data.get('gasi-contingency:TENANT-A:HQ');
  expect(raw).not.toContain('summary');
  expect(readContingencyCache(storage,'gasi-contingency:TENANT-A:HQ')).toEqual([{
   tenant_id:'TENANT-A',center:'HQ',channel_type:'REFERENCE',label:'Procedimiento',target:'CALL-DESK-A',active:true,updated_at:'2026-09-20T16:10:00Z'
  }]);
 });
});
