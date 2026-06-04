from pydantic import BaseModel, EmailStr
from typing import List, Optional
import datetime

# --- Student Schemas ---
class StudentBase(BaseModel):
    student_id: str
    name: str
    email: EmailStr
    phone: Optional[str] = None
    status: Optional[str] = "Active"
    enrollment_date: Optional[datetime.date] = None

class StudentCreate(StudentBase):
    pass

class StudentUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    status: Optional[str] = None
    enrollment_date: Optional[datetime.date] = None

class StudentImageResponse(BaseModel):
    id: int
    student_id: str
    file_path: str
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class StudentResponse(StudentBase):
    id: int
    created_at: datetime.datetime
    attendance_percentage: float = 100.0
    images: List[StudentImageResponse] = []

    class Config:
        from_attributes = True

# --- Attendance Schemas ---
class AttendanceBase(BaseModel):
    student_id: str
    status: str = "PRESENT"
    method: str = "LIVE_CAMERA"

class AttendanceCreate(AttendanceBase):
    date: Optional[datetime.date] = None
    timestamp: Optional[datetime.datetime] = None

class AttendanceResponse(BaseModel):
    id: int
    student_id: str
    date: datetime.date
    timestamp: datetime.datetime
    status: str
    method: str
    student_name: Optional[str] = None

    class Config:
        from_attributes = True

# --- Unknown Logs ---
class UnknownLogResponse(BaseModel):
    id: int
    image_path: str
    timestamp: datetime.datetime
    resolved: bool

    class Config:
        from_attributes = True

# --- Dashboard Stats ---
class DashboardStats(BaseModel):
    total_students: int
    present_today: int
    absent_today: int
    attendance_percentage: float
