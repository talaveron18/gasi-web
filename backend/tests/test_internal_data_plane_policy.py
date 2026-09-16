import pytest

from internal_data_plane_policy import (
    DataAsset,
    DataPlaneViolation,
    RuntimeBoundary,
    assert_transfer_allowed,
    validate_asset,
    validate_runtime,
)


def test_corporate_asset_without_health_data_is_allowed():
    asset = DataAsset(name="corporate-directory", plane="A_CORPORATE")
    assert validate_asset(asset) == asset


def test_health_data_is_rejected_from_corporate_plane():
    with pytest.raises(DataPlaneViolation, match="health_data_forbidden_in_corporate_plane"):
        validate_asset(DataAsset(name="case-record", plane="A_CORPORATE", contains_health_data=True))


def test_mixed_file_is_forced_to_clinical_plane():
    with pytest.raises(DataPlaneViolation, match="mixed_content_must_be_clinical"):
        validate_asset(DataAsset(name="mixed-export", plane="A_CORPORATE", mixed_content=True))

    clinical = DataAsset(name="mixed-export", plane="B_CLINICAL", mixed_content=True, contains_health_data=True)
    assert validate_asset(clinical) == clinical


def test_runtime_credentials_backups_and_logs_are_single_plane_only():
    valid = RuntimeBoundary(
        name="clinical-synthetic-runtime",
        plane="B_CLINICAL",
        credential_scope=frozenset({"B_CLINICAL"}),
        backup_scope=frozenset({"B_CLINICAL"}),
        log_scope=frozenset({"B_CLINICAL"}),
    )
    assert validate_runtime(valid) == valid

    for field in ("credential_scope", "backup_scope", "log_scope"):
        values = {
            "name": "bad-runtime",
            "plane": "B_CLINICAL",
            "credential_scope": frozenset({"B_CLINICAL"}),
            "backup_scope": frozenset({"B_CLINICAL"}),
            "log_scope": frozenset({"B_CLINICAL"}),
        }
        values[field] = frozenset({"A_CORPORATE", "B_CLINICAL"})
        with pytest.raises(DataPlaneViolation):
            validate_runtime(RuntimeBoundary(**values))


def test_cross_plane_transfer_is_fail_closed():
    clinical = DataAsset(name="synthetic-case", plane="B_CLINICAL", contains_health_data=True)
    assert_transfer_allowed(clinical, "B_CLINICAL")
    with pytest.raises(DataPlaneViolation, match="cross_plane_transfer_forbidden"):
        assert_transfer_allowed(clinical, "A_CORPORATE")


def test_empty_asset_and_runtime_names_are_rejected():
    with pytest.raises(DataPlaneViolation, match="asset_name_required"):
        validate_asset(DataAsset(name=" ", plane="A_CORPORATE"))
    with pytest.raises(DataPlaneViolation, match="runtime_name_required"):
        validate_runtime(RuntimeBoundary(name="", plane="A_CORPORATE", credential_scope=frozenset({"A_CORPORATE"}), backup_scope=frozenset({"A_CORPORATE"}), log_scope=frozenset({"A_CORPORATE"})))
