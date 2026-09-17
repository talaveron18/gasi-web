from __future__ import annotations
from datetime import datetime,timezone
from typing import Dict,List,Literal,Optional
import os
from fastapi import APIRouter,Header,HTTPException
from pydantic import BaseModel,Field
from backend.internal_audit_policy import ValidatedAuditStream
router=APIRouter(prefix='/internal-prototype',tags=['internal-prototype'])
Role=Literal['nurse','physician','psychologist','physiotherapist','admin'];Privilege=Literal['clinical_record_privileged_read','worker_access_management'];CLINICAL_ROLES=frozenset({'nurse','physician','psychologist','physiotherapist'});EPISODE_CREATORS=frozenset({'nurse','psychologist','physiotherapist'});ROLE_DISCIPLINE={'nurse':'nursing','psychologist':'psychology','physiotherapist':'physiotherapy'}
def _enabled():return os.getenv('ENABLE_INTERNAL_SYNTHETIC_PROTOTYPE','false').lower()=='true'
def _require_enabled():
 if not _enabled():raise HTTPException(404,'prototype_disabled')
def _now():return datetime.now(timezone.utc).isoformat()
def _require_synthetic(v,n):
 x=(v or '').strip()
 if not x or not any(t in x.upper() for t in ('DEMO','FICTICIO','SYNTH')):raise HTTPException(422,f'{n}_must_be_synthetic')
 return x
class Actor(BaseModel):id:str;role:Role;display_name:str;centers:List[str]=Field(default_factory=list);active:bool=True
class CreateEpisode(BaseModel):patient_ref:str;center:str;level:Literal[1,2,3];summary:str=Field(min_length=1,max_length=4000)
class ResponseInput(BaseModel):text:str=Field(min_length=1,max_length=4000)
class LevelChangeInput(BaseModel):level:Literal[1,2,3]
class AddendumInput(BaseModel):text:str=Field(min_length=1,max_length=4000)
class CorrectionInput(BaseModel):replacement_text:str=Field(min_length=1,max_length=4000);reason:str=Field(min_length=3,max_length=500)
class DispositionInput(BaseModel):kind:Literal['SALIDA_CENTRO','TRASLADO','DECISION_POSTERIOR'];occurred_at:str
class EvidenceInput(BaseModel):kind:Literal['synthetic_delivery_receipt','synthetic_read_receipt'];at:str
class CloseInput(BaseModel):follow_up_pending:bool=False;acknowledgement_required:bool=False;handoff_required:bool=False;handoff_acknowledged:bool=False
class PrivilegedAccessInput(BaseModel):reason:Literal['authority_request','inspection','legal_process','incident_review'];reference:str=Field(min_length=3,max_length=160)
class PrivilegeGrantInput(BaseModel):privilege:Privilege;reason:str=Field(min_length=3,max_length=500)
ACTORS={'USR-DEMO-NURSE-01':Actor(id='USR-DEMO-NURSE-01',role='nurse',display_name='Enfermera Demo 01',centers=['Centro ficticio Madrid 01']),'USR-DEMO-PHYS-01':Actor(id='USR-DEMO-PHYS-01',role='physician',display_name='Dr. Demo 01',centers=['Centro ficticio Madrid 01']),'USR-DEMO-PSY-01':Actor(id='USR-DEMO-PSY-01',role='psychologist',display_name='Psicóloga Demo 01',centers=['Centro ficticio Madrid 01']),'USR-DEMO-PHYSIO-01':Actor(id='USR-DEMO-PHYSIO-01',role='physiotherapist',display_name='Fisioterapeuta Demo 01',centers=['Centro ficticio Madrid 01']),'USR-DEMO-ADMIN-01':Actor(id='USR-DEMO-ADMIN-01',role='admin',display_name='Coordinación Demo 01',centers=[])}
MASTER_ADMIN_ID='USR-DEMO-ADMIN-01';EPISODES:Dict[str,dict]={};AUDIT=ValidatedAuditStream();DELEGATED_PRIVILEGES:Dict[str,set]={}
def _actor(i):
 _require_enabled();a=ACTORS.get(i or '')
 if not a or not a.active:raise HTTPException(401,'invalid_or_revoked_identity')
 return a
def _audit(a,action,eid=None,metadata=None):AUDIT.append({'at':_now(),'actor_id':a.id,'actor_role':a.role,'action':action,'episode_id':eid,'metadata':metadata or {}})
def _has(a,p):return a.id==MASTER_ADMIN_ID or p in DELEGATED_PRIVILEGES.get(a.id,set())
def _ep(i):
 e=EPISODES.get(i)
 if not e:raise HTTPException(404,'episode_not_found')
 return e
