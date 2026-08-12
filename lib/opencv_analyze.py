#!/usr/bin/env python3
"""
OpenCV face and text edge detection for COMPr adaptive engine.

Usage: python3 opencv_analyze.py <frame_path> [<frame_path> ...]

Outputs a JSON array to stdout, one result object per input frame, in the
same order the paths were given:
[
  {"face_score": 0.0-1.0, "text_edge_score": 0.0-1.0, "brightness_mean": 0-255, "contrast_stddev": 0-128},
  ...
]

Face detection: Haar Cascade frontalface (haarcascade_frontalface_default.xml)
Text detection: Canny edge + contour filtering for text-line aspect ratios.

Resource constraints (adaptive-engine.md Rule 3):
- Called on 1fps samples only, never on full-rate video.
- Matrix buffers released immediately after scoring each frame.

Batched by design: cv2 import and Haar cascade loading are the dominant
per-invocation cost, so every sampled frame for a video is scored in one
process instead of spawning a fresh Python process per frame.
"""

import sys
import json
import os
import numpy as np

try:
    import cv2
    _HAS_CV2 = True
except ImportError:
    _HAS_CV2 = False

_EMPTY_RESULT = {
    "face_score": 0.0,
    "text_edge_score": 0.0,
    "brightness_mean": 0.0,
    "contrast_stddev": 0.0,
}

_cascade_cache = None


def get_haar_cascade_path():
    """Locate haarcascade XML. Checks common system paths."""
    candidates = [
        # OpenCV install paths
        os.path.join(cv2.data.haarcascades, 'haarcascade_frontalface_default.xml'),
        # System paths
        '/usr/share/opencv4/haarcascades/haarcascade_frontalface_default.xml',
        '/usr/share/opencv/haarcascades/haarcascade_frontalface_default.xml',
        '/usr/local/share/opencv4/haarcascades/haarcascade_frontalface_default.xml',
        # Windows OpenCV
        os.path.join(os.environ.get('OPENCV_DIR', ''), 'haarcascades', 'haarcascade_frontalface_default.xml'),
    ]
    for path in candidates:
        if os.path.exists(path):
            return path
    return None


def get_cascade():
    """Load the Haar cascade classifier once and reuse it across all frames."""
    global _cascade_cache
    if _cascade_cache is not None:
        return _cascade_cache or None

    cascade_path = get_haar_cascade_path()
    if cascade_path is None:
        _cascade_cache = False
        return None

    classifier = cv2.CascadeClassifier(cascade_path)
    if classifier.empty():
        _cascade_cache = False
        return None

    _cascade_cache = classifier
    return classifier


def detect_faces(gray, frame_area):
    """Detect faces using Haar Cascade. Returns score 0-1."""
    face_cascade = get_cascade()
    if face_cascade is None:
        return 0.0

    # detectMultiScale params: scaleFactor=1.1, minNeighbors=5, minSize=30x30
    faces = face_cascade.detectMultiScale(
        gray,
        scaleFactor=1.1,
        minNeighbors=5,
        minSize=(30, 30),
        flags=cv2.CASCADE_SCALE_IMAGE
    )

    if len(faces) == 0:
        return 0.0

    # Score = total face area / frame area
    total_face_area = sum(w * h for (x, y, w, h) in faces)
    return min(1.0, total_face_area / frame_area)


def detect_text_edges(gray, frame_area):
    """Detect text-like regions via Canny edge + contour filtering. Returns score 0-1."""
    # Canny edge detection
    edges = cv2.Canny(gray, 50, 150)

    # Morphological close to connect edge fragments into text lines
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (15, 3))
    closed = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, kernel)

    # Find contours
    contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    if len(contours) == 0:
        return 0.0

    # Filter contours by text-line criteria:
    # - Width > 3x height (horizontal text lines)
    # - Area > 100 pixels (filter noise)
    # - Aspect ratio < 20:1 (filter long horizontal lines that aren't text)
    text_contours = 0
    for contour in contours:
        x, y, w, h = cv2.boundingRect(contour)
        area = w * h
        if area < 100:
            continue
        if h == 0:
            continue
        aspect_ratio = w / h
        if 3.0 < aspect_ratio < 20.0:
            text_contours += 1

    # Score = text contours / total meaningful contours
    meaningful = [c for c in contours if cv2.boundingRect(c)[2] * cv2.boundingRect(c)[3] >= 100]
    if len(meaningful) == 0:
        return 0.0

    return min(1.0, text_contours / len(meaningful))


def analyze_frame(frame_path):
    """Full analysis of a single frame."""
    img = cv2.imread(frame_path)
    if img is None:
        return dict(_EMPTY_RESULT)

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    h, w = gray.shape
    frame_area = h * w

    # Face detection
    face_score = detect_faces(gray, frame_area)

    # Text edge detection
    text_edge_score = detect_text_edges(gray, frame_area)

    # Brightness and contrast
    brightness_mean = float(np.mean(gray))
    contrast_stddev = float(np.std(gray))

    # Release matrices
    del img, gray

    return {
        "face_score": round(face_score, 4),
        "text_edge_score": round(text_edge_score, 4),
        "brightness_mean": round(brightness_mean, 2),
        "contrast_stddev": round(contrast_stddev, 2)
    }


def analyze_all(frame_paths):
    """Analyze every frame path in this single process invocation."""
    if not _HAS_CV2:
        return [dict(_EMPTY_RESULT) for _ in frame_paths]
    return [analyze_frame(p) for p in frame_paths]


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: python3 opencv_analyze.py <frame_path> [<frame_path> ...]"}))
        sys.exit(1)

    frame_paths = sys.argv[1:]
    results = analyze_all(frame_paths)
    print(json.dumps(results))
