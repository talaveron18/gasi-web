import pytest
from copy import deepcopy
from internal_clinical_store import InternalClinicalStore

class Cursor:
    def __init__(self, rows): self.rows=list(rows)
    def sort(self,*args):
        key=args[0]; self.rows.sort(key=lambda x: str(x.get(key,''))); return self
    def __aiter__(self): self._i=iter(self.rows); return self
    async def __anext__(self):
        try:return next(self._i)
        except StopIteration:raise StopAsyncIteration

class Collection:
    def __init__(self, db, name, rows=None):
        self.db=db; self.name=name; self.rows=[dict(x) for x in (rows or [])]; self.fail_insert=False
    def find(self,q): return Cursor(self.rows)
    async def delete_many(self,q,session=None): self.rows=[]
    async def insert_many(self,rows,session=None):
        if self.fail_insert: raise RuntimeError("injected_database_failure")
        self.rows.extend(dict(x) for x in rows)
    async def create_index(self,*args,**kwargs): return None

class Transaction:
    def __init__(self, db): self.db=db; self.before=None
    async def __aenter__(self):
        self.before=self.db.snapshot_rows(); return self
    async def __aexit__(self,exc_type,exc,tb):
        if exc_type: self.db.restore_rows(self.before)
        return False

class Session:
    def __init__(self, db): self.db=db
    async def __aenter__(self): return self
    async def __aexit__(self,*args): return False
    def start_transaction(self): return Transaction(self.db)

class Client:
    def __init__(self, db): self.db=db
    async def start_session(self): return Session(self.db)

class DB:
    def __init__(self, transactional=True):
        self.internal_clinical_episodes=Collection(self,'episodes',[{'id':'GASI-EP-000001','center':'A','summary':'one'},{'id':'GASI-EP-000002','center':'B','summary':'two'}])
        self.internal_clinical_workers=Collection(self,'workers',[{'id':'N-A','role':'nurse','centers':['A'],'auth_version':1},{'id':'N-B','role':'nurse','centers':['B'],'auth_version':2}])
        self.internal_clinical_audit=Collection(self,'audit',[{'at':'2026-09-18T10:00:00Z','action':'EPISODE_CREATED','episode_id':'GASI-EP-000001'}])
        self.internal_clinical_counters=Collection(self,'counters',[{'_id':'episode','value':2}])
        if transactional: self.client=Client(self)
    def collections(self):
        return [self.internal_clinical_episodes,self.internal_clinical_workers,self.internal_clinical_audit,self.internal_clinical_counters]
    def snapshot_rows(self): return [deepcopy(c.rows) for c in self.collections()]
    def restore_rows(self, rows):
        for collection,data in zip(self.collections(),rows): collection.rows=deepcopy(data)

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
async def test_mid_restore_database_failure_rolls_back_every_collection():
    db=DB(); store=InternalClinicalStore(db); snapshot=await store.export_recovery_snapshot(); before=db.snapshot_rows()
    db.internal_clinical_workers.fail_insert=True
    with pytest.raises(RuntimeError,match='injected_database_failure'):
        await store.restore_recovery_snapshot(snapshot)
    assert db.snapshot_rows()==before

@pytest.mark.asyncio
async def test_restore_fails_closed_without_transaction_support():
    db=DB(transactional=False); store=InternalClinicalStore(db); snapshot=await store.export_recovery_snapshot(); before=db.snapshot_rows()
    with pytest.raises(RuntimeError,match='transactional_restore_required'):
        await store.restore_recovery_snapshot(snapshot)
    assert db.snapshot_rows()==before

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
