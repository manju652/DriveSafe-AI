"""
WebSocket endpoint for real-time monitoring feed.
Analytics endpoint for fleet dashboard.
"""
import uuid
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect
from sqlalchemy import func, select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.db.base import get_db
from app.models.models import Alert, AlertType, Driver, Trip, TripStatus, User
from app.schemas.schemas import FleetStats, DriverStats, AlertOut
from app.services.websocket_manager import ws_manager

# ─── WebSocket ────────────────────────────────────────────────────────────────

ws_router = APIRouter(prefix="/ws", tags=["WebSocket"])


@ws_router.websocket("/trip/{trip_id}")
async def trip_websocket(websocket: WebSocket, trip_id: str):
    """
    Edge device (or test client) connects here to stream detection results.
    Dashboard viewers also connect here to receive live updates.

    Protocol:
      Client → Server: JSON with 'event' field
        { event: 'ping' }
        { event: 'metrics', data: { ear, mar, ... } }
      Server → Client: JSON with 'event' field
        { event: 'alert', data: {...} }
        { event: 'metrics', data: {...} }
        { event: 'pong' }
    """
    await ws_manager.connect_trip(websocket, trip_id)
    try:
        while True:
            raw = await websocket.receive_json()
            event = raw.get("event")

            if event == "ping":
                await websocket.send_json({"event": "pong"})

            elif event in ("metrics", "alert"):
                # Broadcast to all listeners on this trip channel
                await ws_manager.broadcast_trip(trip_id, raw)

    except WebSocketDisconnect:
        ws_manager.disconnect_trip(websocket, trip_id)


@ws_router.websocket("/dashboard/{user_id}")
async def dashboard_websocket(websocket: WebSocket, user_id: str):
    """Fleet manager dashboard — receives alerts for all their trips."""
    await ws_manager.connect_user(websocket, user_id)
    try:
        while True:
            data = await websocket.receive_json()
            if data.get("event") == "ping":
                await websocket.send_json({"event": "pong"})
    except WebSocketDisconnect:
        ws_manager.disconnect_user(websocket, user_id)


# ─── Analytics ────────────────────────────────────────────────────────────────

analytics_router = APIRouter(prefix="/analytics", tags=["Analytics"])


@analytics_router.get("/fleet", response_model=FleetStats)
async def fleet_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

    # Total drivers
    total_drivers_r = await db.execute(
        select(func.count(Driver.id)).where(Driver.manager_id == current_user.id, Driver.is_active == True)
    )
    total_drivers = total_drivers_r.scalar_one() or 0

    # Active trips
    active_r = await db.execute(
        select(func.count(Trip.id))
        .join(Driver).where(
            Driver.manager_id == current_user.id,
            Trip.status == TripStatus.ACTIVE,
        )
    )
    active_trips = active_r.scalar_one() or 0

    # Alerts today
    alerts_today_r = await db.execute(
        select(func.count(Alert.id))
        .join(Trip).join(Driver).where(
            Driver.manager_id == current_user.id,
            Alert.timestamp >= today,
        )
    )
    total_alerts_today = alerts_today_r.scalar_one() or 0

    # Avg safety score
    avg_score_r = await db.execute(
        select(func.avg(Driver.safety_score)).where(Driver.manager_id == current_user.id)
    )
    avg_safety = float(avg_score_r.scalar_one() or 100.0)

    # Top alert type
    top_alert_r = await db.execute(
        select(Alert.alert_type, func.count(Alert.id).label("cnt"))
        .join(Trip).join(Driver).where(Driver.manager_id == current_user.id)
        .group_by(Alert.alert_type)
        .order_by(desc("cnt"))
        .limit(1)
    )
    top_row = top_alert_r.first()
    top_alert_type = top_row[0] if top_row else None

    return FleetStats(
        total_drivers=total_drivers,
        active_trips=active_trips,
        total_alerts_today=total_alerts_today,
        avg_safety_score=round(avg_safety, 1),
        top_alert_type=top_alert_type,
        incidents_prevented_estimate=int(total_alerts_today * 0.7),
    )


@analytics_router.get("/driver/{driver_id}", response_model=DriverStats)
async def driver_stats(
    driver_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    driver = await db.get(Driver, driver_id)
    if not driver or str(driver.manager_id) != str(current_user.id):
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Driver not found")

    # Avg scores from trips
    score_r = await db.execute(
        select(func.avg(Trip.avg_attention))
        .where(Trip.driver_id == driver_id, Trip.status == TripStatus.COMPLETED)
    )
    avg_attention = score_r.scalar_one()

    # Recent alerts
    alerts_r = await db.execute(
        select(Alert)
        .join(Trip).where(Trip.driver_id == driver_id)
        .order_by(desc(Alert.timestamp))
        .limit(10)
    )
    recent_alerts = alerts_r.scalars().all()

    return DriverStats(
        driver_id=driver.id,
        full_name=driver.full_name,
        safety_score=driver.safety_score,
        total_trips=driver.total_trips,
        total_alerts=driver.total_alerts,
        avg_attention=float(avg_attention) if avg_attention else None,
        recent_alerts=[AlertOut.model_validate(a) for a in recent_alerts],
    )


@analytics_router.get("/alerts/summary")
async def alerts_summary(
    days: int = Query(default=7, le=90),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns alert counts by type for the last N days."""
    since = datetime.now(timezone.utc) - timedelta(days=days)
    result = await db.execute(
        select(Alert.alert_type, func.count(Alert.id).label("count"))
        .join(Trip).join(Driver)
        .where(
            Driver.manager_id == current_user.id,
            Alert.timestamp >= since,
        )
        .group_by(Alert.alert_type)
        .order_by(desc("count"))
    )
    return [{"alert_type": row[0], "count": row[1]} for row in result.all()]
