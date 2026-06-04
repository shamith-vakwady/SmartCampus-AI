import os
import socket

# Base Directories
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
DATASET_DIR = os.path.join(DATA_DIR, "dataset")
UNKNOWN_DIR = os.path.join(DATA_DIR, "unknown")
REPORTS_DIR = os.path.join(DATA_DIR, "reports")
MODELS_DIR = os.path.join(BASE_DIR, "models")

# Ensure directories exist
for path in [DATA_DIR, DATASET_DIR, UNKNOWN_DIR, REPORTS_DIR, MODELS_DIR]:
    os.makedirs(path, exist_ok=True)

# Database Config
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{os.path.join(DATA_DIR, 'database.db')}")

# AI Model settings
YUNET_MODEL_URL = "https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx"
SFACE_MODEL_URL = "https://github.com/opencv/opencv_zoo/raw/main/models/face_recognition_sface/face_recognition_sface_2021dec.onnx"

YUNET_MODEL_PATH = os.path.join(MODELS_DIR, "face_detection_yunet.onnx")
SFACE_MODEL_PATH = os.path.join(MODELS_DIR, "face_recognition_sface.onnx")

# Face detection and recognition parameters
CONFIDENCE_THRESHOLD = 0.6  # Detection confidence
NMS_THRESHOLD = 0.3        # Non-maximum suppression threshold
COSINE_THRESHOLD = 0.36     # Cosine similarity threshold for matching (SFace specific)
L2_THRESHOLD = 1.12        # L2 distance threshold for matching (alternative)

# Server Config
def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        # Use an address that doesn't need to be reachable
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

LOCAL_IP = get_local_ip()
PORT = 8000
FRONTEND_PORT = 5173

# Mobile camera access URL
MOBILE_URL = f"http://{LOCAL_IP}:{FRONTEND_PORT}/mobile-camera"
BACKEND_WS_URL = f"ws://{LOCAL_IP}:{PORT}/api/ws/camera"