def _can(a,e):return a.role=='admin' or (a.role in CLINICAL_ROLES and e['center'] in a.centers)
def _access(a,e):
 if not _can(a,e):raise HTTPException(403,'episode_forbidden')
def _admin(e):return{k:e.get(k) for k in ('id','center','discipline','level','status','created_at','created_by_id','responded_at','responded_by_id','closed_at','closed_by_id','disposition_events')}
def _entry(a,e,c,i):
 x=next((z for z in e[c] if z['id']==i),None)
 if not x:raise HTTPException(404,'entry_not_found')
 if x.get('author_id')!=a.id:raise HTTPException(403,'author_only_correction')
 return x
def _correct(a,e,x,p,k):
 h=x.setdefault('corrections',[]);c={'id':f"{x['id']}-C{len(h)+1}",'previous_text':x['text'],'replacement_text':p.replacement_text.strip(),'reason':p.reason.strip(),'corrected_at':_now(),'corrected_by_id':a.id};h.append(c);x['text']=c['replacement_text'];_audit(a,'CLINICAL_ENTRY_CORRECTED',e['id'],{'entry_id':x['id'],'entry_kind':k,'correction_id':c['id']});return e
@router.get('/health')
def health():_require_enabled();return{'enabled':True,'storage':'memory_only','real_data_allowed':False,'activation':'BLOQUEADA PARA ACTIVACIÓN REAL'}
@router.get('/workers')
def workers(x_demo_actor_id:Optional[str]=Header(default=None)):
 a=_actor(x_demo_actor_id)
 if not(a.role=='admin' or _has(a,'worker_access_management')):raise HTTPException(403,'worker_management_required')
 _audit(a,'WORKERS_LIST_VIEWED');return[{**x.model_dump(),'delegated_privileges':sorted(DELEGATED_PRIVILEGES.get(x.id,set()))}for x in ACTORS.values()]
@router.post('/workers/{worker_id}/privileges/grant')
def grant(worker_id:str,p:PrivilegeGrantInput,x_demo_actor_id:Optional[str]=Header(default=None)):
 a=_actor(x_demo_actor_id)
 if a.id!=MASTER_ADMIN_ID:raise HTTPException(403,'master_account_only')
 t=_actor(worker_id)
 if t.id==MASTER_ADMIN_ID:raise HTTPException(409,'master_privilege_is_intrinsic')
 DELEGATED_PRIVILEGES.setdefault(t.id,set()).add(p.privilege);_audit(a,'PRIVILEGE_GRANTED',metadata={'target_actor_id':t.id,'privilege':p.privilege});return{'worker_id':t.id,'base_role':t.role,'privileges':sorted(DELEGATED_PRIVILEGES[t.id])}
@router.post('/workers/{worker_id}/privileges/revoke')
def revoke(worker_id:str,p:PrivilegeGrantInput,x_demo_actor_id:Optional[str]=Header(default=None)):
 a=_actor(x_demo_actor_id)
 if a.id!=MASTER_ADMIN_ID:raise HTTPException(403,'master_account_only')
 t=_actor(worker_id);DELEGATED_PRIVILEGES.setdefault(t.id,set()).discard(p.privilege);_audit(a,'PRIVILEGE_REVOKED',metadata={'target_actor_id':t.id,'privilege':p.privilege});return{'worker_id':t.id,'base_role':t.role,'privileges':sorted(DELEGATED_PRIVILEGES[t.id])}
@router.post('/episodes',status_code=201)
def create(p:CreateEpisode,x_demo_actor_id:Optional[str]=Header(default=None)):
 a=_actor(x_demo_actor_id)
 if a.role not in EPISODE_CREATORS:raise HTTPException(403,'episode_creator_role_required')
 patient=_require_synthetic(p.patient_ref,'patient_ref');center=_require_synthetic(p.center,'center')
 if center not in a.centers:raise HTTPException(403,'center_not_assigned')
 i=f'DEMO-EP-{len(EPISODES)+1:04d}';n=_now();e={'id':i,'patient_ref':patient,'center':center,'discipline':ROLE_DISCIPLINE[a.role],'level':p.level,'status':'ABIERTO','summary':p.summary.strip(),'created_at':n,'created_by_id':a.id,'created_by_role':a.role,'responses':[],'addenda':[],'level_history':[],'disposition_events':[],'closed_at':None,'closed_by_id':None};EPISODES[i]=e;_audit(a,'EPISODE_CREATED',i,{'level':p.level,'discipline':e['discipline']});return e
