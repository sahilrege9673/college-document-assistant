import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import engine, Base, SessionLocal
from app.models import User
from app.auth.security import get_password_hash
from app.auth.router import router as auth_router
from app.documents.router import router as docs_router
from app.chat.router import router as chat_router
from app.admin.router import router as admin_router
from app.fine_tuned_model.classifier import classifier_service
from app.gemini.client import gemini_client
from app.schemas import HealthResponse

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("app.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown lifecycle management."""
    logger.info("Initializing College Document Assistant Backend...")

    # 1. Automatically create tables for local development / SQLite
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database schema verified/created.")
        
        # Non-blocking schema evolution for existing SQLite or PostgreSQL deployments
        from sqlalchemy import text
        with engine.connect() as conn:
            for col, col_type in [("summary", "TEXT"), ("suggested_questions", "JSON"), ("detected_topics", "JSON")]:
                try:
                    conn.execute(text(f"ALTER TABLE documents ADD COLUMN {col} {col_type};"))
                    conn.commit()
                except Exception:
                    pass
            logger.info("Database schema columns verified/updated.")
    except Exception as e:
        logger.warning(f"Database schema auto-creation note: {e}")

    # 2. Seed default system administrator if not present
    db = SessionLocal()
    try:
        admin_email = settings.ADMIN_EMAIL.lower()
        admin_user = db.query(User).filter(User.email == admin_email).first()
        if not admin_user:
            admin_user = User(
                full_name="College System Administrator",
                email=admin_email,
                hashed_password=get_password_hash(settings.ADMIN_PASSWORD),
                role="admin",
            )
            db.add(admin_user)
            db.commit()
            logger.info(f"Initialized pre-configured admin user: {admin_email}")

        # 3. Recover any documents stuck in 'processing' from server crash/restart
        from app.models import Document
        stuck_docs = db.query(Document).filter(Document.status == "processing").all()
        if stuck_docs:
            for s_doc in stuck_docs:
                s_doc.status = "failed"
                s_doc.error_message = "Indexing was interrupted by server restart. Please delete and re-upload this document."
            db.commit()
            logger.info(f"Cleaned up {len(stuck_docs)} interrupted processing document(s).")
    except Exception as e:
        logger.warning(f"Admin auto-seed error: {e}")
    finally:
        db.close()

    yield

    logger.info("Shutting down College Document Assistant Backend.")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Production-grade, free-tier RAG and Intent Classification API for college academic documents.",
    lifespan=lifespan,
)

# Configure Cross-Origin Resource Sharing (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://college-document-assistant.vercel.app",
    ],
    allow_origin_regex=r"^https?://.*",  # Dynamically permits any local, Vercel preview, or mobile origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error at {request.url.path}: {exc}", exc_info=True)
    origin = request.headers.get("origin", "*")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": f"Server error ({type(exc).__name__}): {str(exc)}"},
        headers={
            "Access-Control-Allow-Origin": origin if origin else "*",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        },
    )

# Register Routers
app.include_router(auth_router)
app.include_router(docs_router)
app.include_router(chat_router)
app.include_router(admin_router)


# System Health Check Endpoint
@app.get("/api/health", response_model=HealthResponse, tags=["System"])
def health_check():
    """
    Public health check endpoint.
    Used by Render free tier and Vercel frontend to verify backend availability.
    """
    db_status = "connected"
    try:
        with engine.connect() as conn:
            conn.execute(Base.metadata.tables["users"].select().limit(1))
    except Exception as e:
        db_status = f"unhealthy ({e})"

    return HealthResponse(
        status="healthy",
        database=db_status,
        classifier_mode=classifier_service.get_mode(),
        gemini_configured=gemini_client.is_configured(),
        app_version=settings.APP_VERSION,
    )


@app.get("/", tags=["System"])
def root():
    return {
        "message": "College Document Assistant API is running.",
        "documentation": "/docs",
        "health": "/api/health",
    }
