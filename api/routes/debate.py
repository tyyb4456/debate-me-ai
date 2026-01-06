# ============================================================================
# FILE 7: api/routes/debate.py - Debate Endpoints
# ============================================================================

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from config.database import get_db
from api.models import (
    StartDebateRequest, StartDebateResponse,
    SendMessageRequest, DebateMessageResponse,
    EndDebateRequest
)
from services.debate_service import debate_service

router = APIRouter()


@router.post("/start", response_model=StartDebateResponse)
async def start_debate(
    request: StartDebateRequest,
    db: AsyncSession = Depends(get_db)
):
    """Start a new debate session"""
    try:
        result = await debate_service.start_debate(
            db=db,
            user_id=request.user_id,
            topic=request.topic,
            difficulty=request.difficulty
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/message", response_model=DebateMessageResponse)
async def send_message(
    request: SendMessageRequest,
    db: AsyncSession = Depends(get_db)
):
    """Send a message in the debate"""
    try:
        result = await debate_service.process_message(
            db=db,
            session_id=request.session_id,
            user_input=request.user_input
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/end")
async def end_debate(
    request: EndDebateRequest,
    db: AsyncSession = Depends(get_db)
):
    """Explicitly end a debate"""
    # Implementation for explicit end
    # (Debates can also end naturally through the workflow)
    return {"message": "Debate ended", "session_id": request.session_id}
