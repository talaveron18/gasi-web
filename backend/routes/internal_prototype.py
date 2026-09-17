from __future__ import annotations
from datetime import datetime, timezone
from typing import Dict,List,Literal,Optional
import os
from fastapi import APIRouter,Header,HTTPException,status
from pydantic import BaseModel,Field
from backend.internal_audit_policy import ValidatedAuditStream
router=APIRouter(prefix="/internal-prototype",tags=["internal-prototype"])
Role=Literal["nurse","physician","psychologist","physiotherapist","admin"]
CLINICAL_ROLES=frozenset({"nurse","physician","psychologist","physiotherapist"});EPISODE_CREATORS=frozenset({"nurse","psychologist","physiotherapist"});ROLE_DISCIPLINE={"nurse":"nursing","psychologist":"psychology","physiotherapist":"physiotherapy"}
def _enabled():return os.getenv("ENABLE_INTERNAL_SYNTHETIC_PROTOTYPE","false").lower()=="true"
def _require_enabled():
 if not _enabled():raise HTTPException(status_code=404,detail="prototype_disabled")
def _now():return datetime.now(timezone.utc).isoformat()
def _require_synthetic(v,n):
 x=(v or "").strip()
 if not x or not any(t in x.upper() for t in ("DEMO","FICTICIO","SYNTH")):raise HTTPException(status_code=422,detail=f"{n}_must_be_synthetic")
 return x
class Actor(BaseModel):id:str;role:Role;display_name:str;centers:List[str]=Field(default_factory=list);active:bool=True
class CreateEpisode(BaseModel):patient_ref:str;center:str;level:Literal[1,2,3];summary:str=Field(min_length=1,max_length=4000)
class ResponseInput(BaseModel):text:str=Field(min_length=1,max_length=4000)
class LevelChangeInput(BaseModel):level:Literal[1,2,3]
class AddendumInput(BaseModel):text:str=Field(min_length=1,max_length=4000)
class CorrectionInput(BaseModel):replacement_text:str=Field(min_length=1,max_length=4000);reason:str=Field(min_length=3,max_length=500)
class DispositionInput(BaseModel):kind:Literal["SALIDA_CENTRO","TRASLADO","DECISION_POSTERIOR"];occurred_at:str
class EvidenceInput(BaseModel):kind:Literal["synthetic_delivery_receipt","synthetic_read_receipt"];at:str
class CloseInput(BaseModel):follow_up_pending:bool=False;acknowledgement_required:bool=False;handoff_required:bool=False;handoff_acknowledged:bool=False
class PrivilegedAccessInput(BaseModel):reason:Literal["authority_request","inspection","legal_process","incident_review"];reference:str=Field(min_length=3,max_length=160)
ACTORS={"USR-DEMO-NURSE-01":Actor(id="USR-DEMO-NURSE-01",role="nurse",display_name="Enfermera Demo 01",centers=["Centro ficticio Madrid 01"]),"USR-DEMO-PHYS-01":Actor(id="USR-DEMO-PHYS-01",role="physician",display_name="Dr. Demo 01",centers=["Centro ficticio Madrid 01"]),"USR-DEMO-PSY-01":Actor(id="USR-DEMO-PSY-01",role="psychologist",display_name="Psicóloga Demo 01",centers=["Centro ficticio Madrid 01"]),"USR-DEMO-PHYSIO-01":Actor(id="USR-DEMO-PHYSIO-01",role="physiotherapist",display_name="Fisioterapeuta Demo 01",centers=["Centro ficticio Madrid 01"]),"USR-DEMO-ADMIN-01":Actor(id="USR-DEMO-ADMIN-01",role="admin",display_name="Coordinación Demo 01",centers=[])}
MASTER_ADMIN_ID="USR-DEMO-ADMIN-01";EPISODES:Dict[str,dict]={};AUDIT=ValidatedAuditStream()
def _actor(i):
 _require_enabled();a=ACTORS.get(i or "")
 if not a or not a.active:raise HTTPException(status_code=401,detail="invalid_or_revoked_identity")
 return a
def _audit(a,action,eid=None,metadata=None):AUDIT.append({"at":_now(),"actor_id":a.id,"actor_role":a.role,"action":action,"episode_id":eid,"metadata":metadata or {}})
def _episode_or_404(eid):
 e=EPISODES.get(eid)
 if not e:raise HTTPException(status_code=404,detail="episode_not_found")
 return e
