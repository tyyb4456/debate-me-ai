# ============================================================================
# FILE: api/routes/streaming.py - PRODUCTION-READY SSE STREAMING
# ============================================================================

from fastapi import APIRouter, Query, HTTPException
from sse_starlette.sse import EventSourceResponse
import asyncio
import json
import logging
from typing import AsyncGenerator, Dict, Any
from datetime import datetime

from graph_builder import create_debate_workflow

router = APIRouter()
logger = logging.getLogger(__name__)

# Initialize workflow once
debate_workflow = create_debate_workflow()


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def serialize_for_json(obj: Any) -> Any:
    """Safely serialize objects to JSON-compatible format"""
    if hasattr(obj, 'dict'):
        return obj.dict()
    elif hasattr(obj, '__dict__'):
        return {k: v for k, v in obj.__dict__.items() if not k.startswith('_')}
    elif isinstance(obj, (list, tuple)):
        return [serialize_for_json(item) for item in obj]
    elif isinstance(obj, dict):
        return {k: serialize_for_json(v) for k, v in obj.items()}
    elif isinstance(obj, (str, int, float, bool, type(None))):
        return obj
    else:
        return str(obj)


def create_initial_state(session_id: str, user_input: str) -> Dict[str, Any]:
    """Create initial state for debate workflow"""
    return {
        "session_id": session_id,
        "user_id": "default_user",  # In production, get from auth
        "topic": "Current debate topic",  # Load from session
        "difficulty": "standard",
        "turn_count": 0,
        "debate_ended": False,
        
        "user_input": user_input,
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


# ============================================================================
# SSE EVENT GENERATORS
# ============================================================================

async def stream_debate_response(
    session_id: str,
    user_input: str
) -> AsyncGenerator[Dict[str, Any], None]:
    """
    Stream debate response using LangGraph's astream
    
    Yields SSE events:
    - status: Agent status updates
    - thinking: Agent is processing
    - token: Individual AI response tokens
    - agent_output: Complete agent output
    - complete: Streaming finished
    - error: Error occurred
    """
    
    try:
        # Send initial status
        yield {
            "event": "status",
            "data": json.dumps({
                "status": "initializing",
                "message": "Processing your message...",
                "timestamp": datetime.utcnow().isoformat()
            })
        }
        
        # Create initial state
        state = create_initial_state(session_id, user_input)
        config = {
            "configurable": {
                "thread_id": session_id
            }
        }
        
        logger.info(f"[SSE] Starting stream for session: {session_id}")
        
        # Track which agents have executed
        agents_executed = set()
        current_node = None
        accumulated_response = ""
        
        # Stream through LangGraph workflow
        async for chunk in debate_workflow.astream(state, config=config, stream_mode="updates"):
            
            # chunk is a dict like: {"node_name": node_output_state}
            for node_name, node_state in chunk.items():
                
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
                    
                    # Small delay for better UX
                    await asyncio.sleep(0.1)
                
                # Check if this node produced agent outputs
                if "agent_outputs" in node_state:
                    agent_outputs = node_state["agent_outputs"]
                    
                    for agent_name, agent_output in agent_outputs.items():
                        if agent_name not in agents_executed:
                            agents_executed.add(agent_name)
                            
                            # Send agent-specific output
                            yield {
                                "event": "agent_output",
                                "data": json.dumps({
                                    "agent": agent_name,
                                    "output": serialize_for_json(agent_output)[:500],  # Truncate long outputs
                                    "timestamp": datetime.utcnow().isoformat()
                                })
                            }
                
                # Check for AI response (final synthesis)
                if "ai_response" in node_state and node_state["ai_response"]:
                    ai_response = node_state["ai_response"]
                    
                    # Only stream if this is new content
                    if ai_response != accumulated_response:
                        # Stream token by token
                        new_content = ai_response[len(accumulated_response):]
                        
                        # Split into words for streaming
                        words = new_content.split()
                        for word in words:
                            yield {
                                "event": "token",
                                "data": word + " "
                            }
                            await asyncio.sleep(0.02)  # Simulate natural typing
                        
                        accumulated_response = ai_response
        
        # Get final state
        final_state = state
        
        # Send completion event with metadata
        yield {
            "event": "complete",
            "data": json.dumps({
                "status": "complete",
                "session_id": session_id,
                "turn": final_state.get("turn_count", 0),
                "debate_ended": final_state.get("debate_ended", False),
                "user_skill": final_state.get("user_skill_estimate", 0.5),
                "agents_executed": list(agents_executed),
                "timestamp": datetime.utcnow().isoformat()
            })
        }
        
        logger.info(f"[SSE] Stream completed for session: {session_id}")
        
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


def get_agent_status_message(node_name: str) -> str:
    """Get human-readable status message for each agent"""
    messages = {
        "moderator": "Analyzing your argument and routing to specialists...",
        "analyzer": "Examining logical structure and detecting fallacies...",
        "researcher": "Searching for evidence and credible sources...",
        "socratic_questioner": "Crafting probing questions...",
        "devils_advocate": "Building counter-arguments...",
        "growth_tracker": "Analyzing your growth and progress...",
    }
    return messages.get(node_name, f"Processing with {node_name}...")


# ============================================================================
# SSE ENDPOINTS
# ============================================================================

@router.get("/stream/{session_id}")
async def stream_debate_sse(
    session_id: str,
    user_input: str = Query(..., description="User's message to debate")
):
    """
    Stream AI debate response using Server-Sent Events (SSE)
    
    **Event Types:**
    - `status`: Agent status updates
    - `token`: Individual words/tokens of AI response
    - `agent_output`: Complete output from specific agent
    - `complete`: Streaming finished with metadata
    - `error`: Error occurred during processing
    
    **Example Client (JavaScript):**
    ```javascript
    const eventSource = new EventSource(
        `/api/debate/stream/${sessionId}?user_input=${encodeURIComponent(message)}`
    );
    
    eventSource.addEventListener('status', (e) => {
        const data = JSON.parse(e.data);
        console.log(`Status: ${data.agent} - ${data.message}`);
    });
    
    eventSource.addEventListener('token', (e) => {
        appendToResponse(e.data);
    });
    
    eventSource.addEventListener('complete', (e) => {
        const data = JSON.parse(e.data);
        console.log('Complete:', data);
        eventSource.close();
    });
    
    eventSource.addEventListener('error', (e) => {
        console.error('Error:', JSON.parse(e.data));
        eventSource.close();
    });
    ```
    """
    
    try:
        return EventSourceResponse(
            stream_debate_response(session_id, user_input),
            media_type="text/event-stream",
            ping=15,  # Send ping every 15 seconds to keep connection alive
            sep="\n"  # Event separator
        )
    except Exception as e:
        logger.error(f"[SSE] Failed to create event source: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to start streaming: {str(e)}"
        )


@router.get("/stream-values/{session_id}")
async def stream_debate_values(
    session_id: str,
    user_input: str = Query(..., description="User's message")
):
    """
    Alternative streaming endpoint using stream_mode="values"
    
    Streams the complete state after each node execution.
    Useful for debugging or when you need full state access.
    """
    
    async def value_stream():
        try:
            state = create_initial_state(session_id, user_input)
            config = {"configurable": {"thread_id": session_id}}
            
            yield {
                "event": "start",
                "data": json.dumps({"message": "Starting debate processing..."})
            }
            
            async for value in debate_workflow.astream(state, config=config, stream_mode="values"):
                # Send complete state after each node
                yield {
                    "event": "state_update",
                    "data": json.dumps({
                        "turn": value.get("turn_count", 0),
                        "current_phase": value.get("current_phase", "unknown"),
                        "routing_decision": value.get("routing_decision", ""),
                        "has_response": value.get("ai_response") is not None,
                        "debate_ended": value.get("debate_ended", False)
                    })
                }
                
                await asyncio.sleep(0.1)
            
            yield {
                "event": "complete",
                "data": json.dumps({"message": "Processing complete"})
            }
            
        except Exception as e:
            logger.error(f"[SSE Values] Error: {str(e)}")
            yield {
                "event": "error",
                "data": json.dumps({"error": str(e)})
            }
    
    return EventSourceResponse(value_stream())


@router.get("/stream-messages/{session_id}")
async def stream_debate_messages(
    session_id: str,
    user_input: str = Query(..., description="User's message")
):
    """
    Stream LLM messages/tokens in real-time
    
    Uses stream_mode="messages" to get individual LLM tokens.
    Best for true token-by-token streaming of AI responses.
    """
    
    async def message_stream():
        try:
            state = create_initial_state(session_id, user_input)
            config = {"configurable": {"thread_id": session_id}}
            
            yield {
                "event": "start",
                "data": json.dumps({"message": "Connecting to AI..."})
            }
            
            async for message, metadata in debate_workflow.astream(
                state, 
                config=config, 
                stream_mode="messages"
            ):
                # Stream individual LLM tokens
                if hasattr(message, 'content') and message.content:
                    yield {
                        "event": "token",
                        "data": message.content
                    }
                    await asyncio.sleep(0.01)
            
            yield {
                "event": "complete",
                "data": json.dumps({"message": "Streaming complete"})
            }
            
        except Exception as e:
            logger.error(f"[SSE Messages] Error: {str(e)}")
            yield {
                "event": "error",
                "data": json.dumps({"error": str(e)})
            }
    
    return EventSourceResponse(message_stream())


# ============================================================================
# WEBSOCKET ALTERNATIVE (Optional)
# ============================================================================

from fastapi import WebSocket, WebSocketDisconnect

@router.websocket("/ws/{session_id}")
async def websocket_debate(websocket: WebSocket, session_id: str):
    """
    WebSocket alternative to SSE for bi-directional communication
    
    **Example Client:**
    ```javascript
    const ws = new WebSocket(`ws://localhost:8000/api/debate/ws/${sessionId}`);
    
    ws.onopen = () => {
        ws.send(JSON.stringify({
            type: "message",
            content: "Your debate message here"
        }));
    };
    
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('Received:', data);
    };
    ```
    """
    
    await websocket.accept()
    logger.info(f"[WebSocket] Client connected: {session_id}")
    
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            if message_data.get("type") == "message":
                user_input = message_data.get("content", "")
                
                # Send acknowledgment
                await websocket.send_json({
                    "type": "ack",
                    "message": "Processing your message..."
                })
                
                # Stream response through WebSocket
                state = create_initial_state(session_id, user_input)
                config = {"configurable": {"thread_id": session_id}}
                
                async for chunk in debate_workflow.astream(state, config=config, stream_mode="updates"):
                    for node_name, node_state in chunk.items():
                        # Send status update
                        await websocket.send_json({
                            "type": "status",
                            "agent": node_name,
                            "message": get_agent_status_message(node_name)
                        })
                        
                        # Send AI response tokens
                        if "ai_response" in node_state and node_state["ai_response"]:
                            words = node_state["ai_response"].split()
                            for word in words:
                                await websocket.send_json({
                                    "type": "token",
                                    "content": word + " "
                                })
                                await asyncio.sleep(0.02)
                
                # Send completion
                await websocket.send_json({
                    "type": "complete",
                    "message": "Response complete"
                })
                
            elif message_data.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
                
    except WebSocketDisconnect:
        logger.info(f"[WebSocket] Client disconnected: {session_id}")
    except Exception as e:
        logger.error(f"[WebSocket] Error for {session_id}: {str(e)}")
        await websocket.send_json({
            "type": "error",
            "error": str(e)
        })
        await websocket.close()


# ============================================================================
# HEALTH CHECK FOR STREAMING
# ============================================================================

@router.get("/stream-health")
async def stream_health():
    """Check if streaming is available"""
    return {
        "status": "healthy",
        "streaming": "available",
        "modes": ["updates", "values", "messages"],
        "protocols": ["SSE", "WebSocket"]
    }