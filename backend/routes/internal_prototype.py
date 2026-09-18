from __future__ import annotations
from datetime import datetime,timezone
from typing import Literal,Optional
from fastapi import APIRouter,Header,HTTPException
from pydantic import BaseModel,Field
import os
from internal_session_security import SessionSecurityError, signed_session_subject, verify_session_token
router=APIRouter(prefix='/internal-clinical',tags=['internal-clinical'])
Role=Literal['nurse','physician','psychologist','physiotherapist','admin'];Privilege=Literal['clinical_record_privileged_read','worker_access_management'];CLINICAL_ROLES=frozenset({'nurse','physician','psychologist','physiotherapist'});EPISODE_CREATORS=frozenset({'nurse','psychologist','physiotherapist'});ROLE_DISCIPLINE={'nurse':'nursing','psychologist':'psychology','physiotherapist':'physiotherapy'};MASTER_ADMIN_ID='GASI-MASTER-01'
def _store():
 from server import clinical_store
 return clinical_store
def _now():return datetime.now(timezone.utc).isoformat()
def _required(v,n):
 x=(v or '').strip()
 if not x:raise HTTPException(422,f'{n}_required')
 return x
class CreateEpisode(BaseModel):patient_ref:str;center:str;level:Literal[1,2,3];summary:str=Field(min_length=1,max_length=4000)
class ResponseInput(BaseModel):text:str=Field(min_length=1,max_length=4000)
class LevelChangeInput(BaseModel):level:Literal[1,2,3]
class AddendumInput(BaseModel):text:str=Field(min_length=1,max_length=4000)
class CorrectionInput(BaseModel):replacement_text:str=Field(min_length=1,max_length=4000);reason:str=Field(min_length=3,max_length=500)
class DispositionInput(BaseModel):kind:Literal['SALIDA_CENTRO','TRASLADO','DECISION_POSTERIOR'];occurred_at:str
class EvidenceInput(BaseModel):kind:Literal['delivery_receipt','read_receipt'];at:str
class CloseInput(BaseModel):follow_up_pending:bool=False;acknowledgement_required:bool=False;handoff_required:bool=False;handoff_acknowledged:bool=False
class PrivilegedAccessInput(BaseModel):reason:Literal['authority_request','inspection','legal_process','incident_review'];reference:str=Field(min_length=3,max_length=160)
class PrivilegeGrantInput(BaseModel):privilege:Privilege;reason:str=Field(min_length=3,max_length=500)
async def _actor(authorization):
 token=(authorization or '').strip()
 if not token.startswith('Bearer '):raise HTTPException(401,'authentication_required')
 token=token[7:].strip()
 secret=os.environ.get('GASI_INTERNAL_SESSION_SECRET','')
 try:
  worker_id=signed_session_subject(token=token,secret=secret)
 except SessionSecurityError:raise HTTPException(401,'invalid_session')
 a=await _store().get_worker(worker_id)
 if not a or not a.get('active',True):raise HTTPException(401,'invalid_or_revoked_identity')
 try:
  verify_session_token(token=token,secret=secret,current_auth_version=int(a.get('auth_version',1)))
 except SessionSecurityError:raise HTTPException(401,'session_expired_or_revoked')
 return a
def _has(a,p):return a['id']==MASTER_ADMIN_ID or p in set(a.get('delegated_privileges',[]))
async def _audit(a,action,eid=None,metadata=None):await _store().append_audit({'at':_now(),'actor_id':a['id'],'actor_role':a['role'],'action':action,'episode_id':eid,'metadata':metadata or {}})
async def _ep(i):
 e=await _store().get_episode(i)
 if not e:raise HTTPException(404,'episode_not_found')
 return e
def _can(a,e):return a['role']=='admin'or(a['role']in CLINICAL_ROLES and e['center']in a.get('centers',[]))
def _access(a,e):
 if not _can(a,e):raise HTTPException(403,'episode_forbidden')
def _can_write(a,e):
 if a['role']in('nurse','physician'):return e['center']in a.get('centers',[])and e.get('discipline')=='nursing'
 return a['role']in('psychologist','physiotherapist')and e['center']in a.get('centers',[])and e.get('discipline')==ROLE_DISCIPLINE[a['role']]
def _write_access(a,e):
 _access(a,e)
 if not _can_write(a,e):raise HTTPException(403,'discipline_write_forbidden')
