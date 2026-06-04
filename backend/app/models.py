import datetime
from sqlalchemy import Column, Integer, String, Date, DateTime, Boolean, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    phone = Column(String(20), nullable=True)
    enrollment_date = Column(Date, default=datetime.date.today)
    status = Column(String(20), default="Active")  # Active, Inactive
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    images = relationship("StudentImage", back_populates="student", cascade="all, delete-orphan")
    attendance_records = relationship("Attendance", back_populates="student", cascade="all, delete-orphan")

class StudentImage(Base):
    __tablename__ = "student_images"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String(50), ForeignKey("students.student_id", ondelete="CASCADE"), nullable=False)
    file_path = Column(String(255), nullable=False)
    embedding = Column(Text, nullable=False)  # JSON-serialized list of 128 floats
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationship
    student = relationship("Student", back_populates="images")

class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String(50), ForeignKey("students.student_id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, default=datetime.date.today, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    status = Column(String(20), default="PRESENT")  # PRESENT, ABSENT, LATE
    method = Column(String(30), default="LIVE_CAMERA")  # LIVE_CAMERA, MOBILE_CAMERA, UPLOAD, MANUAL

    # Relationship
    student = relationship("Student", back_populates="attendance_records")

class UnknownLog(Base):
    __tablename__ = "unknown_logs"

    id = Column(Integer, primary_key=True, index=True)
    image_path = Column(String(255), nullable=False)  # Path to saved cropped image
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    resolved = Column(Boolean, default=False)
