from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Iterable

from internal_session_security import SessionState, issue_session, session_is_valid
from internal_worker_management import WorkerAccess, WorkerAccessError, can_access_center, change_worker_access


class IdentityAccessError(ValueError):
    pass


@dataclass(frozen=True)
class IdentityState:
    worker: WorkerAccess
    auth_version: int = 1


def build_identity_state(*, worker: WorkerAccess, auth_version: int = 1) -> IdentityState:
    if auth_version < 1:
        raise IdentityAccessError("invalid_auth_version")
    if not worker.active:
        raise IdentityAccessError("inactive_worker_cannot_authenticate")
    return IdentityState(worker=worker, auth_version=auth_version)


def issue_identity_session(*, identity: IdentityState, now: datetime | None = None, ttl_minutes: int = 30) -> SessionState:
    if not identity.worker.active:
        raise IdentityAccessError("inactive_worker_cannot_authenticate")
    return issue_session(
        worker_id=identity.worker.worker_id,
        auth_version=identity.auth_version,
        now=now,
        ttl_minutes=ttl_minutes,
    )


def session_can_access_center(*, identity: IdentityState, session: SessionState, tenant_id: str, center: str, now: datetime | None = None) -> bool:
    if session.worker_id != identity.worker.worker_id:
        return False
    if not identity.worker.active:
        return False
    if not session_is_valid(session, current_auth_version=identity.auth_version, now=now):
        return False
    return can_access_center(identity.worker, tenant_id, center)


def change_identity_access(
    identity: IdentityState,
    *,
    actor: WorkerAccess,
    role: str | None = None,
    centers: Iterable[str] | None = None,
    active: bool | None = None,
) -> IdentityState:
    """Apply an authorised access change and revoke every previously issued session.

    Role, centre scope and active-state changes are security-sensitive.  Incrementing
    auth_version makes sessions issued under the previous authorisation unusable.
    """
    changed = change_worker_access(
        identity.worker,
        actor=actor,
        role=role,
        centers=centers,
        active=active,
    )
    return IdentityState(worker=changed, auth_version=identity.auth_version + 1)


def revoke_identity(identity: IdentityState, *, actor: WorkerAccess) -> IdentityState:
    if not actor.active or actor.role != "admin" or not actor.master_admin:
        raise WorkerAccessError("master_admin_required")
    if actor.tenant_id != identity.worker.tenant_id:
        raise WorkerAccessError("cross_tenant_identity_revoke_forbidden")
    if identity.worker.master_admin and identity.worker.worker_id == actor.worker_id:
        raise WorkerAccessError("master_admin_self_lockout_forbidden")
    revoked = WorkerAccess(
        worker_id=identity.worker.worker_id,
        role=identity.worker.role,
        tenant_id=identity.worker.tenant_id,
        centers=identity.worker.centers,
        active=False,
        master_admin=identity.worker.master_admin,
    )
    return IdentityState(worker=revoked, auth_version=identity.auth_version + 1)
