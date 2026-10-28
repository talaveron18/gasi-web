from pathlib import Path


ROUTE = Path(__file__).resolve().parents[1] / "routes" / "internal_access_prototype.py"
RUNTIME = Path(__file__).resolve().parents[2] / "netlify" / "functions" / "internal-clinical.mts"


def test_login_rejects_cross_tenant_worker_id_ambiguity():
    source = ROUTE.read_text(encoding="utf-8")
    assert "global_worker=await _store().get_worker(worker_id)" in source
    assert "global_worker.get('tenant_id')" in source
    assert "ambiguous_worker_identity" in source


def test_worker_creation_preserves_global_session_subject_uniqueness():
    source = ROUTE.read_text(encoding="utf-8")
    assert "if await _store().get_worker(worker_id)" in source
    assert "worker_id_must_be_globally_unique" in source


def test_netlify_runtime_session_requires_signed_tenant_claim():
    source = RUNTIME.read_text(encoding="utf-8")
    assert 'typeof p.tid!=="string"||!p.tid' in source
    assert 'tenant_id=${String(p.tid)}' in source
    assert 'tenant_id:w.tenant_id' in source or 'tid:w.tenant_id' in source


def test_netlify_runtime_identity_mutations_are_tenant_scoped():
    source = RUNTIME.read_text(encoding="utf-8")
    # Session revocation and credential changes must never identify a normal
    # worker by id alone once duplicate ids can exist in separate tenants.
    assert 'WHERE id=${w.id} AND tenant_id=${w.tenant_id}' in source
    assert 'WHERE id=${String(p.sub)} AND tenant_id=${String(p.tid)}' in source
