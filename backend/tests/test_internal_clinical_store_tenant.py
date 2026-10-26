import pytest

from internal_clinical_store import InternalClinicalStore


class Cursor:
    def __init__(self, rows):
        self.rows = list(rows)

    def sort(self, *_args):
        return self

    def __aiter__(self):
        self._iter = iter(self.rows)
        return self

    async def __anext__(self):
        try:
            return next(self._iter)
        except StopIteration:
            raise StopAsyncIteration


class Result:
    def __init__(self, matched_count):
        self.matched_count = matched_count


class Collection:
    def __init__(self, rows=None):
        self.rows = [dict(row) for row in (rows or [])]

    @staticmethod
    def _matches(row, query):
        for key, expected in query.items():
            if isinstance(expected, dict) and "$in" in expected:
                if row.get(key) not in expected["$in"]:
                    return False
            elif row.get(key) != expected:
                return False
        return True

    async def find_one(self, query):
        return next((dict(row) for row in self.rows if self._matches(row, query)), None)

    def find(self, query):
        return Cursor([dict(row) for row in self.rows if self._matches(row, query)])

    async def insert_one(self, row):
        self.rows.append(dict(row))

    async def replace_one(self, query, row, upsert=False):
        for index, current in enumerate(self.rows):
            if self._matches(current, query):
                self.rows[index] = dict(row)
                return Result(1)
        return Result(0)

    async def create_index(self, *_args, **_kwargs):
        return None


class DB:
    def __init__(self):
        self.internal_clinical_episodes = Collection([
            {"id": "EP-A", "tenant_id": "TENANT-A", "center": "CENTRO-1", "created_at": "1"},
            {"id": "EP-B", "tenant_id": "TENANT-B", "center": "CENTRO-1", "created_at": "2"},
        ])
        self.internal_clinical_workers = Collection([
            {"id": "NURSE-A", "tenant_id": "TENANT-A", "display_name": "A"},
            {"id": "NURSE-B", "tenant_id": "TENANT-B", "display_name": "B"},
        ])
        self.internal_clinical_audit = Collection()
        self.internal_clinical_counters = Collection()


@pytest.mark.asyncio
async def test_episode_lookup_is_tenant_scoped_even_when_centers_match():
    store = InternalClinicalStore(DB())
    assert (await store.get_episode_for_tenant("TENANT-A", "EP-A"))["id"] == "EP-A"
    assert await store.get_episode_for_tenant("TENANT-A", "EP-B") is None


@pytest.mark.asyncio
async def test_episode_listing_cannot_override_tenant_scope():
    store = InternalClinicalStore(DB())
    rows = await store.list_episodes_for_tenant("TENANT-A", {"center": "CENTRO-1"})
    assert [row["id"] for row in rows] == ["EP-A"]
    with pytest.raises(ValueError, match="cross_tenant_query_forbidden"):
        await store.list_episodes_for_tenant("TENANT-A", {"tenant_id": "TENANT-B"})


@pytest.mark.asyncio
async def test_insert_and_replace_fail_closed_on_cross_tenant_payload():
    store = InternalClinicalStore(DB())
    with pytest.raises(ValueError, match="cross_tenant_write_forbidden"):
        await store.insert_episode_for_tenant("TENANT-A", {"id": "EP-X", "tenant_id": "TENANT-B"})
    with pytest.raises(ValueError, match="cross_tenant_write_forbidden"):
        await store.replace_episode_for_tenant("TENANT-A", {"id": "EP-A", "tenant_id": "TENANT-B"})


@pytest.mark.asyncio
async def test_worker_lookup_and_listing_do_not_cross_tenants():
    store = InternalClinicalStore(DB())
    assert (await store.get_worker_for_tenant("TENANT-A", "NURSE-A"))["id"] == "NURSE-A"
    assert await store.get_worker_for_tenant("TENANT-A", "NURSE-B") is None
    assert [row["id"] for row in await store.list_workers_for_tenant("TENANT-B")] == ["NURSE-B"]


@pytest.mark.asyncio
async def test_empty_tenant_fails_closed():
    store = InternalClinicalStore(DB())
    with pytest.raises(ValueError, match="tenant_id_required"):
        await store.get_episode_for_tenant(" ", "EP-A")
