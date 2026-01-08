# ============================================================================
# FILE 10: api/routes/health.py - Health Check
# ============================================================================

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from config.database import get_db

router = APIRouter()


@router.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    """Health check endpoint"""
    try:
        # Check database connection
        await db.execute(text("SELECT 1"))
        
        return {
            "status": "healthy",
            "database": "connected",
            "service": "debate-ai-system"
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e)
        }
