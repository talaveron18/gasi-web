from __future__ import annotations

from typing import Any, Mapping

from internal_audit_policy import GENESIS_HASH, build_audit_event, seal_audit_event


class PersistentAuditStore:
    """Tenant-scoped metadata-only audit persistence.

    This adapter deliberately accepts the same minimal audit contract as
    internal_audit_policy. It never accepts an already-sealed event from a
    caller: tenant, previous hash and event hash are derived here.
    """

    def __init__(self, collection):
        self.collection = collection

    @staticmethod
    def _tenant(tenant_id: str) -> str:
        value = (tenant_id or "").strip()
        if not value:
            raise ValueError("tenant_id_required")
        return value

    async def ensure_indexes(self) -> None:
        await self.collection.create_index(
            [("tenant_id", 1), ("event_hash", 1)], unique=True,
            name="tenant_audit_event_hash_unique",
        )
        await self.collection.create_index(
            [("tenant_id", 1), ("at", -1)], name="tenant_audit_timeline",
        )

    async def append(self, *, tenant_id: str, actor_id: str, actor_role: str,
                     action: str, episode_id: str | None = None,
                     metadata: Mapping[str, Any] | None = None,
                     at: str | None = None) -> dict[str, Any]:
        tenant = self._tenant(tenant_id)
        # Rebuild through the policy so clinical/free-text/secrets and nested
        # structures fail closed before anything reaches persistence.
        event = build_audit_event(
            actor_id=actor_id, actor_role=actor_role, action=action,
            episode_id=episode_id, metadata=metadata, at=at,
        )
        latest = await self.collection.find_one(
            {"tenant_id": tenant}, sort=[("at", -1), ("event_hash", -1)]
        )
        previous_hash = latest["event_hash"] if latest else GENESIS_HASH
        sealed = seal_audit_event(event, previous_hash)
        stored = {"tenant_id": tenant, **sealed}
        await self.collection.insert_one(stored)
        return dict(stored)

    async def list_for_tenant(self, tenant_id: str, limit: int = 1000) -> list[dict[str, Any]]:
        tenant = self._tenant(tenant_id)
        safe_limit = max(1, min(int(limit), 1000))
        cursor = self.collection.find({"tenant_id": tenant}).sort("at", -1).limit(safe_limit)
        rows = []
        async for row in cursor:
            value = dict(row)
            value.pop("_id", None)
            rows.append(value)
        return rows
