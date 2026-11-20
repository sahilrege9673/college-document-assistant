import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # App Settings
    APP_NAME: str = "College Document Assistant API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "sqlite:///./college_docs.db"  # Fallback to local SQLite for immediate zero-config testing
    )

    # Supabase (Storage & Vector database)
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    SUPABASE_BUCKET_NAME: str = os.getenv("SUPABASE_BUCKET_NAME", "college-docs")

    # Google Gemini API
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")

    # JWT Authentication
    JWT_SECRET_KEY: str = os.getenv(
        "JWT_SECRET_KEY",
        "e4f8b9d3c2a1059f7e8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e"
    )
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 Hours

    # Pre-configured Administrator Account
    ADMIN_EMAIL: str = os.getenv("ADMIN_EMAIL", "admin@college.edu")
    ADMIN_PASSWORD: str = os.getenv("ADMIN_PASSWORD", "AdminSecurePass2026!")

    # CORS & Deployment
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "https://college-document-assistant.vercel.app",
        os.getenv("FRONTEND_URL", "http://localhost:5173"),
    ]

    # Fine-Tuned Model Configuration
    HUGGINGFACE_REPO_ID: str = os.getenv("HUGGINGFACE_REPO_ID", "")
    USE_FALLBACK_CLASSIFIER: bool = os.getenv("USE_FALLBACK_CLASSIFIER", "false").lower() in ("true", "1", "yes")

    # RAG Chunker Specifications
    CHUNK_SIZE: int = 900
    CHUNK_OVERLAP: int = 120
    MAX_FILE_SIZE_BYTES: int = 10 * 1024 * 1024  # 10 MB limit

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
