from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
import hashlib
import secrets
from typing import Literal

AccountKind = Literal["master_admin", "worker"]


class SessionSecurityError(ValueError):
    pass


@dataclass(frozen=True)
class SessionState:
    session_id: str
    worker_id: str
    issued_at: datetime
    expires_at: datetime
    auth_version: int
    active: bool = True


@dataclass(frozen=True)
class RecoveryChallenge:
    worker_id: str
    token_digest: str
    issued_at: datetime
    expires_at: datetime
    auth_version: int
    used: bool = False


def _utc(now: datetime | None = None) -> datetime:
    value = now or datetime.now(timezone.utc)
    if value.tzinfo is None:
        raise SessionSecurityError("timezone_aware_datetime_required")
    return value.astimezone(timezone.utc)


def _required(value: str, field: str) -> str:
    normalized = (value or "").strip()
    if not normalized:
        raise SessionSecurityError(f"{field}_required")
    if len(normalized) > 160:
        raise SessionSecurityError(f"{field}_too_long")
    return normalized


def issue_session(*, worker_id: str, auth_version: int, now: datetime | None = None, ttl_minutes: int = 30) -> SessionState:
    safe_worker = _required(worker_id, "worker_id")
    if auth_version < 1 or ttl_minutes < 1 or ttl_minutes > 480:
        raise SessionSecurityError("invalid_session_policy")
    issued = _utc(now)
    return SessionState(
        session_id=f"GASI-SESSION-{secrets.token_urlsafe(18)}",
        worker_id=safe_worker,
        issued_at=issued,
        expires_at=issued + timedelta(minutes=ttl_minutes),
        auth_version=auth_version,
    )


def session_is_valid(session: SessionState, *, current_auth_version: int, now: datetime | None = None) -> bool:
    current = _utc(now)
    return session.active and session.auth_version == current_auth_version and current < session.expires_at


def begin_password_recovery(*, worker_id: str, account_kind: AccountKind, auth_version: int, now: datetime | None = None) -> tuple[str, RecoveryChallenge]:
    safe_worker = _required(worker_id, "worker_id")
    if auth_version < 1:
        raise SessionSecurityError("invalid_auth_version")
    issued = _utc(now)
    raw_token = secrets.token_urlsafe(32)
    challenge = RecoveryChallenge(
        worker_id=safe_worker,
        token_digest=hashlib.sha256(raw_token.encode("utf-8")).hexdigest(),
        issued_at=issued,
        expires_at=issued + timedelta(minutes=15),
        auth_version=auth_version,
    )
    return raw_token, challenge


def consume_password_recovery(*, challenge: RecoveryChallenge, raw_token: str, current_auth_version: int, now: datetime | None = None) -> int:
    current = _utc(now)
    supplied = hashlib.sha256((raw_token or "").encode("utf-8")).hexdigest()
    if challenge.used or current >= challenge.expires_at:
        raise SessionSecurityError("recovery_expired_or_used")
    if challenge.auth_version != current_auth_version:
        raise SessionSecurityError("recovery_auth_version_changed")
    if not secrets.compare_digest(challenge.token_digest, supplied):
        raise SessionSecurityError("invalid_recovery_token")
    # Incrementar auth_version invalida todas las sesiones y retos previos del usuario.
    return current_auth_version + 1
