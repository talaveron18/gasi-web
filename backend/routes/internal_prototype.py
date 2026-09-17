from __future__ import annotations

from datetime import datetime, timezone
from typing import Dict, List, Literal, Optional
import os

from fastapi import APIRouter, Header, HTTPException, status
from pydantic import BaseModel, Field

from backend.internal_audit_policy import ValidatedAuditStream

router = APIRouter(prefix="/internal-prototype", tags=["internal-prototype"])
Role = Literal["nurse", "physician", "psychologist", "physiotherapist", "admin"]
EpisodeStatus = Literal["ABIERTO", "RESPONDIDO", "CERRADO"]
DispositionKind = Literal["SALIDA_CENTRO", "TRASLADO", "DECISION_POSTERIOR"]
CLINICAL_ROLES=frozenset({"nurse","physician","psychologist","physiotherapist"}); EPISODE_CREATORS=frozenset({"nurse","psychologist","physiotherapist"}); ROLE_DISCIPLINE={"nurse":"nursing","psychologist":"psychology","physiotherapist":"physiotherapy"}
def _enabled(): return os.getenv("ENABLE_INTERNAL_SYNTHETIC_PROTOTYPE","false").lower()=="true"
def _require_enabled():
    if not _enabled(): raise HTTPException(status_code=404,detail="prototype_disabled")
def _now(): return datetime.now(timezone.utc).isoformat()
def _require_synthetic(value,field_name):
    normalized=(value or "").strip()
    if not normalized or not any(t in normalized.upper() for t in ("DEMO","FICTICIO","SYNTH")): raise HTTPException(status_code=422,detail=f"{field_name}_must_be_synthetic")
    return normalized
class Actor(BaseModel): id:str; role:Role; display_name:str; centers:List[str]=Field(default_factory=list); active:bool=True
class CreateEpisode(BaseModel): patient_ref:str; center:str; level:Literal[1,2,3]; summary:str=Field(min_length=1,max_length=4000)
class ResponseInput(BaseModel): text:str=Field(min_length=1,max_length=4000)
class LevelChangeInput(BaseModel): level:Literal[1,2,3]
class AddendumInput(BaseModel): text:str=Field(min_length=1,max_length=4000)
class DispositionInput(BaseModel): kind:DispositionKind; occurred_at:str
class EvidenceInput(BaseModel): kind:Literal["synthetic_delivery_receipt","synthetic_read_receipt"]; at:str
class CloseInput(BaseModel): follow_up_pending:bool=False; acknowledgement_required:bool=False; handoff_required:bool=False; handoff_acknowledged:bool=False
class PrivilegedAccessInput(BaseModel): reason:Literal["authority_request","inspection","legal_process","incident_review"]; reference:str=Field(min_length=3,max_length=160)
ACTORS={
"USR-DEMO-NURSE-01":Actor(id="USR-DEMO-NURSE-01",role="nurse",display_name="Enfermera Demo 01",centers=["Centro ficticio Madrid 01"]),
"USR-DEMO-PHYS-01":Actor(id="USR-DEMO-PHYS-01",role="physician",display_name="Dr. Demo 01",centers=["Centro ficticio Madrid 01"]),
"USR-DEMO-PSY-01":Actor(id="USR-DEMO-PSY-01",role="psychologist",display_name="Psicóloga Demo 01",centers=["Centro ficticio Madrid 01"]),
"USR-DEMO-PHYSIO-01":Actor(id="USR-DEMO-PHYSIO-01",role="physiotherapist",display_name="Fisioterapeuta Demo 01",centers=["Centro ficticio Madrid 01"]),
"USR-DEMO-ADMIN-01":Actor(id="USR-DEMO-ADMIN-01",role="admin",display_name="Coordinación Demo 01",centers=[])}
EPISODES:Dict[str,dict]={}; AUDIT=ValidatedAuditStream()
def _actor(actor_id):
    _require_enabled(); actor=ACTORS.get(actor_id or "")
    if not actor or not actor.active: raise HTTPException(status_code=401,detail="invalid_or_revoked_identity")
    return actor
