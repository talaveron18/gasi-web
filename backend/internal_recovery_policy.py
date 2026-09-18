from __future__ import annotations

from dataclasses import dataclass
from typing import FrozenSet, Literal

from internal_data_plane_policy import Plane

RecoveryMode = Literal["backup", "restore", "failover"]


class RecoveryBoundaryViolation(ValueError):
    """Raised when recovery could cross or weaken a data-plane boundary."""


@dataclass(frozen=True)
class RecoveryPlan:
    name: str
    plane: Plane
    mode: RecoveryMode
    source_scope: FrozenSet[Plane]
    destination_scope: FrozenSet[Plane]
    credential_scope: FrozenSet[Plane]
    audit_scope: FrozenSet[Plane]
    test_data_only: bool = True


def validate_recovery_plan(plan: RecoveryPlan) -> RecoveryPlan:
    if not plan.name.strip():
        raise RecoveryBoundaryViolation("recovery_name_required")
    expected = frozenset({plan.plane})
    if plan.source_scope != expected:
        raise RecoveryBoundaryViolation("recovery_source_cross_plane")
    if plan.destination_scope != expected:
        raise RecoveryBoundaryViolation("recovery_destination_cross_plane")
    if plan.credential_scope != expected:
        raise RecoveryBoundaryViolation("recovery_credentials_cross_plane")
    if plan.audit_scope != expected:
        raise RecoveryBoundaryViolation("recovery_audit_cross_plane")
    return plan


def assert_recovery_pair_isolated(corporate: RecoveryPlan, clinical: RecoveryPlan) -> None:
    validate_recovery_plan(corporate)
    validate_recovery_plan(clinical)
    if corporate.plane != "A_CORPORATE" or clinical.plane != "B_CLINICAL":
        raise RecoveryBoundaryViolation("recovery_pair_plane_mismatch")

    corporate_scopes = corporate.source_scope | corporate.destination_scope | corporate.credential_scope | corporate.audit_scope
    clinical_scopes = clinical.source_scope | clinical.destination_scope | clinical.credential_scope | clinical.audit_scope
    if corporate_scopes & clinical_scopes:
        raise RecoveryBoundaryViolation("recovery_pair_not_isolated")
