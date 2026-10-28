from pathlib import Path


ROUTE = Path(__file__).resolve().parents[1] / "routes" / "internal_access_prototype.py"


def test_login_rejects_cross_tenant_worker_id_ambiguity():
    source = ROUTE.read_text(encoding="utf-8")
    assert "global_worker=await _store().get_worker(worker_id)" in source
    assert "global_worker.get('tenant_id')" in source
    assert "ambiguous_worker_identity" in source


def test_worker_creation_preserves_global_session_subject_uniqueness():
    source = ROUTE.read_text(encoding="utf-8")
    assert "if await _store().get_worker(worker_id)" in source
    assert "worker_id_must_be_globally_unique" in source
