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


def test_absolute_timeout_fails_closed():
    session = make_session(issued_at=NOW - timedelta(hours=9))
    assert validate_session(session, ACTOR, NOW) == "ABSOLUTE_TIMEOUT"


def test_revoked_session_fails_closed():
    session = make_session(revoked_at=NOW - timedelta(seconds=1))
    assert validate_session(session, ACTOR, NOW) == "REVOKED"


def test_session_cannot_be_reused_by_another_identity():
    assert validate_session(make_session(), "USR-DEMO-DOCTOR-01", NOW) == "IDENTITY_MISMATCH"


def test_future_timestamps_fail_closed():
    session = make_session(last_seen_at=NOW + timedelta(seconds=1))
    assert validate_session(session, ACTOR, NOW) == "INVALID_CLOCK"
