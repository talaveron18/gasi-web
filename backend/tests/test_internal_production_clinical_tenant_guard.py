from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
PRODUCTION_FUNCTION = ROOT / "netlify" / "functions" / "internal-clinical.mts"
TENANT_GATEWAY = ROOT / "netlify" / "functions" / "internal-clinical-guarded.mts"
NETLIFY_CONFIG = ROOT / "netlify.toml"


def _source(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def test_commercial_deployment_blocks_internal_clinical_routes() -> None:
    config = _source(NETLIFY_CONFIG)
    route_start = config.index('from = "/api/internal-clinical/*"')
    route_end = config.index("[[redirects]]", route_start)
    restricted_route = config[route_start:route_end]
    assert 'to = "/404.html"' in restricted_route
    assert "status = 404" in restricted_route
    assert "force = true" in restricted_route
    assert route_start < config.index('from = "/*"')


def test_effective_gateway_requires_signed_tenant_claim() -> None:
    gateway = _source(TENANT_GATEWAY)
    assert 'typeof p.tenant_id!=="string"' in gateway
    assert "!p.tenant_id" in gateway
    assert "tenant_id:tenantId" in gateway
    assert "sign({...payload,tenant_id:tenantId})" in gateway


def test_effective_gateway_binds_worker_lookup_to_signed_tenant() -> None:
    gateway = _source(TENANT_GATEWAY)
    assert "WHERE id=${String(p.sub)} AND tenant_id=${String(p.tenant_id)} LIMIT 1" in gateway
    assert "tenantBoundSession" in gateway


def test_legacy_handler_is_only_reached_behind_gateway_for_authenticated_routes() -> None:
    gateway = _source(TENANT_GATEWAY)
    guard = gateway.index("await tenantBoundSession(delegated)")
    delegated_handler = gateway.rindex("return internalClinical(delegated,context)")
    assert guard < delegated_handler


def test_legacy_handler_still_checks_session_revocation() -> None:
    source = _source(PRODUCTION_FUNCTION)
    assert "Number(w.auth_version)!==Number(p.av)" in source
