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
MASTER={'x-demo-actor-id':'USR-DEMO-ADMIN-01'}; NURSE={'x-demo-actor-id':'USR-DEMO-NURSE-01'}; PHYS={'x-demo-actor-id':'USR-DEMO-PHYS-01'}; PSY={'x-demo-actor-id':'USR-DEMO-PSY-01'}

@pytest.fixture(autouse=True)
def reset():
    internal_prototype.EPISODES.clear(); internal_prototype.AUDIT.clear(); internal_prototype.DELEGATED_PRIVILEGES.clear()
    for a in internal_prototype.ACTORS.values(): a.active=True
    yield

def grant(worker, privilege):
    return client.post(f'/api/internal-prototype/workers/{worker}/privileges/grant', headers=MASTER, json={'privilege':privilege,'reason':'Delegación DEMO de prueba'})

def make_episode():
    r=client.post('/api/internal-prototype/episodes',headers=NURSE,json={'patient_ref':'PACIENTE-DEMO-PRIV','center':'Centro ficticio Madrid 01','level':2,'summary':'Resumen clínico sintético'})
    assert r.status_code==201
    return r.json()

def test_master_can_make_nurse_service_manager_without_changing_clinical_role():
    r=grant('USR-DEMO-NURSE-01','worker_access_management'); assert r.status_code==200
    assert internal_prototype.ACTORS['USR-DEMO-NURSE-01'].role=='nurse'
    assert client.get('/api/internal-prototype/workers',headers=NURSE).status_code==200

def test_delegated_manager_cannot_grant_itself_or_others_privileges():
    assert grant('USR-DEMO-NURSE-01','worker_access_management').status_code==200
    assert client.post('/api/internal-prototype/workers/USR-DEMO-NURSE-01/privileges/grant',headers=NURSE,json={'privilege':'clinical_record_privileged_read','reason':'Escalada DEMO'}).status_code==403
    assert client.post('/api/internal-prototype/workers/USR-DEMO-PHYS-01/privileges/grant',headers=NURSE,json={'privilege':'worker_access_management','reason':'Escalada DEMO'}).status_code==403

def test_record_read_privilege_does_not_allow_worker_management():
    assert grant('USR-DEMO-PHYS-01','clinical_record_privileged_read').status_code==200
    assert client.get('/api/internal-prototype/workers',headers=PHYS).status_code==403

def test_service_manager_does_not_gain_privileged_clinical_read():
    assert grant('USR-DEMO-NURSE-01','worker_access_management').status_code==200
    episode=make_episode()
    assert client.post(f"/api/internal-prototype/episodes/{episode['id']}/privileged-access",headers=NURSE,json={'reason':'inspection','reference':'REF-DEMO-001'}).status_code==403

def test_master_normal_get_is_metadata_only_but_exceptional_read_returns_full_record_and_audits():
    episode=make_episode(); eid=episode['id']
    ordinary=client.get(f'/api/internal-prototype/episodes/{eid}',headers=MASTER)
    assert ordinary.status_code==200
    assert 'summary' not in ordinary.json() and 'patient_ref' not in ordinary.json()
    privileged=client.post(f'/api/internal-prototype/episodes/{eid}/privileged-access',headers=MASTER,json={'reason':'authority_request','reference':'EXP-DEMO-001'})
    assert privileged.status_code==200 and privileged.json()['read_only'] is True
    assert privileged.json()['summary']=='Resumen clínico sintético'
    events=client.get('/api/internal-prototype/audit',headers=MASTER).json()
    access=[x for x in events if x['action']=='PRIVILEGED_CLINICAL_RECORD_ACCESSED']
    assert len(access)==1 and access[0]['metadata']['reference']=='EXP-DEMO-001'

def test_delegated_privileged_reader_must_use_exceptional_endpoint_not_routine_access():
    episode=make_episode(); eid=episode['id']
    # Psychology is assigned to the same centre, so create an administrative identity with no routine clinical path
    admin_id='USR-DEMO-ADMIN-02'; internal_prototype.ACTORS[admin_id]=internal_prototype.Actor(id=admin_id,role='admin',display_name='Administración Demo 02',centers=[])
    try:
        assert grant(admin_id,'clinical_record_privileged_read').status_code==200
        headers={'x-demo-actor-id':admin_id}
        ordinary=client.get(f'/api/internal-prototype/episodes/{eid}',headers=headers)
        assert ordinary.status_code==200 and 'summary' not in ordinary.json()
        privileged=client.post(f'/api/internal-prototype/episodes/{eid}/privileged-access',headers=headers,json={'reason':'inspection','reference':'INSPECCION-DEMO-02'})
        assert privileged.status_code==200 and privileged.json()['read_only'] is True
    finally:
        internal_prototype.ACTORS.pop(admin_id,None); internal_prototype.DELEGATED_PRIVILEGES.pop(admin_id,None)

def test_professional_can_correct_own_addendum_after_closure_without_destroying_previous_text():
    episode=make_episode(); eid=episode['id']
    add=client.post(f'/api/internal-prototype/episodes/{eid}/addenda',headers=NURSE,json={'text':'Primera anotación sintética'})
    assert add.status_code==200; aid=add.json()['addenda'][0]['id']
    response=client.post(f'/api/internal-prototype/episodes/{eid}/responses',headers=PHYS,json={'text':'Respuesta médica sintética'})
    assert response.status_code==200
    assert client.post(f'/api/internal-prototype/episodes/{eid}/close',headers=NURSE,json={}).status_code==200
    corrected=client.post(f'/api/internal-prototype/episodes/{eid}/addenda/{aid}/correct',headers=NURSE,json={'replacement_text':'Anotación sintética corregida','reason':'Corrección DEMO de redacción'})
    assert corrected.status_code==200
    entry=corrected.json()['addenda'][0]
    assert entry['text']=='Anotación sintética corregida'
    assert entry['corrections'][0]['previous_text']=='Primera anotación sintética'
    assert entry['corrections'][0]['replacement_text']=='Anotación sintética corregida'

def test_professional_cannot_correct_another_professionals_entry():
    episode=make_episode(); eid=episode['id']
    response=client.post(f'/api/internal-prototype/episodes/{eid}/responses',headers=PHYS,json={'text':'Respuesta médica sintética'}).json()
    rid=response['responses'][0]['id']
    denied=client.post(f'/api/internal-prototype/episodes/{eid}/responses/{rid}/correct',headers=NURSE,json={'replacement_text':'Intento sintético','reason':'No soy autor DEMO'})
    assert denied.status_code==403

def test_master_can_grant_and_revoke_record_read_and_events_are_audited():
    assert grant('USR-DEMO-NURSE-01','clinical_record_privileged_read').status_code==200
    r=client.post('/api/internal-prototype/workers/USR-DEMO-NURSE-01/privileges/revoke',headers=MASTER,json={'privilege':'clinical_record_privileged_read','reason':'Fin delegación DEMO'}); assert r.status_code==200
    actions=[x['action'] for x in client.get('/api/internal-prototype/audit',headers=MASTER).json()]
    assert 'PRIVILEGE_GRANTED' in actions and 'PRIVILEGE_REVOKED' in actions
