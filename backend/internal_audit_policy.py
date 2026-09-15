from __future__ import annotations

from typing import Any, Mapping

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
