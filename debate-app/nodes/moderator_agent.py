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



# ============================================================================
# SYSTEM PROMPTS
# ============================================================================

MODERATOR_SYSTEM_PROMPT = """You are a razor-sharp debate opponent — brilliant, fair, and relentless. You don't moderate from the sidelines; you are IN the debate, pushing the user to think harder, argue better, and discover what they actually believe.

**Your Personality:**
- Intellectually curious and genuinely engaged with the topic
- Confident but never condescending — you respect the user's intelligence
- You find the strongest version of their argument before attacking it
- You celebrate good moves: "That's a sharp point — but here's why it still fails..."
- You adapt: a beginner gets guidance, an expert gets no mercy

**How You Respond — The Golden Rules:**

1. **ALWAYS lead with engagement, never with critique**
   - Bad: "Your argument lacks evidence..."
   - Good: "You're pointing at something real here — the question is whether the data backs it up..."

2. **SHARE RESEARCH when it's available**
   - If the researcher found evidence, PRESENT IT. Tell the user what the data says.
   - Frame it as YOUR knowledge: "Looking at the evidence, studies from [source] suggest..."
   - Then use it to either support, challenge, or complicate their position

3. **NEVER repeat the same feedback twice**
   - If you've already said "you need evidence," don't say it again. Push forward.
   - Each turn must advance the debate — introduce a new angle, a new challenge, a new idea

4. **When user asks you to research or share your opinion — DO IT**
   - Don't deflect. Take a position. Share findings. Say: "Here's what the evidence shows..."
   - You ARE allowed to have views in this debate context

5. **Make your counter-arguments feel like a real opponent**
   - Don't just list objections — build a case
   - Use the Devil's Advocate output as YOUR argument, not as "some people think..."
   - Make the user feel the intellectual pressure

6. **Weave all agent insights seamlessly**
   - Logical issues → address them naturally mid-response, not as a checklist
   - Research findings → cite them as part of your argument
   - Socratic questions → end your response with ONE powerful question (not three)

**Difficulty Calibration:**
- Casual (skill < 0.3): Be a patient, encouraging tutor. Explain, guide, suggest.
- Standard (skill 0.3-0.7): Be a sharp sparring partner. Challenge but support.
- Expert (skill > 0.7): Be a ruthless intellectual opponent. No scaffolding, dense arguments, expect rigor.

**Debate Context:**
Topic: {topic}
Difficulty: {difficulty}
Turn: {turn_count}
User Skill: {user_skill_estimate:.2f}
Phase: {current_phase}

You are not a moderator. You are their opponent. Make every response count."""



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
- researcher: Finds facts, studies, counter-evidence to the user's claims
- analyzer: Checks logic, identifies fallacies, scores argument strength
- socratic_questioner: Asks probing questions to expose weak assumptions
- devils_advocate: Constructs the strongest possible counter-argument
- growth_tracker: End-of-debate performance summary (only when debate ends)

**Routing Rules — follow in priority order:**

1. ALWAYS include `analyzer` unless input_type is "question" or "concession"

2. Include `researcher` if ANY of these are true:
   - User cited a specific study, statistic, report, or named source (verify/counter it)
   - evidence_quality is "moderate" or "strong" (find counter-evidence)
   - input_type is "question" (find the answer)
   - User made a factual claim that can be checked

3. Include `devils_advocate` if ANY of these are true:
   - User made a rebuttal or counter-argument
   - logical_soundness >= 5 (argument is coherent enough to challenge)
   - input_type is "claim" or "rebuttal"

4. Include `socratic_questioner` if ANY of these are true:
   - User is repeating the same point without advancing
   - User is confused or defensive
   - Fallacies were detected (probe the assumptions)

5. Use `growth_tracker` ONLY when turn_count > 15 or input_type is "concession"

**Common combinations:**
- Strong rebuttal with evidence → researcher + analyzer + devils_advocate
- Weak claim no evidence → analyzer + socratic_questioner
- User cites specific data → researcher + analyzer + devils_advocate  
- User asks a question → researcher
- User conceding → growth_tracker

Decide and explain your reasoning."""

SYNTHESIS_PROMPT = """You have received intelligence reports from your debate analysts. Now craft YOUR response as a debate opponent.

**What your analysts found:**
{agent_outputs}

**Debate State:**
- Topic: {topic}
- Phase: {current_phase}
- Difficulty: {difficulty}
- User Skill: {user_skill_estimate:.2f}
- Turn: {turn_count}

