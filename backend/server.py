from fastapi import FastAPI, APIRouter
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()

api_router = APIRouter(prefix="/api")

from routes import auth, courses, chatbot, contact, payments, admin, internal_prototype, internal_access_prototype
from internal_clinical_store import InternalClinicalStore
from auth import hash_password

clinical_store = InternalClinicalStore(db)

@api_router.get("/")
async def root():
    return {"message": "GASI API Server"}

api_router.include_router(auth.router)
api_router.include_router(courses.router)
api_router.include_router(chatbot.router)
api_router.include_router(contact.router)
api_router.include_router(payments.router)
api_router.include_router(admin.router)
api_router.include_router(internal_prototype.router)
api_router.include_router(internal_access_prototype.router)

app.include_router(api_router)

cors_origins = [origin.strip() for origin in os.environ.get('CORS_ORIGINS', '').split(',') if origin.strip()]
if not cors_origins:
    raise RuntimeError('CORS_ORIGINS must explicitly list trusted frontend origins')
if '*' in cors_origins:
    raise RuntimeError('CORS_ORIGINS wildcard is not permitted')

app.add_middleware(
    CORSMiddleware,
    allow_credentials=False,
    allow_origins=cors_origins,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def initialize_internal_clinical_store():
    await clinical_store.ensure_indexes()
    master_password = os.environ.get('GASI_MASTER_PASSWORD')
    session_secret = os.environ.get('GASI_INTERNAL_SESSION_SECRET')
    public_jwt_secret = os.environ.get('JWT_SECRET_KEY')
    if not public_jwt_secret or len(public_jwt_secret.encode('utf-8')) < 32:
        raise RuntimeError('JWT_SECRET_KEY must be configured with at least 32 bytes')
    if not master_password or len(master_password) < 12:
        raise RuntimeError('GASI_MASTER_PASSWORD must be configured with at least 12 characters')
    if not session_secret or len(session_secret.encode('utf-8')) < 32:
        raise RuntimeError('GASI_INTERNAL_SESSION_SECRET must be configured with at least 32 bytes')
    await clinical_store.seed_master(
        os.environ.get('GASI_MASTER_ACTOR_ID', 'GASI-MASTER-01'),
        os.environ.get('GASI_MASTER_DISPLAY_NAME', 'Administración maestra GASI'),
        hash_password(master_password),
    )
    await db.enrollments.create_index([('user_id', 1), ('course_id', 1)], unique=True, name='uniq_user_course_enrollment')

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
