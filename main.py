"""
COMPLETE FASTAPI BACKEND FOR DEBATE AI SYSTEM (FIXED)
Production-ready implementation with SSE streaming, PostgreSQL, and full integration
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from config.settings import settings
from config.database import engine, Base
from api.routes import debate, streaming, history, health
from utils.logger import setup_logging

# Setup logging
setup_logging()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    # Startup
    logger.info("Starting Debate AI System...")
    
    # Create database tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    logger.info("Database tables created/verified")
    logger.info("Application started successfully")
    
    yield
    
    # Shutdown
    logger.info("Shutting down application...")
    await engine.dispose()


# Create FastAPI app
app = FastAPI(
    title="Debate AI System",
    description="AI-powered debate system with real-time streaming and growth tracking",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration - FIXED
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,  # Use the property method
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, tags=["Health"])
app.include_router(debate.router, prefix="/api/debate", tags=["Debate"])
app.include_router(streaming.router, prefix="/api/debate", tags=["Streaming"])
app.include_router(history.router, prefix="/api/user", tags=["User History"])


@app.get("/")
async def root():
    return {
        "message": "Debate AI System API",
        "version": "1.0.0",
        "docs": "/docs",
        "status": "running"
    }