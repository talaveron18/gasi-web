"""Compatibility export for backend-local synthetic prototype tests.

The CI executes pytest with backend/ as its working directory, so imports of
backend.internal_worker_management resolve through this compatibility package.
No production route or real-data path is enabled here.
"""

from internal_worker_management import (  # noqa: F401
    ALL_ROLES,
    PROFESSIONAL_ROLES,
    Role,
    WorkerAccess,
    WorkerAccessError,
    build_worker_access,
    can_access_center,
    change_worker_access,
)

__all__ = [
    "ALL_ROLES",
    "PROFESSIONAL_ROLES",
    "Role",
    "WorkerAccess",
    "WorkerAccessError",
    "build_worker_access",
    "can_access_center",
    "change_worker_access",
]
