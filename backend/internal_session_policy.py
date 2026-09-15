from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Optional


SESSION_IDLE_TIMEOUT = timedelta(minutes=15)
SESSION_ABSOLUTE_TIMEOUT = timedelta(hours=8)


@dataclass(frozen=True)
class SyntheticSession:
    session_id: str
    actor_id: str
    issued_at: datetime
    last_seen_at: datetime
    revoked_at: Optional[datetime] = None


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def validate_session(session: SyntheticSession, actor_id: str, now: Optional[datetime] = None) -> str:
    """Fail closed for the synthetic prototype. Never authorises real clinical data."""
    current = now or utcnow()
    if session.revoked_at is not None:
        return "REVOKED"
    if session.actor_id != actor_id:
        return "IDENTITY_MISMATCH"
    if current < session.issued_at or current < session.last_seen_at:
        return "INVALID_CLOCK"
    if current - session.issued_at > SESSION_ABSOLUTE_TIMEOUT:
        return "ABSOLUTE_TIMEOUT"
    if current - session.last_seen_at > SESSION_IDLE_TIMEOUT:
        return "IDLE_TIMEOUT"
    return "ACTIVE"
