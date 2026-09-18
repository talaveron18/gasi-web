import pytest
from internal_clinical_store import InternalClinicalStore

class Result:
    def __init__(self, matched_count=1): self.matched_count=matched_count
class Cursor:
    def __init__(self, rows): self.rows=list(rows)
    def sort(self,*args):
        key=args[0]; self.rows.sort(key=lambda x: str(x.get(key,''))); return self
    def __aiter__(self): self._i=iter(self.rows); return self
    async def __anext__(self):
        try:return next(self._i)
        except StopIteration:raise StopAsyncIteration
class Collection:
    def __init__(self, rows=None): self.rows=[dict(x) for x in (rows or [])]
    def find(self,q): return Cursor(self.rows)
    async def delete_many(self,q): self.rows=[]
    async def insert_many(self,rows): self.rows.extend(dict(x) for x in rows)
    async def create_index(self,*args,**kwargs): return None
class DB:
    def __init__(self):
        self.internal_clinical_episodes=Collection([{'id':'GASI-EP-000001','center':'A','summary':'one'},{'id':'GASI-EP-000002','center':'B','summary':'two'}])
        self.internal_clinical_workers=Collection([{'id':'N-A','role':'nurse','centers':['A'],'auth_version':1},{'id':'N-B','role':'nurse','centers':['B'],'auth_version':2}])
        self.internal_clinical_audit=Collection([{'at':'2026-09-18T10:00:00Z','action':'EPISODE_CREATED','episode_id':'GASI-EP-000001'}])
        self.internal_clinical_counters=Collection([{'_id':'episode','value':2}])

@pytest.mark.asyncio
async def test_snapshot_restore_roundtrip_preserves_all_clinical_collections():
    db=DB(); store=InternalClinicalStore(db); snapshot=await store.export_recovery_snapshot()
    db.internal_clinical_episodes.rows=[{'id':'BROKEN','center':'X'}]; db.internal_clinical_workers.rows=[]; db.internal_clinical_audit.rows=[]; db.internal_clinical_counters.rows=[]
    counts=await store.restore_recovery_snapshot(snapshot)
    restored=await store.export_recovery_snapshot()
    assert restored==snapshot
    assert counts=={'episodes':2,'workers':2,'audit':1,'counters':1}
    assert {x['center'] for x in restored['episodes']}=={'A','B'}

@pytest.mark.asyncio
async def test_invalid_snapshot_fails_before_destructive_changes():
    db=DB(); store=InternalClinicalStore(db); before=await store.export_recovery_snapshot()
    with pytest.raises(ValueError,match='invalid_recovery_episode'):
        await store.restore_recovery_snapshot({'schema_version':1,'episodes':[{'id':'bad'}],'workers':[],'audit':[],'counters':[]})
    assert await store.export_recovery_snapshot()==before

@pytest.mark.asyncio
async def test_unknown_snapshot_version_fails_closed():
    db=DB(); store=InternalClinicalStore(db); before=await store.export_recovery_snapshot()
    with pytest.raises(ValueError,match='unsupported_recovery_snapshot'):
        await store.restore_recovery_snapshot({'schema_version':99,'episodes':[],'workers':[],'audit':[],'counters':[]})
    assert await store.export_recovery_snapshot()==before
