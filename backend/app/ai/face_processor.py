import os
import cv2
import numpy as np
import requests
from app.config import (
    YUNET_MODEL_URL, SFACE_MODEL_URL,
    YUNET_MODEL_PATH, SFACE_MODEL_PATH,
    CONFIDENCE_THRESHOLD, NMS_THRESHOLD, COSINE_THRESHOLD
)

class FaceProcessor:
    def __init__(self):
        self.detector = None
        self.recognizer = None
        self.initialize_models()

    def initialize_models(self):
        # Ensure models exist
        self.ensure_model_exists(YUNET_MODEL_URL, YUNET_MODEL_PATH)
        self.ensure_model_exists(SFACE_MODEL_URL, SFACE_MODEL_PATH)
        
        try:
            # Create YuNet face detector. Positional arguments avoid keyword binding constraints in OpenCV
            self.detector = cv2.FaceDetectorYN.create(
                YUNET_MODEL_PATH,
                "",
                (320, 320),
                CONFIDENCE_THRESHOLD,
                NMS_THRESHOLD,
                5000
            )
            
            # Create SFace face recognizer
            self.recognizer = cv2.FaceRecognizerSF.create(
                SFACE_MODEL_PATH,
                ""
            )
            print("Successfully loaded YuNet and SFace models into OpenCV.")
        except Exception as e:
            print(f"Error loading face models: {e}")
            raise e

    def ensure_model_exists(self, url: str, dest_path: str):
        if not os.path.exists(dest_path):
            print(f"Model not found at {dest_path}. Downloading from {url}...")
            try:
                os.makedirs(os.path.dirname(dest_path), exist_ok=True)
                response = requests.get(url, stream=True, timeout=30)
                response.raise_for_status()
                with open(dest_path, "wb") as f:
                    for chunk in response.iter_content(chunk_size=8192):
                        if chunk:
                            f.write(chunk)
                print(f"Successfully downloaded model to {dest_path}")
            except Exception as e:
                print(f"Failed to download model from {url}: {e}")
                raise e

    def detect_faces(self, image: np.ndarray):
        """
        Detect faces in an image.
        Returns:
            faces: numpy array of detected faces or None. Each face is represented by a 15-dim array.
        """
        if self.detector is None:
            return None
            
        h, w = image.shape[:2]
        # YuNet requires setting input size dynamically for every different resolution
        self.detector.setInputSize((w, h))
        
        # detect returns (status, faces_array)
        retval, faces = self.detector.detect(image)
        if retval and faces is not None:
            return faces
        return []

    def get_embedding(self, image: np.ndarray, face_features):
        """
        Aligns the face and extracts the 128D embedding vector.
        """
        if self.recognizer is None:
            return None
            
        try:
            # Align and crop face image to 112x112
            aligned_face = self.recognizer.alignCrop(image, face_features)
            # Compute SFace embedding
            embedding = self.recognizer.feature(aligned_face)
            return embedding.flatten().tolist()
        except Exception as e:
            print(f"Error extracting face embedding: {e}")
            return None

    def match_embedding(self, query_emb: list, gallery_embs: list) -> tuple:
        """
        Compares query embedding with a list of gallery embeddings.
        Returns:
            match_index: Index of best match or -1 if no match above threshold.
            max_score: Highest cosine similarity score.
        """
        if not gallery_embs:
            return -1, 0.0

        query_arr = np.array(query_emb, dtype=np.float32).reshape(1, -1)
        best_match_idx = -1
        max_similarity = -1.0

        for idx, item in enumerate(gallery_embs):
            # item is dict: {"student_id": ..., "name": ..., "embedding": list}
            gal_arr = np.array(item["embedding"], dtype=np.float32).reshape(1, -1)
            
            # Compute cosine similarity using SFace match API
            # SFace match returns a score. For cosine option, higher is more similar
            try:
                score = self.recognizer.match(query_arr, gal_arr, cv2.FaceRecognizerSF_FR_COSINE)
            except Exception:
                # Manual fallback for cosine similarity
                dot_prod = np.dot(query_arr, gal_arr.T)[0][0]
                norm_q = np.linalg.norm(query_arr)
                norm_g = np.linalg.norm(gal_arr)
                score = dot_prod / (norm_q * norm_g)
                
            if score > max_similarity:
                max_similarity = score
                if score >= COSINE_THRESHOLD:
                    best_match_idx = idx

        return best_match_idx, float(max_similarity)

# Singleton Instance
face_processor = FaceProcessor()
