from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from typing import Any, Mapping, MutableSequence, Sequence

# Technical/audit logs must never become a shadow clinical record.
# Keep this deny-list deliberately broad and fail closed for nested structures.
FORBIDDEN_AUDIT_KEYS = frozenset({
    "summary", "text", "clinical_content", "content", "narrative", "patient_ref",
    "patient_name", "diagnosis", "prescription", "indication", "password", "token",
    "secret", "authorization", "cookie",
})
ALLOWED_SCALAR_TYPES = (str, int, float, bool, type(None))
GENESIS_HASH = "0" * 64


def sanitize_audit_metadata(metadata: Mapping[str, Any] | None) -> dict[str, Any]:
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


def build_audit_event(*, actor_id: str, actor_role: str, action: str,
                      episode_id: str | None = None, metadata: Mapping[str, Any] | None = None,
                      at: str | None = None) -> dict[str, Any]:
    if not actor_id.strip() or not actor_role.strip() or not action.strip():
        raise ValueError("audit_identity_or_action_missing")
    return {"at": at or datetime.now(timezone.utc).isoformat(), "actor_id": actor_id.strip(),
            "actor_role": actor_role.strip(), "action": action.strip(), "episode_id": episode_id,
            "metadata": sanitize_audit_metadata(metadata)}


def _event_hash(event: Mapping[str, Any], previous_hash: str) -> str:
    payload = {key: event[key] for key in ("at", "actor_id", "actor_role", "action", "episode_id", "metadata")}
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=True)
    return hashlib.sha256(f"{previous_hash}:{canonical}".encode("utf-8")).hexdigest()


def seal_audit_event(event: Mapping[str, Any], previous_hash: str = GENESIS_HASH) -> dict[str, Any]:
    if len(previous_hash) != 64:
        raise ValueError("audit_previous_hash_invalid")
    sealed = dict(event)
    sealed["previous_hash"] = previous_hash
    sealed["event_hash"] = _event_hash(event, previous_hash)
    return sealed


def verify_audit_chain(stream: Sequence[Mapping[str, Any]]) -> bool:
    previous = GENESIS_HASH
    for event in stream:
        if event.get("previous_hash") != previous:
            return False
        if event.get("event_hash") != _event_hash(event, previous):
            return False
        previous = str(event["event_hash"])
    return True


def append_audit_event(stream: MutableSequence[dict[str, Any]], *, actor_id: str, actor_role: str,
                       action: str, episode_id: str | None = None,
                       metadata: Mapping[str, Any] | None = None, at: str | None = None) -> dict[str, Any]:
    event = build_audit_event(actor_id=actor_id, actor_role=actor_role, action=action,
                              episode_id=episode_id, metadata=metadata, at=at)
    stream.append(event)
    return stream[-1]


class ValidatedAuditStream(list[dict[str, Any]]):
    """Synthetic metadata-only, hash-chained prototype. BLOQUEADA PARA ACTIVACION REAL."""
    def append(self, event: dict[str, Any]) -> None:
        if not isinstance(event, Mapping):
            raise ValueError("audit_event_must_be_mapping")
        allowed_keys = {"at", "actor_id", "actor_role", "action", "episode_id", "metadata"}
        if set(event) - allowed_keys:
            raise ValueError("audit_event_unexpected_field")
        validated = build_audit_event(actor_id=str(event.get("actor_id") or ""),
                                      actor_role=str(event.get("actor_role") or ""),
                                      action=str(event.get("action") or ""), episode_id=event.get("episode_id"),
                                      metadata=event.get("metadata"), at=event.get("at"))
        previous = self[-1]["event_hash"] if self else GENESIS_HASH
        super().append(seal_audit_event(validated, previous))
