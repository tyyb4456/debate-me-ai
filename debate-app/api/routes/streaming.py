# ============================================================================
# FIXED: api/routes/streaming.py - Proper State Management
# ============================================================================

from fastapi import APIRouter, Query, HTTPException, Depends
from sse_starlette.sse import EventSourceResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import asyncio
import json
import logging
from typing import AsyncGenerator, Dict, Any
from datetime import datetime

from graph_builder import create_debate_workflow
from database.models import DebateSession, Turn
from config.database import get_db

router = APIRouter()
logger = logging.getLogger(__name__)

# Initialize workflow once
debate_workflow = create_debate_workflow()


# ============================================================================
# FIXED: Load State from Database
# ============================================================================
async def load_debate_state(session_id: str, db: AsyncSession) -> Dict[str, Any]:
    """
    CRITICAL FIX: Load existing state instead of creating new
    WITH BETTER DEBUGGING
    """
    
    # Get debate session
    result = await db.execute(
        select(DebateSession).where(DebateSession.session_id == session_id)
    )
    debate = result.scalar_one_or_none()
    
    if not debate:
        raise HTTPException(status_code=404, detail="Debate session not found")
    
    # Get all previous turns
    result = await db.execute(
        select(Turn)
        .where(Turn.session_id == session_id)
        .order_by(Turn.turn_number)
    )
    turns = result.scalars().all()
    
    # ============================================================================
    # BETTER DEBUGGING - Print actual turn data
    # ============================================================================
    print(f"\n{'='*60}")
    print(f"[LOAD STATE] Session ID: {session_id}")
    print(f"[LOAD STATE] Topic: {debate.topic}")
    print(f"[LOAD STATE] Difficulty: {debate.difficulty}")
    print(f"[LOAD STATE] Total Turns Found: {len(turns)}")
    print(f"{'='*60}\n")
    
    if turns:
        for i, turn in enumerate(turns, 1):
            print(f"Turn {i}:")
            print(f"  Turn Number: {turn.turn_number}")
            print(f"  User Input: {turn.user_input[:50]}..." if len(turn.user_input) > 50 else f"  User Input: {turn.user_input}")
            print(f"  AI Response: {turn.ai_response[:50]}..." if len(turn.ai_response) > 50 else f"  AI Response: {turn.ai_response}")
            print(f"  User Skill: {turn.user_skill_at_turn}")
            print(f"  Argument Strength: {turn.argument_strength}")
            print(f"  Timestamp: {turn.timestamp}")
            print()
    else:
        print("[LOAD STATE] ⚠️  No previous turns found - This is a new debate session\n")
    
    # ============================================================================
    # Reconstruct conversation history
    # ============================================================================
    conversation_history = []
    for turn in turns:
        conversation_history.append({
            "role": "user",
            "content": turn.user_input,
            "turn": turn.turn_number
        })
        conversation_history.append({
            "role": "assistant",
            "content": turn.ai_response,
            "turn": turn.turn_number
        })
    
    print(f"[LOAD STATE] Conversation History Length: {len(conversation_history)} messages")
    print(f"[LOAD STATE] Last User Skill Estimate: {turns[-1].user_skill_at_turn if turns else 0.5}")
    print(f"{'='*60}\n")
    
    # ============================================================================
    # Build state from database
    # ============================================================================
    state = {
        "session_id": session_id,
        "user_id": str(debate.user_id),
        "topic": debate.topic,
        "difficulty": debate.difficulty,
        "turn_count": len(turns),
        "debate_ended": debate.status != "active",
        
        "user_input": "",  # Will be filled by new input
        "user_claim": "",
        "ai_response": None,
        
        "analyzer_output": None,
        "research_output": None,
        "socratic_output": None,
        "advocate_output": None,
        "growth_feedback": None,
        
        "agent_outputs": {},
        "conversation_history": conversation_history,
        
        "user_claims": [],
        "ai_claims": [],
        "conceded_points": [],
        "fallacies_detected": [],
        "current_phase": "opening" if len(turns) <= 2 else "rebuttal",
        
        "user_claims_history": [],
        "fallacies_history": [],
        "questions_asked": [],
        "ai_claims_history": [],
        
        "user_skill_estimate": turns[-1].user_skill_at_turn if turns else 0.5,
        "routing_phase": "initial",
        "next_agents": [],
        "routing_decision": ""
    }
    
    return state


