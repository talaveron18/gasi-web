import pytest

from internal_clinical_store import InternalClinicalStore


class Cursor:
    def __init__(self, rows): self.rows = list(rows)
    def sort(self, *_args): return self
    def __aiter__(self): self._iter = iter(self.rows); return self
    async def __anext__(self):
        try: return next(self._iter)
        except StopIteration: raise StopAsyncIteration

class Result:
    def __init__(self, matched_count): self.matched_count = matched_count

class Collection:
    def __init__(self, rows=None, indexes=None):
        self.rows = [dict(row) for row in (rows or [])]; self.indexes = dict(indexes or {"_id_": {"key": [("_id", 1)]}}); self.dropped_indexes = []
    @staticmethod
    def _matches(row, query):
        for key, expected in query.items():
            if isinstance(expected, dict) and "$in" in expected:
                if row.get(key) not in expected["$in"]: return False
            elif row.get(key) != expected: return False
        return True
    async def find_one(self, query): return next((dict(row) for row in self.rows if self._matches(row, query)), None)
    async def find_one_and_update(self, query, update, **_kwargs):
        for index, current in enumerate(self.rows):
            if not self._matches(current, query): continue
            value = dict(current)
            for key, item in update.get("$set", {}).items(): value[key] = item
            for key, item in update.get("$inc", {}).items(): value[key] = value.get(key, 0) + item
            for key, item in update.get("$addToSet", {}).items():
                items = list(value.get(key, []))
                if item not in items: items.append(item)
                value[key] = items
            for key, item in update.get("$pull", {}).items(): value[key] = [entry for entry in value.get(key, []) if entry != item]
            self.rows[index] = value; return dict(value)
        return None
    def find(self, query): return Cursor([dict(row) for row in self.rows if self._matches(row, query)])
    async def insert_one(self, row): self.rows.append(dict(row))
    async def replace_one(self, query, row, upsert=False):
        for index, current in enumerate(self.rows):
            if self._matches(current, query): self.rows[index] = dict(row); return Result(1)
        return Result(0)
    async def index_information(self): return dict(self.indexes)
    async def drop_index(self, name): self.dropped_indexes.append(name); self.indexes.pop(name, None)
    async def create_index(self, keys, **kwargs):
        if isinstance(keys, str): keys = [(keys, 1)]
        name = kwargs.get("name") or "_".join(f"{key}_{direction}" for key, direction in keys); self.indexes[name] = {"key": list(keys), **{key: value for key, value in kwargs.items() if key != "name"}}; return name

class DB:
    def __init__(self):
        self.internal_clinical_episodes = Collection([{"id":"EP-A","tenant_id":"TENANT-A","center":"CENTRO-1","created_at":"1"},{"id":"EP-B","tenant_id":"TENANT-B","center":"CENTRO-1","created_at":"2"}])
        self.internal_clinical_workers = Collection([{"id":"NURSE-SHARED","tenant_id":"TENANT-A","display_name":"A","active":True,"auth_version":1,"delegated_privileges":[]},{"id":"NURSE-SHARED","tenant_id":"TENANT-B","display_name":"B","active":True,"auth_version":7,"delegated_privileges":[]},{"id":"NURSE-B","tenant_id":"TENANT-B","display_name":"B2","active":True,"auth_version":1,"delegated_privileges":[]}], indexes={"_id_":{"key":[("_id",1)]},"id_1":{"key":[("id",1)],"unique":True}})
        self.internal_clinical_audit=Collection(); self.internal_clinical_counters=Collection()

@pytest.mark.asyncio
async def test_episode_lookup_is_tenant_scoped_even_when_centers_match():
    store=InternalClinicalStore(DB()); assert (await store.get_episode_for_tenant("TENANT-A","EP-A"))["id"]=="EP-A"; assert await store.get_episode_for_tenant("TENANT-A","EP-B") is None
