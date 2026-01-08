"""
ARGUMENT ANALYZER AGENT - Complete Implementation with Structured Output
The logic detective that examines arguments for fallacies and reasoning quality
"""

from typing import List, Optional, Literal, Dict, Any
from langchain.chat_models import init_chat_model
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field
import re
from dotenv import load_dotenv
load_dotenv()
from state import DebateState
from models.agent_models import AnalyzerOutput, Claim, Evidence, ReasoningChain, ArgumentStrength, Patterns, Fallacy, Assumption



# ============================================================================
# FALLACY DATABASE
# ============================================================================

FALLACY_PATTERNS = {
    "ad_hominem": {
        "description": "Attacking the person instead of their argument",
        "indicators": ["you're just", "typical", "of course you'd say", "coming from you", "you people"],
        "example": "You're just saying that because you're biased"
    },
    "straw_man": {
        "description": "Misrepresenting opponent's position to make it easier to attack",
        "indicators": ["so you're saying", "you think all", "your position is basically", "you want"],
        "example": "So you think we should just give everyone free money and nobody should work?"
    },
    "anecdotal": {
        "description": "Using personal experience as proof of universal truth",
        "indicators": ["my friend", "I know someone", "in my experience", "my uncle", "my cousin", "I saw"],
        "example": "My cousin got welfare and stopped working, so UBI destroys work ethic"
    },
    "hasty_generalization": {
        "description": "Drawing broad conclusions from limited evidence",
        "indicators": ["everyone", "all people", "nobody", "always", "never", "every single"],
        "example": "People won't work if given free money"
    },
    "false_dichotomy": {
        "description": "Presenting only two options when more exist",
        "indicators": ["either", "or", "only two options", "must choose between", "it's one or the other"],
        "example": "Either we keep capitalism or adopt full communism"
    },
    "slippery_slope": {
        "description": "Claiming one thing inevitably leads to extreme consequences",
        "indicators": ["next thing", "before you know it", "will lead to", "opens the door", "eventually"],
        "example": "If we allow UBI, soon nobody will work and society will collapse"
    },
    "appeal_to_emotion": {
        "description": "Manipulating emotions instead of using logic",
        "indicators": ["think of the children", "heartbreaking", "devastating", "tragic", "horrific"],
        "example": "It's devastating to think about families suffering"
    },
    "circular_reasoning": {
        "description": "Conclusion is hidden in the premise",
        "indicators": ["because it is", "obviously", "clearly", "it's true because", "by definition"],
        "example": "UBI is bad because giving people free money is wrong"
    },
    "appeal_to_authority": {
        "description": "Citing authority without explaining reasoning",
        "indicators": ["experts say", "studies show", "everyone knows", "scientists agree"],
        "example": "Experts say UBI is bad (without explaining why)"
    },
    "red_herring": {
        "description": "Introducing irrelevant point to distract",
        "indicators": ["but what about", "the real issue is", "let's talk about", "more importantly"],
        "example": "We're debating UBI, but what about immigration?"
    },
    "tu_quoque": {
        "description": "Deflecting criticism by pointing out hypocrisy",
        "indicators": ["you do it too", "what about when you", "hypocrite", "you're one to talk"],
        "example": "You criticize UBI but you receive tax deductions"
    },
    "bandwagon": {
        "description": "Claiming something is true because many believe it",
        "indicators": ["most people", "everyone agrees", "consensus", "popular opinion", "majority"],
        "example": "Most Americans oppose UBI, so it must be bad"
    },
    "post_hoc": {
        "description": "Assuming correlation implies causation",
        "indicators": ["after that", "since then", "followed by", "correlation", "when X happened, Y happened"],
        "example": "Crime increased after UBI was introduced, so UBI causes crime"
    },
    "begging_the_question": {
        "description": "Assuming what you're trying to prove",
        "indicators": ["obviously", "naturally", "of course", "it goes without saying"],
        "example": "UBI is harmful because it harms society"
    },
    "no_true_scotsman": {
        "description": "Redefining terms to exclude counter-examples",
        "indicators": ["no real", "no true", "that's not really", "doesn't count"],
        "example": "No real worker would support UBI"
    },
}


# ============================================================================
# SYSTEM PROMPT
# ============================================================================

