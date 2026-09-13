import os
import sys
from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

os.environ["ENABLE_INTERNAL_SYNTHETIC_PROTOTYPE"] = "true"
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from routes import internal_access_prototype, internal_prototype  # noqa: E402


app = FastAPI()
app.include_router(internal_prototype.router, prefix="/api")
app.include_router(internal_access_prototype.router, prefix="/api")
client = TestClient(app)

NURSE = {"x-demo-actor-id": "USR-DEMO-NURSE-01"}
ADMIN = {"x-demo-actor-id": "USR-DEMO-ADMIN-01"}


@pytest.fixture(autouse=True)
def reset_access_state():
    internal_prototype.AUDIT.clear()
    for actor in internal_prototype.ACTORS.values():
        actor.active = True
    yield


def test_session_validation_returns_minimal_synthetic_identity():
    response = client.get("/api/internal-prototype/session", headers=NURSE)
    assert response.status_code == 200
    payload = response.json()
    assert payload["id"] == "USR-DEMO-NURSE-01"
    assert payload["role"] == "nurse"
    assert payload["prototype_only"] is True
    assert payload["real_data_allowed"] is False


def test_admin_can_revoke_and_revoked_identity_is_immediately_rejected():
    changed = client.post(
        "/api/internal-prototype/workers/USR-DEMO-NURSE-01/access",
        headers=ADMIN,
        json={"state": "REVOKED"},
    )
    assert changed.status_code == 200
    assert changed.json()["active"] is False

    rejected = client.get("/api/internal-prototype/session", headers=NURSE)
    assert rejected.status_code == 401
    assert rejected.json()["detail"] == "invalid_or_revoked_identity"


def test_non_admin_cannot_change_worker_access():
    response = client.post(
        "/api/internal-prototype/workers/USR-DEMO-ADMIN-01/access",
        headers=NURSE,
        json={"state": "REVOKED"},
    )
    assert response.status_code == 403
    assert response.json()["detail"] == "admin_only"


def test_admin_cannot_revoke_current_identity():
    response = client.post(
        "/api/internal-prototype/workers/USR-DEMO-ADMIN-01/access",
        headers=ADMIN,
        json={"state": "REVOKED"},
    )
    assert response.status_code == 409
    assert response.json()["detail"] == "self_revocation_not_allowed"


def test_revocation_audit_contains_metadata_but_no_clinical_content():
    client.post(
        "/api/internal-prototype/workers/USR-DEMO-NURSE-01/access",
        headers=ADMIN,
        json={"state": "REVOKED"},
    )
    audit = client.get("/api/internal-prototype/audit", headers=ADMIN)
    assert audit.status_code == 200
    serialized = audit.text
    assert "IDENTITY_REVOKED" in serialized
    assert "USR-DEMO-NURSE-01" in serialized
    assert "summary" not in serialized
    assert "response_text" not in serialized
