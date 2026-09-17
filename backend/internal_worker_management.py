from __future__ import annotations

from dataclasses import dataclass, field
from typing import Iterable, Literal

Role = Literal["nurse", "physician", "psychologist", "physiotherapist", "admin"]
PROFESSIONAL_ROLES = frozenset({"nurse", "physician", "psychologist", "physiotherapist"})
ALL_ROLES = PROFESSIONAL_ROLES | {"admin"}


class WorkerAccessError(ValueError):
    pass


@dataclass(frozen=True)
class WorkerAccess:
    worker_id: str
    role: Role
    centers: tuple[str, ...] = field(default_factory=tuple)
    active: bool = True
    master_admin: bool = False


def _synthetic(value: str, field: str) -> str:
    normalized = (value or "").strip()
    if not normalized or not any(token in normalized.upper() for token in ("DEMO", "FICTICIO", "SYNTH")):
        raise WorkerAccessError(f"{field}_must_be_synthetic")
    return normalized


def build_worker_access(*, worker_id: str, role: str, centers: Iterable[str] = (), active: bool = True, master_admin: bool = False) -> WorkerAccess:
    safe_id = _synthetic(worker_id, "worker_id")
    if role not in ALL_ROLES:
        raise WorkerAccessError("unsupported_role")
    safe_centers = tuple(dict.fromkeys(_synthetic(center, "center") for center in centers))
    if role in PROFESSIONAL_ROLES and active and not safe_centers:
        raise WorkerAccessError("professional_requires_assigned_center")
    if role == "admin" and safe_centers:
        raise WorkerAccessError("admin_cannot_receive_clinical_center_scope")
    if master_admin and role != "admin":
        raise WorkerAccessError("master_admin_requires_admin_role")
    return WorkerAccess(worker_id=safe_id, role=role, centers=safe_centers, active=bool(active), master_admin=bool(master_admin))


def change_worker_access(current: WorkerAccess, *, actor: WorkerAccess, role: str | None = None, centers: Iterable[str] | None = None, active: bool | None = None) -> WorkerAccess:
    if not actor.active or actor.role != "admin" or not actor.master_admin:
        raise WorkerAccessError("master_admin_required")
    if current.master_admin and current.worker_id == actor.worker_id:
        if active is False or (role is not None and role != "admin"):
            raise WorkerAccessError("master_admin_self_lockout_forbidden")
    return build_worker_access(worker_id=current.worker_id, role=role if role is not None else current.role, centers=current.centers if centers is None else centers, active=current.active if active is None else active, master_admin=current.master_admin)


def can_access_center(worker: WorkerAccess, center: str) -> bool:
    return worker.active and worker.role in PROFESSIONAL_ROLES and center in worker.centers
