"""
Driver Safety Detection Engine
-------------------------------
Processes raw MediaPipe landmark data and computes:
  • EAR  — Eye Aspect Ratio  (drowsiness / blink)
  • MAR  — Mouth Aspect Ratio (yawning)
  • Head pose  (pitch / yaw / roll via solvePnP geometry)
  • Attention & fatigue composite scores
  • Alert decision with severity classification
"""
from __future__ import annotations

import math
import time
from collections import deque
from dataclasses import dataclass, field
from enum import Enum
from typing import List, Optional

import numpy as np

from app.core.config import settings
from app.models.models import AlertSeverity, AlertType


# ─── Data types ───────────────────────────────────────────────────────────────

@dataclass
class Landmark:
    x: float
    y: float
    z: float = 0.0


@dataclass
class DetectionResult:
    ear: float
    mar: float
    head_pitch: float
    head_yaw: float
    head_roll: float
    blink_rate: float           # blinks / minute
    attention_score: float      # 0-100
    fatigue_score: float        # 0-100
    face_detected: bool
    alerts: list["DetectionAlert"] = field(default_factory=list)
    frame_number: int = 0
    timestamp: float = field(default_factory=time.time)


@dataclass
class DetectionAlert:
    alert_type: AlertType
    severity: AlertSeverity
    message: str
    confidence: float
    ear_value: Optional[float] = None
    mar_value: Optional[float] = None
    head_pitch: Optional[float] = None
    head_yaw: Optional[float] = None


# ─── Geometry helpers ─────────────────────────────────────────────────────────

def _dist(a: Landmark, b: Landmark) -> float:
    return math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)


def _eye_aspect_ratio(eye: List[Landmark]) -> float:
    """
    Compute EAR from 6 eye landmarks:
      p1-p6 (outer/inner corners), p2-p5 (top/bottom pairs)
    EAR = (||p2-p6|| + ||p3-p5||) / (2 * ||p1-p4||)
    """
    if len(eye) < 6:
        return 1.0
    A = _dist(eye[1], eye[5])
    B = _dist(eye[2], eye[4])
    C = _dist(eye[0], eye[3])
    return (A + B) / (2.0 * C) if C > 0 else 1.0


def _mouth_aspect_ratio(mouth: List[Landmark]) -> float:
    """
    Compute MAR from 8 mouth landmarks.
    MAR = vertical opening / horizontal width
    """
    if len(mouth) < 8:
        return 0.0
    A = _dist(mouth[1], mouth[7])
    B = _dist(mouth[2], mouth[6])
    C = _dist(mouth[3], mouth[5])
    D = _dist(mouth[0], mouth[4])
    return (A + B + C) / (3.0 * D) if D > 0 else 0.0


def _head_pose_from_landmarks(landmarks: List[Landmark]) -> tuple[float, float, float]:
    """
    Simplified head pose estimation using key facial landmark ratios.
    Returns (pitch_deg, yaw_deg, roll_deg).
    Uses MediaPipe 468-point indices (simplified 3D approximation).
    For production, use OpenCV solvePnP with a 3D face model.
    """
    if len(landmarks) < 468:
        return 0.0, 0.0, 0.0

    nose_tip = landmarks[1]
    chin = landmarks[152]
    left_eye_outer = landmarks[33]
    right_eye_outer = landmarks[263]
    left_mouth = landmarks[61]
    right_mouth = landmarks[291]

    # Yaw: horizontal nose offset relative to eye midpoint
    eye_mid_x = (left_eye_outer.x + right_eye_outer.x) / 2
    yaw = (nose_tip.x - eye_mid_x) * 120   # scale to degrees

    # Pitch: vertical nose-chin ratio
    face_height = _dist(landmarks[10], chin)
    nose_to_chin = _dist(nose_tip, chin)
    pitch_ratio = nose_to_chin / face_height if face_height > 0 else 0.5
    pitch = (pitch_ratio - 0.45) * 100  # positive = looking down

    # Roll: angle of eye line
    eye_dx = right_eye_outer.x - left_eye_outer.x
    eye_dy = right_eye_outer.y - left_eye_outer.y
    roll = math.degrees(math.atan2(eye_dy, eye_dx)) if eye_dx != 0 else 0.0

    return float(pitch), float(yaw), float(roll)