# ============================================================================
# ALTERNATIVE: Even More Detailed Debugging
# ============================================================================

async def load_debate_state_verbose(session_id: str, db: AsyncSession) -> Dict[str, Any]:
    """
    Version with MAXIMUM debugging info
    """
    
    logger.info(f"{'='*80}")
    logger.info(f"LOADING DEBATE STATE - Session: {session_id}")
    logger.info(f"{'='*80}")
    
    # Get debate session
    result = await db.execute(
        select(DebateSession).where(DebateSession.session_id == session_id)
    )
    debate = result.scalar_one_or_none()
    
    if not debate:
        logger.error(f"❌ Debate session {session_id} not found in database")
        raise HTTPException(status_code=404, detail="Debate session not found")
    
    logger.info(f"Found debate session:")
    logger.info(f"   Topic: {debate.topic}")
    logger.info(f"   Difficulty: {debate.difficulty}")
    logger.info(f"   Status: {debate.status}")
    logger.info(f"   Started: {debate.started_at}")
    logger.info(f"   User ID: {debate.user_id}")
    
    # Get all previous turns
    result = await db.execute(
        select(Turn)
        .where(Turn.session_id == session_id)
        .order_by(Turn.turn_number)
    )
    turns = result.scalars().all()
    
    logger.info(f"\nTurn Statistics:")
    logger.info(f"   Total Turns: {len(turns)}")
    
    if turns:
        logger.info(f"   First Turn: {turns[0].turn_number} at {turns[0].timestamp}")
        logger.info(f"   Last Turn: {turns[-1].turn_number} at {turns[-1].timestamp}")
        logger.info(f"   Current Skill Estimate: {turns[-1].user_skill_at_turn:.3f}")
        
        # Analyze turn quality
        strengths = [t.argument_strength for t in turns if t.argument_strength is not None]
        if strengths:
            avg_strength = sum(strengths) / len(strengths)
            logger.info(f"   Average Argument Strength: {avg_strength:.2f}/10")
        
        # Count analyzer outputs
        with_analyzer = sum(1 for t in turns if t.analyzer_output is not None)
        with_research = sum(1 for t in turns if t.research_output is not None)
        
        logger.info(f"\n Agent Activity:")
        logger.info(f"   Turns with Analyzer: {with_analyzer}/{len(turns)}")
        logger.info(f"   Turns with Research: {with_research}/{len(turns)}")
        
        # Show recent turns
        logger.info(f"\n  Recent Conversation:")
        for turn in turns[-3:]:  # Last 3 turns
            logger.info(f"\n   Turn {turn.turn_number}:")
            logger.info(f"   👤 User: {turn.user_input[:80]}...")
            logger.info(f"   🤖 AI: {turn.ai_response[:80]}...")
    else:
        logger.warning(f"  No previous turns found - Starting fresh debate")
    
    # Reconstruct conversation history
    conversation_history = []
    for turn in turns:
        conversation_history.append({
            "role": "user",
            "content": turn.user_input,
            "turn": turn.turn_number
        })
        conversation_history.append({
            "role": "assistant",
            "content": turn.ai_response,
            "turn": turn.turn_number
        })
    
    logger.info(f"\nReconstructed Conversation History: {len(conversation_history)} messages")
    logger.info(f"{'='*80}\n")
    
    # Build state from database
    state = {
        "session_id": session_id,
        "user_id": str(debate.user_id),
        "topic": debate.topic,
        "difficulty": debate.difficulty,
        "turn_count": len(turns),
        "debate_ended": debate.status != "active",
        
        "user_input": "",
        "user_claim": "",
        "ai_response": None,
        
        "analyzer_output": None,
        "research_output": None,
        "socratic_output": None,
        "advocate_output": None,
        "growth_feedback": None,
        
        "agent_outputs": {},
        "conversation_history": conversation_history,
        
        "user_claims": [],
        "ai_claims": [],
        "conceded_points": [],
        "fallacies_detected": [],
        "current_phase": "opening" if len(turns) <= 2 else "rebuttal",
        
        "user_claims_history": [],
        "fallacies_history": [],
        "questions_asked": [],
        "ai_claims_history": [],
        
        "user_skill_estimate": turns[-1].user_skill_at_turn if turns else 0.5,
        "routing_phase": "initial",
        "next_agents": [],
        "routing_decision": ""
    }
    
    return state



