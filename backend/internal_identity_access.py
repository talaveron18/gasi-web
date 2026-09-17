from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from internal_session_security import SessionState, issue_session, session_is_valid
from internal_worker_management import WorkerAccess, WorkerAccessError, can_access_center


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


def authenticate_synthetic_identity(*, identity: IdentityState, now: datetime | None = None, ttl_minutes: int = 30) -> SessionState:
    if not identity.worker.active:
        raise IdentityAccessError("inactive_worker_cannot_authenticate")
    return issue_session(
        worker_id=identity.worker.worker_id,
        auth_version=identity.auth_version,
        now=now,
        ttl_minutes=ttl_minutes,
    )


def session_can_access_center(*, identity: IdentityState, session: SessionState, center: str, now: datetime | None = None) -> bool:
    if session.worker_id != identity.worker.worker_id:
        return False
    if not identity.worker.active:
        return False
    if not session_is_valid(session, current_auth_version=identity.auth_version, now=now):
        return False
    return can_access_center(identity.worker, center)


def revoke_identity(identity: IdentityState, *, actor: WorkerAccess) -> IdentityState:
    if not actor.active or actor.role != "admin" or not actor.master_admin:
        raise WorkerAccessError("master_admin_required")
    if identity.worker.master_admin and identity.worker.worker_id == actor.worker_id:
        raise WorkerAccessError("master_admin_self_lockout_forbidden")
    revoked = WorkerAccess(
        worker_id=identity.worker.worker_id,
        role=identity.worker.role,
        centers=identity.worker.centers,
        active=False,
        master_admin=identity.worker.master_admin,
    )
    # Incrementar auth_version invalida inmediatamente todas las sesiones previas.
    return IdentityState(worker=revoked, auth_version=identity.auth_version + 1)


# BLOQUEADA PARA ACTIVACION REAL: esta capa solo integra identidades y sesiones
# sinteticas. Requiere proveedor de identidad, correo corporativo verificado,
# MFA/reautenticacion y gates juridicos/tecnicos cerrados antes de datos reales.
