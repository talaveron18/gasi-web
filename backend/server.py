"""Legacy Python harness for internal policy/compatibility tests only.

Production GASI Web V1 is deployed from Netlify:
- public web API: netlify/functions/public-api.mts
- internal clinical API: netlify/functions/internal-clinical.mts

This FastAPI/Mongo harness is deliberately opt-in so it cannot be mistaken
for a production entrypoint.
"""

import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI
from motor.motor_asyncio import AsyncIOMotorClient

if os.environ.get("GASI_ENABLE_LEGACY_INTERNAL_HARNESS") != "1":
    raise RuntimeError(
        "backend/server.py is a legacy internal test harness; "
        "set GASI_ENABLE_LEGACY_INTERNAL_HARNESS=1 only for controlled local compatibility tests"
    )

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

from auth import hash_password
from internal_clinical_store import InternalClinicalStore
from routes import internal_access_prototype, internal_prototype

app = FastAPI(title="GASI legacy internal harness")
api_router = APIRouter(prefix="/api")
clinical_store = InternalClinicalStore(db)

api_router.include_router(internal_prototype.router)
api_router.include_router(internal_access_prototype.router)
app.include_router(api_router)


@app.on_event("startup")
async def initialize_internal_clinical_store():
    await clinical_store.ensure_indexes()
    master_password = os.environ.get("GASI_MASTER_PASSWORD")
    session_secret = os.environ.get("GASI_INTERNAL_SESSION_SECRET")
    if not master_password or len(master_password) < 12:
        raise RuntimeError("GASI_MASTER_PASSWORD must be configured with at least 12 characters")
    if not session_secret or len(session_secret.encode("utf-8")) < 32:
        raise RuntimeError("GASI_INTERNAL_SESSION_SECRET must be configured with at least 32 bytes")
    await clinical_store.seed_master(
        os.environ.get("GASI_MASTER_ACTOR_ID", "GASI-MASTER-01"),
        os.environ.get("GASI_MASTER_DISPLAY_NAME", "Administración maestra GASI"),
        hash_password(master_password),
    )


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
