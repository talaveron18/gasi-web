from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid

class UserBase(BaseModel):
    email: EmailStr
    name: str = Field(min_length=2, max_length=80)

class UserCreate(UserBase):
    password: str = Field(min_length=12, max_length=128)

class UserResponse(UserBase):
    user_id: str
    picture: Optional[str] = None
    is_admin: bool = False
    created_at: datetime

class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)

class TokenResponse(BaseModel):
    token: str
    user: UserResponse

class CourseModule(BaseModel):
    module_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    order: int
    description: Optional[str] = None

class Course(BaseModel):
    course_id: str = Field(default_factory=lambda: f"course_{uuid.uuid4().hex[:12]}")
    title: str
    description: str
    duration: str
    type: str
    price: float
    is_free: bool = True
    thumbnail: Optional[str] = None
    modules: List[CourseModule] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now())

class CourseCreate(BaseModel):
    title: str
    description: str
    duration: str
    type: str
    price: float = 0.0
    is_free: bool = True
    thumbnail: Optional[str] = None
    modules: List[CourseModule] = []

class EnrollmentCreate(BaseModel):
    course_id: str

class Enrollment(BaseModel):
    enrollment_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    course_id: str
    progress: float = 0.0
    enrolled_at: datetime = Field(default_factory=lambda: datetime.now())

class ChatMessage(BaseModel):
    message: str
    session_id: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    session_id: str
    buttons: Optional[List[Dict[str, str]]] = None

class ContactForm(BaseModel):
    name: str
    company: str
    email: EmailStr
    phone: str
    employee_count: Optional[str] = None
    service_type: str
    message: str
    accepts_privacy: bool

class SessionData(BaseModel):
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now())