@router.get('/episodes')
def episodes(x_demo_actor_id:Optional[str]=Header(default=None)):
 a=_actor(x_demo_actor_id);v=[e for e in EPISODES.values()if _can(a,e)];_audit(a,'EPISODES_LIST_VIEWED',metadata={'count':len(v)});return[_admin(e)for e in v]if a.role=='admin'else v
@router.get('/episodes/{episode_id}')
def get(episode_id:str,x_demo_actor_id:Optional[str]=Header(default=None)):
 a=_actor(x_demo_actor_id);e=_ep(episode_id);_access(a,e);_audit(a,'EPISODE_VIEWED',episode_id);return _admin(e)if a.role=='admin'else e
@router.post('/episodes/{episode_id}/privileged-access')
def privileged(episode_id:str,p:PrivilegedAccessInput,x_demo_actor_id:Optional[str]=Header(default=None)):
 a=_actor(x_demo_actor_id)
 if not _has(a,'clinical_record_privileged_read'):raise HTTPException(403,'privileged_record_access_required')
 e=_ep(episode_id);ref=_require_synthetic(p.reference,'reference');_audit(a,'PRIVILEGED_CLINICAL_RECORD_ACCESSED',episode_id,{'reason':p.reason,'reference':ref,'delegated':a.id!=MASTER_ADMIN_ID});return{**e,'privileged_access':{'reason':p.reason,'reference':ref,'accessed_at':_now(),'accessed_by_id':a.id,'delegated':a.id!=MASTER_ADMIN_ID},'read_only':True}
@router.post('/episodes/{episode_id}/level')
def level(episode_id:str,p:LevelChangeInput,x_demo_actor_id:Optional[str]=Header(default=None)):
 a=_actor(x_demo_actor_id)
 if a.role!='nurse':raise HTTPException(403,'nurse_only')
 e=_ep(episode_id);_access(a,e)
 if e['status']=='CERRADO':raise HTTPException(409,'closed_episode_immutable')
 old=e['level']
 if old!=p.level:e['level']=p.level;e['level_history'].append({'at':_now(),'actor_id':a.id,'from':old,'to':p.level});_audit(a,'LEVEL_CHANGED',episode_id,{'from':old,'to':p.level})
 return e
@router.post('/episodes/{episode_id}/disposition')
def disposition(episode_id:str,p:DispositionInput,x_demo_actor_id:Optional[str]=Header(default=None)):
 a=_actor(x_demo_actor_id)
 if a.role not in CLINICAL_ROLES:raise HTTPException(403,'clinical_role_required')
 e=_ep(episode_id);_access(a,e)
 if e['status']=='CERRADO':raise HTTPException(409,'closed_episode_immutable')
 d={'id':f"{episode_id}-D{len(e['disposition_events'])+1}",'kind':p.kind,'occurred_at':p.occurred_at,'recorded_at':_now(),'recorded_by_id':a.id,'recorded_by_role':a.role};e['disposition_events'].append(d);_audit(a,'PATIENT_DISPOSITION_RECORDED',episode_id,{'event_id':d['id'],'kind':d['kind']});return e
@router.post('/episodes/{episode_id}/responses')
def respond(episode_id:str,p:ResponseInput,x_demo_actor_id:Optional[str]=Header(default=None)):
 a=_actor(x_demo_actor_id)
 if a.role!='physician':raise HTTPException(403,'physician_only')
 e=_ep(episode_id);_access(a,e)
 if e['status']=='CERRADO':raise HTTPException(409,'response_not_allowed')
 n=_now();d=e['disposition_events'][-1]if e['disposition_events']else None;r={'id':f"{episode_id}-R{len(e['responses'])+1}",'text':p.text.strip(),'author_id':a.id,'created_at':n,'corrections':[],'status':'EMITIDA','status_history':[{'at':n,'from':'BORRADOR','to':'EMITIDA','evidence':None}],'late_after_disposition':d is not None,'disposition_event_id':d['id']if d else None,'late_reviewed_at':None,'late_reviewed_by_id':None};e['responses'].append(r);e['status']='RESPONDIDO';e['responded_at']=n;e['responded_by_id']=a.id;_audit(a,'CLINICAL_RESPONSE_ISSUED',episode_id,{'response_id':r['id'],'late_after_disposition':r['late_after_disposition']});return e
@router.post('/episodes/{episode_id}/responses/{response_id}/late-review')
def late_review(episode_id:str,response_id:str,x_demo_actor_id:Optional[str]=Header(default=None)):
 a=_actor(x_demo_actor_id)
 if a.role!='physician':raise HTTPException(403,'physician_only')
 e=_ep(episode_id);_access(a,e);r=next((x for x in e['responses']if x['id']==response_id),None)
 if not r:raise HTTPException(404,'response_not_found')
 if not r.get('late_after_disposition'):raise HTTPException(409,'response_not_late')
 if not r.get('late_reviewed_at'):r['late_reviewed_at']=_now();r['late_reviewed_by_id']=a.id;_audit(a,'LATE_RESPONSE_REVIEWED',episode_id,{'response_id':response_id})
 return r
