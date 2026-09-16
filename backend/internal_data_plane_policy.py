from __future__ import annotations

from dataclasses import dataclass
from typing import FrozenSet, Literal

Plane = Literal["A_CORPORATE", "B_CLINICAL"]


class DataPlaneViolation(ValueError):
    """Raised when a workload would cross the corporate/clinical boundary."""


@dataclass(frozen=True)
class DataAsset:
    name: str
    plane: Plane
    contains_health_data: bool = False
    mixed_content: bool = False


@dataclass(frozen=True)
class RuntimeBoundary:
    name: str
    plane: Plane
    credential_scope: FrozenSet[Plane]
    backup_scope: FrozenSet[Plane]
    log_scope: FrozenSet[Plane]


def validate_asset(asset: DataAsset) -> DataAsset:
    if not asset.name.strip():
        raise DataPlaneViolation("asset_name_required")
    if asset.mixed_content and asset.plane != "B_CLINICAL":
        raise DataPlaneViolation("mixed_content_must_be_clinical")
    if asset.contains_health_data and asset.plane != "B_CLINICAL":
        raise DataPlaneViolation("health_data_forbidden_in_corporate_plane")
    return asset


def validate_runtime(boundary: RuntimeBoundary) -> RuntimeBoundary:
    if not boundary.name.strip():
        raise DataPlaneViolation("runtime_name_required")
    expected = frozenset({boundary.plane})
    if boundary.credential_scope != expected:
        raise DataPlaneViolation("credentials_cross_plane")
    if boundary.backup_scope != expected:
        raise DataPlaneViolation("backups_cross_plane")
    if boundary.log_scope != expected:
        raise DataPlaneViolation("logs_cross_plane")
    return boundary


def assert_transfer_allowed(asset: DataAsset, destination: Plane) -> None:
    validate_asset(asset)
    if asset.plane != destination:
        raise DataPlaneViolation("cross_plane_transfer_forbidden")
