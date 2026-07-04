"""
Driver Safety AI — FastAPI Application
=======================================
Entry point. Registers all routers, middleware, startup/shutdown hooks.
"""
import time
import structlog
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.db.base import engine, Base

# Import all models so SQLAlchemy registers them before create_all
from app.models import models  # noqa: F401

from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.core import (
    drivers_router, vehicles_router,
    trips_router, alerts_router, frames_router,
)
from app.api.v1.endpoints.analytics import analytics_router, ws_router

log = structlog.get_logger()


# ─── Lifespan ─────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: create DB tables. Shutdown: dispose engine."""
    log.info("Starting Driver Safety AI backend", version=settings.APP_VERSION)

    async with engine.begin() as conn:
        # In production use Alembic migrations instead
        await conn.run_sync(Base.metadata.create_all)
    log.info("Database tables ready")

    yield

    await engine.dispose()
    log.info("Database engine disposed — shutdown complete")


# ─── App ──────────────────────────────────────────────────────────────────────

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "Real-Time Driver Safety & Health Monitoring API. "
        "Provides detection ingestion, alert streaming, fleet analytics "
        "and WebSocket feeds for live dashboard updates."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)


# ─── Middleware ────────────────────────────────────────────────────────────────
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)


@app.middleware("http")
async def request_timing_middleware(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = (time.perf_counter() - start) * 1000
    response.headers["X-Response-Time-Ms"] = f"{duration_ms:.2f}"
    log.debug(
        "request",
        method=request.method,
        path=request.url.path,
        status=response.status_code,
        ms=round(duration_ms, 2),
    )
    return response


# ─── Global exception handlers ────────────────────────────────────────────────

@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": str(exc)},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    log.error("Unhandled exception", error=str(exc), path=request.url.path)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error"},
    )


# ─── Routers ──────────────────────────────────────────────────────────────────

API_PREFIX = "/api/v1"

app.include_router(auth_router,      prefix=API_PREFIX)
app.include_router(drivers_router,   prefix=API_PREFIX)
app.include_router(vehicles_router,  prefix=API_PREFIX)
app.include_router(trips_router,     prefix=API_PREFIX)
app.include_router(alerts_router,    prefix=API_PREFIX)
app.include_router(frames_router,    prefix=API_PREFIX)
app.include_router(analytics_router, prefix=API_PREFIX)
app.include_router(ws_router,        prefix=API_PREFIX)


# ─── Health endpoints ─────────────────────────────────────────────────────────

@app.get("/health", tags=["Health"])
async def health():
    return {
        "status": "healthy",
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
    }


@app.get("/health/ws", tags=["Health"])
async def ws_health():
    from app.services.websocket_manager import ws_manager
    return {
        "active_trip_channels": len(ws_manager.active_trips),
        "total_connections": ws_manager.total_connections,
    }


@app.get("/", tags=["Root"])
async def root():
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "health": "/health",
    }
