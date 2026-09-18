"""Compatibility export for backend test/runtime package resolution."""

from internal_accessibility_policy import (  # noqa: F401
    AccessibilityGateViolation,
    InternalWorkflowAccessibility,
    validate_internal_workflow_accessibility,
)

__all__ = [
    "AccessibilityGateViolation",
    "InternalWorkflowAccessibility",
    "validate_internal_workflow_accessibility",
]