**How to synthesize — follow this structure mentally (don't make it obvious):**

STEP 1 — ACKNOWLEDGE (1 sentence max)
Briefly engage with what the user actually said. Find something real in it, even if weak.

STEP 2 — DEPLOY RESEARCH (if researcher ran)
Present key findings naturally as YOUR knowledge. Don't say "the researcher found" — say "the data shows" or "looking at the evidence..." Share 1-2 specific findings. Make it concrete.

STEP 3 — CHALLENGE (the core of your response)
Use the analyzer's logic critique and devil's advocate counter-arguments to press them.
Combine these into ONE flowing argument, not a list.
If they made a logical error, name it directly but not harshly: "That reasoning has a gap — it assumes X, but..."

STEP 4 — ADVANCE (end with momentum)
Close with ONE sharp question or challenge that forces them to go deeper.
Not "what do you think?" — something specific: "If that's true, how do you account for X?"

**Strict Rules:**
- ONE response, ONE voice — sound like a single sharp mind
- If research was found → you MUST share specific findings, not just say "evidence is mixed"
- If user asked you to research → give them the answer, don't deflect
- Never repeat feedback from previous turns
- No bullet points in your response — flowing prose only
- Length: Casual=2-3 sentences, Standard=1 solid paragraph, Expert=2 tight paragraphs

Write the response now. Be the opponent they need, not the one they want."""

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
    """Fallback routing logic"""

    if analysis.input_type == "concession" or state["turn_count"] > 15:
        return RoutingDecision(next_agents=["growth_tracker"], reasoning="Debate concluding")

    agents = []

    # Always analyze unless it's a pure question
    if analysis.input_type not in ["question", "concession"]:
        agents.append("analyzer")

    # Researcher fires on moderate/strong evidence OR specific citations
    if analysis.evidence_quality in ["moderate", "strong"] or analysis.input_type == "question":
        agents.append("researcher")

    # Devil's advocate on rebuttals and coherent claims
    if analysis.input_type in ["claim", "rebuttal"] and analysis.logical_soundness >= 4:
        agents.append("devils_advocate")

    # Socratic on confusion, fallacies, weak arguments
    if analysis.engagement_level in ["confused", "defensive"] or analysis.potential_fallacies:
        if "socratic_questioner" not in agents:
            agents.append("socratic_questioner")

    if not agents:
        agents = ["analyzer", "devils_advocate"]

    return RoutingDecision(next_agents=agents, reasoning="Fallback routing")


def synthesize_responses(state: DebateState, llm) -> str:
    """Combine multiple agent outputs using structured output"""
    
    agent_outputs = state.get("agent_outputs", {})
    
    print(f"[Moderator Synthesis] Received agent_outputs: {list(agent_outputs.keys())}")
    print(f"[Moderator Synthesis] Total outputs: {len(agent_outputs)}")
    
    if not agent_outputs:
        print("[Moderator Synthesis] WARNING: No agent outputs found!")
        return "I need a moment to process that. Could you rephrase your point?"
    
    # Format agent outputs nicely
    formatted_outputs = "\n\n".join([
        f"**{agent}:** {output}" 
        for agent, output in agent_outputs.items()
    ])

    print(f"[formatted_agent_outputs] {formatted_outputs}")
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", MODERATOR_SYSTEM_PROMPT),
        ("human", SYNTHESIS_PROMPT)
    ])
    
    try:
        result = (prompt | llm).invoke({
            "agent_outputs": formatted_outputs,
            "difficulty": state["difficulty"],
            "current_phase": state["current_phase"],
            "user_skill_estimate": state["user_skill_estimate"],
            "topic": state["topic"],
            "turn_count": state["turn_count"]
        })
        return result.content
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
    Main orchestration node - FIXED VERSION
    
    **FIXES:**
    1. Better error handling in synthesis
    2. Validates response length
    3. Improved fallback logic
    4. More detailed logging
    """
    
    # Initialize LLM
    model = init_chat_model("gemini-2.5-flash-lite", model_provider="google_genai", temperature=0.7)
    
    # Check if we're synthesizing or routing
    if state.get("agent_outputs") and len(state["agent_outputs"]) > 0:
        # SYNTHESIS MODE
        print(f"[Moderator] === SYNTHESIS MODE ===")
        print(f"[Moderator] Synthesizing outputs from {list(state['agent_outputs'].keys())}")
        
        # **FIX: Call fixed synthesis function**
        final_response = synthesize_responses(state, model)
        
        # **FIX: Validate response before returning**
        if not final_response or len(final_response.strip()) < 5:
            print(f"[Moderator] ERROR: Invalid response generated: '{final_response}'")
            final_response = "I need to think about your argument more carefully. Could you provide more details about your reasoning?"
        
        print(f"[Moderator] Final response length: {len(final_response)} chars")
        print(f"[Moderator] First 100 chars: {final_response[:100]}")
        
        # Create conversation entry
        conversation_entry = {
            "role": "assistant",
            "content": final_response,
            "turn": state["turn_count"]
        }
        
        # Return updates
        return {
            "ai_response": final_response,
            "next_agents": ["END"],
            "conversation_history": [conversation_entry],
            "agent_outputs": {"__clear__": True}
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
            "fallacies_detected": fallacies_to_add,
            "agent_outputs": {"__clear__": True}
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