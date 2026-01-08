# ============================================================================
# FILE 9: api/routes/history.py - User History Endpoints (COMPLETE)
# ============================================================================

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func
from typing import List, Optional
from datetime import datetime

from config.database import get_db
from database.models import User, DebateSession, Achievement, Turn, Fallacy
from api.models import DebateHistoryResponse, DebateHistoryItem

router = APIRouter()


@router.get("/{user_id}/history", response_model=DebateHistoryResponse)
async def get_user_history(
    user_id: str,
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """Get user's debate history with pagination"""
    
    # Get user
    result = await db.execute(select(User).where(User.user_id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get debates
    result = await db.execute(
        select(DebateSession)
        .where(DebateSession.user_id == user_id)
        .order_by(desc(DebateSession.started_at))
        .limit(limit)
        .offset(offset)
    )
    debates = result.scalars().all()
    
    # Format response
    debate_items = [
        DebateHistoryItem(
            session_id=d.session_id,
            topic=d.topic,
            difficulty=d.difficulty,
            started_at=d.started_at,
            ended_at=d.ended_at,
            total_turns=d.total_turns,
            performance=d.overall_performance
        )
        for d in debates
    ]
    
    return DebateHistoryResponse(
        user_id=str(user_id),
        total_debates=user.total_debates,
        current_skill=user.current_skill_level,
        debates=debate_items
    )


@router.get("/{user_id}/achievements")
async def get_user_achievements(
    user_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get user's earned achievements"""
    
    result = await db.execute(
        select(Achievement)
        .where(Achievement.user_id == user_id)
        .order_by(desc(Achievement.earned_at))
    )
    achievements = result.scalars().all()
    
    return {
        "user_id": user_id,
        "total_achievements": len(achievements),
        "achievements": [
            {
                "badge_name": a.badge_name,
                "description": a.description,
                "earned_at": a.earned_at.isoformat(),
                "debate_id": a.debate_id
            }
            for a in achievements
        ]
    }


@router.get("/{user_id}/stats")
async def get_user_stats(
    user_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get comprehensive user statistics"""
    
    # Get user
    result = await db.execute(select(User).where(User.user_id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get completed debates
    result = await db.execute(
        select(DebateSession)
        .where(
            DebateSession.user_id == user_id,
            DebateSession.status == "completed"
        )
    )
    completed_debates = result.scalars().all()
    
    # Calculate statistics
    total_completed = len(completed_debates)
    
    if total_completed == 0:
        return {
            "user_id": user_id,
            "total_debates": 0,
            "completed_debates": 0,
            "current_skill_level": user.current_skill_level,
            "message": "No completed debates yet"
        }
    
    # Average argument strength
    avg_strengths = [d.avg_argument_strength for d in completed_debates if d.avg_argument_strength]
    avg_argument_strength = sum(avg_strengths) / len(avg_strengths) if avg_strengths else 0
    
    # Total fallacies
    total_fallacies = sum(d.fallacy_count or 0 for d in completed_debates)
    avg_fallacies_per_debate = total_fallacies / total_completed if total_completed > 0 else 0
    
    # Performance breakdown
    performance_counts = {
        "excellent": 0,
        "good": 0,
        "fair": 0,
        "poor": 0
    }
    
    for debate in completed_debates:
        if debate.overall_performance:
            performance_counts[debate.overall_performance] = performance_counts.get(debate.overall_performance, 0) + 1
    
    # Recent performance trend (last 5 debates)
    recent_debates = sorted(completed_debates, key=lambda x: x.started_at, reverse=True)[:5]
    recent_avg_strength = sum(d.avg_argument_strength or 0 for d in recent_debates) / len(recent_debates) if recent_debates else 0
    
    # Skill progression (first 3 vs last 3)
    if total_completed >= 6:
        first_3 = sorted(completed_debates, key=lambda x: x.started_at)[:3]
        last_3 = sorted(completed_debates, key=lambda x: x.started_at, reverse=True)[:3]
        
        first_3_avg = sum(d.avg_argument_strength or 0 for d in first_3) / 3
        last_3_avg = sum(d.avg_argument_strength or 0 for d in last_3) / 3
        
        improvement = ((last_3_avg - first_3_avg) / first_3_avg * 100) if first_3_avg > 0 else 0
        skill_trend = "improving" if improvement > 5 else "stable" if improvement > -5 else "declining"
    else:
        first_3_avg = None
        last_3_avg = None
        improvement = None
        skill_trend = "insufficient_data"
    
    # Most common difficulty level
    difficulty_counts = {}
    for debate in completed_debates:
        difficulty_counts[debate.difficulty] = difficulty_counts.get(debate.difficulty, 0) + 1
    
    preferred_difficulty = max(difficulty_counts.items(), key=lambda x: x[1])[0] if difficulty_counts else None
    
    return {
        "user_id": user_id,
        "overview": {
            "total_debates": user.total_debates,
            "completed_debates": total_completed,
            "current_skill_level": round(user.current_skill_level, 2),
            "preferred_difficulty": preferred_difficulty
        },
        "performance": {
            "avg_argument_strength": round(avg_argument_strength, 2),
            "performance_breakdown": performance_counts,
            "total_fallacies": total_fallacies,
            "avg_fallacies_per_debate": round(avg_fallacies_per_debate, 2)
        },
        "progression": {
            "recent_avg_strength": round(recent_avg_strength, 2),
            "skill_trend": skill_trend,
            "first_3_debates_avg": round(first_3_avg, 2) if first_3_avg else None,
            "last_3_debates_avg": round(last_3_avg, 2) if last_3_avg else None,
            "improvement_percentage": round(improvement, 1) if improvement else None
        }
    }


@router.get("/{user_id}/growth")
async def get_user_growth_trajectory(
    user_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get user's skill growth over time"""
    
    # Get all completed debates with timestamps
    result = await db.execute(
        select(DebateSession)
        .where(
            DebateSession.user_id == user_id,
            DebateSession.status == "completed"
        )
        .order_by(DebateSession.started_at)
    )
    debates = result.scalars().all()
    
    if not debates:
        return {
            "user_id": user_id,
            "data_points": [],
            "message": "No completed debates yet"
        }
    
    # Build growth trajectory
    growth_data = []
    for i, debate in enumerate(debates, 1):
        growth_data.append({
            "debate_number": i,
            "session_id": debate.session_id,
            "date": debate.started_at.isoformat(),
            "topic": debate.topic,
            "difficulty": debate.difficulty,
            "argument_strength": debate.avg_argument_strength,
            "fallacy_count": debate.fallacy_count,
            "performance": debate.overall_performance
        })
    
    return {
        "user_id": user_id,
        "total_debates": len(debates),
        "data_points": growth_data,
        "summary": {
            "starting_strength": debates[0].avg_argument_strength,
            "current_strength": debates[-1].avg_argument_strength,
            "improvement": debates[-1].avg_argument_strength - debates[0].avg_argument_strength if debates[0].avg_argument_strength else None
        }
    }


@router.get("/{user_id}/fallacies")
async def get_user_fallacy_analysis(
    user_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get detailed fallacy analysis for user"""
    
    # Get all user's debates
    result = await db.execute(
        select(DebateSession.session_id)
        .where(DebateSession.user_id == user_id)
    )
    session_ids = [row[0] for row in result.all()]
    
    if not session_ids:
        return {
            "user_id": user_id,
            "total_fallacies": 0,
            "fallacy_breakdown": [],
            "message": "No debates found"
        }
    
    # Get all fallacies
    result = await db.execute(
        select(Fallacy)
        .where(Fallacy.session_id.in_(session_ids))
        .order_by(desc(Fallacy.detected_at))
    )
    fallacies = result.scalars().all()
    
    # Aggregate by type
    fallacy_counts = {}
    fallacy_severity = {}
    
    for fallacy in fallacies:
        f_type = fallacy.fallacy_type
        fallacy_counts[f_type] = fallacy_counts.get(f_type, 0) + 1
        
        if f_type not in fallacy_severity:
            fallacy_severity[f_type] = {"minor": 0, "moderate": 0, "severe": 0}
        fallacy_severity[f_type][fallacy.severity] += 1
    
    # Sort by frequency
    sorted_fallacies = sorted(fallacy_counts.items(), key=lambda x: x[1], reverse=True)
    
    fallacy_breakdown = [
        {
            "fallacy_type": f_type,
            "count": count,
            "percentage": round(count / len(fallacies) * 100, 1),
            "severity_breakdown": fallacy_severity[f_type]
        }
        for f_type, count in sorted_fallacies
    ]
    
    # Recent fallacies (last 10)
    recent_fallacies = [
        {
            "fallacy_type": f.fallacy_type,
            "text_span": f.text_span,
            "severity": f.severity,
            "detected_at": f.detected_at.isoformat()
        }
        for f in fallacies[:10]
    ]
    
    return {
        "user_id": user_id,
        "total_fallacies": len(fallacies),
        "unique_fallacy_types": len(fallacy_counts),
        "fallacy_breakdown": fallacy_breakdown,
        "recent_fallacies": recent_fallacies,
        "most_common_fallacy": sorted_fallacies[0][0] if sorted_fallacies else None
    }


@router.get("/debate/{session_id}/turns")
async def get_debate_turns(
    session_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get all turns in a specific debate"""
    
    # Verify debate exists
    result = await db.execute(
        select(DebateSession).where(DebateSession.session_id == session_id)
    )
    debate = result.scalar_one_or_none()
    
    if not debate:
        raise HTTPException(status_code=404, detail="Debate session not found")
    
    # Get all turns
    result = await db.execute(
        select(Turn)
        .where(Turn.session_id == session_id)
        .order_by(Turn.turn_number)
    )
    turns = result.scalars().all()
    
    return {
        "session_id": session_id,
        "topic": debate.topic,
        "total_turns": len(turns),
        "turns": [
            {
                "turn_number": t.turn_number,
                "user_input": t.user_input,
                "ai_response": t.ai_response,
                "argument_strength": t.argument_strength,
                "user_skill_at_turn": t.user_skill_at_turn,
                "timestamp": t.timestamp.isoformat(),
                "has_analyzer_output": t.analyzer_output is not None,
                "has_research_output": t.research_output is not None,
                "has_socratic_output": t.socratic_output is not None,
                "has_advocate_output": t.advocate_output is not None
            }
            for t in turns
        ]
    }


@router.get("/debate/{session_id}/details")
async def get_debate_details(
    session_id: str,
    include_agent_outputs: bool = Query(False),
    db: AsyncSession = Depends(get_db)
):
    """Get detailed information about a specific debate"""
    
    # Get debate session
    result = await db.execute(
        select(DebateSession).where(DebateSession.session_id == session_id)
    )
    debate = result.scalar_one_or_none()
    
    if not debate:
        raise HTTPException(status_code=404, detail="Debate session not found")
    
    # Get turns
    result = await db.execute(
        select(Turn)
        .where(Turn.session_id == session_id)
        .order_by(Turn.turn_number)
    )
    turns = result.scalars().all()
    
    # Get fallacies
    result = await db.execute(
        select(Fallacy)
        .where(Fallacy.session_id == session_id)
    )
    fallacies = result.scalars().all()
    
    response = {
        "session_id": debate.session_id,
        "user_id": str(debate.user_id),
        "topic": debate.topic,
        "difficulty": debate.difficulty,
        "status": debate.status,
        "started_at": debate.started_at.isoformat(),
        "ended_at": debate.ended_at.isoformat() if debate.ended_at else None,
        "total_turns": debate.total_turns,
        "avg_argument_strength": debate.avg_argument_strength,
        "fallacy_count": debate.fallacy_count,
        "overall_performance": debate.overall_performance,
        "fallacies": [
            {
                "type": f.fallacy_type,
                "text_span": f.text_span,
                "severity": f.severity,
                "turn_id": str(f.turn_id)
            }
            for f in fallacies
        ]
    }
    
    if include_agent_outputs:
        response["turns"] = [
            {
                "turn_number": t.turn_number,
                "user_input": t.user_input,
                "ai_response": t.ai_response,
                "analyzer_output": t.analyzer_output,
                "research_output": t.research_output,
                "socratic_output": t.socratic_output,
                "advocate_output": t.advocate_output,
                "argument_strength": t.argument_strength,
                "user_skill_at_turn": t.user_skill_at_turn
            }
            for t in turns
        ]
    
    return response


@router.delete("/{user_id}/debates/{session_id}")
async def delete_debate(
    user_id: str,
    session_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Soft delete a debate session"""
    
    # Get debate
    result = await db.execute(
        select(DebateSession).where(
            DebateSession.session_id == session_id,
            DebateSession.user_id == user_id
        )
    )
    debate = result.scalar_one_or_none()
    
    if not debate:
        raise HTTPException(status_code=404, detail="Debate not found or access denied")
    
    # Soft delete by marking as abandoned
    debate.status = "abandoned"
    await db.commit()
    
    return {
        "message": "Debate deleted successfully",
        "session_id": session_id
    }