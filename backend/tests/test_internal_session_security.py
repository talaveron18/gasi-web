from datetime import datetime, timedelta, timezone

import pytest

from backend.internal_session_security import (
    SessionSecurityError,
    begin_password_recovery,
    consume_password_recovery,
    issue_session,
    session_is_valid,
    sign_session_token,
    verify_session_token,
)

NOW = datetime(2026, 9, 17, 5, 0, tzinfo=timezone.utc)
WORKER = "GASI-WORKER-SECURITY"
SECRET = "synthetic-test-secret-32-bytes-minimum-2026"


def test_session_expires_and_auth_version_revokes_it():
    session = issue_session(worker_id=WORKER, auth_version=3, now=NOW, ttl_minutes=30)
    assert session_is_valid(session, current_auth_version=3, now=NOW + timedelta(minutes=29))
    assert not session_is_valid(session, current_auth_version=3, now=NOW + timedelta(minutes=30))
    assert not session_is_valid(session, current_auth_version=4, now=NOW + timedelta(minutes=1))


def test_signed_session_token_derives_identity_and_rejects_tampering():
    session = issue_session(worker_id="GASI-NURSE-01", auth_version=3, now=NOW, ttl_minutes=30)
    token = sign_session_token(session, secret=SECRET)
    observed = verify_session_token(token=token, secret=SECRET, current_auth_version=3, now=NOW + timedelta(minutes=1))
    assert observed.worker_id == "GASI-NURSE-01"
    assert observed.session_id == session.session_id
    parts = token.split(".")
    tampered = f"{parts[0]}.{parts[1][:-1]}A.{parts[2]}"
    with pytest.raises(SessionSecurityError, match="invalid_session_signature"):
        verify_session_token(token=tampered, secret=SECRET, current_auth_version=3, now=NOW + timedelta(minutes=1))


def test_signed_session_token_rejects_expired_or_rotated_auth_version():
    session = issue_session(worker_id=WORKER, auth_version=7, now=NOW, ttl_minutes=30)
    token = sign_session_token(session, secret=SECRET)
    with pytest.raises(SessionSecurityError, match="session_expired_or_revoked"):
        verify_session_token(token=token, secret=SECRET, current_auth_version=7, now=NOW + timedelta(minutes=30))
    with pytest.raises(SessionSecurityError, match="session_expired_or_revoked"):
        verify_session_token(token=token, secret=SECRET, current_auth_version=8, now=NOW + timedelta(minutes=1))


def test_session_signing_requires_server_grade_secret():
    session = issue_session(worker_id=WORKER, auth_version=1, now=NOW)
    with pytest.raises(SessionSecurityError, match="session_secret_too_short"):
        sign_session_token(session, secret="short")


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
