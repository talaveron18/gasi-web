from pathlib import Path


PRODUCTION_FUNCTION = (
    Path(__file__).resolve().parents[2]
    / "netlify"
    / "functions"
    / "internal-clinical.mts"
)


def _source() -> str:
    return PRODUCTION_FUNCTION.read_text(encoding="utf-8")


def test_production_actor_binds_worker_lookup_to_signed_tenant() -> None:
    """A professional session must resolve identity by (tenant, worker), not id alone.

    The Netlify function is the production internal clinical API. This regression is
    intentionally source-level so CI cannot report the Python legacy harness as
    evidence for production tenant isolation.
    """
    source = _source()
    actor_start = source.index("async function actor(")
    actor_end = source.index("\nconst FORBIDDEN_AUDIT_KEYS", actor_start)
    actor_source = source[actor_start:actor_end]

    assert "tenant_id" in actor_source, "production actor must query tenant_id"
    assert "p.tenant" in actor_source or "p.tid" in actor_source, (
        "production actor must bind the worker lookup to a signed tenant claim"
    )
    assert "WHERE id=${String(p.sub)} LIMIT 1" not in actor_source, (
        "worker id alone is not a tenant boundary"
    )


def test_production_session_payload_requires_tenant_claim() -> None:
    """Decoded production sessions must reject tokens without a tenant boundary."""
    source = _source()
    decode_start = source.index("function decode(token:string)")
    decode_end = source.index("\nasync function actor(", decode_start)
    decode_source = source[decode_start:decode_end]

    assert "tenant" in decode_source or ".tid" in decode_source, (
        "production session decoding must require a tenant claim"
    )
