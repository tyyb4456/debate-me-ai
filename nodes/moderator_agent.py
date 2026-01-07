"""
MODERATOR AGENT - Complete Implementation with Structured Output
The orchestration brain of the debate system
"""

from typing import List, Dict, Literal
from langchain.chat_models import init_chat_model
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field
from state import DebateState
from dotenv import load_dotenv
load_dotenv()

# ============================================================================
# PYDANTIC SCHEMAS FOR STRUCTURED OUTPUT
# ============================================================================

class UserInputAnalysis(BaseModel):
    """Schema for analyzing user input"""
    input_type: Literal["claim", "question", "rebuttal", "concession", "clarification", "off-topic"] = Field(
        description="Type of user input"
    )
    evidence_quality: Literal["none", "anecdotal", "weak", "moderate", "strong"] = Field(
        description="Quality of evidence provided by user"
    )
    logical_soundness: int = Field(
        ge=0, le=10,
        description="Rating of logical soundness from 0-10"
    )
    logical_reasoning: str = Field(
        description="Brief explanation of the logical soundness rating"
    )
    potential_fallacies: List[str] = Field(
        default_factory=list,
        description="List of any logical fallacies detected"
    )
    user_intent: str = Field(
        description="What the user is trying to accomplish"
    )
    engagement_level: Literal["confused", "defensive", "exploring", "confident"] = Field(
        description="User's engagement and emotional state"
    )


class RoutingDecision(BaseModel):
    """Schema for agent routing decisions"""
    next_agents: List[Literal["researcher", "analyzer", "socratic_questioner", "devils_advocate", "growth_tracker"]] = Field(
        description="List of agents to route to next"
    )
    reasoning: str = Field(
        description="Brief explanation of routing decision"
    )


class SynthesizedResponse(BaseModel):
    """Schema for final synthesized response"""
    response: str = Field(
        description="The complete, natural-flowing response to the user"
    )
    tone: Literal["supportive", "challenging", "neutral", "probing"] = Field(
        description="The tone used in the response"
    )


# ============================================================================
# SYSTEM PROMPTS
# ============================================================================

MODERATOR_SYSTEM_PROMPT = """You are the Moderator in an AI debate system. Your role is to orchestrate an intelligent, adaptive debate experience.

**Your Responsibilities:**

1. **Analyze User Input:**
   - Identify the type of move: claim, question, rebuttal, concession, clarification
   - Assess reasoning quality (evidence provided, logic soundness, fallacy presence)
   - Gauge user's engagement level and emotional state

2. **Make Routing Decisions:**
   - Research Agent: When facts, evidence, or data verification needed
   - Analyzer Agent: When checking logical structure or identifying fallacies
   - Socratic Questioner: When user needs deeper reflection or is stuck
   - Devil's Advocate: When presenting counter-arguments
   - Growth Tracker: When debate concludes or patterns emerge

3. **Synthesize Agent Outputs:**
   - Combine multiple agent responses into ONE coherent, natural reply
   - Don't sound like a committee - sound like one thoughtful debater
   - Balance intellectual challenge with respect and encouragement
   - Match the difficulty level appropriately

4. **Manage Debate Flow:**
   - Track argument development
   - Adjust difficulty dynamically based on user performance
   - Decide when to push harder, when to support, when to conclude
   - Maintain productive momentum

**Difficulty Levels:**
- Casual: Friendly, encouraging, simpler language, shorter responses
- Standard: Balanced challenge, moderate complexity
- Expert: No hand-holding, dense arguments, assumes strong knowledge

**Current Context:**
Topic: {topic}
Difficulty: {difficulty}
Turn: {turn_count}
User Skill Estimate: {user_skill_estimate:.2f}
Phase: {current_phase}

Be adaptive, intellectually honest, and focused on helping the user think more deeply.
"""

ANALYSIS_PROMPT = """Analyze this user input in the context of an ongoing debate.

**User Input:** {user_input}

**Debate Context:**
- Topic: {topic}
- Previous claims by user: {user_claims}
- Current phase: {current_phase}
- Turn count: {turn_count}

Analyze the input and provide detailed assessment of its type, quality, and characteristics."""

