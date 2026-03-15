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
    
from sqlalchemy import select
from database.models import DebateSession


@router.post("/end")
async def end_debate(
    request: EndDebateRequest,
    db: AsyncSession = Depends(get_db)
):
    """Explicitly end a debate"""
    try:
        # Load the session to verify it exists and is active
        result = await db.execute(
            select(DebateSession).where(DebateSession.session_id == request.session_id)
        )
        debate_session = result.scalar_one_or_none()

        if not debate_session:
            raise HTTPException(status_code=404, detail="Debate session not found")

        if debate_session.status != "active":
            raise HTTPException(
                status_code=400,
                detail=f"Debate is already {debate_session.status}"
            )

        # Load the current state to pass to _end_debate
        state = await debate_service._load_or_create_state(db, request.session_id, debate_session)
        
        # Mark debate_ended in state so growth tracker runs properly
        state['debate_ended'] = True

        # Actually end it in the database
        await debate_service._end_debate(db, request.session_id, state)

        return {"message": "Debate ended", "session_id": request.session_id}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))