def _can_access(a,e):return a.id==MASTER_ADMIN_ID or (a.role in CLINICAL_ROLES and e["center"] in a.centers)
def _require_episode_access(a,e):
 if not _can_access(a,e):raise HTTPException(status_code=403,detail="episode_forbidden")
def _admin_view(e):return {k:e.get(k) for k in ("id","center","discipline","level","status","created_at","created_by_id","responded_at","responded_by_id","closed_at","closed_by_id","disposition_events")}
def _own_entry_or_403(a,e,collection,item_id):
 item=next((x for x in e[collection] if x["id"]==item_id),None)
 if not item:raise HTTPException(status_code=404,detail="entry_not_found")
 if item.get("author_id")!=a.id:raise HTTPException(status_code=403,detail="author_only_correction")
 return item
def _append_correction(a,e,item,payload,kind):
 history=item.setdefault("corrections",[]);c={"id":f"{item['id']}-C{len(history)+1}","previous_text":item["text"],"replacement_text":payload.replacement_text.strip(),"reason":payload.reason.strip(),"corrected_at":_now(),"corrected_by_id":a.id};history.append(c);item["text"]=c["replacement_text"];_audit(a,"CLINICAL_ENTRY_CORRECTED",e["id"],{"entry_id":item["id"],"entry_kind":kind,"correction_id":c["id"]});return e
@router.get("/health")
def health():_require_enabled();return{"enabled":True,"storage":"memory_only","real_data_allowed":False,"activation":"BLOQUEADA PARA ACTIVACIÓN REAL"}
@router.get("/workers")
def workers(x_demo_actor_id:Optional[str]=Header(default=None)):
 a=_actor(x_demo_actor_id)
 if a.role!="admin":raise HTTPException(status_code=403,detail="admin_only")
 _audit(a,"WORKERS_LIST_VIEWED");return[x.model_dump() for x in ACTORS.values()]
@router.post("/episodes",status_code=201)
def create_episode(p:CreateEpisode,x_demo_actor_id:Optional[str]=Header(default=None)):
 a=_actor(x_demo_actor_id)
 if a.role not in EPISODE_CREATORS:raise HTTPException(status_code=403,detail="episode_creator_role_required")
 patient=_require_synthetic(p.patient_ref,"patient_ref");center=_require_synthetic(p.center,"center")
 if center not in a.centers:raise HTTPException(status_code=403,detail="center_not_assigned")
 eid=f"DEMO-EP-{len(EPISODES)+1:04d}";now=_now();e={"id":eid,"patient_ref":patient,"center":center,"discipline":ROLE_DISCIPLINE[a.role],"level":p.level,"status":"ABIERTO","summary":p.summary.strip(),"created_at":now,"created_by_id":a.id,"created_by_role":a.role,"responses":[],"addenda":[],"level_history":[],"disposition_events":[],"closed_at":None,"closed_by_id":None};EPISODES[eid]=e;_audit(a,"EPISODE_CREATED",eid,{"level":p.level,"discipline":e["discipline"]});return e
@router.get("/episodes")
def list_episodes(x_demo_actor_id:Optional[str]=Header(default=None)):
 a=_actor(x_demo_actor_id);v=[e for e in EPISODES.values() if _can_access(a,e)];_audit(a,"EPISODES_LIST_VIEWED",metadata={"count":len(v)});return[_admin_view(e) for e in v] if a.role=="admin" else v
@router.get("/episodes/{episode_id}")
def get_episode(episode_id:str,x_demo_actor_id:Optional[str]=Header(default=None)):
 a=_actor(x_demo_actor_id);e=_episode_or_404(episode_id);_require_episode_access(a,e);_audit(a,"EPISODE_VIEWED",episode_id);return _admin_view(e) if a.role=="admin" else e
@router.post("/episodes/{episode_id}/privileged-access")
def privileged_access(episode_id:str,p:PrivilegedAccessInput,x_demo_actor_id:Optional[str]=Header(default=None)):
 a=_actor(x_demo_actor_id)
 if a.id!=MASTER_ADMIN_ID:raise HTTPException(status_code=403,detail="master_account_only")
 e=_episode_or_404(episode_id);ref=_require_synthetic(p.reference,"reference");_audit(a,"PRIVILEGED_CLINICAL_RECORD_ACCESSED",episode_id,{"reason":p.reason,"reference":ref});return{**e,"privileged_access":{"reason":p.reason,"reference":ref,"accessed_at":_now(),"accessed_by_id":a.id},"read_only":True}