ROUTING_PROMPT = """Based on this analysis, decide which agents to route to next.

**Analysis Results:**
- Input Type: {input_type}
- Evidence Quality: {evidence_quality}
- Logical Soundness: {logical_soundness}/10
- Fallacies: {fallacies}
- Engagement: {engagement_level}
- Turn Count: {turn_count}

**Available Agents:**
- researcher: Finds facts, studies, evidence
- analyzer: Checks logic, identifies fallacies
- socratic_questioner: Asks probing questions to deepen thinking
- devils_advocate: Presents counter-arguments
- growth_tracker: Summarizes learning and growth patterns

**Routing Guidelines:**
- New claim without evidence → researcher + analyzer
- User asks question → researcher
- Repeating arguments → socratic_questioner
- Strong argument made → researcher + devils_advocate
- Confused or off-track → socratic_questioner
- Fallacy detected → analyzer + socratic_questioner
- Should end debate (turn > 15 or concession) → growth_tracker

Decide which agents to route to and explain your reasoning."""

SYNTHESIS_PROMPT = """Synthesize these agent outputs into ONE natural, coherent response.

**Agent Outputs:**
{agent_outputs}

**Context:**
- Difficulty level: {difficulty}
- Current phase: {current_phase}
- User skill: {user_skill_estimate:.2f}

**Requirements:**
- Sound like ONE person debating, not multiple voices
- Weave information naturally into argumentative flow
- Balance challenge with respect
- Keep response focused and engaging
- Match the phase appropriately

**Length Guidelines:**
- Casual: 2-4 sentences
- Standard: 1 paragraph
- Expert: 1-2 dense paragraphs

Generate the final response to the user."""


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def summarize_history(history: List[Dict], max_turns: int = 10) -> List[Dict]:
    """Keep recent history, summarize older turns"""
    if len(history) <= max_turns:
        return history
    
    # Keep last max_turns, summarize the rest
    recent = history[-max_turns:]
    old = history[:-max_turns]
    
    summary = {
        "role": "system",
        "content": f"[Earlier in debate: {len(old)} turns exchanged covering initial arguments]",
        "turn": 0
    }
    
    return [summary] + recent


def calculate_skill_adjustment(analysis: UserInputAnalysis, prev_skill: float) -> float:
    """Dynamically adjust user skill estimate based on performance"""
    adjustment = 0.0
    
    # Evidence quality
    evidence_map = {
        "none": -0.05, 
        "anecdotal": -0.02, 
        "weak": 0, 
        "moderate": 0.03, 
        "strong": 0.05
    }
    adjustment += evidence_map.get(analysis.evidence_quality, 0)
    
    # Logical soundness (scale 0-10 to -0.05 to +0.05)
    adjustment += (analysis.logical_soundness - 5) * 0.01
    
    # Fallacies detected
    adjustment -= len(analysis.potential_fallacies) * 0.02
    
    # Engagement level
    if analysis.engagement_level == "confident":
        adjustment += 0.02
    elif analysis.engagement_level == "confused":
        adjustment -= 0.03
    
    # Clamp between 0 and 1
    new_skill = max(0.0, min(1.0, prev_skill + adjustment))
    return new_skill


def determine_phase(analysis: UserInputAnalysis, state: DebateState) -> str:
    """Determine what phase the debate is in"""
    turn = state["turn_count"]
    input_type = analysis.input_type
    
    if turn <= 2:
        return "opening"
    elif turn <= 5:
        return "rebuttal"
    elif input_type == "concession" or turn > 12:
        return "conclusion"
    else:
        return "deepening"


# ============================================================================
# CORE MODERATOR FUNCTIONS WITH STRUCTURED OUTPUT
# ============================================================================

def analyze_user_input(state: DebateState, llm) -> UserInputAnalysis:
    """Analyze the user's input using structured output"""
    
    # Create structured LLM
    structured_llm = llm.with_structured_output(UserInputAnalysis)
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are an expert debate analyst. Analyze inputs objectively and thoroughly."),
        ("human", ANALYSIS_PROMPT)
    ])
    
    try:
        analysis: UserInputAnalysis = (prompt | structured_llm).invoke({
            "user_input": state["user_input"],
            "topic": state["topic"],
            "user_claims": state["user_claims"],
            "current_phase": state["current_phase"],
            "turn_count": state["turn_count"]
        })
        return analysis
    except Exception as e:
        print(f"[Moderator] Analysis error: {e}, using fallback")
        # Fallback analysis
        return UserInputAnalysis(
            input_type="claim",
            evidence_quality="none",
            logical_soundness=5,
            logical_reasoning="Unable to analyze fully",
            potential_fallacies=[],
            user_intent="Making an argument",
            engagement_level="exploring"
        )


