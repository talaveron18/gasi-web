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

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def initialize_internal_clinical_store():
    await clinical_store.ensure_indexes()
    await clinical_store.seed_master(
        os.environ.get('GASI_MASTER_ACTOR_ID', 'GASI-MASTER-01'),
        os.environ.get('GASI_MASTER_DISPLAY_NAME', 'Administración maestra GASI'),
    )

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
