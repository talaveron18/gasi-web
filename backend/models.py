from pydantic import BaseModel, EmailStr, Field, ConfigDict, model_validator
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
    price: float = Field(ge=0)
    is_free: bool = True
    thumbnail: Optional[str] = None
    modules: List[CourseModule] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now())

class CourseCreate(BaseModel):
    title: str
    description: str
    duration: str
    type: str
    price: float = Field(default=0.0, ge=0)
    is_free: bool = True
    thumbnail: Optional[str] = None
    modules: List[CourseModule] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_structure_and_price(self):
        module_ids = [str(module.module_id) for module in self.modules]
        if len(module_ids) != len(set(module_ids)):
            raise ValueError("module_id must be unique within a course")
        if self.is_free:
            self.price = 0.0
        elif self.price <= 0:
            raise ValueError("paid courses require a positive price")
        return self

class EnrollmentCreate(BaseModel):
    course_id: str

class Enrollment(BaseModel):
    enrollment_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    course_id: str
    progress: float = Field(default=0.0, ge=0, le=100)
    completed_module_ids: List[str] = Field(default_factory=list)
    completed_at: Optional[datetime] = None
    certificate_id: Optional[str] = None
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