def _audit(actor,action,episode_id=None,metadata=None): AUDIT.append({"at":_now(),"actor_id":actor.id,"actor_role":actor.role,"action":action,"episode_id":episode_id,"metadata":metadata or {}})
def _episode_or_404(eid):
    ep=EPISODES.get(eid)
    if not ep: raise HTTPException(status_code=404,detail="episode_not_found")
    return ep
def _can_access(actor,ep): return actor.role=="admin" or (actor.role in CLINICAL_ROLES and ep["center"] in actor.centers)
def _require_episode_access(actor,ep):
    if not _can_access(actor,ep): raise HTTPException(status_code=403,detail="episode_forbidden")
def _admin_view(ep): return {k:ep.get(k) for k in ("id","center","discipline","level","status","created_at","created_by_id","responded_at","responded_by_id","closed_at","closed_by_id","disposition_events")}
@router.get("/health")
def health(): _require_enabled(); return {"enabled":True,"storage":"memory_only","real_data_allowed":False,"activation":"BLOQUEADA PARA ACTIVACIÓN REAL"}
@router.get("/workers")
def workers(x_demo_actor_id:Optional[str]=Header(default=None)):
    a=_actor(x_demo_actor_id)
    if a.role!="admin": raise HTTPException(status_code=403,detail="admin_only")
    _audit(a,"WORKERS_LIST_VIEWED"); return [x.model_dump() for x in ACTORS.values()]
@router.post("/episodes",status_code=201)
def create_episode(payload:CreateEpisode,x_demo_actor_id:Optional[str]=Header(default=None)):
    a=_actor(x_demo_actor_id)
    if a.role not in EPISODE_CREATORS: raise HTTPException(status_code=403,detail="episode_creator_role_required")
    patient=_require_synthetic(payload.patient_ref,"patient_ref"); center=_require_synthetic(payload.center,"center")
    if center not in a.centers: raise HTTPException(status_code=403,detail="center_not_assigned")
    eid=f"DEMO-EP-{len(EPISODES)+1:04d}"; now=_now(); ep={"id":eid,"patient_ref":patient,"center":center,"discipline":ROLE_DISCIPLINE[a.role],"level":payload.level,"status":"ABIERTO","summary":payload.summary.strip(),"created_at":now,"created_by_id":a.id,"created_by_role":a.role,"responses":[],"addenda":[],"level_history":[],"disposition_events":[],"closed_at":None,"closed_by_id":None}; EPISODES[eid]=ep; _audit(a,"EPISODE_CREATED",eid,{"level":payload.level,"discipline":ep["discipline"]}); return ep
@router.get("/episodes")
def list_episodes(x_demo_actor_id:Optional[str]=Header(default=None)):
    a=_actor(x_demo_actor_id); visible=[e for e in EPISODES.values() if _can_access(a,e)]; _audit(a,"EPISODES_LIST_VIEWED",metadata={"count":len(visible)}); return [_admin_view(e) for e in visible] if a.role=="admin" else visible
@router.get("/episodes/{episode_id}")
def get_episode(episode_id:str,x_demo_actor_id:Optional[str]=Header(default=None)):
    a=_actor(x_demo_actor_id); ep=_episode_or_404(episode_id); _require_episode_access(a,ep); _audit(a,"EPISODE_VIEWED",episode_id); return _admin_view(ep) if a.role=="admin" else ep
@router.post("/episodes/{episode_id}/privileged-access")
def privileged_access(episode_id:str,payload:PrivilegedAccessInput,x_demo_actor_id:Optional[str]=Header(default=None)):
    a=_actor(x_demo_actor_id)
    if a.role!="admin": raise HTTPException(status_code=403,detail="admin_only")
    ep=_episode_or_404(episode_id); ref=_require_synthetic(payload.reference,"reference")
    _audit(a,"PRIVILEGED_CLINICAL_RECORD_ACCESSED",episode_id,{"reason":payload.reason,"reference":ref})
    return {**ep,"privileged_access":{"reason":payload.reason,"reference":ref,"accessed_at":_now(),"accessed_by_id":a.id},"read_only":True}