def _admin(e):return{k:e.get(k)for k in('id','center','discipline','level','status','created_at','created_by_id','responded_at','responded_by_id','closed_at','closed_by_id','disposition_events')}
def _entry(a,e,c,i):
 x=next((z for z in e[c]if z['id']==i),None)
 if not x:raise HTTPException(404,'entry_not_found')
 if x.get('author_id')!=a['id']:raise HTTPException(403,'author_only_correction')
 return x
async def _save(e):return await _store().replace_episode(e)
async def _correct(a,e,x,p,k):
 h=x.setdefault('corrections',[]);c={'id':f"{x['id']}-C{len(h)+1}",'previous_text':x['text'],'replacement_text':p.replacement_text.strip(),'reason':p.reason.strip(),'corrected_at':_now(),'corrected_by_id':a['id']};h.append(c);x['text']=c['replacement_text'];await _save(e);await _audit(a,'CLINICAL_ENTRY_CORRECTED',e['id'],{'entry_id':x['id'],'entry_kind':k,'correction_id':c['id']});return e
@router.get('/health')
async def health():return{'enabled':True,'service':'internal_clinical','storage':'persistent'}
@router.get('/workers')
async def workers(authorization:Optional[str]=Header(default=None,alias='Authorization')):
 a=await _actor(authorization)
 if not _has(a,'worker_access_management'):raise HTTPException(403,'worker_management_required')
 rows=await _store().list_workers();await _audit(a,'WORKERS_LIST_VIEWED');return rows
@router.post('/workers/{worker_id}/privileges/grant')
async def grant(worker_id:str,p:PrivilegeGrantInput,authorization:Optional[str]=Header(default=None,alias='Authorization')):
 a=await _actor(authorization)
 if a['id']!=MASTER_ADMIN_ID:raise HTTPException(403,'master_account_only')
 t=await _store().get_worker(worker_id)
 if not t:raise HTTPException(404,'worker_not_found')
 if t['id']==MASTER_ADMIN_ID:raise HTTPException(409,'master_privilege_is_intrinsic')
 t=await _store().set_privilege(worker_id,p.privilege,True);await _audit(a,'PRIVILEGE_GRANTED',metadata={'target_actor_id':worker_id,'privilege':p.privilege});return{'worker_id':worker_id,'base_role':t['role'],'privileges':sorted(t.get('delegated_privileges',[]))}
@router.post('/workers/{worker_id}/privileges/revoke')
async def revoke(worker_id:str,p:PrivilegeGrantInput,authorization:Optional[str]=Header(default=None,alias='Authorization')):
 a=await _actor(authorization)
 if a['id']!=MASTER_ADMIN_ID:raise HTTPException(403,'master_account_only')
 t=await _store().get_worker(worker_id)
 if not t:raise HTTPException(404,'worker_not_found')
 if t['id']==MASTER_ADMIN_ID:raise HTTPException(409,'master_privilege_is_intrinsic')
 t=await _store().set_privilege(worker_id,p.privilege,False);await _audit(a,'PRIVILEGE_REVOKED',metadata={'target_actor_id':worker_id,'privilege':p.privilege});return{'worker_id':worker_id,'base_role':t['role'],'privileges':sorted(t.get('delegated_privileges',[]))}
@router.post('/episodes',status_code=201)
async def create(p:CreateEpisode,authorization:Optional[str]=Header(default=None,alias='Authorization')):
 a=await _actor(authorization)
 if a['role']not in EPISODE_CREATORS:raise HTTPException(403,'episode_creator_role_required')
 patient=_required(p.patient_ref,'patient_ref');center=_required(p.center,'center')
 if center not in a.get('centers',[]):raise HTTPException(403,'center_not_assigned')
 i=await _store().next_episode_id();n=_now();e={'id':i,'patient_ref':patient,'center':center,'discipline':ROLE_DISCIPLINE[a['role']],'level':p.level,'status':'ABIERTO','summary':p.summary.strip(),'created_at':n,'created_by_id':a['id'],'created_by_role':a['role'],'responses':[],'addenda':[],'level_history':[],'disposition_events':[],'closed_at':None,'closed_by_id':None};await _store().insert_episode(e);await _audit(a,'EPISODE_CREATED',i,{'level':p.level,'discipline':e['discipline']});return e
@router.get('/episodes')
async def episodes(authorization:Optional[str]=Header(default=None,alias='Authorization')):
 a=await _actor(authorization);query={}if a['role']=='admin'else{'center':{'$in':a.get('centers',[])}};v=await _store().list_episodes(query);await _audit(a,'EPISODES_LIST_VIEWED',metadata={'count':len(v)});return[_admin(e)for e in v]if a['role']=='admin'else v
