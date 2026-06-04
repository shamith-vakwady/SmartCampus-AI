import cv2
import numpy as np

class LivenessDetector:
    @staticmethod
    def analyze_face(image: np.ndarray, face_features) -> dict:
        """
        Analyzes a face box for liveness (anti-spoofing).
        
        Args:
            image: Full BGR frame.
            face_features: 15-dimensional array from YuNet.
            
        Returns:
            dict containing liveness status, scores, and details.
        """
        # Bounding box is at index 0-3: [x, y, w, h]
        x, y, w, h = map(int, face_features[0:4])
        
        # Clamp bounding box coordinates to image dimensions
        img_h, img_w = image.shape[:2]
        x_start = max(0, x)
        y_start = max(0, y)
        x_end = min(img_w, x + w)
        y_end = min(img_h, y + h)
        
        crop_w = x_end - x_start
        crop_h = y_end - y_start
        
        if crop_w < 30 or crop_h < 30:
            return {
                "is_live": False,
                "reason": "Face too far or too small",
                "score": 0.0
            }
            
        # Crop the face
        face_crop = image[y_start:y_end, x_start:x_end]
        
        # 1. Blur Detection (Laplacian Variance)
        # Printed photos or screen recaptures often lose high-frequency details, resulting in a lower variance.
        gray = cv2.cvtColor(face_crop, cv2.COLOR_BGR2GRAY)
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        
        # 2. Lighting & Color Analysis (HSV Brightness Standard Deviation)
        # Screen recaptures suffer from backlighting, Moire patterns, or flat illumination.
        hsv = cv2.cvtColor(face_crop, cv2.COLOR_BGR2HSV)
        h, s, v = cv2.split(hsv)
        brightness_std = float(np.std(v))
        saturation_std = float(np.std(s))
        
        # Thresholds
        MIN_LAPLACIAN_VAR = 75.0      # Sharpness threshold
        MIN_BRIGHTNESS_STD = 12.0     # Screen captures or printed images tend to have lower color depth/variation
        MAX_BRIGHTNESS_STD = 85.0     # Excessive glare or light from a screen
        
        is_sharp = laplacian_var >= MIN_LAPLACIAN_VAR
        is_live_contrast = MIN_BRIGHTNESS_STD <= brightness_std <= MAX_BRIGHTNESS_STD
        
        is_live = is_sharp and is_live_contrast
        
        # Build explanation
        reasons = []
        if not is_sharp:
            reasons.append(f"Texture spoof detected (blurry texture: {laplacian_var:.1f})")
        if not is_live_contrast:
            reasons.append(f"Glare/Reflection spoof detected (brightness variation: {brightness_std:.1f})")
            
        reason = "Pass" if is_live else " | ".join(reasons)
        
        # Landmark geometry sanity check:
        # YuNet landmarks: Left Eye (4,5), Right Eye (6,7), Nose Tip (8,9), Left Mouth (10,11), Right Mouth (12,13)
        landmarks = face_features[4:14].reshape(5, 2)
        left_eye, right_eye, nose, left_mouth, right_mouth = landmarks
        
        # Simple distance checks to verify facial layout
        eye_dist = np.linalg.norm(left_eye - right_eye)
        mouth_dist = np.linalg.norm(left_mouth - right_mouth)
        
        # If eye-to-mouth ratio is completely skewed (e.g. flat page folded or cropped), flag it
        eye_to_mouth_ratio = eye_dist / (mouth_dist + 1e-6)
        is_ratio_valid = 0.5 < eye_to_mouth_ratio < 2.5
        
        if not is_ratio_valid:
            is_live = False
            reason += f" | Abnormal facial geometry ratio: {eye_to_mouth_ratio:.2f}"
            
        return {
            "is_live": is_live,
            "reason": reason,
            "laplacian_var": float(laplacian_var),
            "brightness_std": brightness_std,
            "eye_to_mouth_ratio": float(eye_to_mouth_ratio)
        }