@pytest.mark.asyncio
async def test_episode_listing_cannot_override_tenant_scope():
    store=InternalClinicalStore(DB()); rows=await store.list_episodes_for_tenant("TENANT-A",{"center":"CENTRO-1"}); assert [row["id"] for row in rows]==["EP-A"]
    with pytest.raises(ValueError,match="cross_tenant_query_forbidden"): await store.list_episodes_for_tenant("TENANT-A",{"tenant_id":"TENANT-B"})
@pytest.mark.asyncio
async def test_insert_and_replace_fail_closed_on_cross_tenant_payload():
    store=InternalClinicalStore(DB())
    with pytest.raises(ValueError,match="cross_tenant_write_forbidden"): await store.insert_episode_for_tenant("TENANT-A",{"id":"EP-X","tenant_id":"TENANT-B"})
    with pytest.raises(ValueError,match="cross_tenant_write_forbidden"): await store.replace_episode_for_tenant("TENANT-A",{"id":"EP-A","tenant_id":"TENANT-B"})
@pytest.mark.asyncio
async def test_worker_lookup_and_listing_do_not_cross_tenants():
    store=InternalClinicalStore(DB()); assert (await store.get_worker_for_tenant("TENANT-A","NURSE-SHARED"))["display_name"]=="A"; assert await store.get_worker_for_tenant("TENANT-A","NURSE-B") is None; assert {row["id"] for row in await store.list_workers_for_tenant("TENANT-B")}=={"NURSE-SHARED","NURSE-B"}
@pytest.mark.asyncio
async def test_worker_state_mutation_is_tenant_scoped_for_same_worker_id():
    store=InternalClinicalStore(DB()); changed=await store.set_worker_state_for_tenant("TENANT-A","NURSE-SHARED",False); assert changed["active"] is False; assert changed["auth_version"]==2; other=await store.get_worker_for_tenant("TENANT-B","NURSE-SHARED"); assert other["active"] is True; assert other["auth_version"]==7
@pytest.mark.asyncio
async def test_auth_rotation_and_privilege_mutation_do_not_cross_tenants_and_revoke_old_sessions():
    store=InternalClinicalStore(DB()); await store.rotate_auth_version_for_tenant("TENANT-B","NURSE-SHARED"); changed=await store.set_privilege_for_tenant("TENANT-B","NURSE-SHARED","worker_access_management",True); tenant_a=await store.get_worker_for_tenant("TENANT-A","NURSE-SHARED"); tenant_b=await store.get_worker_for_tenant("TENANT-B","NURSE-SHARED")
    assert tenant_a["auth_version"]==1; assert tenant_a["delegated_privileges"]==[]; assert changed["auth_version"]==9; assert tenant_b["auth_version"]==9; assert tenant_b["delegated_privileges"]==["worker_access_management"]
    revoked=await store.set_privilege_for_tenant("TENANT-B","NURSE-SHARED","worker_access_management",False); assert revoked["auth_version"]==10; assert revoked["delegated_privileges"]==[]
@pytest.mark.asyncio
async def test_worker_index_migrates_from_global_to_tenant_unique_key():
    db=DB(); store=InternalClinicalStore(db); await store.ensure_indexes(); assert db.internal_clinical_workers.dropped_indexes==["id_1"]; assert "id_1" not in db.internal_clinical_workers.indexes; assert db.internal_clinical_workers.indexes["tenant_worker_unique"]=={"key":[("tenant_id",1),("id",1)],"unique":True}; await store.ensure_indexes(); assert db.internal_clinical_workers.dropped_indexes==["id_1"]
@pytest.mark.asyncio
async def test_empty_tenant_fails_closed():
    store=InternalClinicalStore(DB())
    with pytest.raises(ValueError,match="tenant_id_required"): await store.get_episode_for_tenant(" ","EP-A")
    with pytest.raises(ValueError,match="tenant_id_required"): await store.rotate_auth_version_for_tenant(" ","NURSE-SHARED")
