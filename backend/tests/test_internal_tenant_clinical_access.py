from __future__ import annotations

import pytest

from internal_tenant_clinical_access import TenantClinicalAccess


class RecordingStore:
    def __init__(self):
        self.calls = []

    async def _record(self, name, *args):
        self.calls.append((name, args))
        return {"name": name, "args": args}

    async def get_episode_for_tenant(self, *args): return await self._record("get_episode_for_tenant", *args)
    async def list_episodes_for_tenant(self, *args): return await self._record("list_episodes_for_tenant", *args)
    async def insert_episode_for_tenant(self, *args): return await self._record("insert_episode_for_tenant", *args)
    async def replace_episode_for_tenant(self, *args): return await self._record("replace_episode_for_tenant", *args)
    async def get_worker_for_tenant(self, *args): return await self._record("get_worker_for_tenant", *args)
    async def list_workers_for_tenant(self, *args): return await self._record("list_workers_for_tenant", *args)
    async def set_privilege_for_tenant(self, *args): return await self._record("set_privilege_for_tenant", *args)
    async def set_worker_state_for_tenant(self, *args): return await self._record("set_worker_state_for_tenant", *args)
    async def rotate_auth_version_for_tenant(self, *args): return await self._record("rotate_auth_version_for_tenant", *args)
    async def append_audit(self, event):
        self.calls.append(("append_audit", (event,)))


@pytest.mark.asyncio
async def test_all_clinical_operations_are_bound_to_the_selected_tenant():
    store = RecordingStore()
    access = TenantClinicalAccess(store=store, tenant_id="TENANT-A")

    await access.get_episode("EP-1")
    await access.list_episodes({"center": "CENTRO-COMUN"})
    await access.insert_episode({"id": "EP-2"})
    await access.replace_episode({"id": "EP-2", "tenant_id": "TENANT-A"})
    await access.get_worker("WORKER-1")
    await access.list_workers()
    await access.set_privilege("WORKER-1", "worker_access_management", True)
    await access.set_worker_state("WORKER-1", False)
    await access.rotate_auth_version("WORKER-1")

    for name, args in store.calls:
        assert name.endswith("_for_tenant")
        assert args[0] == "TENANT-A"


@pytest.mark.asyncio
async def test_audit_is_stamped_with_tenant_and_rejects_cross_tenant_metadata():
    store = RecordingStore()
    access = TenantClinicalAccess(store=store, tenant_id="TENANT-A")

    await access.append_audit({"action": "EPISODE_VIEWED", "episode_id": "EP-1"})
    assert store.calls[-1][1][0]["tenant_id"] == "TENANT-A"

    with pytest.raises(ValueError, match="cross_tenant_audit_forbidden"):
        await access.append_audit({"tenant_id": "TENANT-B", "action": "EPISODE_VIEWED"})


def test_empty_tenant_fails_closed():
    with pytest.raises(ValueError, match="tenant_id_required"):
        TenantClinicalAccess(store=RecordingStore(), tenant_id="  ")
