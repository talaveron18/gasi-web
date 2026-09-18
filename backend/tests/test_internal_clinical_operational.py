import sys
from copy import deepcopy
from pathlib import Path

from fastapi import FastAPI
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from routes import internal_prototype as clinical
from internal_session_security import issue_session, sign_session_token
from datetime import datetime, timedelta, timezone

CENTER = "Centro GASI Madrid 01"
CENTER_B = "Centro GASI Barcelona 01"
SECRET = "synthetic-test-secret-32-bytes-minimum-2026"


class MemoryStore:
    """Test double for the persistent adapter; production state remains Mongo-backed."""
    def __init__(self):
        self.episodes = {}
        self.audit = []
        self.seq = 0
        self.workers = {
            "GASI-MASTER-01": {"id":"GASI-MASTER-01","role":"admin","display_name":"Administrador maestro","centers":[],"active":True,"delegated_privileges":[],"auth_version":1},
            "GASI-NURSE-01": {"id":"GASI-NURSE-01","role":"nurse","display_name":"Enfermería","centers":[CENTER],"active":True,"delegated_privileges":[],"auth_version":1},
            "GASI-PHYS-01": {"id":"GASI-PHYS-01","role":"physician","display_name":"Facultativo","centers":[CENTER],"active":True,"delegated_privileges":[],"auth_version":1},
            "GASI-PSY-01": {"id":"GASI-PSY-01","role":"psychologist","display_name":"Psicología","centers":[CENTER],"active":True,"delegated_privileges":[],"auth_version":1},
            "GASI-NURSE-B": {"id":"GASI-NURSE-B","role":"nurse","display_name":"Enfermería B","centers":[CENTER_B],"active":True,"delegated_privileges":[],"auth_version":1},
        }
    async def get_worker(self, i): return deepcopy(self.workers.get(i))
    async def list_workers(self): return [deepcopy(x) for x in self.workers.values()]
    async def set_privilege(self, i, p, grant):
        w=self.workers[i]; s=set(w.get("delegated_privileges",[])); s.add(p) if grant else s.discard(p); w["delegated_privileges"]=sorted(s); return deepcopy(w)
    async def next_episode_id(self): self.seq+=1; return f"GASI-EP-{self.seq:06d}"
    async def insert_episode(self, e): self.episodes[e["id"]]=deepcopy(e); return deepcopy(e)
    async def get_episode(self, i): return deepcopy(self.episodes.get(i))
    async def list_episodes(self, query=None):
        rows=list(self.episodes.values())
        if query and "center" in query: rows=[e for e in rows if e["center"] in query["center"]["$in"]]
        return deepcopy(rows)
    async def replace_episode(self, e): self.episodes[e["id"]]=deepcopy(e); return deepcopy(e)
    async def append_audit(self, e): self.audit.append(deepcopy(e))
    async def list_audit(self, limit=1000): return deepcopy(self.audit[-limit:])

store=MemoryStore()
clinical._store=lambda: store
import os
os.environ['GASI_INTERNAL_SESSION_SECRET']=SECRET
app=FastAPI(); app.include_router(clinical.router,prefix="/api"); client=TestClient(app)
def h(actor):
    w=store.workers[actor]
    s=issue_session(worker_id=actor,auth_version=w.get("auth_version",1),ttl_minutes=30)
    return {"Authorization":f"Bearer {sign_session_token(s,secret=SECRET)}"}

def setup_function():
    store.episodes.clear(); store.audit.clear(); store.seq=0
    for w in store.workers.values(): w["active"]=True; w["delegated_privileges"]=[]; w["auth_version"]=1

def create(actor="GASI-NURSE-01"):
    return client.post("/api/internal-clinical/episodes",headers=h(actor),json={"patient_ref":"PAC-001","center":CENTER,"level":2,"summary":"Valoración clínica"})

def test_nursing_episode_physician_response_delivery_read_and_close():
    e=create().json(); eid=e["id"]
    r=client.post(f"/api/internal-clinical/episodes/{eid}/responses",headers=h("GASI-PHYS-01"),json={"text":"Criterio facultativo"})
    assert r.status_code==200
    rid=r.json()["responses"][-1]["id"]
    assert client.post(f"/api/internal-clinical/episodes/{eid}/responses/{rid}/delivery",headers=h("GASI-NURSE-01"),json={"kind":"delivery_receipt","at":"2026-09-17T20:00:00Z"}).status_code==200
    assert client.post(f"/api/internal-clinical/episodes/{eid}/responses/{rid}/delivery",headers=h("GASI-NURSE-01"),json={"kind":"read_receipt","at":"2026-09-17T20:01:00Z"}).status_code==200
    closed=client.post(f"/api/internal-clinical/episodes/{eid}/close",headers=h("GASI-NURSE-01"),json={"acknowledgement_required":True})
    assert closed.status_code==200 and closed.json()["status"]=="CERRADO"

