import pytest

from internal_recovery_policy import (
    RecoveryBoundaryViolation,
    RecoveryPlan,
    assert_recovery_pair_isolated,
    validate_recovery_plan,
)


def plan(plane, name="synthetic-recovery", **changes):
    values = {
        "name": name,
        "plane": plane,
        "mode": "restore",
        "source_scope": frozenset({plane}),
        "destination_scope": frozenset({plane}),
        "credential_scope": frozenset({plane}),
        "audit_scope": frozenset({plane}),
        "test_data_only": True,
    }
    values.update(changes)
    return RecoveryPlan(**values)


def test_corporate_and_clinical_recovery_are_independently_valid():
    assert validate_recovery_plan(plan("A_CORPORATE"))
    assert validate_recovery_plan(plan("B_CLINICAL"))


@pytest.mark.parametrize("field", ["source_scope", "destination_scope", "credential_scope", "audit_scope"])
def test_every_recovery_scope_is_single_plane(field):
    with pytest.raises(RecoveryBoundaryViolation, match="cross_plane"):
        validate_recovery_plan(plan("B_CLINICAL", **{field: frozenset({"A_CORPORATE", "B_CLINICAL"})}))


def test_valid_a_b_recovery_pair_is_isolated():
    assert_recovery_pair_isolated(plan("A_CORPORATE", name="corp"), plan("B_CLINICAL", name="clinical"))


def test_swapped_recovery_pair_is_rejected():
    with pytest.raises(RecoveryBoundaryViolation, match="recovery_pair_plane_mismatch"):
        assert_recovery_pair_isolated(plan("B_CLINICAL"), plan("A_CORPORATE"))


def test_empty_recovery_name_is_rejected():
    with pytest.raises(RecoveryBoundaryViolation, match="recovery_name_required"):
        validate_recovery_plan(plan("A_CORPORATE", name=" "))
