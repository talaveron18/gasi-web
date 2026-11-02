from datetime import datetime, timezone

import pytest

from internal_session_security import issue_session, sign_session_token
from internal_tenant_actor import TenantActorError, resolve_tenant_actor


SECRET = "tenant-actor-test-secret-that-is-long-enough-123456"
NOW = datetime(2026, 11, 1, 12, 0, tzinfo=timezone.utc)


class Store:
    def __init__(self):
        self.workers = {
            ("TENANT-A", "SHARED"): {"id": "SHARED", "tenant_id": "TENANT-A", "active": True, "auth_version": 1},
            ("TENANT-B", "SHARED"): {"id": "SHARED", "tenant_id": "TENANT-B", "active": True, "auth_version": 7},
            ("TENANT-A", "REVOKED"): {"id": "REVOKED", "tenant_id": "TENANT-A", "active": False, "auth_version": 1},
        }
        self.lookups = []

    async def get_worker_for_tenant(self, tenant_id, worker_id):
        self.lookups.append((tenant_id, worker_id))
        value = self.workers.get((tenant_id, worker_id))
        return dict(value) if value else None


def token(worker_id, tenant_id, auth_version=1):
    session = issue_session(
        worker_id=worker_id,
        tenant_id=tenant_id,
        auth_version=auth_version,
        now=NOW,
        ttl_minutes=60,
    )
    return sign_session_token(session, secret=SECRET)


@pytest.mark.asyncio
async def test_same_worker_id_is_resolved_only_inside_signed_tenant(monkeypatch):
    store = Store()
    monkeypatch.setattr("internal_session_security._utc", lambda now=None: NOW)
    actor = await resolve_tenant_actor(token=token("SHARED", "TENANT-A"), secret=SECRET, store=store)
    assert actor["tenant_id"] == "TENANT-A"
    assert actor["auth_version"] == 1
    assert store.lookups == [("TENANT-A", "SHARED")]


@pytest.mark.asyncio
async def test_other_tenant_auth_version_cannot_authorize_signed_tenant(monkeypatch):
    store = Store()
    monkeypatch.setattr("internal_session_security._utc", lambda now=None: NOW)
    with pytest.raises(TenantActorError, match="session_expired_or_revoked"):
        await resolve_tenant_actor(token=token("SHARED", "TENANT-A", auth_version=7), secret=SECRET, store=store)
    assert store.lookups == [("TENANT-A", "SHARED")]


@pytest.mark.asyncio
async def test_revoked_identity_fails_closed_before_route_authorization(monkeypatch):
    store = Store()
    monkeypatch.setattr("internal_session_security._utc", lambda now=None: NOW)
    with pytest.raises(TenantActorError, match="invalid_or_revoked_identity"):
        await resolve_tenant_actor(token=token("REVOKED", "TENANT-A"), secret=SECRET, store=store)


@pytest.mark.asyncio
async def test_legacy_session_without_tenant_is_rejected(monkeypatch):
    store = Store()
    monkeypatch.setattr("internal_session_security._utc", lambda now=None: NOW)
    legacy = issue_session(worker_id="SHARED", auth_version=1, now=NOW, ttl_minutes=60)
    signed = sign_session_token(legacy, secret=SECRET)
    with pytest.raises(TenantActorError, match="tenant_session_required"):
        await resolve_tenant_actor(token=signed, secret=SECRET, store=store)
    assert store.lookups == []