def decide_routing(analysis: UserInputAnalysis, state: DebateState, llm) -> RoutingDecision:
    """Decide which agents to route to using structured output"""
    
    # Create structured LLM
    structured_llm = llm.with_structured_output(RoutingDecision)
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are an expert at routing debate queries to appropriate agents."),
        ("human", ROUTING_PROMPT)
    ])
    
    try:
        routing: RoutingDecision = (prompt | structured_llm).invoke({
            "input_type": analysis.input_type,
            "evidence_quality": analysis.evidence_quality,
            "logical_soundness": analysis.logical_soundness,
            "fallacies": ", ".join(analysis.potential_fallacies) if analysis.potential_fallacies else "none",
            "engagement_level": analysis.engagement_level,
            "turn_count": state["turn_count"]
        })
        return routing
    except Exception as e:
        print(f"[Moderator] Routing error: {e}, using fallback")
        # Fallback routing using heuristics
        return fallback_routing(analysis, state)


def fallback_routing(analysis: UserInputAnalysis, state: DebateState) -> RoutingDecision:
    """Fallback routing logic using simple rules"""
    
    # End debate conditions
    if analysis.input_type == "concession" or state["turn_count"] > 15:
        return RoutingDecision(
            next_agents=["growth_tracker"],
            reasoning="Debate should conclude"
        )
    
    # User is confused or off-topic
    if analysis.engagement_level in ["confused", "defensive"] or analysis.input_type == "off-topic":
        return RoutingDecision(
            next_agents=["socratic_questioner"],
            reasoning="User needs guidance"
        )
    
    # New claim without evidence
    if analysis.input_type == "claim" and analysis.evidence_quality in ["none", "anecdotal"]:
        return RoutingDecision(
            next_agents=["analyzer", "researcher"],
            reasoning="Need to analyze claim and find evidence"
        )
    
    # Question from user
    if analysis.input_type == "question":
        return RoutingDecision(
            next_agents=["researcher"],
            reasoning="User asked a question"
        )
    
    # Fallacies detected
    if analysis.potential_fallacies:
        return RoutingDecision(
            next_agents=["analyzer", "socratic_questioner"],
            reasoning="Fallacies detected"
        )
    
    # Strong argument - need counter
    if analysis.logical_soundness >= 7:
        return RoutingDecision(
            next_agents=["researcher", "devils_advocate"],
            reasoning="Strong argument needs counter-evidence"
        )
    
    # Default: analyze and counter
    return RoutingDecision(
        next_agents=["analyzer", "devils_advocate"],
        reasoning="Standard debate response"
    )


def synthesize_responses(state: DebateState, llm) -> str:
    """Combine multiple agent outputs using structured output"""
    
    agent_outputs = state.get("agent_outputs", {})
    
    if not agent_outputs:
        return "I need a moment to process that. Could you rephrase your point?"
    
    # Create structured LLM
    structured_llm = llm.with_structured_output(SynthesizedResponse)
    
    # Format agent outputs nicely
    formatted_outputs = "\n\n".join([
        f"**{agent}:** {output}" 
        for agent, output in agent_outputs.items()
    ])
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", MODERATOR_SYSTEM_PROMPT),
        ("human", SYNTHESIS_PROMPT)
    ])
    
    try:
        result: SynthesizedResponse = (prompt | structured_llm).invoke({
            "agent_outputs": formatted_outputs,
            "difficulty": state["difficulty"],
            "current_phase": state["current_phase"],
            "user_skill_estimate": state["user_skill_estimate"],
            "topic": state["topic"],
            "turn_count": state["turn_count"]
        })
        return result.response
    except Exception as e:
        print(f"[Moderator] Synthesis error: {e}, using fallback")
        # Fallback: Simple concatenation
        return fallback_synthesis(agent_outputs, state)


def fallback_synthesis(agent_outputs: Dict[str, str], state: DebateState) -> str:
    """Fallback synthesis when structured output fails"""
    
    responses = []
    
    if "researcher" in agent_outputs:
        responses.append(agent_outputs["researcher"])
    
    if "analyzer" in agent_outputs:
        responses.append(agent_outputs["analyzer"])
    
    if "socratic_questioner" in agent_outputs:
        responses.append(agent_outputs["socratic_questioner"])
    
    if "devils_advocate" in agent_outputs:
        responses.append(agent_outputs["devils_advocate"])
    
    return " ".join(responses) if responses else "Let me think about that..."


# ============================================================================
# MAIN MODERATOR NODE
# ============================================================================

