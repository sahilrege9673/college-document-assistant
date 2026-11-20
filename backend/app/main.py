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
    allow_origins=["*"],  # Allows local dev and deployed Vercel frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error at {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred. Please try again shortly."},
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
