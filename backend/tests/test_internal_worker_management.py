import pytest

from backend.internal_worker_management import (
    WorkerAccessError,
    build_worker_access,
    can_access_center,
    change_worker_access,
)


def master():
    return build_worker_access(worker_id="GASI-MASTER-01", role="admin", master_admin=True)


def test_professional_requires_explicit_center_assignment():
    with pytest.raises(WorkerAccessError, match="professional_requires_assigned_center"):
        build_worker_access(worker_id="GASI-PSY-02", role="psychologist")


def test_professional_only_gets_assigned_center_scope():
    worker = build_worker_access(worker_id="GASI-PHYSIO-02", role="physiotherapist", centers=["Centro GASI Madrid 01"])
    assert can_access_center(worker, "Centro GASI Madrid 01") is True
    assert can_access_center(worker, "Centro GASI Madrid 02") is False


def test_admin_never_receives_clinical_center_scope():
    with pytest.raises(WorkerAccessError, match="admin_cannot_receive_clinical_center_scope"):
        build_worker_access(worker_id="GASI-ADMIN-02", role="admin", centers=["Centro GASI Madrid 01"])


def test_only_master_admin_can_change_worker_access():
    worker = build_worker_access(worker_id="GASI-NURSE-02", role="nurse", centers=["Centro GASI Madrid 01"])
    ordinary_admin = build_worker_access(worker_id="GASI-ADMIN-02", role="admin")
    with pytest.raises(WorkerAccessError, match="master_admin_required"):
        change_worker_access(worker, actor=ordinary_admin, active=False)

    revoked = change_worker_access(worker, actor=master(), active=False)
    assert revoked.active is False
    assert can_access_center(revoked, "Centro GASI Madrid 01") is False


def test_master_cannot_revoke_or_downgrade_itself():
    admin = master()
    with pytest.raises(WorkerAccessError, match="master_admin_self_lockout_forbidden"):
        change_worker_access(admin, actor=admin, active=False)
    with pytest.raises(WorkerAccessError, match="master_admin_self_lockout_forbidden"):
        change_worker_access(admin, actor=admin, role="nurse", centers=["Centro GASI Madrid 01"])


def test_operational_identity_and_center_are_accepted():
    worker = build_worker_access(worker_id="GASI-NURSE-03", role="nurse", centers=["Centro GASI Madrid 01"])
    assert worker.worker_id == "GASI-NURSE-03"
    assert can_access_center(worker, "Centro GASI Madrid 01") is True


def test_blank_identity_and_center_are_rejected():
    with pytest.raises(WorkerAccessError, match="worker_id_required"):
        build_worker_access(worker_id=" ", role="nurse", centers=["Centro GASI Madrid 01"])
    with pytest.raises(WorkerAccessError, match="center_required"):
        build_worker_access(worker_id="GASI-NURSE-04", role="nurse", centers=[" "])