ANALYZER_SYSTEM_PROMPT = """You are an Argument Analyzer in a debate system. Your job is to dissect arguments with surgical precision.

**Analyze these dimensions:**

1. **CLAIMS:**
   - What is the user actually claiming?
   - Main claim vs supporting premises
   - Any implicit claims?

2. **EVIDENCE:**
   - Did they provide any evidence?
   - Type: anecdotal, statistical, expert opinion, study, none
   - Quality: Does it actually support their claim?

3. **REASONING:**
   - How do they get from premises to conclusion?
   - Is the logic valid?
   - Are there gaps or leaps?

4. **FALLACIES (check for these):**
   - Ad hominem, Straw man, False dichotomy, Slippery slope
   - Appeal to authority/emotion, Anecdotal evidence, Hasty generalization
   - Circular reasoning, Red herring, Tu quoque, Bandwagon
   - Post hoc, Begging the question, No true Scotsman

5. **ASSUMPTIONS:**
   - What are they assuming without stating?
   - Are these assumptions justified?
   - What would challenge these assumptions?

6. **STRENGTH:**
   - Rate 0-10 overall
   - Consider: logic quality, evidence presence, clarity, sophistication

**Be rigorous but fair. The goal is accurate analysis, not winning.**

User's argument: {user_input}
Previous claims: {previous_claims}
Conversation history: {history}

Provide detailed structured analysis."""


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def detect_fallacies_heuristic(text: str) -> List[Dict[str, Any]]:
    """Quick heuristic fallacy detection using pattern matching"""
    detected = []
    text_lower = text.lower()
    
    for fallacy_name, fallacy_info in FALLACY_PATTERNS.items():
        for indicator in fallacy_info["indicators"]:
            if indicator in text_lower:
                # Find the sentence containing the indicator
                sentences = re.split(r'[.!?]+', text)
                for sentence in sentences:
                    if indicator in sentence.lower():
                        detected.append({
                            "type": fallacy_name,
                            "text_span": sentence.strip(),
                            "explanation": fallacy_info["description"],
                            "severity": "moderate"
                        })
                        break
                break
    
    return detected


def calculate_argument_strength_heuristic(
    user_input: str,
    has_evidence: bool,
    evidence_quality: float,
    fallacies_count: int,
    reasoning_gaps: int
) -> Dict[str, float]:
    """Calculate argument strength scores"""
    
    # Logic Score (0-10)
    logic_score = 10.0
    logic_score -= fallacies_count * 2.0  # -2 per fallacy
    logic_score -= reasoning_gaps * 1.0  # -1 per gap
    logic_score = max(0.0, min(10.0, logic_score))
    
    # Evidence Score (0-10)
    evidence_score = evidence_quality * 10.0 if has_evidence else 0.0
    
    # Clarity Score (0-10)
    clarity_score = 7.0  # Base score
    word_count = len(user_input.split())
    if word_count < 10:
        clarity_score -= 2.0  # Too brief
    elif word_count > 100:
        clarity_score -= 1.0  # Too verbose
    clarity_score = max(0.0, min(10.0, clarity_score))
    
    # Nuance Score (0-10)
    nuance_score = 5.0  # Base
    nuance_indicators = ['however', 'although', 'but', 'complex', 'nuanced', 'on the other hand']
    absolutist_indicators = ['all', 'never', 'always', 'every', 'none', 'no one']
    
    if any(word in user_input.lower() for word in nuance_indicators):
        nuance_score += 2.0
    if any(word in user_input.lower() for word in absolutist_indicators):
        nuance_score -= 2.0
    nuance_score = max(0.0, min(10.0, nuance_score))
    
    # Overall Score (weighted average)
    overall = (
        logic_score * 0.35 +
        evidence_score * 0.35 +
        clarity_score * 0.15 +
        nuance_score * 0.15
    )
    
    breakdown = f"Logic: {logic_score:.1f}/10, Evidence: {evidence_score:.1f}/10, Clarity: {clarity_score:.1f}/10, Nuance: {nuance_score:.1f}/10"
    
    return {
        "overall_score": round(overall, 1),
        "logic_score": round(logic_score, 1),
        "evidence_score": round(evidence_score, 1),
        "clarity_score": round(clarity_score, 1),
        "nuance_score": round(nuance_score, 1),
        "breakdown": breakdown
    }


def check_repeated_claims(current_claim: str, previous_claims: List[str]) -> bool:
    """Check if user is repeating claims"""
    current_lower = current_claim.lower()
    for prev_claim in previous_claims[-3:]:  # Check last 3 claims
        if prev_claim and len(current_lower) > 10 and current_lower in prev_claim.lower():
            return True
        if prev_claim and len(prev_claim) > 10 and prev_claim.lower() in current_lower:
            return True
    return False


def detect_emotional_language(text: str) -> bool:
    """Detect if text uses emotional language"""
    emotional_words = [
        'devastating', 'heartbreaking', 'tragic', 'horrific', 'terrible',
        'amazing', 'incredible', 'wonderful', 'disgusting', 'outrageous'
    ]
    return any(word in text.lower() for word in emotional_words)


# ============================================================================
# MAIN ANALYZER FUNCTION WITH STRUCTURED OUTPUT
# ============================================================================

