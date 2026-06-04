import datetime
import json
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models import Student, StudentImage, Attendance, UnknownLog
from app.schemas import StudentCreate, StudentUpdate, AttendanceCreate

# --- Student CRUD ---

def get_student_by_id(db: Session, student_id: str):
    return db.query(Student).filter(Student.student_id == student_id).first()

def get_student_by_email(db: Session, email: str):
    return db.query(Student).filter(Student.email == email).first()

def get_student_attendance_percentage(db: Session, student_id: str, enrollment_date: datetime.date) -> float:
    # Count how many school days have occurred since the student's enrollment
    total_days = db.query(func.distinct(Attendance.date)).filter(
        Attendance.date >= enrollment_date
    ).count()
    
    if total_days == 0:
        return 100.0
        
    # Count how many days the student was present or late
    present_days = db.query(func.distinct(Attendance.date)).filter(
        Attendance.student_id == student_id,
        Attendance.status.in_(["PRESENT", "LATE"]),
        Attendance.date >= enrollment_date
    ).count()
    
    return round((present_days / total_days) * 100.0, 1)

def get_students(db: Session, skip: int = 0, limit: int = 100):
    students = db.query(Student).offset(skip).limit(limit).all()
    # Add calculated attendance percentage
    for s in students:
        s.attendance_percentage = get_student_attendance_percentage(db, s.student_id, s.enrollment_date)
    return students

def create_student(db: Session, student: StudentCreate):
    db_student = Student(
        student_id=student.student_id,
        name=student.name,
        email=student.email,
        phone=student.phone,
        enrollment_date=student.enrollment_date or datetime.date.today(),
        status=student.status or "Active"
    )
    db.add(db_student)
    db.commit()
    db.refresh(db_student)
    db_student.attendance_percentage = 100.0
    return db_student

def update_student(db: Session, student_id: str, student_update: StudentUpdate):
    db_student = get_student_by_id(db, student_id)
    if not db_student:
        return None
    
    update_data = student_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_student, key, value)
        
    db.commit()
    db.refresh(db_student)
    db_student.attendance_percentage = get_student_attendance_percentage(db, db_student.student_id, db_student.enrollment_date)
    return db_student

def delete_student(db: Session, student_id: str):
    db_student = get_student_by_id(db, student_id)
    if not db_student:
        return False
    db.delete(db_student)
    db.commit()
    return True

# --- Student Image CRUD ---

def create_student_image(db: Session, student_id: str, file_path: str, embedding: list):
    db_image = StudentImage(
        student_id=student_id,
        file_path=file_path,
        embedding=json.dumps(embedding)  # Serialize float list to JSON string
    )
    db.add(db_image)
    db.commit()
    db.refresh(db_image)
    return db_image

def get_student_embeddings(db: Session):
    # Returns a list of tuples (student_id, name, list of float embeddings)
    images = db.query(StudentImage).join(Student).filter(Student.status == "Active").all()
    results = []
    for img in images:
        try:
            emb_list = json.loads(img.embedding)
            results.append({
                "student_id": img.student_id,
                "name": img.student.name,
                "embedding": emb_list,
                "image_id": img.id
            })
        except Exception:
            continue
    return results

# --- Attendance CRUD ---

def mark_attendance(db: Session, attendance: AttendanceCreate):
    # Check if already marked present/late today to avoid double scanning
    today = attendance.date or datetime.date.today()
    existing = db.query(Attendance).filter(
        Attendance.student_id == attendance.student_id,
        Attendance.date == today
    ).first()
    
    if existing:
        return existing
        
    db_attendance = Attendance(
        student_id=attendance.student_id,
        date=today,
        timestamp=attendance.timestamp or datetime.datetime.utcnow(),
        status=attendance.status,
        method=attendance.method
    )
    db.add(db_attendance)
    db.commit()
    db.refresh(db_attendance)
    return db_attendance

def get_attendance_logs(db: Session, skip: int = 0, limit: int = 100):
    logs = db.query(Attendance).order_by(Attendance.timestamp.desc()).offset(skip).limit(limit).all()
    for log in logs:
        log.student_name = log.student.name if log.student else "Unknown Student"
    return logs

def get_attendance_by_student(db: Session, student_id: str):
    return db.query(Attendance).filter(Attendance.student_id == student_id).order_by(Attendance.timestamp.desc()).all()

# --- Unknown Logs CRUD ---

def create_unknown_log(db: Session, image_path: str):
    db_log = UnknownLog(
        image_path=image_path,
        timestamp=datetime.datetime.utcnow()
    )
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    return db_log

def get_unknown_logs(db: Session, skip: int = 0, limit: int = 100):
    return db.query(UnknownLog).order_by(UnknownLog.timestamp.desc()).offset(skip).limit(limit).all()

def clear_unknown_logs(db: Session):
    db.query(UnknownLog).delete()
    db.commit()
    return True
