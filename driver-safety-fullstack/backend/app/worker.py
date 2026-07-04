"""
Celery background task worker.
Handles: safety score computation, alert aggregation,
         daily reports, driver score recalculation.

Run with:
  celery -A app.worker worker --loglevel=info --concurrency=4
  celery -A app.worker beat   --loglevel=info        # scheduler
"""
from celery import Celery
from celery.schedules import crontab

from app.core.config import settings

celery_app = Celery(
    "driver_safety",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    result_expires=3600,

    # Beat schedule — periodic tasks
    beat_schedule={
        "recalculate-safety-scores-nightly": {
            "task": "app.tasks.recalculate_all_safety_scores",
            "schedule": crontab(hour=2, minute=0),
        },
        "cleanup-old-frames-daily": {
            "task": "app.tasks.cleanup_old_frames",
            "schedule": crontab(hour=3, minute=0),
        },
        "send-daily-fleet-report": {
            "task": "app.tasks.send_daily_fleet_report",
            "schedule": crontab(hour=7, minute=0),
        },
    },
)
