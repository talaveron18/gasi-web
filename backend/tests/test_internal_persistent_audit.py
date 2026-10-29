import pytest

from internal_audit_policy import GENESIS_HASH
from internal_persistent_audit import PersistentAuditStore


class Cursor:
    def __init__(self, rows): self.rows=list(rows); self._limit=None
    def sort(self, key, direction): self.rows.sort(key=lambda row: row.get(key, ""), reverse=direction < 0); return self
    def limit(self, value): self._limit=value; return self
    def __aiter__(self): self._iter=iter(self.rows[:self._limit] if self._limit else self.rows); return self
    async def __anext__(self):
        try: return next(self._iter)
        except StopIteration: raise StopAsyncIteration


class Collection:
    def __init__(self): self.rows=[]; self.indexes={}
    async def create_index(self, keys, **kwargs): self.indexes[kwargs.get("name")]=dict(keys=keys, **kwargs)
    async def find_one(self, query, sort=None):
        rows=[row for row in self.rows if all(row.get(k)==v for k,v in query.items())]
        if sort:
            for key,direction in reversed(sort): rows.sort(key=lambda row: row.get(key, ""), reverse=direction < 0)
        return dict(rows[0]) if rows else None
    async def insert_one(self, row): self.rows.append(dict(row))
    def find(self, query): return Cursor([dict(row) for row in self.rows if all(row.get(k)==v for k,v in query.items())])


@pytest.mark.asyncio
async def test_persistent_audit_derives_hash_chain_and_never_accepts_tenant_in_metadata():
    collection=Collection(); store=PersistentAuditStore(collection)
    first=await store.append(tenant_id="TENANT-A", actor_id="A-1", actor_role="nurse", action="EPISODE_VIEWED", at="2026-10-29T01:00:00+00:00")
    second=await store.append(tenant_id="TENANT-A", actor_id="A-1", actor_role="nurse", action="EPISODES_LIST_VIEWED", metadata={"count":2}, at="2026-10-29T01:01:00+00:00")
    assert first["previous_hash"]==GENESIS_HASH
    assert second["previous_hash"]==first["event_hash"]
    assert first["tenant_id"]=="TENANT-A" and "tenant_id" not in first["metadata"]


@pytest.mark.asyncio
async def test_tenant_timelines_are_isolated_even_with_same_actor_id():
    collection=Collection(); store=PersistentAuditStore(collection)
    await store.append(tenant_id="TENANT-A", actor_id="SHARED", actor_role="nurse", action="EPISODE_VIEWED", at="2026-10-29T01:00:00+00:00")
    b=await store.append(tenant_id="TENANT-B", actor_id="SHARED", actor_role="nurse", action="EPISODE_VIEWED", at="2026-10-29T01:00:00+00:00")
    assert b["previous_hash"]==GENESIS_HASH
    assert len(await store.list_for_tenant("TENANT-A"))==1
    assert len(await store.list_for_tenant("TENANT-B"))==1


@pytest.mark.asyncio
async def test_persistence_rejects_clinical_content_secrets_nested_metadata_and_empty_tenant():
    store=PersistentAuditStore(Collection())
    for metadata in ({"clinical_content":"x"},{"access_token":"secret"},{"safe":{"nested":"no"}}):
        with pytest.raises(ValueError):
            await store.append(tenant_id="TENANT-A", actor_id="A", actor_role="nurse", action="VIEW", metadata=metadata)
    with pytest.raises(ValueError, match="tenant_id_required"):
        await store.append(tenant_id=" ", actor_id="A", actor_role="nurse", action="VIEW")


@pytest.mark.asyncio
async def test_indexes_and_list_limit_are_tenant_scoped_and_bounded():
    collection=Collection(); store=PersistentAuditStore(collection); await store.ensure_indexes()
    assert collection.indexes["tenant_audit_event_hash_unique"]["unique"] is True
    assert collection.indexes["tenant_audit_event_hash_unique"]["keys"][:1]==[("tenant_id",1)]
    for i in range(3):
        await store.append(tenant_id="TENANT-A", actor_id="A", actor_role="nurse", action="VIEW", at=f"2026-10-29T01:0{i}:00+00:00")
    rows=await store.list_for_tenant("TENANT-A", limit=2)
    assert len(rows)==2 and all(row["tenant_id"]=="TENANT-A" for row in rows)