@router.post("/episodes/{episode_id}/level")
def level(episode_id:str,payload:LevelChangeInput,x_demo_actor_id:Optional[str]=Header(default=None)):
    a=_actor(x_demo_actor_id)
    if a.role!="nurse": raise HTTPException(status_code=403,detail="nurse_only")
    ep=_episode_or_404(episode_id); _require_episode_access(a,ep)
    if ep["status"]=="CERRADO": raise HTTPException(status_code=409,detail="closed_episode_immutable")
    old=ep["level"]
    if old==payload.level:return ep
    ep["level"]=payload.level; ep["level_history"].append({"at":_now(),"actor_id":a.id,"from":old,"to":payload.level}); _audit(a,"LEVEL_CHANGED",episode_id,{"from":old,"to":payload.level}); return ep
@router.post("/episodes/{episode_id}/disposition")
def disposition(episode_id:str,payload:DispositionInput,x_demo_actor_id:Optional[str]=Header(default=None)):
    a=_actor(x_demo_actor_id)
    if a.role not in CLINICAL_ROLES: raise HTTPException(status_code=403,detail="clinical_role_required")
    ep=_episode_or_404(episode_id); _require_episode_access(a,ep)
    if ep["status"]=="CERRADO": raise HTTPException(status_code=409,detail="closed_episode_immutable")
    ev={"id":f"{episode_id}-D{len(ep['disposition_events'])+1}","kind":payload.kind,"occurred_at":payload.occurred_at,"recorded_at":_now(),"recorded_by_id":a.id,"recorded_by_role":a.role};ep["disposition_events"].append(ev);_audit(a,"PATIENT_DISPOSITION_RECORDED",episode_id,{"event_id":ev["id"],"kind":ev["kind"]});return ep
@router.post("/episodes/{episode_id}/responses")
def respond(episode_id:str,payload:ResponseInput,x_demo_actor_id:Optional[str]=Header(default=None)):
    a=_actor(x_demo_actor_id)
    if a.role!="physician":raise HTTPException(status_code=403,detail="physician_only")
    ep=_episode_or_404(episode_id);_require_episode_access(a,ep)
    if ep["status"]=="CERRADO":raise HTTPException(status_code=409,detail="response_not_allowed")
    now=_now(); latest=ep["disposition_events"][-1] if ep["disposition_events"] else None;r={"id":f"{episode_id}-R{len(ep['responses'])+1}","text":payload.text.strip(),"author_id":a.id,"created_at":now,"status":"EMITIDA","status_history":[{"at":now,"from":"BORRADOR","to":"EMITIDA","evidence":None}],"late_after_disposition":latest is not None,"disposition_event_id":latest["id"] if latest else None,"late_reviewed_at":None,"late_reviewed_by_id":None};ep["responses"].append(r);ep["status"]="RESPONDIDO";ep["responded_at"]=now;ep["responded_by_id"]=a.id;_audit(a,"CLINICAL_RESPONSE_ISSUED",episode_id,{"response_id":r["id"],"late_after_disposition":r["late_after_disposition"]});return ep
@router.post("/episodes/{episode_id}/responses/{response_id}/late-review")
def late_review(episode_id:str,response_id:str,x_demo_actor_id:Optional[str]=Header(default=None)):
    a=_actor(x_demo_actor_id)
    if a.role!="physician":raise HTTPException(status_code=403,detail="physician_only")
    ep=_episode_or_404(episode_id);_require_episode_access(a,ep);r=next((x for x in ep["responses"] if x["id"]==response_id),None)
    if not r:raise HTTPException(status_code=404,detail="response_not_found")
    if not r.get("late_after_disposition"):raise HTTPException(status_code=409,detail="response_not_late")
    if not r.get("late_reviewed_at"):r["late_reviewed_at"]=_now();r["late_reviewed_by_id"]=a.id;_audit(a,"LATE_RESPONSE_REVIEWED",episode_id,{"response_id":response_id})
    return r