# ─── Main Detection Engine ────────────────────────────────────────────────────

class DetectionEngine:
    """
    Stateful per-session detection engine.
    Create one instance per active trip / WebSocket connection.
    """

    def __init__(self, fps: int = 30):
        self.fps = fps
        self._ear_threshold = settings.EAR_THRESHOLD
        self._mar_threshold = settings.MAR_THRESHOLD
        self._pitch_threshold = settings.HEAD_PITCH_THRESHOLD
        self._yaw_threshold = settings.HEAD_YAW_THRESHOLD
        self._consec_alert = settings.CONSEC_FRAMES_ALERT

        # Rolling buffers
        self._ear_buf: deque[float] = deque(maxlen=90)          # 3 sec @ 30fps
        self._mar_buf: deque[float] = deque(maxlen=60)
        self._attention_buf: deque[float] = deque(maxlen=150)   # 5 sec

        # Blink tracking
        self._blink_count = 0
        self._blink_timestamps: deque[float] = deque(maxlen=60)
        self._eye_closed = False

        # Consecutive-frame counters
        self._consec_drowsy = 0
        self._consec_yawn = 0
        self._consec_head_down = 0
        self._consec_head_side = 0

        self._frame_number = 0
        self._session_start = time.time()

    # ── Public API ───────────────────────────────────────────────────────────

    def process_landmarks(
        self,
        landmarks: List[Landmark],
        left_eye_lm: List[Landmark],
        right_eye_lm: List[Landmark],
        mouth_lm: List[Landmark],
    ) -> DetectionResult:
        self._frame_number += 1
        now = time.time()
        alerts: list[DetectionAlert] = []

        if not landmarks:
            return DetectionResult(
                ear=1.0, mar=0.0, head_pitch=0.0, head_yaw=0.0, head_roll=0.0,
                blink_rate=0.0, attention_score=50.0, fatigue_score=50.0,
                face_detected=False, frame_number=self._frame_number, timestamp=now,
            )

        # ── Core metrics ────────────────────────────────────────────────────
        left_ear = _eye_aspect_ratio(left_eye_lm)
        right_ear = _eye_aspect_ratio(right_eye_lm)
        ear = (left_ear + right_ear) / 2.0

        mar = _mouth_aspect_ratio(mouth_lm)
        pitch, yaw, roll = _head_pose_from_landmarks(landmarks)

        # ── Blink detection ─────────────────────────────────────────────────
        if ear < self._ear_threshold:
            self._eye_closed = True
        elif self._eye_closed:
            self._eye_closed = False
            self._blink_count += 1
            self._blink_timestamps.append(now)

        # Blink rate: blinks in last 60 seconds
        cutoff = now - 60
        recent_blinks = sum(1 for t in self._blink_timestamps if t > cutoff)
        blink_rate = float(recent_blinks)

        # ── Update buffers ──────────────────────────────────────────────────
        self._ear_buf.append(ear)
        self._mar_buf.append(mar)

        # ── Consecutive counters ─────────────────────────────────────────────
        if ear < self._ear_threshold:
            self._consec_drowsy += 1
        else:
            self._consec_drowsy = max(0, self._consec_drowsy - 2)

        if mar > self._mar_threshold:
            self._consec_yawn += 1
        else:
            self._consec_yawn = max(0, self._consec_yawn - 3)

        if pitch > self._pitch_threshold:
            self._consec_head_down += 1
        else:
            self._consec_head_down = max(0, self._consec_head_down - 2)

        if abs(yaw) > self._yaw_threshold:
            self._consec_head_side += 1
        else:
            self._consec_head_side = max(0, self._consec_head_side - 2)

        # ── Alert generation ─────────────────────────────────────────────────
        if self._consec_drowsy >= self._consec_alert:
            sev, msg = self._drowsiness_severity(ear, self._consec_drowsy)
            alerts.append(DetectionAlert(
                alert_type=AlertType.DROWSINESS, severity=sev, message=msg,
                confidence=min(1.0, self._consec_drowsy / 60),
                ear_value=ear,
            ))

        if self._consec_yawn >= self._consec_alert // 2:
            alerts.append(DetectionAlert(
                alert_type=AlertType.YAWNING,
                severity=AlertSeverity.MEDIUM,
                message=f"Yawning detected — MAR {mar:.2f}",
                confidence=min(1.0, mar / 0.8),
                mar_value=mar,
            ))

        if self._consec_head_down >= self._consec_alert:
            alerts.append(DetectionAlert(
                alert_type=AlertType.HEAD_DOWN,
                severity=AlertSeverity.HIGH,
                message=f"Head down — pitch {pitch:.1f}°",
                confidence=min(1.0, pitch / 45),
                head_pitch=pitch,
            ))

        if self._consec_head_side >= self._consec_alert:
            alerts.append(DetectionAlert(
                alert_type=AlertType.DISTRACTION,
                severity=AlertSeverity.MEDIUM,
                message=f"Looking away — yaw {yaw:.1f}°",
                confidence=min(1.0, abs(yaw) / 60),
                head_yaw=yaw,
            ))

        # ── Composite scores ─────────────────────────────────────────────────
        avg_ear = float(np.mean(self._ear_buf)) if self._ear_buf else ear
        fatigue_score = self._compute_fatigue(avg_ear, blink_rate, len(alerts))
        attention_score = self._compute_attention(ear, abs(yaw), abs(pitch))
        self._attention_buf.append(attention_score)

        return DetectionResult(
            ear=round(ear, 3),
            mar=round(mar, 3),
            head_pitch=round(pitch, 2),
            head_yaw=round(yaw, 2),
            head_roll=round(roll, 2),
            blink_rate=round(blink_rate, 1),
            attention_score=round(attention_score, 1),
            fatigue_score=round(fatigue_score, 1),
            face_detected=True,
            alerts=alerts,
            frame_number=self._frame_number,
            timestamp=now,
        )

    # ── Internal helpers ─────────────────────────────────────────────────────

    @staticmethod
    def _drowsiness_severity(ear: float, consec: int) -> tuple[AlertSeverity, str]:
        if consec > 90:
            return AlertSeverity.CRITICAL, f"Microsleep detected! EAR {ear:.2f}"
        if consec > 60:
            return AlertSeverity.HIGH, f"Severe drowsiness — EAR {ear:.2f}"
        return AlertSeverity.MEDIUM, f"Drowsiness detected — EAR {ear:.2f}"

    @staticmethod
    def _compute_fatigue(avg_ear: float, blink_rate: float, alert_count: int) -> float:
        """0 = fresh, 100 = critically fatigued."""
        ear_score = max(0.0, (0.35 - avg_ear) / 0.35) * 60   # EAR below normal
        blink_score = max(0.0, (15 - blink_rate) / 15) * 25  # low blink rate
        alert_score = min(15.0, alert_count * 3)
        return min(100.0, ear_score + blink_score + alert_score)

    @staticmethod
    def _compute_attention(ear: float, abs_yaw: float, abs_pitch: float) -> float:
        """100 = fully attentive."""
        base = 100.0
        if ear < 0.3:
            base -= (0.3 - ear) / 0.3 * 40
        if abs_yaw > 15:
            base -= min(30.0, (abs_yaw - 15) * 1.2)
        if abs_pitch > 10:
            base -= min(20.0, (abs_pitch - 10) * 1.0)
        return max(0.0, base)


# ─── Simple seatbelt detector (classifier result wrapper) ────────────────────

def check_seatbelt(detection_confidence: float, threshold: float = 0.7) -> tuple[bool, float]:
    """
    Wraps YOLOv8 seatbelt classifier output.
    Returns (is_wearing, confidence).
    """
    wearing = detection_confidence >= threshold
    return wearing, detection_confidence
