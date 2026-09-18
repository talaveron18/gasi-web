from __future__ import annotations
from typing import List,Literal,Optional
from fastapi import APIRouter,Header,HTTPException,status
from pydantic import BaseModel,Field
from auth import hash_password, verify_password
from internal_session_security import issue_session, sign_session_token
import os
from routes import internal_prototype
router=APIRouter(prefix='/internal-clinical',tags=['internal-clinical-access'])
AccessState=Literal['ACTIVE','REVOKED'];WorkerRole=Literal['nurse','physician','psychologist','physiotherapist','admin']
class AccessChangeInput(BaseModel):state:AccessState
class WorkerCreateInput(BaseModel):id:str=Field(min_length=3,max_length=120);display_name:str=Field(min_length=1,max_length=160);role:WorkerRole;centers:List[str]=Field(default_factory=list,max_length=50);temporary_password:str=Field(min_length=12,max_length=128)
class LoginInput(BaseModel):worker_id:str=Field(min_length=3,max_length=120);password:str=Field(min_length=1,max_length=128)
def _store():
 from server import clinical_store
 return clinical_store
async def _actor(authorization:Optional[str]):return await internal_prototype._actor(authorization)
def _can_manage_workers(actor):return actor['id']==internal_prototype.MASTER_ADMIN_ID or internal_prototype._has(actor,'worker_access_management')
def _require_worker_manager(actor):
 if not _can_manage_workers(actor):raise HTTPException(status_code=403,detail='worker_management_required')
def _profile(actor):return{'id':actor['id'],'role':actor['role'],'display_name':actor['display_name'],'centers':actor.get('centers',[]),'operational_state':'ACTIVE'if actor.get('active',True)else'REVOKED','delegated_privileges':sorted(actor.get('delegated_privileges',[]))}
@router.post('/login')
async def login(payload:LoginInput):
 worker=await _store().get_worker(payload.worker_id.strip())
 if not worker or not worker.get('active',True) or not worker.get('password_hash') or not verify_password(payload.password,worker['password_hash']):raise HTTPException(401,'invalid_credentials')
 session=issue_session(worker_id=worker['id'],auth_version=int(worker.get('auth_version',1)),ttl_minutes=int(os.environ.get('GASI_INTERNAL_SESSION_TTL_MINUTES','30')))
 token=sign_session_token(session,secret=os.environ.get('GASI_INTERNAL_SESSION_SECRET',''))
 await internal_prototype._audit(worker,'LOGIN_SUCCESS')
 return{'token':token,'expires_at':session.expires_at.isoformat(),'profile':_profile(worker)}
@router.post('/logout')
async def logout(authorization:Optional[str]=Header(default=None,alias='Authorization')):
 actor=await _actor(authorization);await _store().rotate_auth_version(actor['id']);await internal_prototype._audit(actor,'LOGOUT_ALL_SESSIONS');return{'ok':True}
@router.get('/session')
async def session_status(authorization:Optional[str]=Header(default=None,alias='Authorization')):
 actor=await _actor(authorization);await internal_prototype._audit(actor,'SESSION_VALIDATED');return{**_profile(actor),'active':actor.get('active',True)}
@router.get('/profile')
async def professional_profile(authorization:Optional[str]=Header(default=None,alias='Authorization')):
 actor=await _actor(authorization);await internal_prototype._audit(actor,'PROFILE_VIEWED');return _profile(actor)
@router.post('/workers',status_code=status.HTTP_201_CREATED)
async def create_worker(payload:WorkerCreateInput,authorization:Optional[str]=Header(default=None,alias='Authorization')):
 actor=await _actor(authorization);_require_worker_manager(actor);worker_id=internal_prototype._required(payload.id,'worker_id');display_name=internal_prototype._required(payload.display_name,'display_name')
 if await _store().get_worker(worker_id):raise HTTPException(409,'worker_already_exists')
 if payload.role=='admin':
  if payload.centers:raise HTTPException(422,'admin_cannot_have_clinical_centers')
  centers=[]
 else:
  if not payload.centers:raise HTTPException(422,'clinical_worker_requires_center')
  centers=[internal_prototype._required(c,'center')for c in payload.centers]
  if len(set(centers))!=len(centers):raise HTTPException(422,'duplicate_centers')
 worker={'id':worker_id,'role':payload.role,'display_name':display_name,'centers':centers,'active':True,'delegated_privileges':[],'password_hash':hash_password(payload.temporary_password)};await _store().insert_worker(worker);await internal_prototype._audit(actor,'IDENTITY_CREATED',metadata={'target_actor_id':worker_id,'target_role':payload.role,'center_count':len(centers)});return _profile(worker)
@router.post('/workers/{worker_id}/access')
async def change_worker_access(worker_id:str,payload:AccessChangeInput,authorization:Optional[str]=Header(default=None,alias='Authorization')):
 actor=await _actor(authorization);_require_worker_manager(actor);target=await _store().get_worker(worker_id)
 if not target:raise HTTPException(404,'worker_not_found')
 if target['id']==internal_prototype.MASTER_ADMIN_ID:raise HTTPException(409,'master_access_is_intrinsic')
 if target['id']==actor['id']and payload.state=='REVOKED':raise HTTPException(409,'self_revocation_not_allowed')
 target=await _store().set_worker_state(worker_id,payload.state=='ACTIVE');await internal_prototype._audit(actor,'IDENTITY_REACTIVATED'if target['active']else'IDENTITY_REVOKED',metadata={'target_actor_id':worker_id,'access_state':payload.state});return _profile(target)