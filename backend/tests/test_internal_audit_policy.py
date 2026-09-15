import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from internal_audit_policy import sanitize_audit_metadata  # noqa: E402


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
