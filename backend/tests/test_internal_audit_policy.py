import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from internal_audit_policy import (  # noqa: E402
    append_audit_event,
    build_audit_event,
    sanitize_audit_metadata,
)


def test_allows_minimal_operational_metadata():
    assert sanitize_audit_metadata({
        "level": 2,
        "from": "ABIERTO",
        "to": "RESPONDIDO",
        "response_id": "DEMO-EP-0001-R1",
    }) == {
        "level": 2,
        "from": "ABIERTO",
        "to": "RESPONDIDO",
        "response_id": "DEMO-EP-0001-R1",
    }


@pytest.mark.parametrize(
    "key",
    ["summary", "text", "clinical_content", "patient_ref", "diagnosis", "prescription", "token", "secret"],
)
def test_rejects_clinical_or_secret_fields(key):
    with pytest.raises(ValueError, match="audit_metadata_forbidden"):
        sanitize_audit_metadata({key: "DEMO value"})


def test_rejects_nested_objects_to_avoid_hidden_clinical_payloads():
    with pytest.raises(ValueError, match="audit_metadata_must_be_scalar"):
        sanitize_audit_metadata({"evidence": {"text": "synthetic clinical narrative"}})


def test_rejects_collections_to_avoid_bulk_payload_logging():
    with pytest.raises(ValueError, match="audit_metadata_must_be_scalar"):
        sanitize_audit_metadata({"items": ["DEMO-1", "DEMO-2"]})


def test_none_becomes_empty_metadata():
    assert sanitize_audit_metadata(None) == {}


def test_builds_metadata_only_event_with_traceable_identity():
    event = build_audit_event(
        actor_id="USR-DEMO-NURSE-01",
        actor_role="nurse",
        action="EPISODE_VIEWED",
        episode_id="DEMO-EP-0001",
        metadata={"access_view": "clinical"},
        at="2026-09-15T18:00:00+00:00",
    )
    assert event == {
        "at": "2026-09-15T18:00:00+00:00",
        "actor_id": "USR-DEMO-NURSE-01",
        "actor_role": "nurse",
        "action": "EPISODE_VIEWED",
        "episode_id": "DEMO-EP-0001",
        "metadata": {"access_view": "clinical"},
    }


def test_unsafe_event_is_not_partially_appended():
    stream = [{"action": "EXISTING"}]
    with pytest.raises(ValueError, match="audit_metadata_forbidden"):
        append_audit_event(
            stream,
            actor_id="USR-DEMO-PHYS-01",
            actor_role="physician",
            action="CLINICAL_RESPONSE_ISSUED",
            episode_id="DEMO-EP-0001",
            metadata={"text": "FICTICIO contenido que no debe entrar en logs"},
        )
    assert stream == [{"action": "EXISTING"}]


def test_missing_identity_or_action_fails_closed():
    with pytest.raises(ValueError, match="audit_identity_or_action_missing"):
        build_audit_event(actor_id="", actor_role="nurse", action="EPISODE_VIEWED")