@router.post("/episodes/{episode_id}/level")
def level(episode_id:str,p:LevelChangeInput,x_demo_actor_id:Optional[str]=Header(default=None)):
 a=_actor(x_demo_actor_id)
 if a.role!="nurse":raise HTTPException(status_code=403,detail="nurse_only")
 e=_episode_or_404(episode_id);_require_episode_access(a,e)
 if e["status"]=="CERRADO":raise HTTPException(status_code=409,detail="closed_episode_immutable")
 old=e["level"]
 if old!=p.level:e["level"]=p.level;e["level_history"].append({"at":_now(),"actor_id":a.id,"from":old,"to":p.level});_audit(a,"LEVEL_CHANGED",episode_id,{"from":old,"to":p.level})
 return e
@router.post("/episodes/{episode_id}/responses")
def respond(episode_id:str,p:ResponseInput,x_demo_actor_id:Optional[str]=Header(default=None)):
 a=_actor(x_demo_actor_id)
 if a.role!="physician":raise HTTPException(status_code=403,detail="physician_only")
 e=_episode_or_404(episode_id);_require_episode_access(a,e)
 if e["status"]=="CERRADO":raise HTTPException(status_code=409,detail="response_not_allowed")
 now=_now();r={"id":f"{episode_id}-R{len(e['responses'])+1}","text":p.text.strip(),"author_id":a.id,"created_at":now,"corrections":[],"status":"EMITIDA","status_history":[{"at":now,"from":"BORRADOR","to":"EMITIDA","evidence":None}],"late_after_disposition":False,"late_reviewed_at":None};e["responses"].append(r);e["status"]="RESPONDIDO";e["responded_at"]=now;e["responded_by_id"]=a.id;_audit(a,"CLINICAL_RESPONSE_ISSUED",episode_id,{"response_id":r["id"]});return e
@router.post("/episodes/{episode_id}/responses/{entry_id}/correct")
def correct_response(episode_id:str,entry_id:str,p:CorrectionInput,x_demo_actor_id:Optional[str]=Header(default=None)):
 a=_actor(x_demo_actor_id);e=_episode_or_404(episode_id);_require_episode_access(a,e);item=_own_entry_or_403(a,e,"responses",entry_id);return _append_correction(a,e,item,p,"response")
@router.post("/episodes/{episode_id}/addenda")
def addendum(episode_id:str,p:AddendumInput,x_demo_actor_id:Optional[str]=Header(default=None)):
 a=_actor(x_demo_actor_id)
 if a.role not in CLINICAL_ROLES:raise HTTPException(status_code=403,detail="clinical_role_required")
 e=_episode_or_404(episode_id);_require_episode_access(a,e);item={"id":f"{episode_id}-A{len(e['addenda'])+1}","text":p.text.strip(),"author_id":a.id,"author_role":a.role,"created_at":_now(),"corrections":[]};e["addenda"].append(item);_audit(a,"ADDENDUM_APPENDED",episode_id,{"addendum_id":item["id"]});return e
@router.post("/episodes/{episode_id}/addenda/{entry_id}/correct")
def correct_addendum(episode_id:str,entry_id:str,p:CorrectionInput,x_demo_actor_id:Optional[str]=Header(default=None)):
 a=_actor(x_demo_actor_id);e=_episode_or_404(episode_id);_require_episode_access(a,e);item=_own_entry_or_403(a,e,"addenda",entry_id);return _append_correction(a,e,item,p,"addendum")
@router.post("/episodes/{episode_id}/close")
def close(episode_id:str,p:CloseInput,x_demo_actor_id:Optional[str]=Header(default=None)):
 a=_actor(x_demo_actor_id)
 if a.role not in CLINICAL_ROLES:raise HTTPException(status_code=403,detail="clinical_role_required")
 e=_episode_or_404(episode_id);_require_episode_access(a,e)
 if e["status"]!="RESPONDIDO":raise HTTPException(status_code=409,detail="close_not_allowed")
 e["status"]="CERRADO";e["closed_at"]=_now();e["closed_by_id"]=a.id;_audit(a,"EPISODE_CLOSED",episode_id);return e
@router.get("/audit")
def audit(x_demo_actor_id:Optional[str]=Header(default=None)):
 a=_actor(x_demo_actor_id)
 if a.role!="admin":raise HTTPException(status_code=403,detail="admin_only")
 return AUDIT