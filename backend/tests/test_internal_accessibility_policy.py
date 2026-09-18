import pytest

from backend.internal_accessibility_policy import (
    AccessibilityGateViolation,
    InternalWorkflowAccessibility,
    validate_internal_workflow_accessibility,
)


def valid_gate(**changes):
    values = {
        "workflow": "clinical-handoff",
        "interactions": frozenset({"keyboard", "pointer", "screen_reader"}),
        "has_programmatic_labels": True,
        "has_visible_focus": True,
        "has_status_announcements": True,
        "destructive_action_requires_confirmation": True,
    }
    values.update(changes)
    return InternalWorkflowAccessibility(**values)


def test_complete_workflow_is_accepted():
    assert validate_internal_workflow_accessibility(valid_gate()).workflow == "clinical-handoff"


@pytest.mark.parametrize("missing", ["keyboard", "pointer", "screen_reader"])
def test_missing_interaction_mode_fails_closed(missing):
    interactions = frozenset({"keyboard", "pointer", "screen_reader"}) - {missing}
    with pytest.raises(AccessibilityGateViolation, match="interaction_modes_incomplete"):
        validate_internal_workflow_accessibility(valid_gate(interactions=interactions))


@pytest.mark.parametrize(
    ("field", "reason"),
    [
        ("has_programmatic_labels", "programmatic_labels_required"),
        ("has_visible_focus", "visible_focus_required"),
        ("has_status_announcements", "status_announcements_required"),
        ("destructive_action_requires_confirmation", "destructive_confirmation_required"),
    ],
)
def test_required_accessibility_control_fails_closed(field, reason):
    with pytest.raises(AccessibilityGateViolation, match=reason):
        validate_internal_workflow_accessibility(valid_gate(**{field: False}))
