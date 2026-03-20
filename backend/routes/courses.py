from fastapi import APIRouter, HTTPException, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from models import Course, CourseCreate, Enrollment, EnrollmentCreate
from auth import get_current_user
from typing import List
from datetime import datetime, timezone
import uuid

router = APIRouter(prefix="/courses", tags=["courses"])

async def get_db():
    from server import db
    return db

@router.get("/", response_model=List[Course])
async def get_courses(db: AsyncIOMotorDatabase = Depends(get_db)):
    courses = await db.courses.find({}, {"_id": 0}).to_list(100)
    
    for course in courses:
        if isinstance(course.get("created_at"), str):
            course["created_at"] = datetime.fromisoformat(course["created_at"])
    
    return courses

@router.get("/{course_id}", response_model=Course)
async def get_course(course_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    course = await db.courses.find_one({"course_id": course_id}, {"_id": 0})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    if isinstance(course.get("created_at"), str):
        course["created_at"] = datetime.fromisoformat(course["created_at"])
    
    return course

@router.post("/", response_model=Course)
async def create_course(
    course_data: CourseCreate,
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
        "enrolled_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.enrollments.insert_one(enrollment_doc)
    enrollment_doc["enrolled_at"] = datetime.fromisoformat(enrollment_doc["enrolled_at"])
    return Enrollment(**enrollment_doc)