# debate-app/api/routes/streaming.py

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

debate_workflow = create_debate_workflow()


# ============================================================================
# SERIALIZE PYDANTIC MODELS
# ============================================================================
def serialize_agent_output(output: Any) -> Dict:
    if output is None:
        return None
    if hasattr(output, 'dict'):
        return output.dict()
    if isinstance(output, dict):
        return output
    if isinstance(output, list):
        return [serialize_agent_output(item) for item in output]
    if isinstance(output, str):
        try:
            return json.loads(output)
        except:
            return {"raw_text": output}
    return {"raw": str(output)}


# ============================================================================
# LOAD STATE FROM DATABASE
# ============================================================================
async def load_debate_state(session_id: str, db: AsyncSession) -> Dict[str, Any]:
    result = await db.execute(
        select(DebateSession).where(DebateSession.session_id == session_id)
    )
    debate = result.scalar_one_or_none()
    if not debate:
        raise HTTPException(status_code=404, detail="Debate session not found")

    result = await db.execute(
        select(Turn).where(Turn.session_id == session_id).order_by(Turn.turn_number)
    )
    turns = result.scalars().all()

    logger.info(f"[LOAD STATE] Session {session_id}: {len(turns)} turns found")

    conversation_history = []
    for turn in turns:
        conversation_history.append({"role": "user",      "content": turn.user_input,  "turn": turn.turn_number})
        conversation_history.append({"role": "assistant", "content": turn.ai_response, "turn": turn.turn_number})

    logger.info(f"length of conv. is {len(conversation_history)}")

    return {
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


# ============================================================================
# SAVE TURN — accepts collected outputs to avoid __clear__ wipe
# ============================================================================
async def save_turn_to_db(
    session_id: str,
    user_input: str,
    state: Dict,
    db: AsyncSession,
    collected_outputs: Dict = None   # ← agent outputs captured DURING streaming
):
    try:
        # Prefer collected_outputs (captured before __clear__) over final state
        c = collected_outputs or {}
        analyzer_out = c.get('analyzer_output') or state.get('analyzer_output')
        research_out = c.get('research_output') or state.get('research_output')
        socratic_out = c.get('socratic_output') or state.get('socratic_output')
        advocate_out = c.get('advocate_output') or state.get('advocate_output')

        # Extract argument strength
        argument_strength = None
        if analyzer_out:
            if hasattr(analyzer_out, 'argument_strength'):
                argument_strength = analyzer_out.argument_strength.overall_score
            elif isinstance(analyzer_out, dict):
                s = analyzer_out.get('argument_strength', {})
                argument_strength = s.get('overall_score') if isinstance(s, dict) else None

        turn = Turn(
            session_id=session_id,
            turn_number=state['turn_count'],
            user_input=user_input,
            ai_response=state.get('ai_response', ''),
            analyzer_output=serialize_agent_output(analyzer_out),
            research_output=serialize_agent_output(research_out),
            socratic_output=serialize_agent_output(socratic_out),
            advocate_output=serialize_agent_output(advocate_out),
            user_skill_at_turn=state.get('user_skill_estimate'),
            argument_strength=argument_strength
        )

        db.add(turn)
        await db.commit()

        logger.info(
            f"[SSE] Saved turn {state['turn_count']} — "
            f"analyzer={'✓' if analyzer_out else '✗'} "
            f"researcher={'✓' if research_out else '✗'} "
            f"socratic={'✓' if socratic_out else '✗'} "
            f"advocate={'✓' if advocate_out else '✗'}"
        )

    except Exception as e:
        logger.error(f"[SSE] Failed to save turn: {e}")
        await db.rollback()


# ============================================================================
# SSE STREAMING
# ============================================================================
async def stream_debate_response(
    session_id: str,
    user_input: str,
    db: AsyncSession
) -> AsyncGenerator[Dict[str, Any], None]:

    try:
        yield {"event": "status", "data": json.dumps({"status": "initializing", "message": "Loading debate state...", "timestamp": datetime.utcnow().isoformat()})}

        state = await load_debate_state(session_id, db)
        state['user_input'] = user_input
        state['routing_phase'] = 'initial'
        state['agent_outputs'] = {}

        config = {"configurable": {"thread_id": session_id}}
        logger.info(f"[SSE] Starting stream for session: {session_id}, turn: {state['turn_count'] + 1}")

        agents_executed = set()
        current_node = None
        accumulated_response = ""
        accumulated_state = state.copy()

        # ── Collect agent outputs HERE before moderator __clear__ wipes them ──
        collected_outputs = {
            'analyzer_output': None,
            'research_output': None,
            'socratic_output': None,
            'advocate_output': None,
        }

        async for chunk in debate_workflow.astream(state, config=config, stream_mode="updates"):
            for node_name, node_state in chunk.items():

                logger.info(f"[SSE DEBUG] Node '{node_name}' returned keys: {list(node_state.keys())}")

                # ── Capture agent outputs immediately, before they get cleared ──
                for key in collected_outputs:
                    if key in node_state and node_state[key] is not None:
                        collected_outputs[key] = node_state[key]
                        logger.info(f"[SSE] Captured {key} from node '{node_name}'")

                # Merge into accumulated state
                for key, value in node_state.items():
                    if key in accumulated_state:
                        if isinstance(value, dict) and key == "agent_outputs":
                            accumulated_state[key].update(value)
                        elif isinstance(value, list):
                            accumulated_state[key].extend(value)
                        else:
                            accumulated_state[key] = value
                    else:
                        accumulated_state[key] = value

                # Status event when node changes
                if node_name != current_node:
                    current_node = node_name
                    agents_executed.add(node_name)
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

                # Emit agent_output SSE events
                agent_output_mapping = {
                    'analyzer_output': 'analyzer',
                    'research_output': 'researcher',
                    'socratic_output': 'socratic_questioner',
                    'advocate_output': 'devils_advocate'
                }
                for output_key, agent_name in agent_output_mapping.items():
                    if output_key in node_state and node_state[output_key] is not None:
                        serialized = serialize_agent_output(node_state[output_key])
                        logger.info(f"[SSE] Emitting agent_output for {agent_name}")
                        yield {
                            "event": "agent_output",
                            "data": json.dumps({
                                "agent": agent_name,
                                "output": serialized,
                                "timestamp": datetime.utcnow().isoformat()
                            })
                        }

                # Stream AI response tokens
                if "ai_response" in node_state and node_state["ai_response"]:
                    ai_response = node_state["ai_response"]
                    if ai_response != accumulated_response:
                        new_content = ai_response[len(accumulated_response):]
                        words = new_content.split()
                        for word in words:
                            yield {"event": "token", "data": word + " "}
                            await asyncio.sleep(0.02)
                        accumulated_response = ai_response

        # Save turn with collected agent outputs
        final_state = await debate_workflow.aget_state(config)
        await save_turn_to_db(
            session_id, user_input, final_state.values, db,
            collected_outputs=collected_outputs   # ← key fix
        )

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
        yield {"event": "error", "data": json.dumps({"error": "Stream cancelled by client", "timestamp": datetime.utcnow().isoformat()})}
    except Exception as e:
        logger.error(f"[SSE] Error in stream for session {session_id}: {str(e)}", exc_info=True)
        yield {"event": "error", "data": json.dumps({"error": str(e), "error_type": type(e).__name__, "timestamp": datetime.utcnow().isoformat()})}


def get_agent_status_message(node_name: str) -> str:
    return {
        "moderator": "Orchestrating response...",
        "analyzer": "Examining logical structure...",
        "researcher": "Searching for evidence...",
        "socratic_questioner": "Crafting probing questions...",
        "devils_advocate": "Building counter-arguments...",
        "growth_tracker": "Analyzing your growth...",
    }.get(node_name, f"Processing with {node_name}...")


# ============================================================================
# ENDPOINTS
# ============================================================================
@router.get("/stream/{session_id}")
async def stream_debate_sse(
    session_id: str,
    user_input: str = Query(..., description="User's message to debate"),
    db: AsyncSession = Depends(get_db)
):
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
        raise HTTPException(status_code=500, detail=f"Failed to start streaming: {str(e)}")


@router.get("/stream-health")
async def stream_health():
    return {"status": "healthy", "streaming": "available", "state_management": "database-backed"}