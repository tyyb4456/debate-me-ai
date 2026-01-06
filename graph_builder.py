"""
DEBATE SYSTEM WITH STREAMING SUPPORT
Shows how to stream AI responses in real-time
"""

from typing import TypedDict, List, Optional, Any, Dict, Iterator
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver
from uuid import uuid4
from state import DebateState
from nodes.moderator_agent import moderator_node
from nodes.research_agent import research_agent_node
from nodes.growth_tracker_agent import growth_tracker_node
from nodes.argument_analyzer_agent import argument_analyzer_node
from nodes.socratic_questioner_agent import socratic_questioner_node
from nodes.devils_advocate_agent import devils_advocate_node


# ============================================================================
# ROUTING FUNCTIONS (Same as before)
# ============================================================================

def route_from_moderator(state: DebateState) -> List[str]:
    """Route from moderator to appropriate agents"""
    next_agents = state.get('next_agents', [])
    
    if not next_agents or next_agents == ["END"]:
        return [END]
    
    if len(next_agents) == 1:
        agent = next_agents[0]
        if agent == "growth_tracker":
            return ["growth_tracker"]
        return [agent]
    
    return next_agents


# ============================================================================
# WORKFLOW BUILDER
# ============================================================================

def create_debate_workflow():
    """Creates the debate workflow"""
    
    print("[WORKFLOW] Building debate workflow with streaming support...")
    
    workflow = StateGraph(DebateState)
    
    # Add all nodes
    workflow.add_node("moderator", moderator_node)
    workflow.add_node("analyzer", argument_analyzer_node)
    workflow.add_node("researcher", research_agent_node)
    workflow.add_node("socratic_questioner", socratic_questioner_node)
    workflow.add_node("devils_advocate", devils_advocate_node)
    workflow.add_node("growth_tracker", growth_tracker_node)
    
    workflow.set_entry_point("moderator")
    
    # Routing
    workflow.add_conditional_edges(
        "moderator",
        route_from_moderator,
        [
            "analyzer",
            "researcher", 
            "socratic_questioner",
            "devils_advocate",
            "growth_tracker",
            END
        ]
    )
    
    # All agents return to moderator
    workflow.add_edge("analyzer", "moderator")
    workflow.add_edge("researcher", "moderator")
    workflow.add_edge("socratic_questioner", "moderator")
    workflow.add_edge("devils_advocate", "moderator")
    workflow.add_edge("growth_tracker", END)
    
    memory = MemorySaver()
    app = workflow.compile(checkpointer=memory)
    
    print("[WORKFLOW] Workflow compiled with streaming support!")
    return app


