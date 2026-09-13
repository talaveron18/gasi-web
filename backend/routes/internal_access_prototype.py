from __future__ import annotations

from typing import Literal, Optional

from fastapi import APIRouter, Header, HTTPException, status
from pydantic import BaseModel

from routes import internal_prototype

router = APIRouter(prefix="/internal-prototype", tags=["internal-prototype-access"])

AccessState = Literal["ACTIVE", "REVOKED"]


class AccessChangeInput(BaseModel):
    state: AccessState


def _actor(actor_id: Optional[str]):
    return internal_prototype._actor(actor_id)


@router.get("/session")
def session_status(x_demo_actor_id: Optional[str] = Header(default=None)):
    """Validate the synthetic identity against the authoritative in-memory actor store."""
    actor = _actor(x_demo_actor_id)
    internal_prototype._audit(actor, "SESSION_VALIDATED")
    return {
        "id": actor.id,
        "role": actor.role,
        "display_name": actor.display_name,
        "centers": actor.centers,
        "active": actor.active,
        "prototype_only": True,
        "real_data_allowed": False,
    }


@router.post("/workers/{worker_id}/access")
def change_worker_access(
    worker_id: str,
    payload: AccessChangeInput,
    x_demo_actor_id: Optional[str] = Header(default=None),
):
    actor = _actor(x_demo_actor_id)
    if actor.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="admin_only")

    target = internal_prototype.ACTORS.get(worker_id)
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="worker_not_found")
    if target.id == actor.id and payload.state == "REVOKED":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="self_revocation_not_allowed")

    target.active = payload.state == "ACTIVE"
    internal_prototype._audit(
        actor,
        "IDENTITY_REACTIVATED" if target.active else "IDENTITY_REVOKED",
        metadata={"target_actor_id": target.id, "access_state": payload.state},
    )
    return {
        "id": target.id,
        "role": target.role,
        "display_name": target.display_name,
        "centers": target.centers,
        "active": target.active,
    }
