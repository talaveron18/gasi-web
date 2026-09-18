from datetime import datetime, timedelta, timezone

from internal_session_policy import SyntheticSession, validate_session


NOW = datetime(2026, 9, 15, 12, 0, tzinfo=timezone.utc)
ACTOR = "USR-DEMO-NURSE-01"


def make_session(**changes):
    values = {
        "session_id": "SES-DEMO-01",
        "actor_id": ACTOR,
        "issued_at": NOW - timedelta(hours=1),
        "last_seen_at": NOW - timedelta(minutes=1),
        "revoked_at": None,
    }
    values.update(changes)
    return SyntheticSession(**values)


def test_active_session_is_accepted():
    assert validate_session(make_session(), ACTOR, NOW) == "ACTIVE"


def test_idle_timeout_fails_closed():
    session = make_session(last_seen_at=NOW - timedelta(minutes=16))
    assert validate_session(session, ACTOR, NOW) == "IDLE_TIMEOUT"


def test_idle_timeout_expires_at_exact_boundary():
    session = make_session(last_seen_at=NOW - timedelta(minutes=15))
    assert validate_session(session, ACTOR, NOW) == "IDLE_TIMEOUT"


def test_absolute_timeout_fails_closed():
    session = make_session(issued_at=NOW - timedelta(hours=9))
    assert validate_session(session, ACTOR, NOW) == "ABSOLUTE_TIMEOUT"


def test_absolute_timeout_expires_at_exact_boundary():
    session = make_session(issued_at=NOW - timedelta(hours=8))
    assert validate_session(session, ACTOR, NOW) == "ABSOLUTE_TIMEOUT"


def test_revoked_session_fails_closed():
    session = make_session(revoked_at=NOW - timedelta(seconds=1))
    assert validate_session(session, ACTOR, NOW) == "REVOKED"


def test_session_cannot_be_reused_by_another_identity():
    assert validate_session(make_session(), "USR-DEMO-DOCTOR-01", NOW) == "IDENTITY_MISMATCH"


def test_future_timestamps_fail_closed():
    session = make_session(last_seen_at=NOW + timedelta(seconds=1))
    assert validate_session(session, ACTOR, NOW) == "INVALID_CLOCK"


def test_last_seen_cannot_precede_session_issuance():
    issued = NOW - timedelta(hours=1)
    session = make_session(issued_at=issued, last_seen_at=issued - timedelta(seconds=1))
    assert validate_session(session, ACTOR, NOW) == "INVALID_CLOCK"


def test_empty_session_identifier_fails_closed():
    assert validate_session(make_session(session_id=""), ACTOR, NOW) == "INVALID_IDENTITY"


def test_empty_bound_actor_identifier_fails_closed():
    assert validate_session(make_session(actor_id=""), ACTOR, NOW) == "INVALID_IDENTITY"


def test_empty_request_actor_identifier_fails_closed():
    assert validate_session(make_session(), "", NOW) == "INVALID_IDENTITY"


def test_naive_session_timestamp_fails_closed_without_runtime_error():
    session = make_session(last_seen_at=datetime(2026, 9, 15, 11, 59))
    assert validate_session(session, ACTOR, NOW) == "INVALID_CLOCK"


def test_naive_current_time_fails_closed_without_runtime_error():
    naive_now = datetime(2026, 9, 15, 12, 0)
    assert validate_session(make_session(), ACTOR, naive_now) == "INVALID_CLOCK"