def initialize_debate(
    topic: str,
    difficulty: str = "standard",
    user_id: str = None,
    session_id: str = None
) -> DebateState:
    """Initialize a new debate session"""
    
    return {
        "session_id": session_id or str(uuid4()),
        "user_id": user_id or str(uuid4()),
        "topic": topic,
        "difficulty": difficulty,
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


def process_user_input(state: DebateState, user_input: str) -> DebateState:
    """Add user input to state"""
    state['user_input'] = user_input
    state['routing_phase'] = 'initial'
    state['agent_outputs'] = {}
    return state


# ============================================================================
# MAIN DEBATE INTERFACE WITH STREAMING
# ============================================================================

class DebateSystem:
    """Main interface for running debates with streaming support"""
    
    def __init__(self):
        self.workflow = create_debate_workflow()
        self.active_sessions = {}
    
    def start_debate(
        self, 
        topic: str, 
        difficulty: str = "standard",
        user_id: str = None
    ) -> str:
        """Start a new debate session"""
        
        session_id = str(uuid4())
        initial_state = initialize_debate(
            topic=topic,
            difficulty=difficulty,
            user_id=user_id,
            session_id=session_id
        )
        
        self.active_sessions[session_id] = initial_state
        
        print(f"[System] Debate started: {topic}")
        print(f"[System] Session ID: {session_id}")
        
        return session_id
    
    def send_message(self, session_id: str, user_input: str) -> str:
        """Send a message and get AI response (non-streaming)"""
        
        if session_id not in self.active_sessions:
            return "Session not found. Please start a new debate."
        
        state = self.active_sessions[session_id]
        state = process_user_input(state, user_input)
        
        config = {"configurable": {"thread_id": session_id}}
        
        try:
            result = self.workflow.invoke(state, config=config)
            self.active_sessions[session_id] = result
            
            if result.get('debate_ended'):
                return "Debate ended. Thank you for participating!"
            
            return result.get('ai_response', "Processing...")
            
        except Exception as e:
            print(f"[ERROR] {e}")
            return f"An error occurred: {str(e)}"
    
    def send_message_streaming(
        self, 
        session_id: str, 
        user_input: str
    ) -> Iterator[str]:
        """
        Send a message and stream AI response token by token
        
        Yields:
            str: Individual tokens/chunks of the AI response
        """
        
        if session_id not in self.active_sessions:
            yield "Session not found. Please start a new debate."
            return
        
        state = self.active_sessions[session_id]
        state = process_user_input(state, user_input)
        
        config = {"configurable": {"thread_id": session_id}}
        
        try:
            # Use stream_mode="messages" to get LLM tokens
            for message_chunk, metadata in self.workflow.stream(
                state,
                config=config,
                stream_mode="messages"
            ):
                # Only yield content from LLM responses
                if hasattr(message_chunk, 'content') and message_chunk.content:
                    yield message_chunk.content
            
            # After streaming completes, get final state
            final_state = self.workflow.invoke(state, config=config)
            self.active_sessions[session_id] = final_state
            
        except Exception as e:
            print(f"[ERROR] {e}")
            yield f"\n\nError: {str(e)}"
    
    def send_message_streaming_updates(
        self, 
        session_id: str, 
        user_input: str
    ) -> Iterator[Dict[str, Any]]:
        """
        Stream with metadata about which node is executing
        
        Yields:
            Dict with keys: 'type', 'node', 'content', 'metadata'
        """
        
        if session_id not in self.active_sessions:
            yield {
                "type": "error",
                "content": "Session not found"
            }
            return
        
        state = self.active_sessions[session_id]
        state = process_user_input(state, user_input)
        
        config = {"configurable": {"thread_id": session_id}}
        
        try:
            # Use stream_mode="updates" to see node-by-node execution
            for update in self.workflow.stream(
                state,
                config=config,
                stream_mode="updates"
            ):
                for node_name, node_state in update.items():
                    yield {
                        "type": "node_update",
                        "node": node_name,
                        "state": node_state
                    }
            
            # Get final state
            final_state = self.workflow.invoke(state, config=config)
            self.active_sessions[session_id] = final_state
            
            yield {
                "type": "complete",
                "response": final_state.get('ai_response', "")
            }
            
        except Exception as e:
            print(f"[ERROR] {e}")
            yield {
                "type": "error",
                "content": str(e)
            }
    
    def get_session_state(self, session_id: str) -> Optional[DebateState]:
        """Get current session state"""
        return self.active_sessions.get(session_id)


# ============================================================================
# EXAMPLE USAGE - THREE STREAMING METHODS
# ============================================================================

def example_basic_streaming():
    """Example 1: Basic token-by-token streaming"""
    
    print("\n" + "="*70)
    print("EXAMPLE 1: BASIC TOKEN STREAMING")
    print("="*70 + "\n")
    
    debate = DebateSystem()
    session_id = debate.start_debate(
        topic="Universal Basic Income and work ethic",
        difficulty="standard"
    )
    
    user_msg = "I think UBI destroys work ethic because people won't work if they get free money"
    
    print(f"👤 USER: {user_msg}\n")
    print("🤖 AI: ", end="", flush=True)
    
    # Stream token by token
    for token in debate.send_message_streaming(session_id, user_msg):
        print(token, end="", flush=True)
    
    print("\n")


def example_streaming_with_separators():
    """Example 2: Streaming with visual separators between tokens"""
    
    print("\n" + "="*70)
    print("EXAMPLE 2: STREAMING WITH SEPARATORS (like your example)")
    print("="*70 + "\n")
    
    debate = DebateSystem()
    session_id = debate.start_debate(
        topic="Universal Basic Income and work ethic",
        difficulty="standard"
    )
    
    user_msg = "I think UBI destroys work ethic"
    
    print(f"👤 USER: {user_msg}\n")
    print("🤖 AI: ", end="", flush=True)
    
    # Stream with pipe separators (like your example)
    for token in debate.send_message_streaming(session_id, user_msg):
        print(token, end="|", flush=True)
    
    print("\n")


def example_streaming_with_node_updates():
    """Example 3: Stream with information about which agent is working"""
    
    print("\n" + "="*70)
    print("EXAMPLE 3: STREAMING WITH NODE UPDATES")
    print("="*70 + "\n")
    
    debate = DebateSystem()
    session_id = debate.start_debate(
        topic="Universal Basic Income and work ethic",
        difficulty="standard"
    )
    
    user_msg = "I think UBI destroys work ethic because people won't work"
    
    print(f"USER: {user_msg}\n")
    
    for update in debate.send_message_streaming_updates(session_id, user_msg):
        if update['type'] == 'node_update':
            print(f" [{update['node'].upper()}] Processing...")
        elif update['type'] == 'complete':
            print(f"\n FINAL RESPONSE:\n{update['response']}\n")
        elif update['type'] == 'error':
            print(f" ERROR: {update['content']}")


def example_async_streaming():
    """Example 4: Async streaming for web applications"""
    
    print("\n" + "="*70)
    print("EXAMPLE 4: ASYNC STREAMING PATTERN FOR WEB APPS")
    print("="*70 + "\n")
    
  

def main():
    """Run all streaming examples"""
    
    # Example 1: Basic streaming
    example_basic_streaming()
    
    # Example 2: With separators (like your example)
    example_streaming_with_separators()
    
    # Example 3: With node updates
    example_streaming_with_node_updates()
    
    # Example 4: Async pattern
    example_async_streaming()
    
    print("\n" + "="*70)
    print("ALL STREAMING EXAMPLES COMPLETE")
    print("="*70)


if __name__ == "__main__":
    main()