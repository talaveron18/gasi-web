import os

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

os.environ["ENABLE_INTERNAL_SYNTHETIC_PROTOTYPE"] = "true"

from routes import internal_prototype  # noqa: E402


app = FastAPI()
app.include_router(internal_prototype.router, prefix="/api")
client = TestClient(app)

NURSE = {"x-demo-actor-id": "USR-DEMO-NURSE-01"}
PHYSICIAN = {"x-demo-actor-id": "USR-DEMO-PHYS-01"}
ADMIN = {"x-demo-actor-id": "USR-DEMO-ADMIN-01"}


@pytest.fixture(autouse=True)
def reset_store():
    internal_prototype.EPISODES.clear()
    internal_prototype.AUDIT.clear()
    for actor in internal_prototype.ACTORS.values():
        actor.active = True
    yield


def create_episode():
    response = client.post(
        "/api/internal-prototype/episodes",
        headers=NURSE,
        json={
            "patient_ref": "PACIENTE-DEMO-TEST",
            "center": "Centro ficticio Madrid 01",
            "level": 2,
            "summary": "Situación sintética para prueba automatizada.",
        },
    )
    assert response.status_code == 201
    return response.json()


def test_rejects_non_synthetic_patient_reference():
    response = client.post(
        "/api/internal-prototype/episodes",
        headers=NURSE,
        json={
            "patient_ref": "PACIENTE-12345",
            "center": "Centro ficticio Madrid 01",
            "level": 2,
            "summary": "Texto de prueba.",
        },
    )
    assert response.status_code == 422
    assert response.json()["detail"] == "patient_ref_must_be_synthetic"