def analyze_argument(
    user_input: str,
    previous_claims: List[str],
    conversation_history: List[Dict],
) -> AnalyzerOutput:
    """
    Analyze user's argument with structured output
    """
    # Create structured LLM
    model = init_chat_model("gemini-2.5-flash-lite", model_provider="google_genai", temperature=0.7)
    structured_llm = model.with_structured_output(AnalyzerOutput)
    
    # Format conversation history
    history_text = "\n".join([
        f"{msg.get('role', 'unknown')}: {msg.get('content', '')[:100]}"
        for msg in conversation_history[-6:]  # Last 3 turns
    ])
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", ANALYZER_SYSTEM_PROMPT),
        ("human", "Analyze this argument in detail.")
    ])
    
    try:
        analysis: AnalyzerOutput = (prompt | structured_llm).invoke({
            "user_input": user_input,
            "previous_claims": ", ".join(previous_claims[-3:]) if previous_claims else "None",
            "history": history_text if history_text else "First turn"
        })
        return analysis
        
    except Exception as e:
        print(f"[Analyzer] Structured output failed: {e}, using fallback")
        return fallback_analysis(user_input, previous_claims)


def fallback_analysis(user_input: str, previous_claims: List[str]) -> AnalyzerOutput:
    """Fallback analysis using heuristics when LLM fails"""
    
    # Extract main claim (first sentence or full text if short)
    sentences = re.split(r'[.!?]+', user_input)
    main_claim_text = sentences[0].strip() if sentences else user_input
    
    claims = [
        Claim(
            text=main_claim_text,
            type="main_claim",
            is_new=not check_repeated_claims(main_claim_text, previous_claims)
        )
    ]
    
    # Detect evidence heuristically
    has_evidence = any(indicator in user_input.lower() for indicator in [
        "study", "research", "data", "statistics", "survey", "my", "example"
    ])
    
    evidence_type = None
    evidence_quality = 0.0
    if has_evidence:
        if any(word in user_input.lower() for word in ["my", "i know", "i saw"]):
            evidence_type = "anecdotal"
            evidence_quality = 0.2
        elif any(word in user_input.lower() for word in ["study", "research", "data"]):
            evidence_type = "study"
            evidence_quality = 0.6
    
    evidence = Evidence(
        has_evidence=has_evidence,
        evidence_type=evidence_type,
        evidence_quality=evidence_quality,
        specific_evidence=user_input[:100] if has_evidence else None
    )
    
    # Simple reasoning chain
    reasoning = ReasoningChain(
        premises=["Implicit premise from user's argument"],
        conclusion=main_claim_text,
        logical_connection="moderate",
        gaps=["Missing explicit reasoning steps"]
    )
    
    # Detect fallacies heuristically
    fallacy_dicts = detect_fallacies_heuristic(user_input)
    fallacies = [
        Fallacy(**fallacy_dict) for fallacy_dict in fallacy_dicts[:3]  # Max 3
    ]
    
    # Identify common assumptions
    assumptions = []
    if "ubi" in user_input.lower() or "basic income" in user_input.lower():
        if "work" in user_input.lower():
            assumptions.append(
                Assumption(
                    assumption="Work motivation is primarily financial",
                    questionable=True,
                    counter_examples=["Volunteers", "Artists", "Wealthy individuals who work"]
                )
            )
    
    # Calculate strength
    strength_scores = calculate_argument_strength_heuristic(
        user_input=user_input,
        has_evidence=has_evidence,
        evidence_quality=evidence_quality,
        fallacies_count=len(fallacies),
        reasoning_gaps=1
    )
    
    argument_strength = ArgumentStrength(**strength_scores)
    
    # Patterns
    patterns = Patterns(
        repeated_claim=check_repeated_claims(main_claim_text, previous_claims),
        avoiding_counter_evidence=False,
        emotional_language=detect_emotional_language(user_input),
        improving_from_last_turn=None
    )
    
    return AnalyzerOutput(
        claims=claims,
        evidence_provided=evidence,
        reasoning_chain=reasoning,
        fallacies_detected=fallacies,
        implicit_assumptions=assumptions,
        argument_strength=argument_strength,
        patterns=patterns
    )


# ============================================================================
# LANGGRAPH NODE IMPLEMENTATION
# ============================================================================

