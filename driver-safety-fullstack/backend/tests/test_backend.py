"""
Tests for Driver Safety AI backend.
Run with: pytest tests/ -v
"""
import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.services.detection_engine import (
    DetectionEngine, Landmark,
    _eye_aspect_ratio, _mouth_aspect_ratio,
)


# ─── Fixtures ─────────────────────────────────────────────────────────────────

@pytest.fixture
def engine():
    return DetectionEngine(fps=30)


@pytest.fixture
def open_eye() -> list[Landmark]:
    """Six landmarks simulating a wide-open eye (EAR ≈ 0.35)."""
    return [
        Landmark(0.0, 0.0),   # p1 outer corner
        Landmark(0.2, -0.1),  # p2 top-left
        Landmark(0.4, -0.1),  # p3 top-right
        Landmark(0.6, 0.0),   # p4 inner corner
        Landmark(0.4, 0.1),   # p5 bottom-right
        Landmark(0.2, 0.1),   # p6 bottom-left
    ]


@pytest.fixture
def closed_eye() -> list[Landmark]:
    """Simulates a closed eye — vertical distance ≈ 0 (EAR ≈ 0.0)."""
    return [
        Landmark(0.0, 0.0),
        Landmark(0.2, 0.0),
        Landmark(0.4, 0.0),
        Landmark(0.6, 0.0),
        Landmark(0.4, 0.0),
        Landmark(0.2, 0.0),
    ]


@pytest.fixture
def open_mouth() -> list[Landmark]:
    """Eight landmarks simulating a yawning mouth (MAR > 0.55)."""
    return [
        Landmark(0.0, 0.0),   # left corner
        Landmark(0.15, -0.2), # top-left
        Landmark(0.3, -0.25), # top-center-left
        Landmark(0.5, -0.2),  # top-center-right
        Landmark(1.0, 0.0),   # right corner
        Landmark(0.5, 0.2),   # bottom-center-right
        Landmark(0.3, 0.25),  # bottom-center-left
        Landmark(0.15, 0.2),  # bottom-left
    ]


# ─── EAR tests ────────────────────────────────────────────────────────────────

def test_ear_open_eye(open_eye):
    ear = _eye_aspect_ratio(open_eye)
    assert ear > 0.25, f"Open eye EAR should be > 0.25, got {ear:.3f}"


def test_ear_closed_eye(closed_eye):
    ear = _eye_aspect_ratio(closed_eye)
    assert ear < 0.05, f"Closed eye EAR should be < 0.05, got {ear:.3f}"


def test_ear_empty_returns_one():
    assert _eye_aspect_ratio([]) == 1.0


# ─── MAR tests ────────────────────────────────────────────────────────────────

def test_mar_open_mouth(open_mouth):
    mar = _mouth_aspect_ratio(open_mouth)
    assert mar > 0.4, f"Open mouth MAR should be > 0.4, got {mar:.3f}"


def test_mar_empty_returns_zero():
    assert _mouth_aspect_ratio([]) == 0.0


# ─── Detection engine ─────────────────────────────────────────────────────────

def test_engine_no_face(engine):
    result = engine.process_landmarks([], [], [], [])
    assert result.face_detected is False
    assert result.ear == 1.0
    assert result.alerts == []


def test_engine_alert_on_closed_eye(engine, closed_eye, open_mouth):
    """Feeding 25 consecutive closed-eye frames should trigger a drowsiness alert."""
    dummy_lm = [Landmark(i * 0.01, i * 0.01) for i in range(468)]

    result = None
    for _ in range(25):
        result = engine.process_landmarks(
            landmarks=dummy_lm,
            left_eye_lm=closed_eye,
            right_eye_lm=closed_eye,
            mouth_lm=open_mouth[:8],
        )

    assert result is not None
    alert_types = [a.alert_type.value for a in result.alerts]
    assert "drowsiness" in alert_types, f"Expected drowsiness alert, got: {alert_types}"


def test_engine_no_alert_open_eye(engine, open_eye):
    """Wide-open eyes should never produce a drowsiness alert."""
    dummy_lm = [Landmark(i * 0.01, i * 0.01) for i in range(468)]
    closed_mouth = [Landmark(j * 0.05, 0.0) for j in range(8)]

    for _ in range(60):
        result = engine.process_landmarks(
            landmarks=dummy_lm,
            left_eye_lm=open_eye,
            right_eye_lm=open_eye,
            mouth_lm=closed_mouth,
        )

    drowsy = [a for a in result.alerts if a.alert_type.value == "drowsiness"]
    assert len(drowsy) == 0


def test_blink_counter(engine, open_eye, closed_eye):
    """One eye-close + reopen = one blink."""
    dummy_lm = [Landmark(i * 0.01, i * 0.01) for i in range(468)]
    mouth = [Landmark(j * 0.05, 0.0) for j in range(8)]

    # Open → Closed → Open = 1 blink
    engine.process_landmarks(dummy_lm, open_eye, open_eye, mouth)
    engine.process_landmarks(dummy_lm, closed_eye, closed_eye, mouth)
    engine.process_landmarks(dummy_lm, open_eye, open_eye, mouth)

    assert engine._blink_count == 1


def test_frame_counter_increments(engine, open_eye):
    dummy_lm = [Landmark(i * 0.01, i * 0.01) for i in range(468)]
    mouth = [Landmark(j * 0.05, 0.0) for j in range(8)]

    for i in range(5):
        result = engine.process_landmarks(dummy_lm, open_eye, open_eye, mouth)

    assert result.frame_number == 5


def test_attention_score_range(engine, open_eye):
    dummy_lm = [Landmark(i * 0.01, i * 0.01) for i in range(468)]
    mouth = [Landmark(j * 0.05, 0.0) for j in range(8)]

    result = engine.process_landmarks(dummy_lm, open_eye, open_eye, mouth)
    assert 0.0 <= result.attention_score <= 100.0
    assert 0.0 <= result.fatigue_score <= 100.0


# ─── API smoke tests (async) ──────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_health_endpoint():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "healthy"


@pytest.mark.asyncio
async def test_register_and_login():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        # Register
        reg = await client.post("/api/v1/auth/register", json={
            "email": "test@example.com",
            "password": "SecurePass1",
            "full_name": "Test User",
        })
        # 201 Created or 409 if already exists in test DB
        assert reg.status_code in (201, 409)

        # Login
        login = await client.post("/api/v1/auth/login", json={
            "email": "test@example.com",
            "password": "SecurePass1",
        })
        if reg.status_code == 201:
            assert login.status_code == 200
            data = login.json()
            assert "access_token" in data
            assert "refresh_token" in data


@pytest.mark.asyncio
async def test_protected_route_without_token():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.get("/api/v1/drivers")
    assert resp.status_code == 403  # Missing Bearer token
