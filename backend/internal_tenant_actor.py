from __future__ import annotations

from typing import Any

from internal_session_security import (
    SessionSecurityError,
    signed_session_identity,
    verify_session_token,
)


class TenantActorError(ValueError):
    """Fail-closed authentication error for tenant-facing clinical routes."""


async def resolve_tenant_actor(*, token: str, secret: str, store: Any) -> dict[str, Any]:
    """Resolve a professional exclusively inside the tenant signed into the session.

    The returned actor always carries the signed tenant_id. A worker with the same
    id in another tenant cannot satisfy this lookup, and legacy sessions without a
    tenant claim are rejected by signed_session_identity.
    """
    try:
        tenant_id, worker_id = signed_session_identity(token=token, secret=secret)
        actor = await store.get_worker_for_tenant(tenant_id, worker_id)
        if not actor or not actor.get("active", True):
            raise TenantActorError("invalid_or_revoked_identity")
        verify_session_token(
            token=token,
            secret=secret,
            current_auth_version=int(actor.get("auth_version", 1)),
        )
    except TenantActorError:
        raise
    except SessionSecurityError as exc:
        raise TenantActorError(str(exc)) from exc

    resolved = dict(actor)
    stored_tenant = (resolved.get("tenant_id") or "").strip()
    if stored_tenant and stored_tenant != tenant_id:
        raise TenantActorError("cross_tenant_identity_forbidden")
    resolved["tenant_id"] = tenant_id
    return resolved