@router.get('/episodes/{episode_id}')
async def get(episode_id:str,authorization:Optional[str]=Header(default=None,alias='Authorization')):
 a=await _actor(authorization);e=await _ep(episode_id);_access(a,e);await _audit(a,'EPISODE_VIEWED',episode_id);return _admin(e)if a['role']=='admin'else e
@router.post('/episodes/{episode_id}/privileged-access')
async def privileged(episode_id:str,p:PrivilegedAccessInput,authorization:Optional[str]=Header(default=None,alias='Authorization')):
 a=await _actor(authorization)
 if not _has(a,'clinical_record_privileged_read'):raise HTTPException(403,'privileged_record_access_required')
 e=await _ep(episode_id)
 if a['id']!=MASTER_ADMIN_ID and e['center'] not in a.get('centers',[]):raise HTTPException(403,'episode_forbidden')
 ref=_required(p.reference,'reference');await _audit(a,'PRIVILEGED_CLINICAL_RECORD_ACCESSED',episode_id,{'reason':p.reason,'reference':ref,'delegated':a['id']!=MASTER_ADMIN_ID});return{**e,'privileged_access':{'reason':p.reason,'reference':ref,'accessed_at':_now(),'accessed_by_id':a['id'],'delegated':a['id']!=MASTER_ADMIN_ID},'read_only':True}
@router.post('/episodes/{episode_id}/level')
async def level(episode_id:str,p:LevelChangeInput,authorization:Optional[str]=Header(default=None,alias='Authorization')):
 a=await _actor(authorization)
 if a['role']!='nurse':raise HTTPException(403,'nurse_only')
 e=await _ep(episode_id);_write_access(a,e)
 if e['status']=='CERRADO':raise HTTPException(409,'closed_episode_immutable')
 old=e['level']
 if old!=p.level:e['level']=p.level;e['level_history'].append({'at':_now(),'actor_id':a['id'],'from':old,'to':p.level});await _save(e);await _audit(a,'LEVEL_CHANGED',episode_id,{'from':old,'to':p.level})
 return e
@router.post('/episodes/{episode_id}/disposition')
async def disposition(episode_id:str,p:DispositionInput,authorization:Optional[str]=Header(default=None,alias='Authorization')):
 a=await _actor(authorization);e=await _ep(episode_id);_write_access(a,e)
 if e['status']=='CERRADO':raise HTTPException(409,'closed_episode_immutable')
 d={'id':f"{episode_id}-D{len(e['disposition_events'])+1}",'kind':p.kind,'occurred_at':p.occurred_at,'recorded_at':_now(),'recorded_by_id':a['id'],'recorded_by_role':a['role']};e['disposition_events'].append(d);await _save(e);await _audit(a,'PATIENT_DISPOSITION_RECORDED',episode_id,{'event_id':d['id'],'kind':d['kind']});return e
@router.post('/episodes/{episode_id}/responses')
async def respond(episode_id:str,p:ResponseInput,authorization:Optional[str]=Header(default=None,alias='Authorization')):
 a=await _actor(authorization)
 if a['role']!='physician':raise HTTPException(403,'physician_only')
 e=await _ep(episode_id);_write_access(a,e)
 if e['status']=='CERRADO':raise HTTPException(409,'response_not_allowed')
 n=_now();d=e['disposition_events'][-1]if e['disposition_events']else None;r={'id':f"{episode_id}-R{len(e['responses'])+1}",'text':p.text.strip(),'author_id':a['id'],'created_at':n,'corrections':[],'status':'EMITIDA','status_history':[{'at':n,'from':'BORRADOR','to':'EMITIDA','evidence':None}],'late_after_disposition':d is not None,'disposition_event_id':d['id']if d else None,'late_reviewed_at':None,'late_reviewed_by_id':None};e['responses'].append(r);e['status']='RESPONDIDO';e['responded_at']=n;e['responded_by_id']=a['id'];await _save(e);await _audit(a,'CLINICAL_RESPONSE_ISSUED',episode_id,{'response_id':r['id'],'late_after_disposition':r['late_after_disposition']});return e
