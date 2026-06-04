import os
import base64
import json
import uuid
import datetime
import cv2
import numpy as np
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from app.config import DATA_DIR, UNKNOWN_DIR, LOCAL_IP, PORT, MOBILE_URL, BACKEND_WS_URL
from app.database import engine, Base, SessionLocal
from app.websocket import manager
from app import crud, schemas
from app.ai.face_processor import face_processor
from app.ai.liveness import LivenessDetector
from app.routers import students, attendance, analytics, reports

# Initialize Database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AI Smart Campus Attendance & Analytics Platform",
    description="Backend API and AI processing engine",
    version="1.0.0"
)

# CORS configuration to allow local React app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount data directories to serve images (profile images & unknown captures)
app.mount("/data", StaticFiles(directory=DATA_DIR), name="data")

# Register REST Routers
app.include_router(students.router, prefix="/api")
app.include_router(attendance.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(reports.router, prefix="/api")

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "ip": LOCAL_IP,
        "port": PORT,
        "websocket_url": BACKEND_WS_URL,
        "mobile_cam_url": MOBILE_URL,
        "timestamp": datetime.datetime.now().isoformat()
    }

# --- WebSockets endpoints ---

@app.websocket("/api/ws/dashboard")
async def websocket_dashboard(websocket: WebSocket):
    await manager.connect_dashboard(websocket)
    try:
        while True:
            # Keep connection open, ignore incoming dashboard messages
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect_dashboard(websocket)

@app.websocket("/api/ws/camera/{client_id}")
async def websocket_camera(websocket: WebSocket, client_id: str):
    await manager.connect_camera(websocket, client_id)
    try:
        # Load embeddings once on connection to avoid querying DB per frame
        # If database updates occur, this connection will catch them on next re-query or dynamically
        db: Session = SessionLocal()
        student_gallery = crud.get_student_embeddings(db)
        db.close()
        
        last_processed_time = datetime.datetime.now()
        
        while True:
            # Receive frame data
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message.get("type") == "frame":
                # Rate limit frame processing (max 5 FPS to reduce CPU load)
                now = datetime.datetime.now()
                if (now - last_processed_time).total_seconds() < 0.2:
                    continue
                last_processed_time = now
                
                image_b64 = message.get("image")
                if not image_b64:
                    continue
                    
                # Decode base64 frame
                if "," in image_b64:
                    image_b64 = image_b64.split(",")[1]
                    
                try:
                    img_bytes = base64.b64decode(image_b64)
                    nparr = np.frombuffer(img_bytes, np.uint8)
                    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                except Exception as e:
                    print(f"Failed to decode frame from camera {client_id}: {e}")
                    continue
                    
                if image is None:
                    continue
                    
                # Run face detection
                faces = face_processor.detect_faces(image)
                
                # If no face is detected
                if len(faces) == 0:
                    await manager.send_camera_result(client_id, {
                        "status": "warning",
                        "message": "Please show your face properly"
                    })
                    continue
                
                # Process the first detected face (for mobile camera stream scanning)
                face = faces[0]
                x, y, w, h = map(int, face[0:4])
                
                # Verify image coordinates are valid before processing
                img_h, img_w = image.shape[:2]
                x_start, y_start = max(0, x), max(0, y)
                x_end, y_end = min(img_w, x + w), min(img_h, y + h)
                face_crop = image[y_start:y_end, x_start:x_end]
                
                # 1. Liveness check
                liveness_results = LivenessDetector.analyze_face(image, face)
                if not liveness_results["is_live"]:
                    # Return spoof warning to camera client
                    await manager.send_camera_result(client_id, {
                        "status": "spoof",
                        "message": "Spoof / Liveness detection failed!"
                    })
                    # Broadcast alert to admin dashboard
                    await manager.broadcast_dashboard({
                        "type": "SPOOF_ATTEMPT",
                        "reason": liveness_results["reason"],
                        "timestamp": datetime.datetime.utcnow().isoformat()
                    })
                    continue
                
                # 2. Extract embedding
                query_emb = face_processor.get_embedding(image, face)
                if query_emb is None:
                    continue
                
                # Re-query DB embeddings occasionally to catch updates
                db = SessionLocal()
                # 3. Compare with registered students
                match_idx, score = face_processor.match_embedding(query_emb, student_gallery)
                
                if match_idx != -1:
                    # Recognized student
                    matched_student = student_gallery[match_idx]
                    student_id = matched_student["student_id"]
                    name = matched_student["name"]
                    
                    # Mark attendance in database
                    db_attendance = crud.mark_attendance(db, schemas.AttendanceCreate(
                        student_id=student_id,
                        status="PRESENT",
                        method="MOBILE_CAMERA" if client_id.startswith("mobile_") else "LIVE_CAMERA"
                    ))
                    
                    # Send success message back to phone/camera screen
                    await manager.send_camera_result(client_id, {
                        "status": "success",
                        "message": f"Attendance marked: {name}",
                        "student_name": name
                    })
                    
                    # Broadcast attendance update to dashboards
                    await manager.broadcast_dashboard({
                        "type": "ATTENDANCE_MARKED",
                        "student_id": student_id,
                        "name": name,
                        "timestamp": db_attendance.timestamp.isoformat(),
                        "status": db_attendance.status,
                        "method": db_attendance.method
                    })
                else:
                    # Unknown / Unauthorized Person
                    await manager.send_camera_result(client_id, {
                        "status": "unknown",
                        "message": "Unauthorized Person Detected"
                    })
                    
                    # Save cropped face to unknown logs
                    os.makedirs(UNKNOWN_DIR, exist_ok=True)
                    filename = f"unknown_{uuid.uuid4().hex}.jpg"
                    file_path = os.path.join(UNKNOWN_DIR, filename)
                    
                    if face_crop.size > 0:
                        cv2.imwrite(file_path, face_crop, [int(cv2.IMWRITE_JPEG_QUALITY), 90])
                        relative_path = f"data/unknown/{filename}"
                        
                        crud.create_unknown_log(db, relative_path)
                        
                        # Broadcast warning to dashboard
                        await manager.broadcast_dashboard({
                            "type": "UNAUTHORIZED_DETECTED",
                            "image_path": relative_path,
                            "timestamp": datetime.datetime.utcnow().isoformat()
                        })
                db.close()
                
    except WebSocketDisconnect:
        manager.disconnect_camera(client_id)
