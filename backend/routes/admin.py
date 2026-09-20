from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from motor.motor_asyncio import AsyncIOMotorDatabase
from models import Course, CourseCreate
from auth import get_current_user
from course_material_storage import (
    MAX_PDF_BYTES,
    CourseMaterialStorageError,
    get_course_material_storage,
)
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

@router.post("/courses/{course_id}/materials")
async def admin_upload_course_material(
    course_id: str,
    file: UploadFile = File(...),
    module_id: str = Form(...),
    current_user: dict = Depends(verify_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    course = await db.courses.find_one({"course_id": course_id}, {"_id": 0})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    modules = course.get("modules") or []
    if not any(str(module.get("module_id")) == module_id for module in modules):
        raise HTTPException(status_code=404, detail="material_module_not_found")

    filename = (file.filename or "").strip()
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=422, detail="invalid_material_type")
    content = await file.read(MAX_PDF_BYTES + 1)
    if not content or len(content) > MAX_PDF_BYTES:
        raise HTTPException(status_code=413, detail="invalid_material_size")
    if not content.startswith(b"%PDF-"):
        raise HTTPException(status_code=422, detail="invalid_pdf_content")

    material_id = f"mat_{uuid.uuid4().hex}"
    object_key = f"courses/{course_id}/{module_id}/{material_id}.pdf"
    try:
        storage = get_course_material_storage()
        storage.put_pdf(object_key=object_key, content=content)
    except CourseMaterialStorageError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception:
        raise HTTPException(status_code=502, detail="material_storage_unavailable")

    material_doc = {
        "material_id": material_id,
        "course_id": course_id,
        "module_id": module_id,
        "object_key": object_key,
        "filename": filename[:180],
        "content_type": "application/pdf",
        "size": len(content),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user["user_id"],
    }
    try:
        await db.course_materials.insert_one(material_doc)
    except Exception:
        try:
            storage.delete(object_key=object_key)
        except Exception:
            pass
        raise

    return {
        "material_id": material_id,
        "course_id": course_id,
        "module_id": module_id,
        "filename": material_doc["filename"],
        "content_type": material_doc["content_type"],
        "size": material_doc["size"],
        "created_at": material_doc["created_at"],
    }

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
