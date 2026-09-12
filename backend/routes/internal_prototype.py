from __future__ import annotations

from datetime import datetime, timezone
from typing import Dict, List, Literal, Optional
import os

from fastapi import APIRouter, Header, HTTPException, status
from pydantic import BaseModel, Field

router = APIRouter(prefix="/internal-prototype", tags=["internal-prototype"])

Role = Literal["nurse", "physician", "admin"]
EpisodeStatus = Literal["ABIERTO", "RESPONDIDO", "CERRADO"]
MessageStatus = Literal["EMITIDA", "ENTREGADA", "LEIDA"]
DispositionKind = Literal["SALIDA_CENTRO", "TRASLADO", "DECISION_POSTERIOR"]


def _enabled() -> bool:
    return os.getenv("ENABLE_INTERNAL_SYNTHETIC_PROTOTYPE", "false").lower() == "true"


def _require_enabled() -> None:
    if not _enabled():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="prototype_disabled")


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _require_synthetic(value: str, field_name: str) -> str:
    normalized = (value or "").strip()
    if not normalized or not any(token in normalized.upper() for token in ("DEMO", "FICTICIO", "SYNTH")):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"{field_name}_must_be_synthetic",
        )
    return normalized


class Actor(BaseModel):
    id: str
    role: Role
    display_name: str
    centers: List[str] = Field(default_factory=list)
    active: bool = True


class CreateEpisode(BaseModel):
    patient_ref: str
    center: str
    level: Literal[1, 2, 3]
    summary: str = Field(min_length=1, max_length=4000)


class ResponseInput(BaseModel):
    text: str = Field(min_length=1, max_length=4000)


class LevelChangeInput(BaseModel):
    level: Literal[1, 2, 3]


class AddendumInput(BaseModel):
    text: str = Field(min_length=1, max_length=4000)


class DispositionInput(BaseModel):
    kind: DispositionKind
    occurred_at: str


class EvidenceInput(BaseModel):
    kind: Literal["synthetic_delivery_receipt", "synthetic_read_receipt"]
    at: str


class CloseInput(BaseModel):
    follow_up_pending: bool = False
    acknowledgement_required: bool = False
    handoff_required: bool = False
    handoff_acknowledged: bool = False


ACTORS: Dict[str, Actor] = {
    "USR-DEMO-NURSE-01": Actor(
        id="USR-DEMO-NURSE-01",
        role="nurse",
        display_name="Enfermera Demo 01",
        centers=["Centro ficticio Madrid 01"],
    ),
    "USR-DEMO-PHYS-01": Actor(
        id="USR-DEMO-PHYS-01",
        role="physician",
        display_name="Dr. Demo 01",
        centers=["Centro ficticio Madrid 01"],
    ),
    "USR-DEMO-ADMIN-01": Actor(
        id="USR-DEMO-ADMIN-01",
        role="admin",
        display_name="Coordinación Demo 01",
        centers=[],
    ),
}

EPISODES: Dict[str, dict] = {}
AUDIT: List[dict] = []


def _actor(actor_id: Optional[str]) -> Actor:
    _require_enabled()
    actor = ACTORS.get(actor_id or "")
    if not actor or not actor.active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_or_revoked_identity")
    return actor


def _audit(actor: Actor, action: str, episode_id: Optional[str] = None, metadata: Optional[dict] = None) -> None:
    AUDIT.append({
        "at": _now(),
        "actor_id": actor.id,
        "actor_role": actor.role,
        "action": action,
        "episode_id": episode_id,
        "metadata": metadata or {},
    })


def _episode_or_404(episode_id: str) -> dict:
    episode = EPISODES.get(episode_id)
    if not episode:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="episode_not_found")
    return episode


def _can_access(actor: Actor, episode: dict) -> bool:
    if actor.role == "admin":
        return True
    return episode["center"] in actor.centers


def _require_episode_access(actor: Actor, episode: dict) -> None:
    if not _can_access(actor, episode):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="episode_forbidden")


def _admin_view(episode: dict) -> dict:
    return {
        key: episode.get(key)
        for key in (
            "id", "center", "level", "status", "created_at", "created_by_id",
            "responded_at", "responded_by_id", "closed_at", "closed_by_id",
            "disposition_events",
        )
    }


@router.get("/health")
def prototype_health():
    _require_enabled()
    return {"enabled": True, "storage": "memory_only", "real_data_allowed": False}


@router.get("/workers")
def list_workers(x_demo_actor_id: Optional[str] = Header(default=None)):
    actor = _actor(x_demo_actor_id)
    if actor.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="admin_only")
    _audit(actor, "WORKERS_LIST_VIEWED")
    return [item.model_dump() for item in ACTORS.values()]


