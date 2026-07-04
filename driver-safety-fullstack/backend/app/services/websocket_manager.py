"""
WebSocket connection manager + Redis pub/sub bridge.
Alerts emitted from detection sessions are broadcast to:
  1. The specific trip's WebSocket channel
  2. The fleet manager's dashboard channel
"""
from __future__ import annotations

import json
import uuid
from typing import Dict, Set

import redis.asyncio as aioredis
from fastapi import WebSocket

from app.core.config import settings


class ConnectionManager:
    """
    Manages active WebSocket connections.
    Groups by trip_id (device → server) and user_id (dashboard listeners).
    """

    def __init__(self) -> None:
        # trip_id → set of sockets (edge device + dashboard viewers)
        self._trip_connections: Dict[str, Set[WebSocket]] = {}
        # user_id → set of sockets (fleet manager dashboards)
        self._user_connections: Dict[str, Set[WebSocket]] = {}

    async def connect_trip(self, ws: WebSocket, trip_id: str) -> None:
        await ws.accept()
        self._trip_connections.setdefault(trip_id, set()).add(ws)

    async def connect_user(self, ws: WebSocket, user_id: str) -> None:
        await ws.accept()
        self._user_connections.setdefault(user_id, set()).add(ws)

    def disconnect_trip(self, ws: WebSocket, trip_id: str) -> None:
        conns = self._trip_connections.get(trip_id, set())
        conns.discard(ws)
        if not conns:
            self._trip_connections.pop(trip_id, None)

    def disconnect_user(self, ws: WebSocket, user_id: str) -> None:
        conns = self._user_connections.get(user_id, set())
        conns.discard(ws)
        if not conns:
            self._user_connections.pop(user_id, None)

    async def broadcast_trip(self, trip_id: str, message: dict) -> None:
        payload = json.dumps(message, default=str)
        dead: list[WebSocket] = []
        for ws in list(self._trip_connections.get(trip_id, [])):
            try:
                await ws.send_text(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect_trip(ws, trip_id)

    async def broadcast_user(self, user_id: str, message: dict) -> None:
        payload = json.dumps(message, default=str)
        dead: list[WebSocket] = []
        for ws in list(self._user_connections.get(user_id, [])):
            try:
                await ws.send_text(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect_user(ws, user_id)

    @property
    def active_trips(self) -> list[str]:
        return list(self._trip_connections.keys())

    @property
    def total_connections(self) -> int:
        return sum(len(v) for v in self._trip_connections.values()) + \
               sum(len(v) for v in self._user_connections.values())


# Singleton manager
ws_manager = ConnectionManager()


# ─── Redis pub/sub helpers ────────────────────────────────────────────────────

async def get_redis() -> aioredis.Redis:
    return aioredis.from_url(settings.REDIS_URL, decode_responses=True)


async def publish_alert(trip_id: str, alert_data: dict) -> None:
    """Publish alert to Redis stream for async consumers (Celery, dashboards)."""
    r = await get_redis()
    channel = f"alerts:{trip_id}"
    await r.publish(channel, json.dumps(alert_data, default=str))
    await r.close()


async def publish_metrics(trip_id: str, metrics: dict) -> None:
    """Publish per-frame metrics — stored in Redis stream for time-series queries."""
    r = await get_redis()
    # Use Redis Streams for time-series data
    stream_key = f"metrics:{trip_id}"
    await r.xadd(stream_key, {k: str(v) for k, v in metrics.items()}, maxlen=1800)  # 60s @ 30fps
    await r.close()


async def cache_active_trip(trip_id: str, data: dict, ttl: int = 86400) -> None:
    r = await get_redis()
    await r.setex(f"trip:{trip_id}", ttl, json.dumps(data, default=str))
    await r.close()


async def get_cached_trip(trip_id: str) -> dict | None:
    r = await get_redis()
    raw = await r.get(f"trip:{trip_id}")
    await r.close()
    return json.loads(raw) if raw else None


async def increment_fleet_counter(key: str, amount: int = 1) -> int:
    r = await get_redis()
    result = await r.incr(f"fleet:{key}", amount)
    await r.close()
    return result
