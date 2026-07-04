"""
Core API endpoints:
  /drivers   — CRUD for drivers
  /vehicles  — CRUD for vehicles
  /trips     — trip lifecycle
  /alerts    — alert ingestion + retrieval
  /frames    — per-frame metrics ingestion
"""
import uuid
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, require_role
from app.db.base import get_db
from app.models.models import (
    Alert, AlertType, Driver, DetectionFrame,
    Trip, TripStatus, User, UserRole, Vehicle,
)
from app.schemas.schemas import (
    AlertCreate, AlertOut,
    DriverCreate, DriverOut, DriverUpdate,
    FrameMetrics, FrameMetricsOut,
    MessageResponse, PaginatedResponse,
    TripEnd, TripOut, TripStart,
    VehicleCreate, VehicleOut,
)
from app.services.websocket_manager import (
    publish_alert, publish_metrics,
    ws_manager, cache_active_trip,
)

# ─── Drivers ─────────────────────────────────────────────────────────────────

drivers_router = APIRouter(prefix="/drivers", tags=["Drivers"])


@drivers_router.post("", response_model=DriverOut, status_code=201)
async def create_driver(
    body: DriverCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = await db.execute(select(Driver).where(Driver.employee_id == body.employee_id))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Employee ID already exists")

    driver = Driver(manager_id=current_user.id, **body.model_dump())
    db.add(driver)
    await db.flush()
    await db.refresh(driver)
    return driver


@drivers_router.get("", response_model=List[DriverOut])
async def list_drivers(
    skip: int = 0,
    limit: int = Query(default=50, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Driver)
        .where(Driver.manager_id == current_user.id)
        .order_by(desc(Driver.created_at))
        .offset(skip).limit(limit)
    )
    return result.scalars().all()


@drivers_router.get("/{driver_id}", response_model=DriverOut)
async def get_driver(
    driver_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Driver).where(Driver.id == driver_id, Driver.manager_id == current_user.id)
    )
    driver = result.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    return driver


@drivers_router.patch("/{driver_id}", response_model=DriverOut)
async def update_driver(
    driver_id: uuid.UUID,
    body: DriverUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Driver).where(Driver.id == driver_id, Driver.manager_id == current_user.id)
    )
    driver = result.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(driver, field, value)
    await db.flush()
    await db.refresh(driver)
    return driver


# ─── Vehicles ─────────────────────────────────────────────────────────────────

vehicles_router = APIRouter(prefix="/vehicles", tags=["Vehicles"])


