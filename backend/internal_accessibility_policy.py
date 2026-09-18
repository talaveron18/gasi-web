from __future__ import annotations

from dataclasses import dataclass
from typing import FrozenSet, Literal

# Accessibility is a technical quality gate. It does not decide whether clinical
# production activation is legally/operationally authorised; that decision is
# enforced by the deployment/readiness gates outside this policy.
Interaction = Literal["keyboard", "pointer", "screen_reader"]


class AccessibilityGateViolation(ValueError):
    """Raised when an internal workflow would exclude an interaction mode."""


@dataclass(frozen=True)
class InternalWorkflowAccessibility:
    workflow: str
    interactions: FrozenSet[Interaction]
    has_programmatic_labels: bool
    has_visible_focus: bool
    has_status_announcements: bool
    destructive_action_requires_confirmation: bool


_REQUIRED_INTERACTIONS: FrozenSet[Interaction] = frozenset(
    {"keyboard", "pointer", "screen_reader"}
)


def validate_internal_workflow_accessibility(
    gate: InternalWorkflowAccessibility,
) -> InternalWorkflowAccessibility:
    if not gate.workflow.strip():
        raise AccessibilityGateViolation("workflow_name_required")
    if gate.interactions != _REQUIRED_INTERACTIONS:
        raise AccessibilityGateViolation("interaction_modes_incomplete")
    if not gate.has_programmatic_labels:
        raise AccessibilityGateViolation("programmatic_labels_required")
    if not gate.has_visible_focus:
        raise AccessibilityGateViolation("visible_focus_required")
    if not gate.has_status_announcements:
        raise AccessibilityGateViolation("status_announcements_required")
    if not gate.destructive_action_requires_confirmation:
        raise AccessibilityGateViolation("destructive_confirmation_required")
    return gate
