from fastapi import APIRouter, HTTPException, Depends, Response
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorDatabase
from models import Course, CourseCreate, Enrollment, EnrollmentCreate
from auth import get_current_user
from course_material_storage import CourseMaterialStorageError, get_course_material_storage
from course_certificate import build_course_certificate_pdf
from typing import List
import re
import hashlib
from datetime import datetime, timezone
import uuid

router = APIRouter(prefix="/courses", tags=["courses"])

async def get_db():
    from server import db
    return db

async def require_admin(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    user = await db.users.find_one({"user_id": current_user["user_id"]}, {"_id": 0, "is_admin": 1})
    if not user or not user.get("is_admin", False):
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

async def require_course_access(course_id: str, current_user: dict, db: AsyncIOMotorDatabase):
    user = await db.users.find_one(
        {"user_id": current_user["user_id"]},
        {"_id": 0, "is_admin": 1}
    )
    if user and user.get("is_admin", False):
        return
    enrollment = await db.enrollments.find_one(
        {"user_id": current_user["user_id"], "course_id": course_id},
        {"_id": 0, "enrollment_id": 1}
    )
    if not enrollment:
        raise HTTPException(status_code=403, detail="course_access_required")


def safe_inline_filename(value: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9._ -]+", "_", value or "material.pdf").strip(" .")
    if not cleaned.lower().endswith(".pdf"):
        cleaned = f"{cleaned or 'material'}.pdf"
    return cleaned[:180]


def enrollment_progress_payload(enrollment: dict, course: dict):
    module_ids = [str(module.get("module_id")) for module in (course.get("modules") or [])]
    completed = [str(value) for value in (enrollment.get("completed_module_ids") or []) if str(value) in set(module_ids)]
    total = len(module_ids)
    progress = round((len(set(completed)) / total) * 100, 2) if total else 0.0
    return {
        "course_id": course["course_id"],
        "completed_module_ids": sorted(set(completed)),
        "completed_modules": len(set(completed)),
        "total_modules": total,
        "progress": progress,
        "completed_at": enrollment.get("completed_at"),
        "certificate_id": enrollment.get("certificate_id"),
    }

@router.get("/", response_model=List[Course])
async def get_courses(db: AsyncIOMotorDatabase = Depends(get_db)):
    courses = await db.courses.find({}, {"_id": 0}).to_list(100)
    
    for course in courses:
        if isinstance(course.get("created_at"), str):
            course["created_at"] = datetime.fromisoformat(course["created_at"])
    
    return courses

@router.post("/", response_model=Course)
async def create_course(
    course_data: CourseCreate,
    current_user: dict = Depends(require_admin),
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

@router.get("/enrollments/my", response_model=List[dict])
async def get_my_enrollments(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    enrollments = await db.enrollments.find(
        {"user_id": current_user["user_id"]},
        {"_id": 0}
    ).to_list(100)
    
    # Batch fetch all courses in a single query (avoid N+1)
    course_ids = [e["course_id"] for e in enrollments]
    courses_list = await db.courses.find(
        {"course_id": {"$in": course_ids}},
        {"_id": 0}
    ).to_list(100)
    courses_dict = {c["course_id"]: c for c in courses_list}
    
    result = []
    for enrollment in enrollments:
        course = courses_dict.get(enrollment["course_id"])
        if course:
            if isinstance(course.get("created_at"), str):
                course["created_at"] = datetime.fromisoformat(course["created_at"])
            result.append({
                "enrollment": enrollment,
                "course": course
            })
    
    return result

@router.get("/{course_id}/materials")
async def list_course_materials(
    course_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    course = await db.courses.find_one({"course_id": course_id}, {"_id": 0, "course_id": 1})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    await require_course_access(course_id, current_user, db)
    materials = await db.course_materials.find(
        {"course_id": course_id},
        {"_id": 0, "object_key": 0, "created_by": 0}
    ).to_list(500)
    return [material for material in materials if material.get("status") != "DELETING"]


@router.get("/{course_id}/materials/{material_id}/content")
async def stream_course_material(
    course_id: str,
    material_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    course = await db.courses.find_one({"course_id": course_id}, {"_id": 0, "course_id": 1})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    await require_course_access(course_id, current_user, db)
    material = await db.course_materials.find_one(
        {"material_id": material_id, "course_id": course_id},
        {"_id": 0}
    )
    if not material or material.get("status") == "DELETING":
        raise HTTPException(status_code=404, detail="material_not_found")
    if material.get("content_type") != "application/pdf":
        raise HTTPException(status_code=415, detail="unsupported_material_type")

    try:
        stored = get_course_material_storage().get_pdf(object_key=material["object_key"])
    except CourseMaterialStorageError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception:
        raise HTTPException(status_code=502, detail="material_storage_unavailable")

    filename = safe_inline_filename(material.get("filename") or "material.pdf")
    body = stored.body.iter_chunks(chunk_size=64 * 1024) if hasattr(stored.body, "iter_chunks") else stored.body
    headers = {
        "Cache-Control": "private, no-store",
        "Content-Disposition": f'inline; filename="{filename}"',
        "X-Content-Type-Options": "nosniff",
    }
    if stored.content_length > 0:
        headers["Content-Length"] = str(stored.content_length)
    return StreamingResponse(body, media_type="application/pdf", headers=headers)


@router.get("/{course_id}/progress")
async def get_course_progress(
    course_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    course = await db.courses.find_one({"course_id": course_id}, {"_id": 0})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    enrollment = await db.enrollments.find_one(
        {"user_id": current_user["user_id"], "course_id": course_id},
        {"_id": 0}
    )
    if not enrollment:
        raise HTTPException(status_code=403, detail="course_access_required")
    return enrollment_progress_payload(enrollment, course)


@router.post("/{course_id}/modules/{module_id}/complete")
async def complete_course_module(
    course_id: str,
    module_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    course = await db.courses.find_one({"course_id": course_id}, {"_id": 0})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    module_ids = [str(module.get("module_id")) for module in (course.get("modules") or [])]
    if module_id not in module_ids:
        raise HTTPException(status_code=404, detail="module_not_found")

    enrollment = await db.enrollments.find_one(
        {"user_id": current_user["user_id"], "course_id": course_id},
        {"_id": 0}
    )
    if not enrollment:
        raise HTTPException(status_code=403, detail="course_access_required")

    await db.enrollments.update_one(
        {"user_id": current_user["user_id"], "course_id": course_id},
        {"$addToSet": {"completed_module_ids": module_id}}
    )
    updated = await db.enrollments.find_one(
        {"user_id": current_user["user_id"], "course_id": course_id},
        {"_id": 0}
    )
    completed = {str(value) for value in (updated.get("completed_module_ids") or []) if str(value) in set(module_ids)}
    progress = round((len(completed) / len(module_ids)) * 100, 2) if module_ids else 0.0

    completion_update = {"$max": {"progress": progress}}
    if progress == 100.0:
        completed_at = updated.get("completed_at") or datetime.now(timezone.utc).isoformat()
        enrollment_id = str(updated.get("enrollment_id") or f"{current_user['user_id']}:{course_id}")
        certificate_id = "GASI-" + hashlib.sha256(enrollment_id.encode("utf-8")).hexdigest()[:16].upper()
        completion_update["$set"] = {
            "completed_at": completed_at,
            "certificate_id": certificate_id,
        }

    await db.enrollments.update_one(
        {"user_id": current_user["user_id"], "course_id": course_id},
        completion_update
    )
    final_enrollment = await db.enrollments.find_one(
        {"user_id": current_user["user_id"], "course_id": course_id},
        {"_id": 0}
    )
    return enrollment_progress_payload(final_enrollment, course)


@router.get("/{course_id}/certificate")
async def get_course_certificate(
    course_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    course = await db.courses.find_one({"course_id": course_id}, {"_id": 0})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    enrollment = await db.enrollments.find_one(
        {"user_id": current_user["user_id"], "course_id": course_id},
        {"_id": 0}
    )
    if not enrollment:
        raise HTTPException(status_code=403, detail="course_access_required")
    state = enrollment_progress_payload(enrollment, course)
    if state["progress"] < 100 or not enrollment.get("completed_at") or not enrollment.get("certificate_id"):
        raise HTTPException(status_code=409, detail="course_not_completed")

    user = await db.users.find_one(
        {"user_id": current_user["user_id"]},
        {"_id": 0, "name": 1}
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    try:
        completed_at = datetime.fromisoformat(str(enrollment["completed_at"]))
    except (TypeError, ValueError):
        raise HTTPException(status_code=409, detail="course_completion_invalid")

    pdf = build_course_certificate_pdf(
        student_name=user["name"],
        course_title=course["title"],
        certificate_id=enrollment["certificate_id"],
        completed_at=completed_at,
    )
    filename = f"certificado-{enrollment['certificate_id']}.pdf"
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={
            "Cache-Control": "private, no-store",
            "Content-Disposition": f'attachment; filename="{filename}"',
            "X-Content-Type-Options": "nosniff",
        },
    )


@router.get("/{course_id}", response_model=Course)
async def get_course(course_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    course = await db.courses.find_one({"course_id": course_id}, {"_id": 0})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    if isinstance(course.get("created_at"), str):
        course["created_at"] = datetime.fromisoformat(course["created_at"])
    
    return course

@router.post("/enroll", response_model=Enrollment)
async def enroll_course(
    enrollment_data: EnrollmentCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    course = await db.courses.find_one(
        {"course_id": enrollment_data.course_id},
        {"_id": 0}
    )
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if not course.get("is_free", True):
        raise HTTPException(status_code=402, detail="payment_required")
    
    existing = await db.enrollments.find_one({
        "user_id": current_user["user_id"],
        "course_id": enrollment_data.course_id
    }, {"_id": 0})
    
    if existing:
        raise HTTPException(status_code=400, detail="Already enrolled")
    
    enrollment_doc = {
        "enrollment_id": str(uuid.uuid4()),
        "user_id": current_user["user_id"],
        "course_id": enrollment_data.course_id,
        "progress": 0.0,
        "completed_module_ids": [],
        "completed_at": None,
        "certificate_id": None,
        "enrolled_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.enrollments.insert_one(enrollment_doc)
    enrollment_doc["enrolled_at"] = datetime.fromisoformat(enrollment_doc["enrolled_at"])
    return Enrollment(**enrollment_doc)