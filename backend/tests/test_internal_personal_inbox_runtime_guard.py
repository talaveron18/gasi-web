from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RUNTIME = ROOT / "netlify" / "functions" / "internal-personal-inbox.mts"


def source() -> str:
    return RUNTIME.read_text(encoding="utf-8")


def test_personal_inbox_runtime_is_scoped_to_authenticated_tenant_center_and_identity():
    text = source()
    assert 'w.id===MASTER()' in text
    assert 'centers.includes(center)' in text
    assert 'tenant_id=${String(w.tenant_id)} AND center=${center} AND sender_worker_id=${String(w.id)}' in text
    assert 'tenant_id=${String(w.tenant_id)} AND center=${center} AND recipient_worker_id=${String(w.id)}' in text
    assert 'tenant_id=${String(w.tenant_id)} AND active=TRUE AND centers ? ${center}' in text


def test_sender_and_tenant_are_never_accepted_from_request_body():
    text = source()
    assert 'body.tenant_id' not in text
    assert 'body.sender_worker_id' not in text
    assert 'VALUES(${String(w.tenant_id)},${center},${String(w.id)},${recipient}' in text


def test_mark_read_cannot_mutate_another_users_or_centers_message():
    text = source()
    assert 'WHERE id=${id}::bigint AND tenant_id=${String(w.tenant_id)} AND center=${center} AND recipient_worker_id=${String(w.id)}' in text
    assert 'SET read_at=COALESCE(read_at,NOW())' in text


def test_runtime_has_bounded_payloads_and_no_store_security_headers():
    text = source()
    assert '"cache-control":"no-store"' in text
    assert 'required(body.subject,"subject",180)' in text
    assert 'required(body.body,"body",8000)' in text
    assert 'ORDER BY created_at DESC LIMIT 100' in text
