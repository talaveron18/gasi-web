from datetime import datetime, timedelta, timezone

import pytest

from backend.internal_session_security import (
    SessionSecurityError,
    begin_password_recovery,
    consume_password_recovery,
    issue_session,
    session_is_valid,
)

NOW = datetime(2026, 9, 17, 5, 0, tzinfo=timezone.utc)
WORKER = "GASI-WORKER-SECURITY"


def test_session_expires_and_auth_version_revokes_it():
    session = issue_session(worker_id=WORKER, auth_version=3, now=NOW, ttl_minutes=30)
    assert session_is_valid(session, current_auth_version=3, now=NOW + timedelta(minutes=29))
    assert not session_is_valid(session, current_auth_version=3, now=NOW + timedelta(minutes=30))
    assert not session_is_valid(session, current_auth_version=4, now=NOW + timedelta(minutes=1))


def test_recovery_is_single_use_by_auth_version_rotation():
    token, challenge = begin_password_recovery(worker_id=WORKER, account_kind="worker", auth_version=7, now=NOW)
    new_version = consume_password_recovery(challenge=challenge, raw_token=token, current_auth_version=7, now=NOW + timedelta(minutes=1))
    assert new_version == 8
    with pytest.raises(SessionSecurityError, match="recovery_auth_version_changed"):
        consume_password_recovery(challenge=challenge, raw_token=token, current_auth_version=new_version, now=NOW + timedelta(minutes=2))


def test_recovery_rejects_wrong_or_expired_token():
    token, challenge = begin_password_recovery(worker_id=WORKER, account_kind="master_admin", auth_version=2, now=NOW)
    with pytest.raises(SessionSecurityError, match="invalid_recovery_token"):
        consume_password_recovery(challenge=challenge, raw_token=token + "x", current_auth_version=2, now=NOW + timedelta(minutes=1))
    with pytest.raises(SessionSecurityError, match="recovery_expired_or_used"):
        consume_password_recovery(challenge=challenge, raw_token=token, current_auth_version=2, now=NOW + timedelta(minutes=15))


def test_operational_identity_is_accepted():
    session = issue_session(worker_id="GASI-NURSE-01", auth_version=1, now=NOW)
    assert session.worker_id == "GASI-NURSE-01"
    assert session.session_id.startswith("GASI-SESSION-")


def test_blank_identity_is_rejected():
    with pytest.raises(SessionSecurityError, match="worker_id_required"):
        issue_session(worker_id=" ", auth_version=1, now=NOW)
