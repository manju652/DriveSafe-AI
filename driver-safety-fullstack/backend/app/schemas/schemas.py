"""
Pydantic v2 schemas — request / response shapes.
"""
import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.models.models import AlertSeverity, AlertType, TripStatus, UserRole


# ─── Shared helpers ───────────────────────────────────────────────────────────

class OrmBase(BaseModel):
    model_config = {"from_attributes": True}


# ─── Auth ─────────────────────────────────────────────────────────────────────

class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str = Field(min_length=2, max_length=255)
    role: UserRole = UserRole.FLEET_MANAGER

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenRefresh(BaseModel):
    refresh_token: str


class UserOut(OrmBase):
    id: uuid.UUID
    email: str
    full_name: str
    role: UserRole
    is_active: bool
    is_verified: bool
    created_at: datetime


# ─── Driver ───────────────────────────────────────────────────────────────────

class DriverCreate(BaseModel):
    employee_id: str = Field(min_length=2, max_length=100)
    full_name: str = Field(min_length=2, max_length=255)
    phone: str | None = None
    license_number: str | None = None


class DriverUpdate(BaseModel):
    full_name: str | None = None
    phone: str | None = None
    license_number: str | None = None
    is_active: bool | None = None


class DriverOut(OrmBase):
    id: uuid.UUID
    employee_id: str
    full_name: str
    phone: str | None
    license_number: str | None
    safety_score: float
    total_trips: int
    total_alerts: int
    is_active: bool
    created_at: datetime


# ─── Vehicle ──────────────────────────────────────────────────────────────────

class VehicleCreate(BaseModel):
    plate_number: str = Field(min_length=2, max_length=50)
    make: str | None = None
    model: str | None = None
    year: int | None = Field(None, ge=1990, le=2030)
    device_id: str | None = None


class VehicleOut(OrmBase):
    id: uuid.UUID
    plate_number: str
    make: str | None
    model: str | None
    year: int | None
    device_id: str | None
    is_active: bool
    created_at: datetime


# ─── Trip ─────────────────────────────────────────────────────────────────────

class TripStart(BaseModel):
    driver_id: uuid.UUID
    vehicle_id: uuid.UUID


class TripEnd(BaseModel):
    distance_km: float | None = None


class TripOut(OrmBase):
    id: uuid.UUID
    driver_id: uuid.UUID
    vehicle_id: uuid.UUID
    status: TripStatus
    started_at: datetime
    ended_at: datetime | None
    duration_seconds: int | None
    distance_km: float | None
    safety_score: float | None
    avg_attention: float | None
    avg_fatigue: float | None
    seatbelt_compliant: bool | None
    total_alerts: int


# ─── Alert ────────────────────────────────────────────────────────────────────

class AlertCreate(BaseModel):
    trip_id: uuid.UUID
    alert_type: AlertType
    severity: AlertSeverity
    message: str
    confidence: float = Field(ge=0.0, le=1.0)
    ear_value: float | None = None
    mar_value: float | None = None
    head_pitch: float | None = None
    head_yaw: float | None = None
    frame_number: int | None = None


class AlertOut(OrmBase):
    id: uuid.UUID
    trip_id: uuid.UUID
    alert_type: AlertType
    severity: AlertSeverity
    message: str
    confidence: float
    ear_value: float | None
    mar_value: float | None
    head_pitch: float | None
    head_yaw: float | None
    frame_number: int | None
    acknowledged: bool
    timestamp: datetime


# ─── Detection frame ──────────────────────────────────────────────────────────

class FrameMetrics(BaseModel):
    """Sent from edge device every N frames."""
    trip_id: uuid.UUID
    frame_number: int
    ear: float | None = None
    mar: float | None = None
    head_pitch: float | None = None
    head_yaw: float | None = None
    head_roll: float | None = None
    attention_score: float | None = None
    fatigue_score: float | None = None
    blink_rate: float | None = None
    face_detected: bool = True


class FrameMetricsOut(OrmBase):
    id: uuid.UUID
    trip_id: uuid.UUID
    frame_number: int
    timestamp: datetime
    ear: float | None
    mar: float | None
    head_pitch: float | None
    head_yaw: float | None
    attention_score: float | None
    fatigue_score: float | None
    face_detected: bool


# ─── Analytics ────────────────────────────────────────────────────────────────

class FleetStats(BaseModel):
    total_drivers: int
    active_trips: int
    total_alerts_today: int
    avg_safety_score: float
    top_alert_type: str | None
    incidents_prevented_estimate: int


class DriverStats(BaseModel):
    driver_id: uuid.UUID
    full_name: str
    safety_score: float
    total_trips: int
    total_alerts: int
    avg_attention: float | None
    recent_alerts: list[AlertOut]


# ─── WebSocket messages ───────────────────────────────────────────────────────

class WSMessage(BaseModel):
    event: str   # "alert" | "metrics" | "trip_start" | "trip_end" | "ping"
    data: Any


# ─── Generic responses ────────────────────────────────────────────────────────

class MessageResponse(BaseModel):
    message: str


class PaginatedResponse(BaseModel):
    items: list[Any]
    total: int
    page: int
    size: int
    pages: int
