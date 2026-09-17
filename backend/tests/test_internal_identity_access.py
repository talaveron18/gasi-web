from datetime import datetime, timedelta, timezone

import pytest

from backend.internal_identity_access import (
    IdentityAccessError,
    issue_identity_session,
    build_identity_state,
    revoke_identity,
    session_can_access_center,
)
from internal_worker_management import WorkerAccessError, build_worker_access

NOW = datetime(2026, 9, 17, 7, 0, tzinfo=timezone.utc)


def _worker(worker_id="GASI-NURSE-01", centers=("Centro GASI Madrid 01",)):
    return build_worker_access(worker_id=worker_id, role="nurse", centers=centers)


def _master():
    return build_worker_access(worker_id="GASI-MASTER-01", role="admin", master_admin=True)


def test_assigned_center_requires_matching_valid_session():
    identity = build_identity_state(worker=_worker())
    session = issue_identity_session(identity=identity, now=NOW)
    assert session_can_access_center(identity=identity, session=session, center="Centro GASI Madrid 01", now=NOW)
    assert not session_can_access_center(identity=identity, session=session, center="Centro GASI Madrid 02", now=NOW)


def test_session_from_another_identity_is_rejected():
    first = build_identity_state(worker=_worker())
    second = build_identity_state(worker=_worker(worker_id="GASI-NURSE-02"))
    session = issue_identity_session(identity=first, now=NOW)
    assert not session_can_access_center(identity=second, session=session, center="Centro GASI Madrid 01", now=NOW)


def test_expired_session_cannot_reach_assigned_center():
    identity = build_identity_state(worker=_worker())
    session = issue_identity_session(identity=identity, now=NOW, ttl_minutes=30)
    assert not session_can_access_center(identity=identity, session=session, center="Centro GASI Madrid 01", now=NOW + timedelta(minutes=31))


def test_master_revocation_invalidates_existing_session():
    identity = build_identity_state(worker=_worker())
    session = issue_identity_session(identity=identity, now=NOW)
    revoked = revoke_identity(identity, actor=_master())
    assert revoked.auth_version == identity.auth_version + 1
    assert not revoked.worker.active
    assert not session_can_access_center(identity=revoked, session=session, center="Centro GASI Madrid 01", now=NOW)


def test_non_master_cannot_revoke_identity():
    identity = build_identity_state(worker=_worker())
    admin = build_worker_access(worker_id="GASI-ADMIN-01", role="admin")
    with pytest.raises(WorkerAccessError) as exc:
        revoke_identity(identity, actor=admin)
    assert str(exc.value) == "master_admin_required"


def test_inactive_worker_cannot_build_authentication_state():
    inactive = build_worker_access(worker_id="GASI-NURSE-OFF", role="nurse", active=False)
    with pytest.raises(IdentityAccessError) as exc:
        build_identity_state(worker=inactive)
    assert str(exc.value) == "inactive_worker_cannot_authenticate"
