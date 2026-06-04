import os
import uuid
import shutil
import cv2
import numpy as np
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.config import DATASET_DIR
from app import crud, schemas
from app.ai.face_processor import face_processor

router = APIRouter(prefix="/students", tags=["Students"])

@router.get("/", response_model=List[schemas.StudentResponse])
def list_students(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    students = crud.get_students(db, skip=skip, limit=limit)
    return students

@router.get("/{student_id}", response_model=schemas.StudentResponse)
def get_student(student_id: str, db: Session = Depends(get_db)):
    db_student = crud.get_student_by_id(db, student_id)
    if not db_student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Calculate percentage
    db_student.attendance_percentage = crud.get_student_attendance_percentage(
        db, db_student.student_id, db_student.enrollment_date
    )
    return db_student

@router.post("/", response_model=schemas.StudentResponse)
def create_student(student: schemas.StudentCreate, db: Session = Depends(get_db)):
    # Check if student ID already exists
    db_student_id = crud.get_student_by_id(db, student.student_id)
    if db_student_id:
        raise HTTPException(status_code=400, detail="Student ID already registered")
    
    # Check if email already exists
    db_student_email = crud.get_student_by_email(db, student.email)
    if db_student_email:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    return crud.create_student(db, student)

@router.put("/{student_id}", response_model=schemas.StudentResponse)
def update_student(student_id: str, student_update: schemas.StudentUpdate, db: Session = Depends(get_db)):
    db_student = crud.update_student(db, student_id, student_update)
    if not db_student:
        raise HTTPException(status_code=404, detail="Student not found")
    return db_student

@router.delete("/{student_id}")
def delete_student(student_id: str, db: Session = Depends(get_db)):
    # Clean up student image folder if it exists
    student_dir = os.path.join(DATASET_DIR, student_id)
    success = crud.delete_student(db, student_id)
    if not success:
        raise HTTPException(status_code=404, detail="Student not found")
        
    if os.path.exists(student_dir):
        shutil.rmtree(student_dir)
        
    return {"detail": "Student and associated face dataset deleted successfully"}

@router.post("/{student_id}/images", response_model=schemas.StudentImageResponse)
async def upload_student_face_image(
    student_id: str, 
    file: UploadFile = File(...), 
    db: Session = Depends(get_db)
):
    # Verify student exists
    db_student = crud.get_student_by_id(db, student_id)
    if not db_student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    # Read file bytes
    file_bytes = await file.read()
    nparr = np.frombuffer(file_bytes, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if image is None:
        raise HTTPException(status_code=400, detail="Invalid image file format")
        
    # Run face detection
    faces = face_processor.detect_faces(image)
    if len(faces) == 0:
        raise HTTPException(
            status_code=400, 
            detail="No face detected in the image. Please ensure the face is clearly visible."
        )
    elif len(faces) > 1:
        raise HTTPException(
            status_code=400, 
            detail="Multiple faces detected. Please upload an image with only one student's face."
        )
        
    # Extract SFace 128D embedding
    embedding = face_processor.get_embedding(image, faces[0])
    if embedding is None:
        raise HTTPException(status_code=500, detail="Failed to process face embedding")
        
    # Save the file on disk
    student_dir = os.path.join(DATASET_DIR, student_id)
    os.makedirs(student_dir, exist_ok=True)
    
    filename = f"{uuid.uuid4().hex}.jpg"
    file_path = os.path.join(student_dir, filename)
    
    # Save optimized JPEG image
    cv2.imwrite(file_path, image, [int(cv2.IMWRITE_JPEG_QUALITY), 95])
    
    # Save to database (returns SQLAlchemy object)
    # Store relative path for flexibility
    relative_path = f"data/dataset/{student_id}/{filename}"
    db_image = crud.create_student_image(db, student_id, relative_path, embedding)
    
    return db_image
