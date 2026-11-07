from pathlib import Path


ROUTE = Path(__file__).resolve().parents[1] / "routes" / "internal_access_prototype.py"
RUNTIME = Path(__file__).resolve().parents[2] / "netlify" / "functions" / "internal-clinical.mts"
INITIAL_SCHEMA = Path(__file__).resolve().parents[2] / "netlify" / "database" / "migrations" / "20260918125500_internal-clinical-v1" / "migration.sql"
TENANT_MIGRATION = Path(__file__).resolve().parents[2] / "netlify" / "database" / "migrations" / "20260920151000_explicit-tenant-isolation" / "migration.sql"


def test_login_rejects_cross_tenant_worker_id_ambiguity():
    source = ROUTE.read_text(encoding="utf-8")
    assert "global_worker=await _store().get_worker(worker_id)" in source
    assert "global_worker.get('tenant_id')" in source
    assert "ambiguous_worker_identity" in source


def test_worker_creation_preserves_global_session_subject_uniqueness():
    source = ROUTE.read_text(encoding="utf-8")
    assert "if await _store().get_worker(worker_id)" in source
    assert "worker_id_must_be_globally_unique" in source


def test_netlify_runtime_session_subject_is_globally_unique_by_schema():
    """The Netlify session subject is worker id, so the DB must keep it globally unique.

    Tenant isolation is still explicit on tenant-owned clinical data, but worker identity is
    intentionally a global namespace. A duplicate worker id cannot exist in another tenant.
    """
    initial = INITIAL_SCHEMA.read_text(encoding="utf-8")
    tenant = TENANT_MIGRATION.read_text(encoding="utf-8")
    runtime = RUNTIME.read_text(encoding="utf-8")
    assert "id TEXT PRIMARY KEY" in initial
    assert "DROP CONSTRAINT" not in tenant or "internal_clinical_workers_pkey" not in tenant
    assert "SELECT * FROM internal_clinical_workers WHERE id=${id} LIMIT 1" in runtime
    assert "SELECT id FROM internal_clinical_workers WHERE id=$1" in runtime
    assert "worker_already_exists" in runtime


def test_netlify_runtime_session_revocation_uses_unique_subject():
    source = RUNTIME.read_text(encoding="utf-8")
    # Because worker id is a global primary key, these mutations cannot cross tenants.
    assert "UPDATE internal_clinical_workers SET auth_version=auth_version+1 WHERE id=$1" in source
    assert "SELECT password_hash,must_change_password FROM internal_clinical_workers WHERE id=$1 FOR UPDATE" in source
    assert "UPDATE internal_clinical_workers SET password_hash=$2,must_change_password=FALSE,auth_version=auth_version+1 WHERE id=$1" in source
