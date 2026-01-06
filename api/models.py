# ============================================================================
# FILE 5: api/models.py - Pydantic Request/Response Models
# ============================================================================

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class StartDebateRequest(BaseModel):
    """Request to start a new debate"""
    user_id: str
    topic: str
    difficulty: str = Field(default="standard", pattern="^(casual|standard|expert)$")


class StartDebateResponse(BaseModel):
    """Response when debate starts"""
    session_id: str
    topic: str
    difficulty: str
    message: str
    created_at: datetime


class SendMessageRequest(BaseModel):
    """Request to send a message in debate"""
    session_id: str
    user_input: str


class AgentInsights(BaseModel):
    """Optional transparent agent outputs"""
    fallacies_detected: List[str] = []
    argument_strength: Optional[float] = None
    sources_cited: List[str] = []


class ImprovementAreaResponse(BaseModel):
    """Area for improvement"""
    area: str
    issue: str
    suggestion: str
    priority: str


class GrowthFeedbackResponse(BaseModel):
    """Growth feedback when debate ends"""
    session_summary: Dict[str, Any]
    what_went_well: List[str]
    areas_for_improvement: List[ImprovementAreaResponse]
    achievements: List[Dict[str, Any]]
    recommendations: Dict[str, Any]


class DebateMessageResponse(BaseModel):
    """Response to user message"""
    session_id: str
    turn: int
    ai_response: str
    debate_ended: bool
    user_skill_estimate: float
    agent_insights: Optional[AgentInsights] = None
    growth_feedback: Optional[GrowthFeedbackResponse] = None


class EndDebateRequest(BaseModel):
    """Request to end debate"""
    session_id: str
    explicit_end: bool = True


class DebateHistoryItem(BaseModel):
    """Single debate in history"""
    session_id: str
    topic: str
    difficulty: str
    started_at: datetime
    ended_at: Optional[datetime]
    total_turns: Optional[int]
    performance: Optional[str]


class DebateHistoryResponse(BaseModel):
    """User's debate history"""
    user_id: str
    total_debates: int
    current_skill: float
    debates: List[DebateHistoryItem]
