import sys
from copy import deepcopy
from pathlib import Path

from fastapi import FastAPI
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from routes import internal_prototype as clinical

CENTER = "Centro GASI Madrid 01"


class MemoryStore:
    """Test double for the persistent adapter; production state remains Mongo-backed."""
    def __init__(self):
        self.episodes = {}
        self.audit = []
        self.seq = 0
        self.workers = {
            "GASI-MASTER-01": {"id":"GASI-MASTER-01","role":"admin","display_name":"Administrador maestro","centers":[],"active":True,"delegated_privileges":[]},
            "GASI-NURSE-01": {"id":"GASI-NURSE-01","role":"nurse","display_name":"Enfermería","centers":[CENTER],"active":True,"delegated_privileges":[]},
            "GASI-PHYS-01": {"id":"GASI-PHYS-01","role":"physician","display_name":"Facultativo","centers":[CENTER],"active":True,"delegated_privileges":[]},
            "GASI-PSY-01": {"id":"GASI-PSY-01","role":"psychologist","display_name":"Psicología","centers":[CENTER],"active":True,"delegated_privileges":[]},
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
app=FastAPI(); app.include_router(clinical.router,prefix="/api"); client=TestClient(app)
def h(actor): return {"X-Actor-Id":actor}

def setup_function():
    store.episodes.clear(); store.audit.clear(); store.seq=0
    for w in store.workers.values(): w["active"]=True; w["delegated_privileges"]=[]

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