def argument_analyzer_node(state: DebateState):
    """
    LangGraph node that analyzes user's argument and updates state
    
    Inputs from state:
    - user_input: Current user message
    - conversation_history: Previous turns
    - user_claims: List of previous claims
    - fallacies_history: Previously detected fallacies
    
    Outputs to state:
    - analyzer_output: Complete structured analysis
    - user_claim: Extracted main claim
    - user_skill_estimate: Updated skill estimate
    """
    
    print("[Analyzer] Starting argument analysis...")
    
    # Extract inputs (READ ONLY - don't modify state directly)
    user_input = state.get('user_input', '')
    conversation_history = state.get('conversation_history', [])
    previous_claims = state.get('user_claims', [])
    current_skill = state.get('user_skill_estimate', 0.5)
    turn_count = state.get('turn_count', 0)
    
    # Run analysis
    analyzer_output = analyze_argument(
        user_input=user_input,
        previous_claims=previous_claims,
        conversation_history=conversation_history,
    )
    
    print(f"[Analyzer] Found {len(analyzer_output.claims)} claims")
    print(f"[Analyzer] Detected {len(analyzer_output.fallacies_detected)} fallacies")
    print(f"[Analyzer] Argument strength: {analyzer_output.argument_strength.overall_score}/10")
    
    # Extract main claim
    if analyzer_output.claims:
        main_claim = next((c for c in analyzer_output.claims if c.type == "main_claim"), None)
        user_claim = main_claim.text if main_claim else analyzer_output.claims[0].text
    else:
        user_claim = user_input[:100]
    
    # Prepare fallacies to add to history
    fallacies_to_add = [
        {
            "turn": turn_count,
            "fallacy": fallacy.type,
            "severity": fallacy.severity
        }
        for fallacy in analyzer_output.fallacies_detected
    ]
    
    # Update skill estimate based on argument quality
    argument_quality = analyzer_output.argument_strength.overall_score / 10.0
    new_skill = (current_skill * 0.8) + (argument_quality * 0.2)
    
    # Format output for synthesis
    formatted_output = format_analyzer_output(analyzer_output)

    print(f"[Analyzer] agent output {formatted_output}")
    
    print(f"[Analyzer] Analysis complete - Skill estimate: {new_skill:.2f}")
    
    # Return ONLY updates (don't modify state directly)
    return {
        # Scalar updates (replace values)
        "analyzer_output": analyzer_output,
        "user_claim": user_claim,
        "user_skill_estimate": new_skill,
        
        # List updates (will be accumulated via Annotated[List, add])
        "user_claims": [user_claim],  # Add this claim to history
        "fallacies_history": fallacies_to_add,  # Add detected fallacies
        
        # Agent outputs
        "agent_outputs": {
            "analyzer": formatted_output
        }
    }

def format_analyzer_output(analysis: AnalyzerOutput) -> str:
    """Format analyzer output for synthesis"""
    
    lines = []
    
    # Argument strength
    lines.append(f"**Argument Quality:** {analysis.argument_strength.overall_score}/10")
    lines.append(f"({analysis.argument_strength.breakdown})")
    
    # Fallacies if found
    if analysis.fallacies_detected:
        lines.append(f"\n**Logical Issues Detected:**")
        for fallacy in analysis.fallacies_detected[:2]:  # Top 2
            lines.append(f"- {fallacy.type.replace('_', ' ').title()}: {fallacy.explanation}")
    
    # Assumptions if found
    if analysis.implicit_assumptions:
        lines.append(f"\n**Assumptions:**")
        for assumption in analysis.implicit_assumptions[:2]:  # Top 2
            lines.append(f"- You assume: {assumption.assumption}")
    
    # Evidence assessment
    if not analysis.evidence_provided.has_evidence:
        lines.append("\n**Note:** No evidence provided to support claim")
    elif analysis.evidence_provided.evidence_type == "anecdotal":
        lines.append("\n**Note:** Evidence is anecdotal (personal experience)")
    
    return "\n".join(lines)


# ============================================================================
# EXAMPLE USAGE
# ============================================================================

if __name__ == "__main__":
    # Test state
    test_state = {
        "session_id": "test123",
        "topic": "Universal Basic Income and work ethic",
        "turn_count": 2,
        "user_input": "My uncle got welfare and stopped working, so UBI destroys work ethic. Everyone knows people won't work if they get free money.",
        "conversation_history": [
            {"role": "user", "content": "I think UBI is bad", "turn": 1},
            {"role": "assistant", "content": "Why do you think that?", "turn": 1}
        ],
        "user_claims": ["UBI is bad"],
        "fallacies_history": [],
        "user_skill_estimate": 0.5,
        "agent_outputs": {}
    }
    
    # Run analyzer
    result_state = argument_analyzer_node(test_state)
    
    print("\n" + "="*60)
    print("ANALYZER OUTPUT")
    print("="*60)
    print(result_state['agent_outputs']['analyzer'])
    print(f"\nMain Claim: {result_state['user_claim']}")
    print(f"Updated Skill: {result_state['user_skill_estimate']:.2f}")
    print(f"Fallacies in History: {len(result_state['fallacies_history'])}")