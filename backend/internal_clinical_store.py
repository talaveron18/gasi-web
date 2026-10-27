from __future__ import annotations

from typing import Any, Dict, List, Optional
from pymongo import ReturnDocument


class InternalClinicalStore:
    """Persistent storage for the internal GASI clinical service.

    Collections are intentionally separate from public-site user data.
    Mongo `_id` is never exposed by this adapter.

    Tenant-scoped accessors are the required path for multiclient clinical
    reads/writes. Legacy unscoped accessors remain temporarily for migration
    callers and must not be used by tenant-facing routes.
    """

    def __init__(self, db):
        self.db = db
        self.episodes = db.internal_clinical_episodes
        self.workers = db.internal_clinical_workers
        self.audit = db.internal_clinical_audit
        self.counters = db.internal_clinical_counters

    async def ensure_indexes(self) -> None:
        await self.episodes.create_index("id", unique=True)
        await self.episodes.create_index([("tenant_id", 1), ("center", 1), ("status", 1)])
        await self.episodes.create_index([("tenant_id", 1), ("discipline", 1), ("created_at", -1)])

        # Worker identity is tenant-local. Remove the legacy global unique id
        # index before enforcing the compound key so two tenants may safely use
        # the same worker identifier without weakening uniqueness inside either
        # tenant. The explicit name makes this migration idempotent.
        worker_indexes = await self.workers.index_information()
        legacy_worker_id = worker_indexes.get("id_1")
        if legacy_worker_id and legacy_worker_id.get("unique") and legacy_worker_id.get("key") == [("id", 1)]:
            await self.workers.drop_index("id_1")
        await self.workers.create_index(
            [("tenant_id", 1), ("id", 1)],
            unique=True,
            name="tenant_worker_unique",
        )
        await self.audit.create_index([("tenant_id", 1), ("at", -1)])
        await self.audit.create_index([("tenant_id", 1), ("episode_id", 1), ("at", -1)])

    @staticmethod
    def clean(doc: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        if doc is None:
            return None
        value = dict(doc)
        value.pop("_id", None)
        return value

    @staticmethod
    def _tenant(tenant_id: str) -> str:
        value = (tenant_id or "").strip()
        if not value:
            raise ValueError("tenant_id_required")
        return value

    async def next_episode_id(self) -> str:
        row = await self.counters.find_one_and_update(
            {"_id": "episode"},
            {"$inc": {"value": 1}},
            upsert=True,
            return_document=ReturnDocument.AFTER,
        )
        return f"GASI-EP-{int(row['value']):06d}"

    async def get_episode(self, episode_id: str) -> Optional[Dict[str, Any]]:
        return self.clean(await self.episodes.find_one({"id": episode_id}))

    async def get_episode_for_tenant(self, tenant_id: str, episode_id: str) -> Optional[Dict[str, Any]]:
        tenant = self._tenant(tenant_id)
        return self.clean(await self.episodes.find_one({"tenant_id": tenant, "id": episode_id}))

    async def list_episodes(self, query: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        cursor = self.episodes.find(query or {}).sort("created_at", -1)
        return [self.clean(row) async for row in cursor]

    async def list_episodes_for_tenant(self, tenant_id: str, query: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        tenant = self._tenant(tenant_id)
        scoped = dict(query or {})
        if "tenant_id" in scoped and scoped["tenant_id"] != tenant:
            raise ValueError("cross_tenant_query_forbidden")
        scoped["tenant_id"] = tenant
        cursor = self.episodes.find(scoped).sort("created_at", -1)
        return [self.clean(row) async for row in cursor]

    async def insert_episode(self, episode: Dict[str, Any]) -> Dict[str, Any]:
        await self.episodes.insert_one(dict(episode))
        return dict(episode)

    async def insert_episode_for_tenant(self, tenant_id: str, episode: Dict[str, Any]) -> Dict[str, Any]:
        tenant = self._tenant(tenant_id)
        value = dict(episode)
        supplied = (value.get("tenant_id") or "").strip()
        if supplied and supplied != tenant:
            raise ValueError("cross_tenant_write_forbidden")
        value["tenant_id"] = tenant
        await self.episodes.insert_one(value)
        return value

    async def replace_episode(self, episode: Dict[str, Any]) -> Dict[str, Any]:
        result = await self.episodes.replace_one({"id": episode["id"]}, dict(episode), upsert=False)
        if result.matched_count != 1:
            raise KeyError(episode["id"])
        return dict(episode)

    async def replace_episode_for_tenant(self, tenant_id: str, episode: Dict[str, Any]) -> Dict[str, Any]:
        tenant = self._tenant(tenant_id)
        value = dict(episode)
        if (value.get("tenant_id") or "").strip() != tenant:
            raise ValueError("cross_tenant_write_forbidden")
        result = await self.episodes.replace_one({"tenant_id": tenant, "id": value["id"]}, value, upsert=False)
        if result.matched_count != 1:
            raise KeyError(value["id"])
        return value

    async def get_worker(self, worker_id: str) -> Optional[Dict[str, Any]]:
        return self.clean(await self.workers.find_one({"id": worker_id}))

    async def get_worker_for_tenant(self, tenant_id: str, worker_id: str) -> Optional[Dict[str, Any]]:
        tenant = self._tenant(tenant_id)
        return self.clean(await self.workers.find_one({"tenant_id": tenant, "id": worker_id}))

    async def list_workers(self) -> List[Dict[str, Any]]:
        return [self.clean(row) async for row in self.workers.find({}).sort("display_name", 1)]

    async def list_workers_for_tenant(self, tenant_id: str) -> List[Dict[str, Any]]:
        tenant = self._tenant(tenant_id)
        return [self.clean(row) async for row in self.workers.find({"tenant_id": tenant}).sort("display_name", 1)]

    async def insert_worker(self, worker: Dict[str, Any]) -> Dict[str, Any]:
        value = dict(worker)
        value.setdefault("auth_version", 1)
        await self.workers.insert_one(value)
        return value

    async def set_worker_state(self, worker_id: str, active: bool) -> Optional[Dict[str, Any]]:
        row = await self.workers.find_one_and_update(
            {"id": worker_id},
            {"$set": {"active": active}, "$inc": {"auth_version": 1}},
            return_document=ReturnDocument.AFTER,
        )
        return self.clean(row)

    async def set_worker_state_for_tenant(self, tenant_id: str, worker_id: str, active: bool) -> Optional[Dict[str, Any]]:
        tenant = self._tenant(tenant_id)
        row = await self.workers.find_one_and_update(
            {"tenant_id": tenant, "id": worker_id},
            {"$set": {"active": active}, "$inc": {"auth_version": 1}},
            return_document=ReturnDocument.AFTER,
        )
        return self.clean(row)

    async def rotate_auth_version(self, worker_id: str) -> Optional[Dict[str, Any]]:
        row = await self.workers.find_one_and_update(
            {"id": worker_id}, {"$inc": {"auth_version": 1}}, return_document=ReturnDocument.AFTER
        )
        return self.clean(row)

    async def rotate_auth_version_for_tenant(self, tenant_id: str, worker_id: str) -> Optional[Dict[str, Any]]:
        tenant = self._tenant(tenant_id)
        row = await self.workers.find_one_and_update(
            {"tenant_id": tenant, "id": worker_id}, {"$inc": {"auth_version": 1}}, return_document=ReturnDocument.AFTER
        )
        return self.clean(row)

    async def set_privilege(self, worker_id: str, privilege: str, grant: bool) -> Optional[Dict[str, Any]]:
        update = {"$addToSet": {"delegated_privileges": privilege}} if grant else {"$pull": {"delegated_privileges": privilege}}
        row = await self.workers.find_one_and_update(
            {"id": worker_id}, update, return_document=ReturnDocument.AFTER
        )
        return self.clean(row)

    async def set_privilege_for_tenant(self, tenant_id: str, worker_id: str, privilege: str, grant: bool) -> Optional[Dict[str, Any]]:
        tenant = self._tenant(tenant_id)
        update = {"$addToSet": {"delegated_privileges": privilege}} if grant else {"$pull": {"delegated_privileges": privilege}}
        row = await self.workers.find_one_and_update(
            {"tenant_id": tenant, "id": worker_id}, update, return_document=ReturnDocument.AFTER
        )
        return self.clean(row)

    async def append_audit(self, event: Dict[str, Any]) -> None:
        await self.audit.insert_one(dict(event))

    async def list_audit(self, limit: int = 1000) -> List[Dict[str, Any]]:
        cursor = self.audit.find({}).sort("at", -1).limit(limit)
        return [self.clean(row) async for row in cursor]

    async def seed_master(self, master_id: str, display_name: str, password_hash: str) -> None:
        await self.workers.update_one(
            {"id": master_id},
            {"$set": {"password_hash": password_hash}, "$setOnInsert": {
                "id": master_id,
                "role": "admin",
                "display_name": display_name,
                "centers": [],
                "active": True,
                "auth_version": 1,
                "delegated_privileges": [],
            }},
            upsert=True,
        )

    async def export_recovery_snapshot(self) -> Dict[str, Any]:
        """Export the complete internal-clinical data plane for controlled backup/restore."""
        episodes = [self.clean(row) async for row in self.episodes.find({}).sort("id", 1)]
        workers = [self.clean(row) async for row in self.workers.find({}).sort("id", 1)]
        audit = [self.clean(row) async for row in self.audit.find({}).sort("at", 1)]
        counters = [dict(row) async for row in self.counters.find({})]
        return {"schema_version": 1, "episodes": episodes, "workers": workers, "audit": audit, "counters": counters}

    async def restore_recovery_snapshot(self, snapshot: Dict[str, Any]) -> Dict[str, int]:
        """Replace only the internal-clinical collections from a validated snapshot."""
        if snapshot.get("schema_version") != 1:
            raise ValueError("unsupported_recovery_snapshot")
        required = ("episodes", "workers", "audit", "counters")
        if any(not isinstance(snapshot.get(key), list) for key in required):
            raise ValueError("invalid_recovery_snapshot")
        for row in snapshot["episodes"]:
            if not isinstance(row, dict) or not row.get("id") or not row.get("center"):
                raise ValueError("invalid_recovery_episode")
        for row in snapshot["workers"]:
            if not isinstance(row, dict) or not row.get("id") or not row.get("role"):
                raise ValueError("invalid_recovery_worker")
        client = getattr(self.db, "client", None)
        if client is None or not hasattr(client, "start_session"):
            raise RuntimeError("transactional_restore_required")
        async with await client.start_session() as session:
            async with session.start_transaction():
                await self.episodes.delete_many({}, session=session)
                await self.workers.delete_many({}, session=session)
                await self.audit.delete_many({}, session=session)
                await self.counters.delete_many({}, session=session)
                if snapshot["episodes"]: await self.episodes.insert_many([dict(x) for x in snapshot["episodes"]], session=session)
                if snapshot["workers"]: await self.workers.insert_many([dict(x) for x in snapshot["workers"]], session=session)
                if snapshot["audit"]: await self.audit.insert_many([dict(x) for x in snapshot["audit"]], session=session)
                if snapshot["counters"]: await self.counters.insert_many([dict(x) for x in snapshot["counters"]], session=session)
        await self.ensure_indexes()
        return {key: len(snapshot[key]) for key in required}