def test_admin_routine_view_is_metadata_only_and_privileged_read_is_audited():
    eid=create().json()["id"]
    normal=client.get(f"/api/internal-clinical/episodes/{eid}",headers=h("GASI-MASTER-01"))
    assert normal.status_code==200 and "summary" not in normal.json()
    privileged=client.post(f"/api/internal-clinical/episodes/{eid}/privileged-access",headers=h("GASI-MASTER-01"),json={"reason":"incident_review","reference":"INC-2026-001"})
    assert privileged.status_code==200 and privileged.json()["read_only"] is True
    assert any(x["action"]=="PRIVILEGED_CLINICAL_RECORD_ACCESSED" for x in store.audit)

def test_allied_professional_cannot_write_nursing_episode():
    eid=create().json()["id"]
    response=client.post(f"/api/internal-clinical/episodes/{eid}/addenda",headers=h("GASI-PSY-01"),json={"text":"Entrada ajena"})
    assert response.status_code==403 and response.json()["detail"]=="discipline_write_forbidden"

def test_master_delegation_does_not_change_base_role():
    grant=client.post("/api/internal-clinical/workers/GASI-NURSE-01/privileges/grant",headers=h("GASI-MASTER-01"),json={"privilege":"worker_access_management","reason":"Responsable de servicio"})
    assert grant.status_code==200
    assert grant.json()["base_role"]=="nurse"
    assert grant.json()["privileges"]==["worker_access_management"]


def test_missing_authentication_is_rejected():
    r=client.get("/api/internal-clinical/episodes")
    assert r.status_code==401 and r.json()["detail"]=="authentication_required"


def test_cross_center_direct_id_read_and_write_are_denied():
    eid=create().json()["id"]
    assert client.get(f"/api/internal-clinical/episodes/{eid}",headers=h("GASI-NURSE-B")).status_code==403
    r=client.post(f"/api/internal-clinical/episodes/{eid}/addenda",headers=h("GASI-NURSE-B"),json={"text":"Intento centro ajeno"})
    assert r.status_code==403


def test_deactivated_worker_session_is_rejected():
    headers=h("GASI-NURSE-01"); store.workers["GASI-NURSE-01"]["active"]=False
    r=client.get("/api/internal-clinical/episodes",headers=headers)
    assert r.status_code==401 and r.json()["detail"]=="invalid_or_revoked_identity"


def test_auth_version_rotation_revokes_existing_session():
    headers=h("GASI-NURSE-01"); store.workers["GASI-NURSE-01"]["auth_version"]+=1
    r=client.get("/api/internal-clinical/episodes",headers=headers)
    assert r.status_code==401 and r.json()["detail"]=="session_expired_or_revoked"


def test_admin_cannot_write_clinical_content():
    eid=create().json()["id"]
    r=client.post(f"/api/internal-clinical/episodes/{eid}/addenda",headers=h("GASI-MASTER-01"),json={"text":"Administrative write attempt"})
    assert r.status_code==403 and r.json()["detail"]=="discipline_write_forbidden"


def test_delegated_privileged_read_cannot_cross_centers_and_can_be_revoked():
    eid=create().json()["id"]
    store.workers["GASI-NURSE-B"]["delegated_privileges"]=["clinical_record_privileged_read"]
    denied=client.post(f"/api/internal-clinical/episodes/{eid}/privileged-access",headers=h("GASI-NURSE-B"),json={"reason":"incident_review","reference":"INC-B-001"})
    assert denied.status_code==403 and denied.json()["detail"]=="episode_forbidden"
    store.workers["GASI-NURSE-01"]["delegated_privileges"]=["clinical_record_privileged_read"]
    allowed=client.post(f"/api/internal-clinical/episodes/{eid}/privileged-access",headers=h("GASI-NURSE-01"),json={"reason":"incident_review","reference":"INC-A-001"})
    assert allowed.status_code==200 and allowed.json()["read_only"] is True
    store.workers["GASI-NURSE-01"]["delegated_privileges"]=[]
    revoked=client.post(f"/api/internal-clinical/episodes/{eid}/privileged-access",headers=h("GASI-NURSE-01"),json={"reason":"incident_review","reference":"INC-A-002"})
    assert revoked.status_code==403 and revoked.json()["detail"]=="privileged_record_access_required"