@router.post('/episodes/{episode_id}/responses/{response_id}/late-review')
async def late_review(episode_id:str,response_id:str,authorization:Optional[str]=Header(default=None,alias='Authorization')):
 a=await _actor(authorization)
 if a['role']!='physician':raise HTTPException(403,'physician_only')
 e=await _ep(episode_id);_write_access(a,e);r=next((x for x in e['responses']if x['id']==response_id),None)
 if not r:raise HTTPException(404,'response_not_found')
 if not r.get('late_after_disposition'):raise HTTPException(409,'response_not_late')
 if not r.get('late_reviewed_at'):r['late_reviewed_at']=_now();r['late_reviewed_by_id']=a['id'];await _save(e);await _audit(a,'LATE_RESPONSE_REVIEWED',episode_id,{'response_id':response_id})
 return r
@router.post('/episodes/{episode_id}/responses/{response_id}/delivery')
async def delivery(episode_id:str,response_id:str,p:EvidenceInput,authorization:Optional[str]=Header(default=None,alias='Authorization')):
 a=await _actor(authorization);e=await _ep(episode_id);_write_access(a,e);r=next((x for x in e['responses']if x['id']==response_id),None)
 if not r:raise HTTPException(404,'response_not_found')
 expected='delivery_receipt'if r['status']=='EMITIDA'else'read_receipt';nxt='ENTREGADA'if r['status']=='EMITIDA'else'LEIDA'
 if p.kind!=expected or r['status']not in('EMITIDA','ENTREGADA'):raise HTTPException(409,'invalid_message_transition')
 old=r['status'];r['status']=nxt;r['status_history'].append({'at':_now(),'from':old,'to':nxt,'evidence':{'kind':p.kind,'at':p.at}});await _save(e);await _audit(a,f'MESSAGE_{nxt}',episode_id,{'response_id':response_id,'evidence_kind':p.kind});return r
@router.post('/episodes/{episode_id}/responses/{entry_id}/correct')
async def correct_response(episode_id:str,entry_id:str,p:CorrectionInput,authorization:Optional[str]=Header(default=None,alias='Authorization')):
 a=await _actor(authorization);e=await _ep(episode_id);_write_access(a,e);return await _correct(a,e,_entry(a,e,'responses',entry_id),p,'response')
@router.post('/episodes/{episode_id}/addenda')
async def addendum(episode_id:str,p:AddendumInput,authorization:Optional[str]=Header(default=None,alias='Authorization')):
 a=await _actor(authorization);e=await _ep(episode_id);_write_access(a,e)
 if e['status']=='CERRADO':raise HTTPException(409,'closed_episode_immutable')
 x={'id':f"{episode_id}-A{len(e['addenda'])+1}",'text':p.text.strip(),'author_id':a['id'],'author_role':a['role'],'created_at':_now(),'corrections':[]};e['addenda'].append(x);await _save(e);await _audit(a,'ADDENDUM_APPENDED',episode_id,{'addendum_id':x['id']});return e
@router.post('/episodes/{episode_id}/addenda/{entry_id}/correct')
async def correct_addendum(episode_id:str,entry_id:str,p:CorrectionInput,authorization:Optional[str]=Header(default=None,alias='Authorization')):
 a=await _actor(authorization);e=await _ep(episode_id);_write_access(a,e);return await _correct(a,e,_entry(a,e,'addenda',entry_id),p,'addendum')
@router.post('/episodes/{episode_id}/close')
async def close(episode_id:str,p:CloseInput,authorization:Optional[str]=Header(default=None,alias='Authorization')):
 a=await _actor(authorization);e=await _ep(episode_id);_write_access(a,e)
 if e['status']!='RESPONDIDO'or not e['responses']:raise HTTPException(409,'close_not_allowed')
 if p.follow_up_pending:raise HTTPException(409,'follow_up_pending')
 if p.handoff_required and not p.handoff_acknowledged:raise HTTPException(409,'handoff_acknowledgement_missing')
 if p.acknowledgement_required and e['responses'][-1]['status']!='LEIDA':raise HTTPException(409,'acknowledgement_missing')
 if any(x.get('late_after_disposition')and not x.get('late_reviewed_at')for x in e['responses']):raise HTTPException(409,'late_response_review_pending')
 e['status']='CERRADO';e['closed_at']=_now();e['closed_by_id']=a['id'];await _save(e);await _audit(a,'EPISODE_CLOSED',episode_id,{'acknowledgement_required':p.acknowledgement_required,'handoff_required':p.handoff_required});return e
@router.get('/audit')
async def audit(authorization:Optional[str]=Header(default=None,alias='Authorization')):
 a=await _actor(authorization)
 if a['id']!=MASTER_ADMIN_ID:raise HTTPException(403,'master_account_only')
 return await _store().list_audit()