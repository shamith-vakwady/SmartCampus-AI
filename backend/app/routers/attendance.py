import os
import uuid
import cv2
import datetime
import numpy as np
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.config import UNKNOWN_DIR
from app import crud, schemas
from app.ai.face_processor import face_processor
from app.ai.liveness import LivenessDetector
from app.websocket import manager

router = APIRouter(prefix="/attendance", tags=["Attendance"])

@router.post("/mark", response_model=schemas.AttendanceResponse)
async def mark_student_attendance(
    attendance: schemas.AttendanceCreate, 
    db: Session = Depends(get_db)
):
    # Verify student exists
    student = crud.get_student_by_id(db, attendance.student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    db_attendance = crud.mark_attendance(db, attendance)
    
    # Broadcast to websocket
    await manager.broadcast_dashboard({
        "type": "ATTENDANCE_MARKED",
        "student_id": student.student_id,
        "name": student.name,
        "timestamp": db_attendance.timestamp.isoformat(),
        "status": db_attendance.status,
        "method": db_attendance.method
    })
    
    return db_attendance

@router.post("/upload")
async def upload_attendance_image(
    file: UploadFile = File(...), 
    db: Session = Depends(get_db)
):
    """
    Process an uploaded classroom image, detects all faces, matches them against
    the registered student face embeddings, and marks their attendance.
    """
    file_bytes = await file.read()
    nparr = np.frombuffer(file_bytes, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if image is None:
        raise HTTPException(status_code=400, detail="Invalid image file format")
        
    faces = face_processor.detect_faces(image)
    if len(faces) == 0:
        return {
            "status": "no_face",
            "message": "Please show your face properly. No face detected in the uploaded image.",
            "recognized": [],
            "unknown_count": 0
        }
        
    # Get all active student embeddings
    student_gallery = crud.get_student_embeddings(db)
    
    recognized_students = []
    unknown_count = 0
    warnings = []
    
    img_h, img_w = image.shape[:2]
    
    for face in faces:
        # Bounding box
        x, y, w, h = map(int, face[0:4])
        conf = float(face[14])
        
        # 1. Liveness check
        liveness_results = LivenessDetector.analyze_face(image, face)
        
        # Crop face to be used for SFace embedding extraction & saving unknown image
        x_start, y_start = max(0, x), max(0, y)
        x_end, y_end = min(img_w, x + w), min(img_h, y + h)
        face_crop = image[y_start:y_end, x_start:x_end]
        
        # 2. Extract Embedding
        query_emb = face_processor.get_embedding(image, face)
        if query_emb is None:
            continue
            
        # 3. Compare with registered students
        match_idx, score = face_processor.match_embedding(query_emb, student_gallery)
        
        if match_idx != -1:
            matched_student = student_gallery[match_idx]
            student_id = matched_student["student_id"]
            name = matched_student["name"]
            
            # Anti-spoof warning
            if not liveness_results["is_live"]:
                warnings.append({
                    "student_id": student_id,
                    "name": name,
                    "reason": liveness_results["reason"]
                })
                # We can broadcast a spoof attempt to the dashboard
                await manager.broadcast_dashboard({
                    "type": "SPOOF_ATTEMPT",
                    "student_id": student_id,
                    "name": name,
                    "reason": liveness_results["reason"]
                })
                # Skip marking attendance on liveness check failure (security measure)
                continue
                
            # Mark present in DB
            db_attendance = crud.mark_attendance(db, schemas.AttendanceCreate(
                student_id=student_id,
                status="PRESENT",
                method="UPLOAD"
            ))
            
            recognized_students.append({
                "student_id": student_id,
                "name": name,
                "score": score
            })
            
            # Broadcast to dashboard
            await manager.broadcast_dashboard({
                "type": "ATTENDANCE_MARKED",
                "student_id": student_id,
                "name": name,
                "timestamp": db_attendance.timestamp.isoformat(),
                "status": db_attendance.status,
                "method": db_attendance.method
            })
        else:
            # Unknown person
            unknown_count += 1
            
            # Save cropped face to unknown folder
            os.makedirs(UNKNOWN_DIR, exist_ok=True)
            filename = f"unknown_{uuid.uuid4().hex}.jpg"
            file_path = os.path.join(UNKNOWN_DIR, filename)
            
            if face_crop.size > 0:
                cv2.imwrite(file_path, face_crop, [int(cv2.IMWRITE_JPEG_QUALITY), 90])
                relative_path = f"data/unknown/{filename}"
                
                # Log to DB
                crud.create_unknown_log(db, relative_path)
                
                # Broadcast warning to dashboard
                await manager.broadcast_dashboard({
                    "type": "UNAUTHORIZED_DETECTED",
                    "image_path": relative_path,
                    "timestamp": datetime.datetime.utcnow().isoformat()
                })
                
    return {
        "status": "success",
        "processed_faces_count": len(faces),
        "recognized": recognized_students,
        "unknown_count": unknown_count,
        "warnings": warnings
    }

# Helper mapping since crud name differed
def list_logs_helper(db: Session, skip: int, limit: int):
    return crud.get_attendance_logs(db, skip=skip, limit=limit)

router.get("/logs", response_model=List[schemas.AttendanceResponse])
@router.get("/logs")
def get_logs_route(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return list_logs_helper(db, skip=skip, limit=limit)