@vehicles_router.post("", response_model=VehicleOut, status_code=201)
async def create_vehicle(
    body: VehicleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = await db.execute(select(Vehicle).where(Vehicle.plate_number == body.plate_number))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Plate number already registered")

    vehicle = Vehicle(manager_id=current_user.id, **body.model_dump())
    db.add(vehicle)
    await db.flush()
    await db.refresh(vehicle)
    return vehicle


@vehicles_router.get("", response_model=List[VehicleOut])
async def list_vehicles(
    skip: int = 0,
    limit: int = Query(default=50, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Vehicle)
        .where(Vehicle.manager_id == current_user.id)
        .offset(skip).limit(limit)
    )
    return result.scalars().all()


# ─── Trips ────────────────────────────────────────────────────────────────────

trips_router = APIRouter(prefix="/trips", tags=["Trips"])


@trips_router.post("/start", response_model=TripOut, status_code=201)
async def start_trip(
    body: TripStart,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Verify driver and vehicle belong to this manager
    dr = await db.get(Driver, body.driver_id)
    vh = await db.get(Vehicle, body.vehicle_id)
    if not dr or str(dr.manager_id) != str(current_user.id):
        raise HTTPException(status_code=404, detail="Driver not found")
    if not vh or str(vh.manager_id) != str(current_user.id):
        raise HTTPException(status_code=404, detail="Vehicle not found")

    trip = Trip(driver_id=body.driver_id, vehicle_id=body.vehicle_id)
    db.add(trip)
    await db.flush()
    await db.refresh(trip)

    # Cache in Redis for fast lookups during active monitoring
    await cache_active_trip(str(trip.id), {
        "driver_id": str(body.driver_id),
        "vehicle_id": str(body.vehicle_id),
        "manager_id": str(current_user.id),
        "started_at": trip.started_at.isoformat(),
    })
    return trip


@trips_router.post("/{trip_id}/end", response_model=TripOut)
async def end_trip(
    trip_id: uuid.UUID,
    body: TripEnd,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Trip).where(Trip.id == trip_id))
    trip = result.scalar_one_or_none()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    now = datetime.now(timezone.utc)
    trip.status = TripStatus.COMPLETED
    trip.ended_at = now
    trip.distance_km = body.distance_km

    if trip.started_at:
        started = trip.started_at
        if started.tzinfo is None:
            started = started.replace(tzinfo=timezone.utc)
        trip.duration_seconds = int((now - started).total_seconds())

    # Compute final safety score from frame aggregates
    frames_result = await db.execute(
        select(
            func.avg(DetectionFrame.attention_score),
            func.avg(DetectionFrame.fatigue_score),
        ).where(DetectionFrame.trip_id == trip_id)
    )
    avg_attention, avg_fatigue = frames_result.one()
    trip.avg_attention = avg_attention
    trip.avg_fatigue = avg_fatigue
    trip.safety_score = max(0.0, 100.0 - (avg_fatigue or 0) * 0.5 - (trip.total_alerts * 2))

    # Update driver stats
    driver = await db.get(Driver, trip.driver_id)
    if driver:
        driver.total_trips += 1
        driver.total_alerts += trip.total_alerts
        # Rolling average safety score
        driver.safety_score = (driver.safety_score * 0.8) + ((trip.safety_score or 100) * 0.2)

    await db.flush()
    await db.refresh(trip)
    return trip


@trips_router.get("", response_model=List[TripOut])
async def list_trips(
    driver_id: uuid.UUID | None = None,
    status: TripStatus | None = None,
    skip: int = 0,
    limit: int = Query(default=50, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = select(Trip).join(Driver).where(Driver.manager_id == current_user.id)
    if driver_id:
        q = q.where(Trip.driver_id == driver_id)
    if status:
        q = q.where(Trip.status == status)
    result = await db.execute(q.order_by(desc(Trip.started_at)).offset(skip).limit(limit))
    return result.scalars().all()


@trips_router.get("/{trip_id}", response_model=TripOut)
async def get_trip(
    trip_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Trip).where(Trip.id == trip_id))
    trip = result.scalar_one_or_none()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    return trip


# ─── Alerts ───────────────────────────────────────────────────────────────────

alerts_router = APIRouter(prefix="/alerts", tags=["Alerts"])


@alerts_router.post("", response_model=AlertOut, status_code=201)
async def create_alert(
    body: AlertCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    alert = Alert(**body.model_dump())
    db.add(alert)

    # Increment trip alert counter
    trip = await db.get(Trip, body.trip_id)
    if trip:
        trip.total_alerts += 1

    await db.flush()
    await db.refresh(alert)

    # Publish to Redis + WS
    alert_data = {
        "event": "alert",
        "data": {
            "id": str(alert.id),
            "trip_id": str(alert.trip_id),
            "alert_type": alert.alert_type,
            "severity": alert.severity,
            "message": alert.message,
            "confidence": alert.confidence,
            "timestamp": alert.timestamp.isoformat(),
        },
    }
    await publish_alert(str(body.trip_id), alert_data)
    await ws_manager.broadcast_trip(str(body.trip_id), alert_data)

    return alert


@alerts_router.get("/trip/{trip_id}", response_model=List[AlertOut])
async def get_trip_alerts(
    trip_id: uuid.UUID,
    alert_type: AlertType | None = None,
    skip: int = 0,
    limit: int = Query(default=100, le=500),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = select(Alert).where(Alert.trip_id == trip_id)
    if alert_type:
        q = q.where(Alert.alert_type == alert_type)
    result = await db.execute(q.order_by(desc(Alert.timestamp)).offset(skip).limit(limit))
    return result.scalars().all()


@alerts_router.patch("/{alert_id}/acknowledge", response_model=AlertOut)
async def acknowledge_alert(
    alert_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    alert = await db.get(Alert, alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.acknowledged = True
    await db.flush()
    await db.refresh(alert)
    return alert


# ─── Detection Frames ─────────────────────────────────────────────────────────

frames_router = APIRouter(prefix="/frames", tags=["Detection Frames"])


@frames_router.post("", response_model=FrameMetricsOut, status_code=201)
async def ingest_frame(
    body: FrameMetrics,
    db: AsyncSession = Depends(get_db),
):
    """
    Called by the edge device every N frames.
    No auth required from device — use device_id + shared secret in production.
    """
    frame = DetectionFrame(**body.model_dump())
    db.add(frame)
    await db.flush()
    await db.refresh(frame)

    # Push metrics to Redis stream + WS
    metrics_data = {
        "event": "metrics",
        "data": {
            "trip_id": str(body.trip_id),
            "frame_number": body.frame_number,
            "ear": body.ear,
            "mar": body.mar,
            "head_pitch": body.head_pitch,
            "head_yaw": body.head_yaw,
            "attention_score": body.attention_score,
            "fatigue_score": body.fatigue_score,
            "blink_rate": body.blink_rate,
            "face_detected": body.face_detected,
        },
    }
    await publish_metrics(str(body.trip_id), metrics_data["data"])
    await ws_manager.broadcast_trip(str(body.trip_id), metrics_data)

    return frame