@router.post("/episodes/{episode_id}/addenda")
def addendum(episode_id:str,payload:AddendumInput,x_demo_actor_id:Optional[str]=Header(default=None)):
    a=_actor(x_demo_actor_id)
    if a.role not in CLINICAL_ROLES:raise HTTPException(status_code=403,detail="clinical_role_required")
    ep=_episode_or_404(episode_id);_require_episode_access(a,ep)
    if ep["status"]=="CERRADO":raise HTTPException(status_code=409,detail="closed_episode_immutable")
    item={"id":f"{episode_id}-A{len(ep['addenda'])+1}","text":payload.text.strip(),"author_id":a.id,"author_role":a.role,"created_at":_now()};ep["addenda"].append(item);_audit(a,"ADDENDUM_APPENDED",episode_id,{"addendum_id":item["id"]});return ep
@router.post("/episodes/{episode_id}/responses/{response_id}/delivery")
def delivery(episode_id:str,response_id:str,evidence:EvidenceInput,x_demo_actor_id:Optional[str]=Header(default=None)):
    a=_actor(x_demo_actor_id);ep=_episode_or_404(episode_id);_require_episode_access(a,ep)
    if a.role not in CLINICAL_ROLES:raise HTTPException(status_code=403,detail="clinical_role_required")
    r=next((x for x in ep["responses"] if x["id"]==response_id),None)
    if not r:raise HTTPException(status_code=404,detail="response_not_found")
    expected="synthetic_delivery_receipt" if r["status"]=="EMITIDA" else "synthetic_read_receipt"; nxt="ENTREGADA" if r["status"]=="EMITIDA" else "LEIDA"
    if evidence.kind!=expected or r["status"] not in ("EMITIDA","ENTREGADA"):raise HTTPException(status_code=409,detail="invalid_message_transition")
    old=r["status"];r["status"]=nxt;r["status_history"].append({"at":_now(),"from":old,"to":nxt,"evidence":{"kind":evidence.kind,"at":evidence.at}});_audit(a,f"MESSAGE_{nxt}",episode_id,{"response_id":response_id,"evidence_kind":evidence.kind});return r
@router.post("/episodes/{episode_id}/close")
def close(episode_id:str,payload:CloseInput,x_demo_actor_id:Optional[str]=Header(default=None)):
    a=_actor(x_demo_actor_id)
    if a.role not in CLINICAL_ROLES:raise HTTPException(status_code=403,detail="clinical_role_required")
    ep=_episode_or_404(episode_id);_require_episode_access(a,ep)
    if ep["status"]!="RESPONDIDO" or not ep["responses"]:raise HTTPException(status_code=409,detail="close_not_allowed")
    if payload.follow_up_pending:raise HTTPException(status_code=409,detail="follow_up_pending")
    if payload.handoff_required and not payload.handoff_acknowledged:raise HTTPException(status_code=409,detail="handoff_acknowledgement_missing")
    if payload.acknowledgement_required and ep["responses"][-1]["status"]!="LEIDA":raise HTTPException(status_code=409,detail="acknowledgement_missing")
    if any(x.get("late_after_disposition") and not x.get("late_reviewed_at") for x in ep["responses"]):raise HTTPException(status_code=409,detail="late_response_review_pending")
    ep["status"]="CERRADO";ep["closed_at"]=_now();ep["closed_by_id"]=a.id;_audit(a,"EPISODE_CLOSED",episode_id,{"acknowledgement_required":payload.acknowledgement_required,"handoff_required":payload.handoff_required,"handoff_acknowledged":payload.handoff_acknowledged});return ep
@router.get("/audit")
def audit(x_demo_actor_id:Optional[str]=Header(default=None)):
    a=_actor(x_demo_actor_id)
    if a.role!="admin":raise HTTPException(status_code=403,detail="admin_only")
    return AUDIT
