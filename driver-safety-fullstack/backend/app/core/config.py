from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # App
    APP_NAME: str = "Driver Safety AI"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "production"

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    WORKERS: int = 4

    # Security
    SECRET_KEY: str = "change-me-to-a-64-char-random-string"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    ALGORITHM: str = "HS256"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://driversafety:password@localhost:5432/driversafety_db"
    SYNC_DATABASE_URL: str = "postgresql://driversafety:password@localhost:5432/driversafety_db"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    # CORS
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000"]

    # Sentry
    SENTRY_DSN: str = ""

    # Detection thresholds
    EAR_THRESHOLD: float = 0.25
    MAR_THRESHOLD: float = 0.55
    HEAD_PITCH_THRESHOLD: float = 20.0
    HEAD_YAW_THRESHOLD: float = 35.0
    CONSEC_FRAMES_ALERT: int = 20
    DETECTION_FPS: int = 30

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
