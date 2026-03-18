from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from motor.motor_asyncio import AsyncIOMotorDatabase
from models import Course, CourseCreate
from auth import get_current_user
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import os
import json

router = APIRouter(prefix="/admin", tags=["admin"])

async def get_db():
    from server import db
    return db

async def verify_admin(current_user: dict = Depends(get_current_user), db: AsyncIOMotorDatabase = Depends(get_db)):
    user_doc = await db.users.find_one({"user_id": current_user["user_id"]}, {"_id": 0})
    if not user_doc or not user_doc.get("is_admin", False):
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

@router.post("/courses", response_model=Course)
async def admin_create_course(
    course_data: CourseCreate,
    current_user: dict = Depends(verify_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    course_id = f"course_{uuid.uuid4().hex[:12]}"
    course_doc = {
        "course_id": course_id,
        **course_data.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.courses.insert_one(course_doc)
    course_doc["created_at"] = datetime.fromisoformat(course_doc["created_at"])
    return Course(**course_doc)

@router.put("/courses/{course_id}", response_model=Course)
async def admin_update_course(
    course_id: str,
    course_data: CourseCreate,
    current_user: dict = Depends(verify_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    result = await db.courses.update_one(
        {"course_id": course_id},
        {"$set": {
            **course_data.model_dump(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Course not found")
    
    course = await db.courses.find_one({"course_id": course_id}, {"_id": 0})
    if isinstance(course.get("created_at"), str):
        course["created_at"] = datetime.fromisoformat(course["created_at"])
    return Course(**course)

@router.delete("/courses/{course_id}")
async def admin_delete_course(
    course_id: str,
    current_user: dict = Depends(verify_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    result = await db.courses.delete_one({"course_id": course_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Course not found")
    return {"message": "Course deleted successfully"}

@router.post("/courses/{course_id}/upload-pdf")
async def admin_upload_course_pdf(
    course_id: str,
    file: UploadFile = File(...),
    module_id: str = Form(...),
    current_user: dict = Depends(verify_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files allowed")
    
    upload_dir = f"/app/uploads/courses/{course_id}"
    os.makedirs(upload_dir, exist_ok=True)
    
    file_path = f"{upload_dir}/{uuid.uuid4().hex[:8]}_{file.filename}"
    
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)
    
    file_url = file_path.replace("/app", "")
    
    await db.courses.update_one(
        {"course_id": course_id, "modules.module_id": module_id},
        {"$push": {"modules.$.pdfs": file_url}}
    )
    
    return {"message": "PDF uploaded successfully", "url": file_url}

@router.get("/users")
async def admin_get_users(
    current_user: dict = Depends(verify_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return users

@router.post("/users/{user_id}/make-admin")
async def admin_make_user_admin(
    user_id: str,
    current_user: dict = Depends(verify_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    result = await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"is_admin": True}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "User is now admin"}
