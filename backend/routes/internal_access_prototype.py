from __future__ import annotations

from typing import List, Literal, Optional

from fastapi import APIRouter, Header, HTTPException, status
from pydantic import BaseModel, Field

from routes import internal_prototype

router = APIRouter(prefix="/internal-clinical", tags=["internal-clinical-access"])
AccessState = Literal["ACTIVE", "REVOKED"]
WorkerRole = Literal["nurse", "physician", "psychologist", "physiotherapist", "admin"]

class AccessChangeInput(BaseModel):
    state: AccessState

class WorkerCreateInput(BaseModel):
    id: str = Field(min_length=3, max_length=120)
    display_name: str = Field(min_length=1, max_length=160)
    role: WorkerRole
    centers: List[str] = Field(default_factory=list, max_length=50)

def _actor(actor_id: Optional[str]):
    return internal_prototype._actor(actor_id)

def _can_manage_workers(actor) -> bool:
    return actor.id == internal_prototype.MASTER_ADMIN_ID or internal_prototype._has(actor, "worker_access_management")

def _require_worker_manager(actor):
    if not _can_manage_workers(actor):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="worker_management_required")

def _profile(actor):
    return {
        "id": actor.id,
        "role": actor.role,
        "display_name": actor.display_name,
        "centers": actor.centers,
        "operational_state": "ACTIVE" if actor.active else "REVOKED",
        "delegated_privileges": sorted(internal_prototype.DELEGATED_PRIVILEGES.get(actor.id, set())),
    }

@router.get("/session")
def session_status(x_actor_id: Optional[str] = Header(default=None)):
    actor = _actor(x_actor_id)
    internal_prototype._audit(actor, "SESSION_VALIDATED")
    return {
        "id": actor.id,
        "role": actor.role,
        "display_name": actor.display_name,
        "centers": actor.centers,
        "active": actor.active,
        "delegated_privileges": sorted(internal_prototype.DELEGATED_PRIVILEGES.get(actor.id, set())),
    }

@router.get("/profile")
def professional_profile(x_actor_id: Optional[str] = Header(default=None)):
    actor = _actor(x_actor_id)
    internal_prototype._audit(actor, "PROFILE_VIEWED")
    return _profile(actor)

@router.post("/workers", status_code=status.HTTP_201_CREATED)
def create_worker(payload: WorkerCreateInput, x_actor_id: Optional[str] = Header(default=None)):
    actor = _actor(x_actor_id)
    _require_worker_manager(actor)
    worker_id = internal_prototype._required(payload.id, "worker_id")
    display_name = internal_prototype._required(payload.display_name, "display_name")
    if worker_id in internal_prototype.ACTORS:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="worker_already_exists")
    if payload.role == "admin":
        if payload.centers:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="admin_cannot_have_clinical_centers")
        centers = []
    else:
        if not payload.centers:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="clinical_worker_requires_center")
        centers = [internal_prototype._required(center, "center") for center in payload.centers]
        if len(set(centers)) != len(centers):
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="duplicate_centers")
    worker = internal_prototype.Actor(id=worker_id, role=payload.role, display_name=display_name, centers=centers, active=True)
    internal_prototype.ACTORS[worker.id] = worker
    internal_prototype._audit(actor, "IDENTITY_CREATED", metadata={"target_actor_id": worker.id, "target_role": worker.role, "center_count": len(worker.centers)})
    return _profile(worker)

@router.post("/workers/{worker_id}/access")
def change_worker_access(worker_id: str, payload: AccessChangeInput, x_actor_id: Optional[str] = Header(default=None)):
    actor = _actor(x_actor_id)
    _require_worker_manager(actor)
    target = internal_prototype.ACTORS.get(worker_id)
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="worker_not_found")
    if target.id == internal_prototype.MASTER_ADMIN_ID:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="master_access_is_intrinsic")
    if target.id == actor.id and payload.state == "REVOKED":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="self_revocation_not_allowed")
    target.active = payload.state == "ACTIVE"
    internal_prototype._audit(actor, "IDENTITY_REACTIVATED" if target.active else "IDENTITY_REVOKED", metadata={"target_actor_id": target.id, "access_state": payload.state})
    return _profile(target)