@router.post("/episodes", status_code=status.HTTP_201_CREATED)
def create_episode(payload: CreateEpisode, x_demo_actor_id: Optional[str] = Header(default=None)):
    actor = _actor(x_demo_actor_id)
    if actor.role != "nurse":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="nurse_only")
    patient_ref = _require_synthetic(payload.patient_ref, "patient_ref")
    center = _require_synthetic(payload.center, "center")
    if center not in actor.centers:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="center_not_assigned")
    episode_id = f"DEMO-EP-{len(EPISODES) + 1:04d}"
    at = _now()
    episode = {
        "id": episode_id,
        "patient_ref": patient_ref,
        "center": center,
        "level": payload.level,
        "status": "ABIERTO",
        "summary": payload.summary.strip(),
        "created_at": at,
        "created_by_id": actor.id,
        "responses": [],
        "addenda": [],
        "level_history": [],
        "disposition_events": [],
        "closed_at": None,
        "closed_by_id": None,
    }
    EPISODES[episode_id] = episode
    _audit(actor, "EPISODE_CREATED", episode_id, {"level": payload.level})
    return episode


@router.get("/episodes")
def list_episodes(x_demo_actor_id: Optional[str] = Header(default=None)):
    actor = _actor(x_demo_actor_id)
    visible = [episode for episode in EPISODES.values() if _can_access(actor, episode)]
    _audit(actor, "EPISODES_LIST_VIEWED", metadata={"count": len(visible)})
    if actor.role == "admin":
        return [_admin_view(item) for item in visible]
    return visible


@router.get("/episodes/{episode_id}")
def get_episode(episode_id: str, x_demo_actor_id: Optional[str] = Header(default=None)):
    actor = _actor(x_demo_actor_id)
    episode = _episode_or_404(episode_id)
    _require_episode_access(actor, episode)
    _audit(actor, "EPISODE_VIEWED", episode_id)
    return _admin_view(episode) if actor.role == "admin" else episode


@router.post("/episodes/{episode_id}/level")
def change_level(episode_id: str, payload: LevelChangeInput, x_demo_actor_id: Optional[str] = Header(default=None)):
    actor = _actor(x_demo_actor_id)
    if actor.role != "nurse":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="nurse_only")
    episode = _episode_or_404(episode_id)
    _require_episode_access(actor, episode)
    if episode["status"] == "CERRADO":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="closed_episode_immutable")
    previous = episode["level"]
    if previous == payload.level:
        return episode
    at = _now()
    episode["level"] = payload.level
    episode["level_history"].append({
        "at": at,
        "actor_id": actor.id,
        "from": previous,
        "to": payload.level,
    })
    _audit(actor, "LEVEL_CHANGED", episode_id, {"from": previous, "to": payload.level})
    return episode


@router.post("/episodes/{episode_id}/disposition")
def record_disposition(episode_id: str, payload: DispositionInput, x_demo_actor_id: Optional[str] = Header(default=None)):
    actor = _actor(x_demo_actor_id)
    if actor.role not in ("nurse", "physician"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="clinical_role_required")
    episode = _episode_or_404(episode_id)
    _require_episode_access(actor, episode)
    if episode["status"] == "CERRADO":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="closed_episode_immutable")
    event = {
        "id": f"{episode_id}-D{len(episode['disposition_events']) + 1}",
        "kind": payload.kind,
        "occurred_at": payload.occurred_at,
        "recorded_at": _now(),
        "recorded_by_id": actor.id,
        "recorded_by_role": actor.role,
    }
    episode["disposition_events"].append(event)
    _audit(actor, "PATIENT_DISPOSITION_RECORDED", episode_id, {"event_id": event["id"], "kind": event["kind"]})
    return episode


@router.post("/episodes/{episode_id}/responses")
def respond(episode_id: str, payload: ResponseInput, x_demo_actor_id: Optional[str] = Header(default=None)):
    actor = _actor(x_demo_actor_id)
    if actor.role != "physician":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="physician_only")
    episode = _episode_or_404(episode_id)
    _require_episode_access(actor, episode)
    if episode["status"] == "CERRADO":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="response_not_allowed")
    at = _now()
    latest_disposition = episode["disposition_events"][-1] if episode["disposition_events"] else None
    late_after_disposition = latest_disposition is not None
    response = {
        "id": f"{episode_id}-R{len(episode['responses']) + 1}",
        "text": payload.text.strip(),
        "author_id": actor.id,
        "created_at": at,
        "status": "EMITIDA",
        "status_history": [{"at": at, "from": "BORRADOR", "to": "EMITIDA", "evidence": None}],
        "late_after_disposition": late_after_disposition,
        "disposition_event_id": latest_disposition["id"] if latest_disposition else None,
        "late_reviewed_at": None,
        "late_reviewed_by_id": None,
    }
    episode["responses"].append(response)
    episode["status"] = "RESPONDIDO"
    episode["responded_at"] = at
    episode["responded_by_id"] = actor.id
    _audit(
        actor,
        "CLINICAL_RESPONSE_ISSUED",
        episode_id,
        {"response_id": response["id"], "late_after_disposition": late_after_disposition},
    )
    return episode


