# ============================================================================
# FILE 6: services/debate_service.py - Business Logic
# ============================================================================

from uuid import uuid4
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Dict, Any
import json

from database.models import User, DebateSession, Turn, Fallacy, Achievement
from graph_builder import create_debate_workflow

from datetime import datetime


class DebateService:
    """Business logic for debates"""
    
    def __init__(self):
        self.debate_app = create_debate_workflow()
    
    async def start_debate(
        self,
        db: AsyncSession,
        user_id: str,
        topic: str,
        difficulty: str
    ) -> Dict[str, Any]:
        """Start a new debate session"""
        
        # Ensure user exists
        result = await db.execute(select(User).where(User.user_id == user_id))
        user = result.scalar_one_or_none()
        
        if not user:
            # Create new user
            user = User(user_id=user_id)
            db.add(user)
            await db.flush()
        
        # Create debate session
        session_id = f"debate_{uuid4().hex[:12]}"
        debate_session = DebateSession(
            session_id=session_id,
            user_id=user_id,
            topic=topic,
            difficulty=difficulty,
            status="active"
        )
        
        db.add(debate_session)
        await db.commit()
        
        return {
            "session_id": session_id,
            "topic": topic,
            "difficulty": difficulty,
            "message": "Debate started! Make your opening statement.",
            "created_at": debate_session.started_at
        }
    
    async def process_message(
        self,
        db: AsyncSession,
        session_id: str,
        user_input: str
    ) -> Dict[str, Any]:
        """Process user message through debate workflow"""
        
        # Load debate session
        result = await db.execute(
            select(DebateSession).where(DebateSession.session_id == session_id)
        )
        debate_session = result.scalar_one_or_none()
        
        if not debate_session:
            raise ValueError(f"Debate session {session_id} not found")
        
        if debate_session.status != "active":
            raise ValueError(f"Debate session is {debate_session.status}")
        
        # Initialize or load state
        state = await self._load_or_create_state(db, session_id, debate_session)
        
        # Update state with user input
        state['user_input'] = user_input
        state['routing_phase'] = 'initial'
        state['agent_outputs'] = {}
        
        # Run through workflow
        config = {"configurable": {"thread_id": session_id}}
        result_state = self.debate_app.invoke(state, config=config)
        
        # Save turn to database
        await self._save_turn(db, session_id, user_input, result_state)
        
        # Check if debate ended
        if result_state.get('debate_ended'):
            await self._end_debate(db, session_id, result_state)
        
        # Build response
        return self._build_response(result_state)
    
    async def _load_or_create_state(
        self,
        db: AsyncSession,
        session_id: str,
        debate_session: DebateSession
    ) -> Dict[str, Any]:
        """Load existing state or create new one"""
        
        # Get turn count
        result = await db.execute(
            select(Turn).where(Turn.session_id == session_id)
        )
        turns = result.scalars().all()
        
        if not turns:
            # Create initial state
            return {
                "session_id": session_id,
                "user_id": str(debate_session.user_id),
                "topic": debate_session.topic,
                "difficulty": debate_session.difficulty,
                "turn_count": 0,
                "debate_ended": False,
                "user_input": "",
                "user_claim": "",
                "ai_response": None,
                "analyzer_output": None,
                "research_output": None,
                "socratic_output": None,
                "advocate_output": None,
                "growth_feedback": None,
                "agent_outputs": {},
                "conversation_history": [],
                "user_claims": [],
                "ai_claims": [],
                "conceded_points": [],
                "fallacies_detected": [],
                "current_phase": "opening",
                "user_claims_history": [],
                "fallacies_history": [],
                "questions_asked": [],
                "ai_claims_history": [],
                "user_skill_estimate": 0.5,
                "routing_phase": "initial",
                "next_agents": [],
                "routing_decision": ""
            }
        
        # Load state from last turn
        last_turn = max(turns, key=lambda t: t.turn_number)
        
        # Reconstruct state from database
        # (Simplified - in production, might store full state in JSONB)
        return {
            "session_id": session_id,
            "user_id": str(debate_session.user_id),
            "topic": debate_session.topic,
            "difficulty": debate_session.difficulty,
            "turn_count": last_turn.turn_number,
            "user_skill_estimate": last_turn.user_skill_at_turn or 0.5,
            # ... reconstruct other fields from turns
        }
    
    async def _save_turn(
        self,
        db: AsyncSession,
        session_id: str,
        user_input: str,
        state: Dict[str, Any]
    ):
        """Save turn to database"""
        
        # Extract argument strength if available
        argument_strength = None
        if state.get('analyzer_output'):
            analyzer = state['analyzer_output']
            if hasattr(analyzer, 'argument_strength'):
                argument_strength = analyzer.argument_strength.overall_score
        
        # Create turn record
        turn = Turn(
            session_id=session_id,
            turn_number=state['turn_count'],
            user_input=user_input,
            ai_response=state.get('ai_response', ''),
            analyzer_output=self._serialize_output(state.get('analyzer_output')),
            research_output=self._serialize_output(state.get('research_output')),
            socratic_output=self._serialize_output(state.get('socratic_output')),
            advocate_output=self._serialize_output(state.get('advocate_output')),
            user_skill_at_turn=state.get('user_skill_estimate'),
            argument_strength=argument_strength
        )
        
        db.add(turn)
        await db.flush()
        
        # Save fallacies
        if state.get('fallacies_history'):
            for fallacy_data in state['fallacies_history']:
                if fallacy_data.get('turn') == state['turn_count']:
                    fallacy = Fallacy(
                        session_id=session_id,
                        turn_id=turn.turn_id,
                        fallacy_type=fallacy_data.get('fallacy', 'unknown'),
                        text_span=fallacy_data.get('text_span', ''),
                        explanation=fallacy_data.get('explanation', ''),
                        severity=fallacy_data.get('severity', 'moderate')
                    )
                    db.add(fallacy)
        
        await db.commit()
    
    async def _end_debate(
        self,
        db: AsyncSession,
        session_id: str,
        state: Dict[str, Any]
    ):
        """Mark debate as completed and save final stats"""
        
        result = await db.execute(
            select(DebateSession).where(DebateSession.session_id == session_id)
        )
        debate_session = result.scalar_one()
        
        # Update session
        debate_session.status = "completed"
        debate_session.ended_at = datetime.utcnow()
        debate_session.total_turns = state.get('turn_count', 0)
        debate_session.final_state = json.loads(json.dumps(state, default=str))
        
        # Extract final metrics
        if state.get('growth_feedback'):
            feedback = state['growth_feedback']
            if hasattr(feedback, 'session_summary'):
                debate_session.avg_argument_strength = feedback.session_summary.argument_strength_avg
                debate_session.fallacy_count = feedback.session_summary.fallacies_count
                debate_session.overall_performance = feedback.session_summary.overall_performance
        
        # Update user stats
        result_user = await db.execute(
            select(User).where(User.user_id == debate_session.user_id)
        )
        user = result_user.scalar_one()
        user.total_debates += 1
        user.current_skill_level = state.get('user_skill_estimate', user.current_skill_level)
        
        # Save achievements
        if state.get('growth_feedback'):
            feedback = state['growth_feedback']
            if hasattr(feedback, 'achievements'):
                for ach in feedback.achievements:
                    if ach.earned:
                        achievement = Achievement(
                            user_id=debate_session.user_id,
                            badge_name=ach.badge,
                            description=ach.description,
                            debate_id=session_id
                        )
                        db.add(achievement)
        
        await db.commit()
    
    def _serialize_output(self, output: Any) -> Dict:
        """Serialize Pydantic models to dict"""
        if output is None:
            return None
        if hasattr(output, 'dict'):
            return output.dict()
        if isinstance(output, dict):
            return output
        return {}
    
    def _build_response(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """Build API response from state"""
        
        response = {
            "session_id": state['session_id'],
            "turn": state['turn_count'],
            "ai_response": state.get('ai_response', ''),
            "debate_ended": state.get('debate_ended', False),
            "user_skill_estimate": state.get('user_skill_estimate', 0.5)
        }
        
        # Add agent insights
        insights = {
            "fallacies_detected": [],
            "argument_strength": None,
            "sources_cited": []
        }
        
        if state.get('analyzer_output'):
            analyzer = state['analyzer_output']
            if hasattr(analyzer, 'fallacies_detected'):
                insights['fallacies_detected'] = [f.type for f in analyzer.fallacies_detected]
            if hasattr(analyzer, 'argument_strength'):
                insights['argument_strength'] = analyzer.argument_strength.overall_score
        
        if state.get('research_output'):
            research = state['research_output']
            if isinstance(research, dict) and 'opposing_evidence' in research:
                insights['sources_cited'] = [
                    e.get('source_name', '') for e in research['opposing_evidence'][:3]
                ]
        
        response['agent_insights'] = insights
        
        # Add growth feedback if debate ended
        if state.get('debate_ended') and state.get('growth_feedback'):
            response['growth_feedback'] = self._serialize_output(state['growth_feedback'])
        
        return response


# Create singleton instance
debate_service = DebateService()