def moderator_node(state: DebateState):
    """
    Main orchestration node that routes to other agents and synthesizes results
    """
    
    # Initialize LLM
    model = init_chat_model("gemini-2.5-flash-lite", model_provider="google_genai", temperature=0.7)
    
    # Check if we're synthesizing (agents have returned) or routing (initial analysis)
    if state.get("agent_outputs") and len(state["agent_outputs"]) > 0:
        # SYNTHESIS MODE: Combine agent outputs into final response
        print(f"[Moderator] Synthesizing outputs from {list(state['agent_outputs'].keys())}")
        
        final_response = synthesize_responses(state, model)
        
        # **FIX: Create a NEW state update dict instead of mutating state directly**
        updates = {
            "ai_response": final_response,
            "next_agents": ["END"],
        }
        
        # Add conversation history entry (this will be accumulated via Annotated[List, add])
        if "conversation_history" not in state:
            state["conversation_history"] = []
        
        # Append to conversation history
        conversation_entry = {
            "role": "assistant",
            "content": final_response,
            "turn": state["turn_count"]
        }
        
        # Return ONLY the updates, not the full state
        return {
            **updates,
            "conversation_history": [conversation_entry],  # Will be added via operator
            "agent_outputs": {}  # Clear for next turn (empty dict will reset)
        }
    
    else:
        # ROUTING MODE: Analyze input and decide which agents to call
        print(f"[Moderator] Analyzing user input: '{state['user_input'][:50]}...'")
        
        # **FIX: Create updates dict**
        updates = {}
        
        # Increment turn count
        updates["turn_count"] = state.get("turn_count", 0) + 1
        
        # Analyze user input with structured output
        analysis = analyze_user_input(state, model)
        print(f"[Moderator] Analysis: {analysis.input_type} | Logic: {analysis.logical_soundness}/10 | Fallacies: {len(analysis.potential_fallacies)}")
        
        # Update skill estimate
        new_skill = calculate_skill_adjustment(analysis, state["user_skill_estimate"])
        updates["user_skill_estimate"] = new_skill
        print(f"[Moderator] Skill estimate: {updates['user_skill_estimate']:.2f}")
        
        # Update phase
        updates["current_phase"] = determine_phase(analysis, state)
        
        # Track claims and fallacies (these will be accumulated)
        claims_to_add = []
        fallacies_to_add = []
        
        if analysis.input_type == "claim":
            claims_to_add.append(state["user_input"][:100])
        
        if analysis.potential_fallacies:
            fallacies_to_add.extend(analysis.potential_fallacies)
        
        # Decide routing with structured output
        routing = decide_routing(analysis, state, model)
        updates["next_agents"] = routing.next_agents
        updates["routing_decision"] = routing.reasoning
        
        print(f"[Moderator] Routing to: {routing.next_agents}")
        print(f"[Moderator] Reasoning: {routing.reasoning}")
        
        # Add user input to conversation history
        user_entry = {
            "role": "user",
            "content": state["user_input"],
            "turn": updates["turn_count"]
        }
        
        # Return updates (lists will be accumulated via Annotated operators)
        return {
            **updates,
            "conversation_history": [user_entry],
            "user_claims": claims_to_add,
            "fallacies_detected": fallacies_to_add
        }

# ============================================================================
# INITIALIZATION HELPER
# ============================================================================

def create_initial_state(
    topic: str,
    difficulty: str = "standard",
    session_id: str = None
) -> DebateState:
    """Create initial debate state"""
    from uuid import uuid4
    
    return DebateState(
        session_id=session_id or str(uuid4()),
        topic=topic,
        difficulty=difficulty,
        turn_count=0,
        user_skill_estimate=0.5,
        conversation_history=[],
        user_input="",
        ai_response=None,
        user_claims=[],
        ai_claims=[],
        conceded_points=[],
        fallacies_detected=[],
        current_phase="opening",
        agent_outputs={},
        next_agents=[],
        routing_decision=""
    )


# ============================================================================
# EXAMPLE USAGE
# ============================================================================

if __name__ == "__main__":
    # Example: Initialize state
    state = create_initial_state(
        topic="Universal Basic Income and work ethic",
        difficulty="standard"
    )
    
    # Example: Simulate user input
    state["user_input"] = "I think UBI destroys work ethic because people won't work if they get free money"
    
    # Run moderator
    updated_state = moderator_node(state)
    
    print("\n" + "="*60)
    print("MODERATOR OUTPUT")
    print("="*60)
    print(f"Routing Decision: {updated_state['routing_decision']}")
    print(f"Next Agents: {updated_state['next_agents']}")
    print(f"Phase: {updated_state['current_phase']}")
    print(f"Skill Estimate: {updated_state['user_skill_estimate']:.2f}")
    print(f"Turn Count: {updated_state['turn_count']}")
    print(f"Fallacies Detected: {updated_state['fallacies_detected']}")