@router.post('/episodes/{episode_id}/responses/{response_id}/delivery')
def delivery(episode_id:str,response_id:str,p:EvidenceInput,x_demo_actor_id:Optional[str]=Header(default=None)):
 a=_actor(x_demo_actor_id);e=_ep(episode_id);_access(a,e)
 if a.role not in CLINICAL_ROLES:raise HTTPException(403,'clinical_role_required')
 r=next((x for x in e['responses']if x['id']==response_id),None)
 if not r:raise HTTPException(404,'response_not_found')
 expected='synthetic_delivery_receipt'if r['status']=='EMITIDA'else'synthetic_read_receipt';nxt='ENTREGADA'if r['status']=='EMITIDA'else'LEIDA'
 if p.kind!=expected or r['status']not in('EMITIDA','ENTREGADA'):raise HTTPException(409,'invalid_message_transition')
 old=r['status'];r['status']=nxt;r['status_history'].append({'at':_now(),'from':old,'to':nxt,'evidence':{'kind':p.kind,'at':p.at}});_audit(a,f'MESSAGE_{nxt}',episode_id,{'response_id':response_id,'evidence_kind':p.kind});return r
@router.post('/episodes/{episode_id}/responses/{entry_id}/correct')
def correct_response(episode_id:str,entry_id:str,p:CorrectionInput,x_demo_actor_id:Optional[str]=Header(default=None)):
 a=_actor(x_demo_actor_id);e=_ep(episode_id);_access(a,e);return _correct(a,e,_entry(a,e,'responses',entry_id),p,'response')
@router.post('/episodes/{episode_id}/addenda')
def addendum(episode_id:str,p:AddendumInput,x_demo_actor_id:Optional[str]=Header(default=None)):
 a=_actor(x_demo_actor_id)
 if a.role not in CLINICAL_ROLES:raise HTTPException(403,'clinical_role_required')
 e=_ep(episode_id);_access(a,e)
 if e['status']=='CERRADO':raise HTTPException(409,'closed_episode_immutable')
 x={'id':f"{episode_id}-A{len(e['addenda'])+1}",'text':p.text.strip(),'author_id':a.id,'author_role':a.role,'created_at':_now(),'corrections':[]};e['addenda'].append(x);_audit(a,'ADDENDUM_APPENDED',episode_id,{'addendum_id':x['id']});return e
@router.post('/episodes/{episode_id}/addenda/{entry_id}/correct')
def correct_addendum(episode_id:str,entry_id:str,p:CorrectionInput,x_demo_actor_id:Optional[str]=Header(default=None)):
 a=_actor(x_demo_actor_id);e=_ep(episode_id);_access(a,e);return _correct(a,e,_entry(a,e,'addenda',entry_id),p,'addendum')
@router.post('/episodes/{episode_id}/close')
def close(episode_id:str,p:CloseInput,x_demo_actor_id:Optional[str]=Header(default=None)):
 a=_actor(x_demo_actor_id)
 if a.role not in CLINICAL_ROLES:raise HTTPException(403,'clinical_role_required')
 e=_ep(episode_id);_access(a,e)
 if e['status']!='RESPONDIDO'or not e['responses']:raise HTTPException(409,'close_not_allowed')
 if p.follow_up_pending:raise HTTPException(409,'follow_up_pending')
 if p.handoff_required and not p.handoff_acknowledged:raise HTTPException(409,'handoff_acknowledgement_missing')
 if p.acknowledgement_required and e['responses'][-1]['status']!='LEIDA':raise HTTPException(409,'acknowledgement_missing')
 if any(x.get('late_after_disposition')and not x.get('late_reviewed_at')for x in e['responses']):raise HTTPException(409,'late_response_review_pending')
 e['status']='CERRADO';e['closed_at']=_now();e['closed_by_id']=a.id;_audit(a,'EPISODE_CLOSED',episode_id,{'acknowledgement_required':p.acknowledgement_required,'handoff_required':p.handoff_required,'handoff_acknowledged':p.handoff_acknowledged});return e
@router.get('/audit')
def audit(x_demo_actor_id:Optional[str]=Header(default=None)):
 a=_actor(x_demo_actor_id)
 if not(a.role=='admin'or _has(a,'worker_access_management')):raise HTTPException(403,'administrative_audit_required')
 return AUDIT