@router.post("/episodes/{episode_id}/responses/{response_id}/late-review")
def review_late_response(episode_id: str, response_id: str, x_demo_actor_id: Optional[str] = Header(default=None)):
    actor = _actor(x_demo_actor_id)
    if actor.role != "physician":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="physician_only")
    episode = _episode_or_404(episode_id)
    _require_episode_access(actor, episode)
    response = next((item for item in episode["responses"] if item["id"] == response_id), None)
    if not response:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="response_not_found")
    if not response.get("late_after_disposition"):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="response_not_late")
    if response.get("late_reviewed_at"):
        return response
    response["late_reviewed_at"] = _now()
    response["late_reviewed_by_id"] = actor.id
    _audit(actor, "LATE_RESPONSE_REVIEWED", episode_id, {"response_id": response_id})
    return response


@router.post("/episodes/{episode_id}/addenda")
def add_addendum(episode_id: str, payload: AddendumInput, x_demo_actor_id: Optional[str] = Header(default=None)):
    actor = _actor(x_demo_actor_id)
    if actor.role not in ("nurse", "physician"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="clinical_role_required")
    episode = _episode_or_404(episode_id)
    _require_episode_access(actor, episode)
    if episode["status"] == "CERRADO":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="closed_episode_immutable")
    at = _now()
    addendum = {
        "id": f"{episode_id}-A{len(episode['addenda']) + 1}",
        "text": payload.text.strip(),
        "author_id": actor.id,
        "author_role": actor.role,
        "created_at": at,
    }
    episode["addenda"].append(addendum)
    _audit(actor, "ADDENDUM_APPENDED", episode_id, {"addendum_id": addendum["id"]})
    return episode


@router.post("/episodes/{episode_id}/responses/{response_id}/delivery")
def mark_delivery(episode_id: str, response_id: str, evidence: EvidenceInput, x_demo_actor_id: Optional[str] = Header(default=None)):
    actor = _actor(x_demo_actor_id)
    episode = _episode_or_404(episode_id)
    _require_episode_access(actor, episode)
    if actor.role == "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="clinical_role_required")
    response = next((item for item in episode["responses"] if item["id"] == response_id), None)
    if not response:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="response_not_found")
    expected = "synthetic_delivery_receipt" if response["status"] == "EMITIDA" else "synthetic_read_receipt"
    next_status = "ENTREGADA" if response["status"] == "EMITIDA" else "LEIDA"
    if evidence.kind != expected or response["status"] not in ("EMITIDA", "ENTREGADA"):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="invalid_message_transition")
    response["status"] = next_status
    response["status_history"].append({
        "at": _now(),
        "from": "EMITIDA" if next_status == "ENTREGADA" else "ENTREGADA",
        "to": next_status,
        "evidence": {"kind": evidence.kind, "at": evidence.at},
    })
    _audit(actor, f"MESSAGE_{next_status}", episode_id, {"response_id": response_id, "evidence_kind": evidence.kind})
    return response


@router.post("/episodes/{episode_id}/close")
def close_episode(episode_id: str, payload: CloseInput, x_demo_actor_id: Optional[str] = Header(default=None)):
    actor = _actor(x_demo_actor_id)
    if actor.role not in ("nurse", "physician"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="clinical_role_required")
    episode = _episode_or_404(episode_id)
    _require_episode_access(actor, episode)
    if episode["status"] != "RESPONDIDO" or not episode["responses"]:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="close_not_allowed")
    if payload.follow_up_pending:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="follow_up_pending")
    if payload.handoff_required and not payload.handoff_acknowledged:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="handoff_acknowledgement_missing")
    if payload.acknowledgement_required and episode["responses"][-1]["status"] != "LEIDA":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="acknowledgement_missing")
    if any(item.get("late_after_disposition") and not item.get("late_reviewed_at") for item in episode["responses"]):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="late_response_review_pending")
    at = _now()
    episode["status"] = "CERRADO"
    episode["closed_at"] = at
    episode["closed_by_id"] = actor.id
    _audit(
        actor,
        "EPISODE_CLOSED",
        episode_id,
        {
            "acknowledgement_required": payload.acknowledgement_required,
            "handoff_required": payload.handoff_required,
            "handoff_acknowledged": payload.handoff_acknowledged,
        },
    )
    return episode


@router.get("/audit")
def audit_events(x_demo_actor_id: Optional[str] = Header(default=None)):
    actor = _actor(x_demo_actor_id)
    if actor.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="admin_only")
    # Deliberately no clinical narrative, response text, passwords, tokens or secrets in this stream.
    return AUDIT
