import os
import sys
from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

os.environ['ENABLE_INTERNAL_SYNTHETIC_PROTOTYPE'] = 'true'
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from routes import internal_prototype

app = FastAPI(); app.include_router(internal_prototype.router, prefix='/api'); client = TestClient(app)
MASTER={'x-demo-actor-id':'USR-DEMO-ADMIN-01'}; NURSE={'x-demo-actor-id':'USR-DEMO-NURSE-01'}; PHYS={'x-demo-actor-id':'USR-DEMO-PHYS-01'}

@pytest.fixture(autouse=True)
def reset():
    internal_prototype.EPISODES.clear(); internal_prototype.AUDIT.clear(); internal_prototype.DELEGATED_PRIVILEGES.clear()
    for a in internal_prototype.ACTORS.values(): a.active=True
    yield

def grant(worker, privilege):
    return client.post(f'/api/internal-prototype/workers/{worker}/privileges/grant', headers=MASTER, json={'privilege':privilege,'reason':'Delegación DEMO de prueba'})

def test_master_can_make_nurse_service_manager_without_changing_clinical_role():
    r=grant('USR-DEMO-NURSE-01','worker_access_management'); assert r.status_code==200
    assert internal_prototype.ACTORS['USR-DEMO-NURSE-01'].role=='nurse'
    directory=client.get('/api/internal-prototype/workers',headers=NURSE); assert directory.status_code==200

def test_delegated_manager_cannot_grant_itself_or_others_privileges():
    assert grant('USR-DEMO-NURSE-01','worker_access_management').status_code==200
    r=client.post('/api/internal-prototype/workers/USR-DEMO-NURSE-01/privileges/grant',headers=NURSE,json={'privilege':'clinical_record_privileged_read','reason':'Escalada DEMO'}); assert r.status_code==403
    r=client.post('/api/internal-prototype/workers/USR-DEMO-PHYS-01/privileges/grant',headers=NURSE,json={'privilege':'worker_access_management','reason':'Escalada DEMO'}); assert r.status_code==403

def test_record_read_privilege_does_not_allow_worker_management():
    assert grant('USR-DEMO-PHYS-01','clinical_record_privileged_read').status_code==200
    assert client.get('/api/internal-prototype/workers',headers=PHYS).status_code==403

def test_service_manager_does_not_gain_privileged_clinical_read():
    assert grant('USR-DEMO-NURSE-01','worker_access_management').status_code==200
    episode=client.post('/api/internal-prototype/episodes',headers=NURSE,json={'patient_ref':'PACIENTE-DEMO-PRIV','center':'Centro ficticio Madrid 01','level':2,'summary':'Texto sintético'}).json()
    # Manager privilege alone cannot use the exceptional privileged endpoint.
    r=client.post(f"/api/internal-prototype/episodes/{episode['id']}/privileged-access",headers=NURSE,json={'reason':'inspection','reference':'REF-DEMO-001'}); assert r.status_code==403

def test_master_can_grant_and_revoke_record_read_and_events_are_audited():
    assert grant('USR-DEMO-NURSE-01','clinical_record_privileged_read').status_code==200
    r=client.post('/api/internal-prototype/workers/USR-DEMO-NURSE-01/privileges/revoke',headers=MASTER,json={'privilege':'clinical_record_privileged_read','reason':'Fin delegación DEMO'}); assert r.status_code==200
    actions=[x['action'] for x in client.get('/api/internal-prototype/audit',headers=MASTER).json()]
    assert 'PRIVILEGE_GRANTED' in actions and 'PRIVILEGE_REVOKED' in actions
