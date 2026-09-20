from fastapi import APIRouter, HTTPException, Response, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from models import UserCreate, UserLogin, TokenResponse, UserResponse, SessionData
from auth import hash_password, verify_password, create_access_token, get_current_user
from datetime import datetime, timedelta, timezone
import uuid
import os
import httpx

router = APIRouter(prefix="/auth", tags=["auth"])

async def get_db():
    from server import db
    return db

def set_session_cookie(response: Response, token: str):
    set_session_cookie(response, token)

@router.post("/register", response_model=TokenResponse)
async def register(user: UserCreate, response: Response, db: AsyncIOMotorDatabase = Depends(get_db)):
    existing = await db.users.find_one({"email": user.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    user_doc = {
        "user_id": user_id,
        "email": user.email,
        "name": user.name,
        "password_hash": hash_password(user.password),
        "picture": None,
        "is_admin": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    
    token = create_access_token({"user_id": user_id, "email": user.email})
    
    user_response = UserResponse(
        user_id=user_id,
        email=user.email,
        name=user.name,
        picture=None,
        is_admin=False,
        created_at=datetime.now(timezone.utc)
    )
    
    session_doc = {
        "user_id": user_id,
        "session_token": token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.user_sessions.insert_one(session_doc)
    set_session_cookie(response, token)
    
    return TokenResponse(token=token, user=user_response)

@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin, response: Response, db: AsyncIOMotorDatabase = Depends(get_db)):
    user_doc = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(credentials.password, user_doc["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_access_token({"user_id": user_doc["user_id"], "email": user_doc["email"]})
    
    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=7*24*60*60,
        path="/"
    )
    
    session_doc = {
        "user_id": user_doc["user_id"],
        "session_token": token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.user_sessions.insert_one(session_doc)
    
    created_at = user_doc.get("created_at")
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at)
    elif created_at is None:
        created_at = datetime.now(timezone.utc)
    
    user_response = UserResponse(
        user_id=user_doc["user_id"],
        email=user_doc["email"],
        name=user_doc["name"],
        picture=user_doc.get("picture"),
        is_admin=user_doc.get("is_admin", False),
        created_at=created_at
    )
    
    return TokenResponse(token=token, user=user_response)

@router.get("/session", response_model=TokenResponse)
async def create_session_from_oauth(
    session_id: str,
    response: Response,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    oauth_backend_url = os.environ.get("OAUTH_BACKEND_URL", "").strip()
    if not oauth_backend_url or not oauth_backend_url.startswith("https://"):
        raise HTTPException(status_code=503, detail="oauth_not_configured")
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{oauth_backend_url}/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
        
        if resp.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session")
        
        oauth_data = resp.json()
    
    existing_user = await db.users.find_one({"email": oauth_data["email"]}, {"_id": 0})
    
    if existing_user:
        user_id = existing_user["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {
                "name": oauth_data["name"],
                "picture": oauth_data.get("picture")
            }}
        )
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user_doc = {
            "user_id": user_id,
            "email": oauth_data["email"],
            "name": oauth_data["name"],
            "picture": oauth_data.get("picture"),
            "password_hash": None,
            "is_admin": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(user_doc)
    
    token = create_access_token({"user_id": user_id, "email": oauth_data["email"]})
    set_session_cookie(response, token)
    
    session_doc = {
        "user_id": user_id,
        "session_token": token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.user_sessions.insert_one(session_doc)
    
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    created_at = user_doc.get("created_at")
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at)
    
    user_response = UserResponse(
        user_id=user_id,
        email=oauth_data["email"],
        name=oauth_data["name"],
        picture=oauth_data.get("picture"),
        is_admin=user_doc.get("is_admin", False),
        created_at=created_at
    )
    
    return TokenResponse(token=token, user=user_response)

@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    user_doc = await db.users.find_one({"user_id": current_user["user_id"]}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    created_at = user_doc.get("created_at")
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at)
    elif created_at is None:
        created_at = datetime.now(timezone.utc)
    
    return UserResponse(
        user_id=user_doc["user_id"],
        email=user_doc["email"],
        name=user_doc["name"],
        picture=user_doc.get("picture"),
        is_admin=user_doc.get("is_admin", False),
        created_at=created_at
    )

@router.post("/logout")
async def logout(
    response: Response,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    await db.user_sessions.delete_many({"user_id": current_user["user_id"]})
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out successfully"}