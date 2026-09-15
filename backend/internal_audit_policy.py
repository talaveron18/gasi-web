from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Mapping, MutableSequence

# Technical/audit logs must never become a shadow clinical record.
# Keep this deny-list deliberately broad and fail closed for nested structures.
FORBIDDEN_AUDIT_KEYS = frozenset({
    "summary",
    "text",
    "clinical_content",
    "content",
    "narrative",
    "patient_ref",
    "patient_name",
    "diagnosis",
    "prescription",
    "indication",
    "password",
    "token",
    "secret",
    "authorization",
    "cookie",
})

ALLOWED_SCALAR_TYPES = (str, int, float, bool, type(None))


def sanitize_audit_metadata(metadata: Mapping[str, Any] | None) -> dict[str, Any]:
    """Return metadata safe for the synthetic append-only audit stream.

    Audit is intentionally metadata-only. Forbidden keys, nested objects and
    collections are rejected rather than silently flattened or stringified so
    clinical narrative/secrets cannot leak into general technical logs.
    """
    if metadata is None:
        return {}

    clean: dict[str, Any] = {}
    for raw_key, value in metadata.items():
        key = str(raw_key).strip()
        if not key or key.lower() in FORBIDDEN_AUDIT_KEYS:
            raise ValueError("audit_metadata_forbidden")
        if not isinstance(value, ALLOWED_SCALAR_TYPES):
            raise ValueError("audit_metadata_must_be_scalar")
        clean[key] = value
    return clean


def build_audit_event(
    *,
    actor_id: str,
    actor_role: str,
    action: str,
    episode_id: str | None = None,
    metadata: Mapping[str, Any] | None = None,
    at: str | None = None,
) -> dict[str, Any]:
    """Build one metadata-only audit event and reject unsafe input."""
    if not actor_id.strip() or not actor_role.strip() or not action.strip():
        raise ValueError("audit_identity_or_action_missing")
    return {
        "at": at or datetime.now(timezone.utc).isoformat(),
        "actor_id": actor_id.strip(),
        "actor_role": actor_role.strip(),
        "action": action.strip(),
        "episode_id": episode_id,
        "metadata": sanitize_audit_metadata(metadata),
    }


def append_audit_event(
    stream: MutableSequence[dict[str, Any]],
    *,
    actor_id: str,
    actor_role: str,
    action: str,
    episode_id: str | None = None,
    metadata: Mapping[str, Any] | None = None,
    at: str | None = None,
) -> dict[str, Any]:
    """Append exactly one validated event; unsafe events never reach the stream."""
    event = build_audit_event(
        actor_id=actor_id,
        actor_role=actor_role,
        action=action,
        episode_id=episode_id,
        metadata=metadata,
        at=at,
    )
    stream.append(event)
    return event


class ValidatedAuditStream(list[dict[str, Any]]):
    """In-memory prototype stream that validates every append at the boundary.

    This deliberately accepts the event shape emitted by the current synthetic
    route, then rebuilds it through ``build_audit_event``. A caller cannot bypass
    metadata controls merely by calling ``append`` directly. This remains
    prototype-only storage and is BLOQUEADA PARA ACTIVACION REAL.
    """

    def append(self, event: dict[str, Any]) -> None:
        if not isinstance(event, Mapping):
            raise ValueError("audit_event_must_be_mapping")
        allowed_keys = {"at", "actor_id", "actor_role", "action", "episode_id", "metadata"}
        if set(event) - allowed_keys:
            raise ValueError("audit_event_unexpected_field")
        validated = build_audit_event(
            actor_id=str(event.get("actor_id") or ""),
            actor_role=str(event.get("actor_role") or ""),
            action=str(event.get("action") or ""),
            episode_id=event.get("episode_id"),
            metadata=event.get("metadata"),
            at=event.get("at"),
        )
        super().append(validated)
