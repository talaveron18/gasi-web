from __future__ import annotations

from typing import Any, Optional


class TenantClinicalAccess:
    """Tenant-bound data plane for internal clinical routes.

    Route code receives this facade after authentication and cannot accidentally
    call the legacy unscoped episode/worker accessors through it.
    """

    def __init__(self, *, store: Any, tenant_id: str):
        tenant = (tenant_id or "").strip()
        if not tenant:
            raise ValueError("tenant_id_required")
        self._store = store
        self.tenant_id = tenant

    async def get_episode(self, episode_id: str):
        return await self._store.get_episode_for_tenant(self.tenant_id, episode_id)

    async def list_episodes(self, query: Optional[dict[str, Any]] = None):
        return await self._store.list_episodes_for_tenant(self.tenant_id, query)

    async def insert_episode(self, episode: dict[str, Any]):
        return await self._store.insert_episode_for_tenant(self.tenant_id, episode)

    async def replace_episode(self, episode: dict[str, Any]):
        return await self._store.replace_episode_for_tenant(self.tenant_id, episode)

    async def get_worker(self, worker_id: str):
        return await self._store.get_worker_for_tenant(self.tenant_id, worker_id)

    async def list_workers(self):
        return await self._store.list_workers_for_tenant(self.tenant_id)

    async def set_privilege(self, worker_id: str, privilege: str, grant: bool):
        return await self._store.set_privilege_for_tenant(
            self.tenant_id, worker_id, privilege, grant
        )

    async def set_worker_state(self, worker_id: str, active: bool):
        return await self._store.set_worker_state_for_tenant(
            self.tenant_id, worker_id, active
        )

    async def rotate_auth_version(self, worker_id: str):
        return await self._store.rotate_auth_version_for_tenant(
            self.tenant_id, worker_id
        )

    async def append_audit(self, event: dict[str, Any]) -> None:
        value = dict(event)
        supplied = (value.get("tenant_id") or "").strip()
        if supplied and supplied != self.tenant_id:
            raise ValueError("cross_tenant_audit_forbidden")
        value["tenant_id"] = self.tenant_id
        await self._store.append_audit(value)
