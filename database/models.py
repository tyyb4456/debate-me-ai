# ============================================================================
# FILE 4: database/models.py - SQLAlchemy ORM Models
# ============================================================================

from sqlalchemy import Column, String, Integer, Float, Text, DateTime, ForeignKey, CheckConstraint, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from datetime import datetime
import uuid

from config.database import Base


class User(Base):
    """User accounts and aggregate stats"""
    __tablename__ = "users"
    
    user_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(255), unique=True, nullable=True)
    email = Column(String(255), unique=True, nullable=True)
    current_skill_level = Column(Float, default=0.5)
    total_debates = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class DebateSession(Base):
    """Debate sessions with metadata and final stats"""
    __tablename__ = "debate_sessions"
    
    session_id = Column(String(255), primary_key=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    topic = Column(Text, nullable=False)
    difficulty = Column(String(20), nullable=False)
    status = Column(String(20), default="active")
    
    # Timestamps
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    ended_at = Column(DateTime(timezone=True), nullable=True)
    
    # Final metrics
    total_turns = Column(Integer, nullable=True)
    avg_argument_strength = Column(Float, nullable=True)
    fallacy_count = Column(Integer, nullable=True)
    overall_performance = Column(String(20), nullable=True)
    
    # Full state snapshot
    final_state = Column(JSONB, nullable=True)
    
    __table_args__ = (
        CheckConstraint("difficulty IN ('casual', 'standard', 'expert')"),
        CheckConstraint("status IN ('active', 'completed', 'abandoned')"),
        CheckConstraint("overall_performance IN ('poor', 'fair', 'good', 'excellent') OR overall_performance IS NULL"),
        Index("idx_debate_user", "user_id"),
        Index("idx_debate_status", "status"),
        Index("idx_debate_started", "started_at"),
    )


class Turn(Base):
    """Individual turns in debates"""
    __tablename__ = "turns"
    
    turn_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(String(255), ForeignKey("debate_sessions.session_id", ondelete="CASCADE"), nullable=False)
    turn_number = Column(Integer, nullable=False)
    
    # Messages
    user_input = Column(Text, nullable=False)
    ai_response = Column(Text, nullable=False)
    
    # Agent outputs
    analyzer_output = Column(JSONB, nullable=True)
    research_output = Column(JSONB, nullable=True)
    socratic_output = Column(JSONB, nullable=True)
    advocate_output = Column(JSONB, nullable=True)
    
    # Metadata
    user_skill_at_turn = Column(Float, nullable=True)
    argument_strength = Column(Float, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    
    __table_args__ = (
        Index("idx_turns_session", "session_id"),
        Index("idx_turns_timestamp", "timestamp"),
    )


class Fallacy(Base):
    """Detected fallacies"""
    __tablename__ = "fallacies"
    
    fallacy_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(String(255), ForeignKey("debate_sessions.session_id", ondelete="CASCADE"), nullable=False)
    turn_id = Column(UUID(as_uuid=True), ForeignKey("turns.turn_id", ondelete="CASCADE"), nullable=False)
    
    fallacy_type = Column(String(100), nullable=False)
    text_span = Column(Text, nullable=False)
    explanation = Column(Text, nullable=True)
    severity = Column(String(20), nullable=False)
    
    detected_at = Column(DateTime(timezone=True), server_default=func.now())
    
    __table_args__ = (
        CheckConstraint("severity IN ('minor', 'moderate', 'severe')"),
        Index("idx_fallacies_session", "session_id"),
        Index("idx_fallacies_type", "fallacy_type"),
    )


class Achievement(Base):
    """User achievements and badges"""
    __tablename__ = "achievements"
    
    achievement_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    
    badge_name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    earned_at = Column(DateTime(timezone=True), server_default=func.now())
    debate_id = Column(String(255), ForeignKey("debate_sessions.session_id", ondelete="SET NULL"), nullable=True)
    
    __table_args__ = (
        Index("idx_achievements_user", "user_id"),
    )
