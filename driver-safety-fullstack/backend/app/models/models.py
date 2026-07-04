"""
Database models for Driver Safety AI.
"""
import uuid
from datetime import datetime, timezone
from enum import Enum as PyEnum

from sqlalchemy import (
    Boolean, DateTime, Float, ForeignKey, Integer,
    String, Text, Enum, JSON
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


# ─── Enums ────────────────────────────────────────────────────────────────────

class AlertType(str, PyEnum):
    DROWSINESS = "drowsiness"
    DISTRACTION = "distraction"
    YAWNING = "yawning"
    HEAD_DOWN = "head_down"
    PHONE_USAGE = "phone_usage"
    SEATBELT = "seatbelt"
    MICROSLEEP = "microsleep"
    UNKNOWN_DRIVER = "unknown_driver"


class AlertSeverity(str, PyEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class TripStatus(str, PyEnum):
    ACTIVE = "active"
    COMPLETED = "completed"
    ABORTED = "aborted"


class UserRole(str, PyEnum):
    ADMIN = "admin"
    FLEET_MANAGER = "fleet_manager"
    DRIVER = "driver"
    VIEWER = "viewer"


# ─── User ─────────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.FLEET_MANAGER)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    # Relationships
    drivers: Mapped[list["Driver"]] = relationship("Driver", back_populates="manager")
    vehicles: Mapped[list["Vehicle"]] = relationship("Vehicle", back_populates="manager")


# ─── Driver ───────────────────────────────────────────────────────────────────

class Driver(Base):
    __tablename__ = "drivers"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    manager_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    employee_id: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(30))
    license_number: Mapped[str | None] = mapped_column(String(100))
    face_embedding: Mapped[dict | None] = mapped_column(JSON)  # ArcFace 512-d vector stored as list
    safety_score: Mapped[float] = mapped_column(Float, default=100.0)
    total_trips: Mapped[int] = mapped_column(Integer, default=0)
    total_alerts: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    # Relationships
    manager: Mapped["User"] = relationship("User", back_populates="drivers")
    trips: Mapped[list["Trip"]] = relationship("Trip", back_populates="driver")


# ─── Vehicle ──────────────────────────────────────────────────────────────────

class Vehicle(Base):
    __tablename__ = "vehicles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    manager_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    plate_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    make: Mapped[str | None] = mapped_column(String(100))
    model: Mapped[str | None] = mapped_column(String(100))
    year: Mapped[int | None] = mapped_column(Integer)
    device_id: Mapped[str | None] = mapped_column(String(255), unique=True)  # Edge device serial
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    # Relationships
    manager: Mapped["User"] = relationship("User", back_populates="vehicles")
    trips: Mapped[list["Trip"]] = relationship("Trip", back_populates="vehicle")


# ─── Trip ─────────────────────────────────────────────────────────────────────

class Trip(Base):
    __tablename__ = "trips"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    driver_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("drivers.id"), nullable=False)
    vehicle_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("vehicles.id"), nullable=False)
    status: Mapped[TripStatus] = mapped_column(Enum(TripStatus), default=TripStatus.ACTIVE)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    duration_seconds: Mapped[int | None] = mapped_column(Integer)
    distance_km: Mapped[float | None] = mapped_column(Float)
    safety_score: Mapped[float | None] = mapped_column(Float)
    avg_attention: Mapped[float | None] = mapped_column(Float)
    avg_fatigue: Mapped[float | None] = mapped_column(Float)
    seatbelt_compliant: Mapped[bool | None] = mapped_column(Boolean)
    total_alerts: Mapped[int] = mapped_column(Integer, default=0)
    meta: Mapped[dict | None] = mapped_column(JSON)

    # Relationships
    driver: Mapped["Driver"] = relationship("Driver", back_populates="trips")
    vehicle: Mapped["Vehicle"] = relationship("Vehicle", back_populates="trips")
    alerts: Mapped[list["Alert"]] = relationship("Alert", back_populates="trip")
    frames: Mapped[list["DetectionFrame"]] = relationship("DetectionFrame", back_populates="trip")


# ─── Alert ────────────────────────────────────────────────────────────────────

class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    trip_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("trips.id"), nullable=False, index=True)
    alert_type: Mapped[AlertType] = mapped_column(Enum(AlertType), nullable=False)
    severity: Mapped[AlertSeverity] = mapped_column(Enum(AlertSeverity), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    confidence: Mapped[float] = mapped_column(Float, nullable=False)
    ear_value: Mapped[float | None] = mapped_column(Float)
    mar_value: Mapped[float | None] = mapped_column(Float)
    head_pitch: Mapped[float | None] = mapped_column(Float)
    head_yaw: Mapped[float | None] = mapped_column(Float)
    frame_number: Mapped[int | None] = mapped_column(Integer)
    acknowledged: Mapped[bool] = mapped_column(Boolean, default=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)

    # Relationships
    trip: Mapped["Trip"] = relationship("Trip", back_populates="alerts")


# ─── DetectionFrame (sampled metrics, not every frame) ───────────────────────

class DetectionFrame(Base):
    __tablename__ = "detection_frames"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    trip_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("trips.id"), nullable=False, index=True)
    frame_number: Mapped[int] = mapped_column(Integer, nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)
    ear: Mapped[float | None] = mapped_column(Float)
    mar: Mapped[float | None] = mapped_column(Float)
    head_pitch: Mapped[float | None] = mapped_column(Float)
    head_yaw: Mapped[float | None] = mapped_column(Float)
    head_roll: Mapped[float | None] = mapped_column(Float)
    attention_score: Mapped[float | None] = mapped_column(Float)
    fatigue_score: Mapped[float | None] = mapped_column(Float)
    blink_rate: Mapped[float | None] = mapped_column(Float)
    face_detected: Mapped[bool] = mapped_column(Boolean, default=True)

    # Relationships
    trip: Mapped["Trip"] = relationship("Trip", back_populates="frames")