def test_nurse_creates_physician_responds_and_admin_cannot_read_narrative():
    episode = create_episode()
    episode_id = episode["id"]

    response = client.post(
        f"/api/internal-prototype/episodes/{episode_id}/responses",
        headers=PHYSICIAN,
        json={"text": "Respuesta sintética del facultativo."},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "RESPONDIDO"
    assert payload["responses"][-1]["status"] == "EMITIDA"

    admin_view = client.get(f"/api/internal-prototype/episodes/{episode_id}", headers=ADMIN)
    assert admin_view.status_code == 200
    admin_payload = admin_view.json()
    assert "summary" not in admin_payload
    assert "responses" not in admin_payload
    assert "addenda" not in admin_payload
    assert admin_payload["status"] == "RESPONDIDO"


def test_nurse_level_change_is_append_only_and_physician_cannot_reclassify():
    episode = create_episode()
    episode_id = episode["id"]

    denied = client.post(
        f"/api/internal-prototype/episodes/{episode_id}/level",
        headers=PHYSICIAN,
        json={"level": 1},
    )
    assert denied.status_code == 403

    changed = client.post(
        f"/api/internal-prototype/episodes/{episode_id}/level",
        headers=NURSE,
        json={"level": 1},
    )
    assert changed.status_code == 200
    payload = changed.json()
    assert payload["level"] == 1
    assert payload["level_history"][-1]["from"] == 2
    assert payload["level_history"][-1]["to"] == 1
    assert payload["level_history"][-1]["actor_id"] == "USR-DEMO-NURSE-01"


def test_addendum_preserves_prior_content_and_admin_cannot_append():
    episode = create_episode()
    episode_id = episode["id"]
    original_summary = episode["summary"]

    denied = client.post(
        f"/api/internal-prototype/episodes/{episode_id}/addenda",
        headers=ADMIN,
        json={"text": "Adenda sintética no permitida."},
    )
    assert denied.status_code == 403

    added = client.post(
        f"/api/internal-prototype/episodes/{episode_id}/addenda",
        headers=NURSE,
        json={"text": "Adenda sintética de corrección sin borrado."},
    )
    assert added.status_code == 200
    payload = added.json()
    assert payload["summary"] == original_summary
    assert len(payload["addenda"]) == 1
    assert payload["addenda"][0]["author_id"] == "USR-DEMO-NURSE-01"


def test_delivery_and_read_need_matching_synthetic_evidence():
    episode = create_episode()
    episode_id = episode["id"]
    responded = client.post(
        f"/api/internal-prototype/episodes/{episode_id}/responses",
        headers=PHYSICIAN,
        json={"text": "Respuesta sintética."},
    ).json()
    response_id = responded["responses"][-1]["id"]

    admin_denied = client.post(
        f"/api/internal-prototype/episodes/{episode_id}/responses/{response_id}/delivery",
        headers=ADMIN,
        json={"kind": "synthetic_delivery_receipt", "at": "2026-09-12T12:00:00Z"},
    )
    assert admin_denied.status_code == 403

    wrong = client.post(
        f"/api/internal-prototype/episodes/{episode_id}/responses/{response_id}/delivery",
        headers=NURSE,
        json={"kind": "synthetic_read_receipt", "at": "2026-09-12T12:00:00Z"},
    )
    assert wrong.status_code == 409

    delivered = client.post(
        f"/api/internal-prototype/episodes/{episode_id}/responses/{response_id}/delivery",
        headers=NURSE,
        json={"kind": "synthetic_delivery_receipt", "at": "2026-09-12T12:00:00Z"},
    )
    assert delivered.status_code == 200
    assert delivered.json()["status"] == "ENTREGADA"

    read = client.post(
        f"/api/internal-prototype/episodes/{episode_id}/responses/{response_id}/delivery",
        headers=NURSE,
        json={"kind": "synthetic_read_receipt", "at": "2026-09-12T12:01:00Z"},
    )
    assert read.status_code == 200
    assert read.json()["status"] == "LEIDA"


def test_close_blocks_follow_up_and_missing_acknowledgement():
    episode = create_episode()
    episode_id = episode["id"]
    responded = client.post(
        f"/api/internal-prototype/episodes/{episode_id}/responses",
        headers=PHYSICIAN,
        json={"text": "Respuesta sintética."},
    ).json()
    response_id = responded["responses"][-1]["id"]

    follow_up = client.post(
        f"/api/internal-prototype/episodes/{episode_id}/close",
        headers=PHYSICIAN,
        json={"follow_up_pending": True, "acknowledgement_required": False},
    )
    assert follow_up.status_code == 409
    assert follow_up.json()["detail"] == "follow_up_pending"

    missing_ack = client.post(
        f"/api/internal-prototype/episodes/{episode_id}/close",
        headers=PHYSICIAN,
        json={"follow_up_pending": False, "acknowledgement_required": True},
    )
    assert missing_ack.status_code == 409
    assert missing_ack.json()["detail"] == "acknowledgement_missing"

    client.post(
        f"/api/internal-prototype/episodes/{episode_id}/responses/{response_id}/delivery",
        headers=NURSE,
        json={"kind": "synthetic_delivery_receipt", "at": "2026-09-12T12:00:00Z"},
    )
    client.post(
        f"/api/internal-prototype/episodes/{episode_id}/responses/{response_id}/delivery",
        headers=NURSE,
        json={"kind": "synthetic_read_receipt", "at": "2026-09-12T12:01:00Z"},
    )

    closed = client.post(
        f"/api/internal-prototype/episodes/{episode_id}/close",
        headers=PHYSICIAN,
        json={"follow_up_pending": False, "acknowledgement_required": True},
    )
    assert closed.status_code == 200
    assert closed.json()["status"] == "CERRADO"


def test_closed_episode_rejects_level_change_and_addendum():
    episode = create_episode()
    episode_id = episode["id"]
    responded = client.post(
        f"/api/internal-prototype/episodes/{episode_id}/responses",
        headers=PHYSICIAN,
        json={"text": "Respuesta sintética."},
    ).json()
    response_id = responded["responses"][-1]["id"]
    client.post(
        f"/api/internal-prototype/episodes/{episode_id}/responses/{response_id}/delivery",
        headers=NURSE,
        json={"kind": "synthetic_delivery_receipt", "at": "2026-09-12T12:00:00Z"},
    )
    client.post(
        f"/api/internal-prototype/episodes/{episode_id}/responses/{response_id}/delivery",
        headers=NURSE,
        json={"kind": "synthetic_read_receipt", "at": "2026-09-12T12:01:00Z"},
    )
    closed = client.post(
        f"/api/internal-prototype/episodes/{episode_id}/close",
        headers=PHYSICIAN,
        json={"follow_up_pending": False, "acknowledgement_required": True},
    )
    assert closed.status_code == 200

    level = client.post(
        f"/api/internal-prototype/episodes/{episode_id}/level",
        headers=NURSE,
        json={"level": 1},
    )
    assert level.status_code == 409

    addendum = client.post(
        f"/api/internal-prototype/episodes/{episode_id}/addenda",
        headers=NURSE,
        json={"text": "Adenda sintética posterior."},
    )
    assert addendum.status_code == 409


def test_audit_stream_contains_metadata_not_clinical_text():
    episode = create_episode()
    episode_id = episode["id"]
    clinical_text = "Respuesta sintética confidencial de prueba"
    addendum_text = "Adenda sintética confidencial de prueba"
    client.post(
        f"/api/internal-prototype/episodes/{episode_id}/responses",
        headers=PHYSICIAN,
        json={"text": clinical_text},
    )
    client.post(
        f"/api/internal-prototype/episodes/{episode_id}/addenda",
        headers=NURSE,
        json={"text": addendum_text},
    )

    response = client.get("/api/internal-prototype/audit", headers=ADMIN)
    assert response.status_code == 200
    serialized = response.text
    assert clinical_text not in serialized
    assert addendum_text not in serialized
    assert "CLINICAL_RESPONSE_ISSUED" in serialized
    assert "ADDENDUM_APPENDED" in serialized


def test_revoked_identity_is_rejected():
    internal_prototype.ACTORS["USR-DEMO-NURSE-01"].active = False
    response = client.get("/api/internal-prototype/episodes", headers=NURSE)
    assert response.status_code == 401