def test_addendum_correction_preserves_original_and_audit():
    eid=create().json()["id"]
    first=client.post(f"/api/internal-clinical/episodes/{eid}/addenda",headers=h("GASI-NURSE-01"),json={"text":"Original note"})
    aid=first.json()["addenda"][-1]["id"]
    corrected=client.post(f"/api/internal-clinical/episodes/{eid}/addenda/{aid}/correct",headers=h("GASI-NURSE-01"),json={"replacement_text":"Corrected note","reason":"Documentation correction"})
    assert corrected.status_code==200
    entry=corrected.json()["addenda"][-1]
    assert entry["text"]=="Corrected note"
    assert entry["corrections"][-1]["previous_text"]=="Original note"
    assert entry["corrections"][-1]["replacement_text"]=="Corrected note"
    assert any(x["action"]=="CLINICAL_ENTRY_CORRECTED" and x["episode_id"]==eid for x in store.audit)


def test_professional_with_admin_privilege_keeps_clinical_scope_separate():
    store.workers["GASI-NURSE-01"]["delegated_privileges"]=["worker_access_management"]
    own=create().json()["id"]
    own_read=client.get(f"/api/internal-clinical/episodes/{own}",headers=h("GASI-NURSE-01"))
    assert own_read.status_code==200
    foreign=client.post("/api/internal-clinical/episodes",headers=h("GASI-NURSE-B"),json={"patient_ref":"PAC-B","center":CENTER_B,"level":2,"summary":"Foreign center"}).json()["id"]
    foreign_read=client.get(f"/api/internal-clinical/episodes/{foreign}",headers=h("GASI-NURSE-01"))
    assert foreign_read.status_code==403 and foreign_read.json()["detail"]=="episode_forbidden"
    workers=client.get("/api/internal-clinical/workers",headers=h("GASI-NURSE-01"))
    assert workers.status_code==200
    privileged=client.post(f"/api/internal-clinical/episodes/{own}/privileged-access",headers=h("GASI-NURSE-01"),json={"reason":"incident_review","reference":"INC-COMBINED-01"})
    assert privileged.status_code==403 and privileged.json()["detail"]=="privileged_record_access_required"


def test_expired_signed_session_is_rejected():
    w=store.workers["GASI-NURSE-01"]
    expired=issue_session(worker_id=w["id"],auth_version=w["auth_version"],ttl_minutes=1,now=datetime.now(timezone.utc)-timedelta(minutes=2))
    token=sign_session_token(expired,secret=SECRET)
    r=client.get("/api/internal-clinical/episodes",headers={"Authorization":f"Bearer {token}"})
    assert r.status_code==401 and r.json()["detail"]=="session_expired_or_revoked"


def test_foreign_episode_id_cannot_be_used_for_level_response_or_close():
    eid=create().json()["id"]
    headers=h("GASI-NURSE-B")
    level=client.post(f"/api/internal-clinical/episodes/{eid}/level",headers=headers,json={"level":1})
    addendum=client.post(f"/api/internal-clinical/episodes/{eid}/addenda",headers=headers,json={"text":"foreign write"})
    close=client.post(f"/api/internal-clinical/episodes/{eid}/close",headers=headers,json={})
    assert level.status_code==403
    assert addendum.status_code==403
    assert close.status_code==403


def test_master_privileged_access_records_actor_reason_reference_and_episode():
    eid=create().json()["id"]
    r=client.post(f"/api/internal-clinical/episodes/{eid}/privileged-access",headers=h("GASI-MASTER-01"),json={"reason":"incident_review","reference":"INC-E2E-001"})
    assert r.status_code==200 and r.json()["read_only"] is True
    event=next(x for x in reversed(store.audit) if x["action"]=="PRIVILEGED_CLINICAL_RECORD_ACCESSED")
    assert event["actor_id"]=="GASI-MASTER-01"
    assert event["episode_id"]==eid
    assert event["reason"]=="incident_review"
    assert event["reference"]=="INC-E2E-001"