# ============================================================================
# FIXED: SSE Streaming with State Persistence
# ============================================================================

async def stream_debate_response(
    session_id: str,
    user_input: str,
    db: AsyncSession
) -> AsyncGenerator[Dict[str, Any], None]:
    """
    FIXED: Stream debate response with proper state management
    """
    
    try:
        # Send initial status
        yield {
            "event": "status",
            "data": json.dumps({
                "status": "initializing",
                "message": "Loading debate state...",
                "timestamp": datetime.utcnow().isoformat()
            })
        }
        
        # CRITICAL FIX: Load existing state from database
        state = await load_debate_state(session_id, db)
        
        # Add new user input
        state['user_input'] = user_input
        state['routing_phase'] = 'initial'
        state['agent_outputs'] = {}
        
        config = {
            "configurable": {
                "thread_id": session_id
            }
        }
        
        logger.info(f"[SSE] Starting stream for session: {session_id}, turn: {state['turn_count'] + 1}")
        
        # Track agents and response
        agents_executed = set()
        current_node = None
        accumulated_response = ""

        # Track accumulated state
        accumulated_state = state.copy()
        
        # Stream through LangGraph workflow
        async for chunk in debate_workflow.astream(state, config=config, stream_mode="updates"):
            
            for node_name, node_state in chunk.items():

                # MERGE state updates
                for key, value in node_state.items():
                    if key in accumulated_state:
                        if isinstance(value, dict) and key == "agent_outputs":
                            # Accumulate agent outputs
                            accumulated_state[key].update(value)
                        elif isinstance(value, list):
                            # Accumulate lists
                            accumulated_state[key].extend(value)
                        else:
                            # Replace scalars
                            accumulated_state[key] = value
                    else:
                        accumulated_state[key] = value
                
                if node_name != current_node:
                    current_node = node_name
                    agents_executed.add(node_name)
                    
                    # Send agent status update
                    yield {
                        "event": "status",
                        "data": json.dumps({
                            "status": "processing",
                            "agent": node_name,
                            "message": get_agent_status_message(node_name),
                            "timestamp": datetime.utcnow().isoformat()
                        })
                    }
                    
                    await asyncio.sleep(0.1)
                
                # Check for agent outputs
                if "agent_outputs" in node_state:
                    agent_outputs = node_state["agent_outputs"]
                    
                    for agent_name, agent_output in agent_outputs.items():
                        if agent_name not in agents_executed:
                            agents_executed.add(agent_name)
                            
                            yield {
                                "event": "agent_output",
                                "data": json.dumps({
                                    "agent": agent_name,
                                    "output": str(agent_output)[:500],
                                    "timestamp": datetime.utcnow().isoformat()
                                })
                            }
                
                # Stream AI response tokens
                if "ai_response" in node_state and node_state["ai_response"]:
                    ai_response = node_state["ai_response"]
                    
                    if ai_response != accumulated_response:
                        new_content = ai_response[len(accumulated_response):]
                        
                        # Stream word by word
                        words = new_content.split()
                        for word in words:
                            yield {
                                "event": "token",
                                "data": word + " "
                            }
                            await asyncio.sleep(0.02)
                        
                        accumulated_response = ai_response
        
        # CRITICAL FIX: Get final state and save to database
        final_state = await debate_workflow.aget_state(config)
        
        # Save turn to database (similar to debate_service.py)
        await save_turn_to_db(session_id, user_input, final_state.values, db)
        
        # Send completion event
        yield {
            "event": "complete",
            "data": json.dumps({
                "status": "complete",
                "session_id": session_id,
                "turn": final_state.values.get("turn_count", 0),
                "debate_ended": final_state.values.get("debate_ended", False),
                "user_skill": final_state.values.get("user_skill_estimate", 0.5),
                "agents_executed": list(agents_executed),
                "timestamp": datetime.utcnow().isoformat()
            })
        }
        
        logger.info(f"[SSE] Stream completed for session: {session_id}")
        
    except HTTPException:
        raise
    except asyncio.CancelledError:
        logger.warning(f"[SSE] Stream cancelled for session: {session_id}")
        yield {
            "event": "error",
            "data": json.dumps({
                "error": "Stream cancelled by client",
                "timestamp": datetime.utcnow().isoformat()
            })
        }
    except Exception as e:
        logger.error(f"[SSE] Error in stream for session {session_id}: {str(e)}", exc_info=True)
        yield {
            "event": "error",
            "data": json.dumps({
                "error": str(e),
                "error_type": type(e).__name__,
                "timestamp": datetime.utcnow().isoformat()
            })
        }


