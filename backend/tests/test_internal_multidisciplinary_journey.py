import os
import sys
from pathlib import Path
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
os.environ['ENABLE_INTERNAL_SYNTHETIC_PROTOTYPE']='true';sys.path.insert(0,str(Path(__file__).resolve().parents[1]));from routes import internal_prototype
app=FastAPI();app.include_router(internal_prototype.router,prefix='/api');client=TestClient(app)
NURSE={'x-demo-actor-id':'USR-DEMO-NURSE-01'};PHYS={'x-demo-actor-id':'USR-DEMO-PHYS-01'};PSY={'x-demo-actor-id':'USR-DEMO-PSY-01'};PHYSIO={'x-demo-actor-id':'USR-DEMO-PHYSIO-01'};ADMIN={'x-demo-actor-id':'USR-DEMO-ADMIN-01'};CENTER='Centro ficticio Madrid 01'
@pytest.fixture(autouse=True)
def reset():
 internal_prototype.EPISODES.clear();internal_prototype.AUDIT.clear();internal_prototype.DELEGATED_PRIVILEGES.clear()
 for actor in internal_prototype.ACTORS.values():actor.active=True
 yield
def create(headers,ref,summary,level=2):
 r=client.post('/api/internal-prototype/episodes',headers=headers,json={'patient_ref':ref,'center':CENTER,'level':level,'summary':summary});assert r.status_code==201,r.text;return r.json()
def test_nursing_to_remote_physician_written_channel_and_close():
 ep=create(NURSE,'PACIENTE-DEMO-E2E-N','Consulta sintética de enfermería');eid=ep['id'];response=client.post(f'/api/internal-prototype/episodes/{eid}/responses',headers=PHYS,json={'text':'Criterio facultativo sintético'});assert response.status_code==200;assert response.json()['status']=='RESPONDIDO';rid=response.json()['responses'][-1]['id'];delivered=client.post(f'/api/internal-prototype/episodes/{eid}/responses/{rid}/delivery',headers=NURSE,json={'kind':'synthetic_delivery_receipt','at':'2026-09-17T20:00:00+00:00'});assert delivered.status_code==200;assert delivered.json()['status']=='ENTREGADA';closed=client.post(f'/api/internal-prototype/episodes/{eid}/close',headers=NURSE,json={});assert closed.status_code==200 and closed.json()['status']=='CERRADO'
def test_psychology_can_open_and_write_own_episode_but_cannot_issue_medical_response():
 ep=create(PSY,'PACIENTE-DEMO-E2E-PSY','Consulta sintética de psicología');eid=ep['id'];add=client.post(f'/api/internal-prototype/episodes/{eid}/addenda',headers=PSY,json={'text':'Evolución psicológica sintética'});assert add.status_code==200;assert add.json()['addenda'][-1]['author_role']=='psychologist';assert client.post(f'/api/internal-prototype/episodes/{eid}/responses',headers=PSY,json={'text':'Intento médico sintético'}).status_code==403
def test_physiotherapy_can_open_and_write_own_episode_but_cannot_issue_medical_response():
 ep=create(PHYSIO,'PACIENTE-DEMO-E2E-FISIO','Consulta sintética de fisioterapia');eid=ep['id'];add=client.post(f'/api/internal-prototype/episodes/{eid}/addenda',headers=PHYSIO,json={'text':'Evolución fisioterapéutica sintética'});assert add.status_code==200;assert add.json()['addenda'][-1]['author_role']=='physiotherapist';assert client.post(f'/api/internal-prototype/episodes/{eid}/responses',headers=PHYSIO,json={'text':'Intento médico sintético'}).status_code==403
def test_allied_professional_same_center_can_read_but_frontend_keeps_foreign_discipline_read_only():
 ep=create(PSY,'PACIENTE-DEMO-E2E-ISO','Historia psicológica sintética');view=client.get(f"/api/internal-prototype/episodes/{ep['id']}",headers=PHYSIO);assert view.status_code==200;assert view.json()['discipline']=='psychology'
def test_admin_routine_view_never_exposes_clinical_narrative():
 ep=create(PSY,'PACIENTE-DEMO-E2E-ADMIN','Narrativa clínica sintética que no debe proyectarse');body=client.get(f"/api/internal-prototype/episodes/{ep['id']}",headers=ADMIN).json();assert 'summary' not in body and 'patient_ref' not in body and 'addenda' not in body and 'responses' not in body
def test_level_one_keeps_written_record_separate_from_direct_call_contingency():
 ep=create(NURSE,'PACIENTE-DEMO-E2E-N1','Urgencia sintética',level=1);assert ep['level']==1 and ep['status']=='ABIERTO';assert all(event.get('action')!='DIRECT_CALL_COMPLETED' for event in internal_prototype.AUDIT)
