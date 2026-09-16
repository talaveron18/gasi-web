import os
import sys
from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

os.environ["ENABLE_INTERNAL_SYNTHETIC_PROTOTYPE"] = "true"
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from routes import internal_prototype  # noqa: E402

app = FastAPI()
app.include_router(internal_prototype.router, prefix="/api")
client = TestClient(app)

PSY = {"x-demo-actor-id": "USR-DEMO-PSY-01"}
PHYSIO = {"x-demo-actor-id": "USR-DEMO-PHYSIO-01"}
PHYSICIAN = {"x-demo-actor-id": "USR-DEMO-PHYS-01"}
ADMIN = {"x-demo-actor-id": "USR-DEMO-ADMIN-01"}


@pytest.fixture(autouse=True)
def reset_store():
    internal_prototype.EPISODES.clear()
    internal_prototype.AUDIT.clear()
    yield


def _create(headers, summary="Consulta sintética de prueba"):
    return client.post(
        "/api/internal-prototype/episodes",
        headers=headers,
        json={"patient_ref": "PACIENTE-DEMO-ALIADO", "center": "Centro ficticio Madrid 01", "level": 2, "summary": summary},
    )


def test_psychologist_opens_psychology_episode_and_appends_evolution():
    created = _create(PSY)
    assert created.status_code == 201
    episode = created.json()
    assert episode["discipline"] == "psychology"
    addendum = client.post(f"/api/internal-prototype/episodes/{episode['id']}/addenda", headers=PSY, json={"text": "Evolución psicológica sintética."})
    assert addendum.status_code == 200
    assert addendum.json()["addenda"][-1]["author_role"] == "psychologist"


def test_physiotherapist_opens_physiotherapy_episode():
    created = _create(PHYSIO)
    assert created.status_code == 201
    assert created.json()["discipline"] == "physiotherapy"


def test_allied_roles_cannot_issue_physician_response():
    episode_id = _create(PSY).json()["id"]
    for headers in (PSY, PHYSIO):
        response = client.post(f"/api/internal-prototype/episodes/{episode_id}/responses", headers=headers, json={"text": "Intento sintético."})
        assert response.status_code == 403
        assert response.json()["detail"] == "physician_only"


def test_unassigned_center_is_denied_for_allied_role():
    response = client.post(
        "/api/internal-prototype/episodes",
        headers=PSY,
        json={"patient_ref": "PACIENTE-DEMO-OTRO", "center": "Centro ficticio Barcelona 02", "level": 2, "summary": "Prueba sintética."},
    )
    assert response.status_code == 403
    assert response.json()["detail"] == "center_not_assigned"


def test_admin_projection_never_contains_clinical_narrative():
    episode_id = _create(PHYSIO).json()["id"]
    response = client.get(f"/api/internal-prototype/episodes/{episode_id}", headers=ADMIN)
    assert response.status_code == 200
    payload = response.json()
    assert payload["discipline"] == "physiotherapy"
    assert "summary" not in payload
    assert "responses" not in payload
    assert "addenda" not in payload


def test_physician_response_remains_physician_only_for_allied_episode():
    episode_id = _create(PSY).json()["id"]
    response = client.post(f"/api/internal-prototype/episodes/{episode_id}/responses", headers=PHYSICIAN, json={"text": "Criterio facultativo sintético."})
    assert response.status_code == 200
    assert response.json()["responded_by_id"] == "USR-DEMO-PHYS-01"