async def save_turn_to_db(session_id: str, user_input: str, state: Dict, db: AsyncSession):
    """Save completed turn to database"""
    
    try:
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
            analyzer_output=_serialize_output(state.get('analyzer_output')),
            research_output=_serialize_output(state.get('research_output')),
            socratic_output=_serialize_output(state.get('socratic_output')),
            advocate_output=_serialize_output(state.get('advocate_output')),
            user_skill_at_turn=state.get('user_skill_estimate'),
            argument_strength=argument_strength
        )
        
        db.add(turn)
        await db.commit()
        logger.info(f"[SSE] Saved turn {state['turn_count']} to database")
        
    except Exception as e:
        logger.error(f"[SSE] Failed to save turn: {e}")
        await db.rollback()


def _serialize_output(output: Any) -> Dict:
    """Serialize Pydantic models to dict"""
    if output is None:
        return None
    if hasattr(output, 'dict'):
        return output.dict()
    if isinstance(output, dict):
        return output
    return {}


def get_agent_status_message(node_name: str) -> str:
    """Get human-readable status message for each agent"""
    messages = {
        "moderator": "...",
        "analyzer": "Examining logical structure and detecting fallacies...",
        "researcher": "Searching for evidence and credible sources...",
        "socratic_questioner": "Crafting probing questions...",
        "devils_advocate": "Building counter-arguments...",
        "growth_tracker": "Analyzing your growth and progress...",
    }
    return messages.get(node_name, f"Processing with {node_name}...")


# ============================================================================
# FIXED: SSE Endpoint with Database Dependency
# ============================================================================

@router.get("/stream/{session_id}")
async def stream_debate_sse(
    session_id: str,
    user_input: str = Query(..., description="User's message to debate"),
    db: AsyncSession = Depends(get_db)  # ADDED: Database dependency
):
    """
    Stream AI debate response using Server-Sent Events (SSE)
    
    **FIXED**: Now properly loads existing debate state from database
    """
    
    try:
        return EventSourceResponse(
            stream_debate_response(session_id, user_input, db),
            media_type="text/event-stream",
            ping=15,
            sep="\n"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[SSE] Failed to create event source: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to start streaming: {str(e)}"
        )


# ============================================================================
# Health Check
# ============================================================================

@router.get("/stream-health")
async def stream_health():
    """Check if streaming is available"""
    return {
        "status": "healthy",
        "streaming": "available",
        "state_management": "database-backed"
    }