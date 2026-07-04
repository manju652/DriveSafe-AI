"""
Celery tasks for Driver Safety AI.
All DB work uses synchronous SQLAlchemy (Celery is not async-native).
"""
import structlog
from datetime import datetime, timezone, timedelta

from sqlalchemy import create_engine, func, select, text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.models import Alert, DetectionFrame, Driver, Trip, TripStatus
from app.worker import celery_app

log = structlog.get_logger()

# Synchronous engine for Celery tasks
sync_engine = create_engine(settings.SYNC_DATABASE_URL, pool_pre_ping=True)


def get_sync_session() -> Session:
    return Session(sync_engine)


# ─── Safety score recalculation ───────────────────────────────────────────────

@celery_app.task(name="app.tasks.recalculate_all_safety_scores", bind=True)
def recalculate_all_safety_scores(self):
    """
    Nightly job: recompute each driver's rolling safety score
    from their last 30 days of completed trips.
    """
    log.info("Starting nightly safety score recalculation")
    since = datetime.now(timezone.utc) - timedelta(days=30)

    with get_sync_session() as db:
        drivers = db.execute(select(Driver).where(Driver.is_active == True)).scalars().all()

        updated = 0
        for driver in drivers:
            trips = db.execute(
                select(Trip).where(
                    Trip.driver_id == driver.id,
                    Trip.status == TripStatus.COMPLETED,
                    Trip.started_at >= since,
                    Trip.safety_score.isnot(None),
                )
            ).scalars().all()

            if not trips:
                continue

            # Weighted average — more recent trips count more
            total_weight = 0.0
            weighted_score = 0.0
            for i, trip in enumerate(sorted(trips, key=lambda t: t.started_at)):
                weight = 1.0 + (i * 0.1)  # newer = higher weight
                weighted_score += (trip.safety_score or 100) * weight
                total_weight += weight

            new_score = weighted_score / total_weight if total_weight > 0 else 100.0
            driver.safety_score = round(min(100.0, max(0.0, new_score)), 2)
            updated += 1

        db.commit()
    log.info("Safety score recalculation complete", drivers_updated=updated)
    return {"drivers_updated": updated}


# ─── Frame cleanup ────────────────────────────────────────────────────────────

@celery_app.task(name="app.tasks.cleanup_old_frames")
def cleanup_old_frames(days_to_keep: int = 30):
    """
    Delete DetectionFrame records older than `days_to_keep` days.
    Alerts and Trips are kept indefinitely for compliance.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(days=days_to_keep)
    log.info("Cleaning up old detection frames", cutoff=cutoff.isoformat())

    with get_sync_session() as db:
        result = db.execute(
            text("DELETE FROM detection_frames WHERE timestamp < :cutoff"),
            {"cutoff": cutoff},
        )
        db.commit()
        deleted = result.rowcount

    log.info("Frame cleanup complete", deleted=deleted)
    return {"deleted_frames": deleted}


# ─── Daily fleet report ───────────────────────────────────────────────────────

@celery_app.task(name="app.tasks.send_daily_fleet_report")
def send_daily_fleet_report():
    """
    Aggregate yesterday's stats per fleet manager and log/email the report.
    Hook up to SendGrid / SES to email actual reports.
    """
    yesterday_start = (datetime.now(timezone.utc) - timedelta(days=1)).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    yesterday_end = yesterday_start + timedelta(days=1)

    with get_sync_session() as db:
        # Total alerts yesterday
        alert_count = db.execute(
            select(func.count(Alert.id)).where(
                Alert.timestamp >= yesterday_start,
                Alert.timestamp < yesterday_end,
            )
        ).scalar_one()

        # Trips completed yesterday
        trip_count = db.execute(
            select(func.count(Trip.id)).where(
                Trip.status == TripStatus.COMPLETED,
                Trip.ended_at >= yesterday_start,
                Trip.ended_at < yesterday_end,
            )
        ).scalar_one()

        # Average safety score
        avg_score = db.execute(
            select(func.avg(Trip.safety_score)).where(
                Trip.status == TripStatus.COMPLETED,
                Trip.ended_at >= yesterday_start,
                Trip.ended_at < yesterday_end,
                Trip.safety_score.isnot(None),
            )
        ).scalar_one()

    report = {
        "date": yesterday_start.date().isoformat(),
        "total_alerts": alert_count,
        "completed_trips": trip_count,
        "avg_safety_score": round(float(avg_score or 0), 2),
        "incidents_prevented_estimate": int(alert_count * 0.7),
    }

    log.info("Daily fleet report generated", **report)
    # TODO: email report via SendGrid:
    # send_email(to=manager.email, subject="Daily Safety Report", body=render_report(report))
    return report


# ─── On-demand tasks (triggered by API events) ───────────────────────────────

@celery_app.task(name="app.tasks.compute_trip_score")
def compute_trip_score(trip_id: str):
    """Called when a trip ends — computes and stores final safety score."""
    with get_sync_session() as db:
        trip = db.get(Trip, trip_id)
        if not trip:
            return {"error": "Trip not found"}

        # Pull frame aggregates
        row = db.execute(
            select(
                func.avg(DetectionFrame.attention_score),
                func.avg(DetectionFrame.fatigue_score),
                func.count(DetectionFrame.id),
            ).where(DetectionFrame.trip_id == trip_id)
        ).one()

        avg_attention, avg_fatigue, frame_count = row

        if frame_count == 0:
            return {"trip_id": trip_id, "score": 100.0}

        alert_penalty = min(40.0, trip.total_alerts * 2.5)
        fatigue_penalty = float(avg_fatigue or 0) * 0.4
        score = max(0.0, 100.0 - alert_penalty - fatigue_penalty)

        trip.safety_score = round(score, 2)
        trip.avg_attention = float(avg_attention or 0)
        trip.avg_fatigue = float(avg_fatigue or 0)
        db.commit()

    log.info("Trip score computed", trip_id=trip_id, score=score)
    return {"trip_id": trip_id, "score": score, "frames_analysed": frame_count}
