from __future__ import annotations

from typing import Any, Dict, List, Optional
from pymongo import ReturnDocument


class InternalClinicalStore:
    """Persistent storage for the internal GASI clinical service.

    Collections are intentionally separate from public-site user data.
    Mongo `_id` is never exposed by this adapter.
    """

    def __init__(self, db):
        self.db = db
        self.episodes = db.internal_clinical_episodes
        self.workers = db.internal_clinical_workers
        self.audit = db.internal_clinical_audit
        self.counters = db.internal_clinical_counters

    async def ensure_indexes(self) -> None:
        await self.episodes.create_index("id", unique=True)
        await self.episodes.create_index([("center", 1), ("status", 1)])
        await self.episodes.create_index([("discipline", 1), ("created_at", -1)])
        await self.workers.create_index("id", unique=True)
        await self.audit.create_index([("at", -1)])
        await self.audit.create_index([("episode_id", 1), ("at", -1)])

    @staticmethod
    def clean(doc: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        if doc is None:
            return None
        value = dict(doc)
        value.pop("_id", None)
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

    async def list_episodes(self, query: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        cursor = self.episodes.find(query or {}).sort("created_at", -1)
        return [self.clean(row) async for row in cursor]

    async def insert_episode(self, episode: Dict[str, Any]) -> Dict[str, Any]:
        await self.episodes.insert_one(dict(episode))
        return dict(episode)

    async def replace_episode(self, episode: Dict[str, Any]) -> Dict[str, Any]:
        result = await self.episodes.replace_one({"id": episode["id"]}, dict(episode), upsert=False)
        if result.matched_count != 1:
            raise KeyError(episode["id"])
        return dict(episode)

    async def get_worker(self, worker_id: str) -> Optional[Dict[str, Any]]:
        return self.clean(await self.workers.find_one({"id": worker_id}))

    async def list_workers(self) -> List[Dict[str, Any]]:
        return [self.clean(row) async for row in self.workers.find({}).sort("display_name", 1)]

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

    async def rotate_auth_version(self, worker_id: str) -> Optional[Dict[str, Any]]:
        row = await self.workers.find_one_and_update(
            {"id": worker_id}, {"$inc": {"auth_version": 1}}, return_document=ReturnDocument.AFTER
        )
        return self.clean(row)

    async def set_privilege(self, worker_id: str, privilege: str, grant: bool) -> Optional[Dict[str, Any]]:
        update = {"$addToSet": {"delegated_privileges": privilege}} if grant else {"$pull": {"delegated_privileges": privilege}}
        row = await self.workers.find_one_and_update(
            {"id": worker_id}, update, return_document=ReturnDocument.AFTER
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
            {"$setOnInsert": {
                "id": master_id,
                "role": "admin",
                "display_name": display_name,
                "centers": [],
                "active": True,
                "auth_version": 1,
                "delegated_privileges": [],
                "password_hash": password_hash,
            }},
            upsert=True,
        )
