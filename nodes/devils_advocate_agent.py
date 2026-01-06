"""
DEVIL'S ADVOCATE AGENT - Complete Implementation with Structured Output
The challenge master that presents the strongest possible counter-arguments
"""

from typing import List, Optional, Literal, Dict, Any
from langchain.chat_models import init_chat_model
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field
import re
from dotenv import load_dotenv
load_dotenv()
from state import DebateState
from models.agent_models import CounterArgument, EvidenceSource, OpposingPosition, Concession, DevilsAdvocateOutput


# ============================================================================
# SYSTEM PROMPT
# ============================================================================

ADVOCATE_SYSTEM_PROMPT = """You are the Devil's Advocate in a debate system. Your job is to present the STRONGEST possible counter-position to the user's argument.

**Core Principles:**

1. **STEEL-MAN, DON'T STRAW-MAN:**
   - Make the opposing position as strong and reasonable as possible
   - Don't create a weak version just to knock it down
   - Present the argument in a way that intelligent people could believe it

2. **USE EVIDENCE STRATEGICALLY:**
   - Prioritize evidence from research (especially opposing_evidence)
   - Cite specific sources with credibility scores
   - Use real-world examples and case studies
   - Reference statistics when available

3. **ACKNOWLEDGE VALID POINTS:**
   - Concede when user makes a good point
   - "You're right that X, BUT consider Y"
   - This builds credibility and makes challenges more effective

4. **MULTIPLE ANGLES OF ATTACK:**
   - Evidence-based: "Studies show the opposite..."
   - Logic-based: "Your reasoning assumes X, but what if Y?"
   - Alternative explanation: "That could also mean..."
   - Edge cases: "Your rule breaks down when..."
   - Value trade-offs: "Even if true, Z might matter more"

5. **CALIBRATE CHALLENGE LEVEL:**
   - Casual: Gentle alternative perspectives
   - Standard: Firm but fair challenges
   - Expert: Aggressive, sophisticated counter-arguments

6. **TONE:**
   - Respectful but firm
   - "Consider this..." not "You're wrong"
   - Intellectually honest
   - No condescension

**Context:**
User's position: {user_claim}
Opposing evidence: {opposing_evidence}
Supporting evidence (for concessions): {supporting_evidence}
Challenge strategy: {strategy}
Difficulty: {difficulty}

Build the strongest possible counter-argument using available evidence."""


# ============================================================================
# COUNTER-ARGUMENT CONSTRUCTION
# ============================================================================

class CounterArgumentBuilder:
    """Builds different types of counter-arguments"""
    
    @staticmethod
    def evidence_based(evidence_item: Dict, user_claim: str) -> CounterArgument:
        """Use research evidence to contradict user's claim"""
        source_name = evidence_item.get('source_name', 'Research')
        finding = evidence_item.get('key_finding', 'contradictory findings')
        credibility = evidence_item.get('credibility', 0.8)
        
        argument = f"{source_name} found that {finding}, which challenges the claim that {user_claim}"
        
        return CounterArgument(
            type="evidence_based",
            argument=argument,
            evidence_source=EvidenceSource(
                name=source_name,
                credibility=credibility,
                url=evidence_item.get('url')
            ),
            strength="strong",
            addresses="main_claim"
        )
    
    @staticmethod
    def alternative_explanation(user_evidence: str, observation: str) -> CounterArgument:
        """Offer different interpretation of user's observations"""
        
        # Check for anecdotal indicators
        anecdotal_markers = ["uncle", "friend", "cousin", "my", "i know", "i saw"]
        has_anecdote = any(marker in user_evidence.lower() for marker in anecdotal_markers)
        
        if has_anecdote:
            argument = f"Your observation about {observation} could reflect individual factors (health, job satisfaction, personal circumstances, age) rather than proving universal patterns"
        else:
            argument = f"That observation could also be explained by alternative factors we haven't considered"
        
        return CounterArgument(
            type="alternative_explanation",
            argument=argument,
            evidence_source=None,
            strength="moderate",
            addresses="anecdotal_evidence"
        )
    
    @staticmethod
    def reframe(user_framing: str, alternative_framing: str) -> CounterArgument:
        """Challenge the fundamental framing of the debate"""
        
        argument = f"What if we're asking the wrong question? Instead of focusing on '{user_framing}', maybe we should consider '{alternative_framing}'"
        
        return CounterArgument(
            type="reframe",
            argument=argument,
            evidence_source=None,
            strength="moderate",
            addresses="framing"
        )
    
    @staticmethod
    def edge_case(user_claim: str, exceptions: List[str]) -> CounterArgument:
        """Find cases where user's rule doesn't apply"""
        
        exception_text = ", ".join(exceptions[:3])
        argument = f"Your claim that '{user_claim}' breaks down when we consider: {exception_text}. How does your theory explain these cases?"
        
        return CounterArgument(
            type="edge_case",
            argument=argument,
            evidence_source=None,
            strength="moderate",
            addresses="overgeneralization"
        )
    
    @staticmethod
    def value_tradeoff(user_concern: str, competing_value: str) -> CounterArgument:
        """Even if user is right, other values might be more important"""
        
        argument = f"Even if {user_concern} is true, we might accept that trade-off because {competing_value} could be more important"
        
        return CounterArgument(
            type="value_tradeoff",
            argument=argument,
            evidence_source=None,
            strength="moderate",
            addresses="priorities"
        )
    
    @staticmethod
    def logical_challenge(assumption: str, gap: str) -> CounterArgument:
        """Challenge the logic connecting premises to conclusion"""
        
        argument = f"Your reasoning assumes {assumption}, but {gap}. How do you bridge that logical gap?"
        
        return CounterArgument(
            type="logical_challenge",
            argument=argument,
            evidence_source=None,
            strength="moderate",
            addresses="reasoning"
        )


# ============================================================================
# STEEL-MANNING LOGIC
# ============================================================================

def steelman_opposing_position(user_claim: str, topic: str) -> OpposingPosition:
    """Create the strongest possible version of the opposite position"""
    
    # Common debate topics and their steel-manned opposites
    steelman_patterns = {
        "ubi": {
            "destroys": "UBI could strengthen work ethic by enabling meaningful, purpose-driven work instead of desperate survival jobs",
            "bad": "UBI could reduce poverty, enable entrepreneurship, and provide economic security for innovation"
        },
        "work": {
            "money": "Work motivation comes from purpose, mastery, autonomy, and contribution - not just financial necessity",
        }
    }
    
    # Try to find pattern match
    claim_lower = user_claim.lower()
    
    # Simple negation with reasoning
    if "destroy" in claim_lower or "harm" in claim_lower or "bad" in claim_lower:
        statement = f"The opposite view is that {topic} could actually be beneficial"
        reasoning = "Removes negative pressures, enables positive outcomes, provides security for risk-taking"
    elif "not work" in claim_lower or "won't work" in claim_lower:
        statement = f"The opposite view is that {topic} can work effectively"
        reasoning = "Evidence from real-world implementations shows positive or neutral results"
    else:
        statement = f"The opposite perspective on {topic} suggests different outcomes"
        reasoning = "Alternative interpretations of evidence and different value frameworks"
    
    return OpposingPosition(
        statement=statement,
        steel_manned=True,
        reasoning=reasoning
    )


# ============================================================================
# CONCESSION STRATEGY
# ============================================================================

def determine_concessions(
    user_claim: str,
    supporting_evidence: List[Any],
    analyzer_output: Any
) -> List[Concession]:
    """Strategically concede valid points to build credibility"""
    
    concessions = []
    
    # Concede if user has legitimate supporting evidence
    if supporting_evidence and len(supporting_evidence) > 0:
        evidence = supporting_evidence[0]
        if isinstance(evidence, dict):
            concessions.append(Concession(
                point=f"You're right that {evidence.get('key_finding', 'there is some evidence for your position')}",
                reasoning="Acknowledging valid evidence builds credibility for our counter-argument"
            ))
    
    # Concede if user showed nuance
    if hasattr(analyzer_output, 'argument_strength'):
        if analyzer_output.argument_strength.nuance_score > 6.0:
            concessions.append(Concession(
                point="You're acknowledging the complexity of this issue, which is important",
                reasoning="Recognizing nuance before challenging"
            ))
    
    # Strategic concession: admit edge cases
    if "always" not in user_claim.lower() and "never" not in user_claim.lower():
        concessions.append(Concession(
            point="There may be individual cases where your concern applies",
            reasoning="Avoiding absolute positions makes our argument stronger"
        ))
    
    return concessions[:2]  # Max 2 concessions


# ============================================================================
# CHALLENGE STRATEGY
# ============================================================================

def determine_challenge_strategy(
    analyzer_output: Any,
    user_skill: float,
    turn_count: int,
    difficulty: str
) -> Dict[str, Any]:
    """Decide how aggressively to challenge based on context"""
    
    # Early turns: introduce doubt gently
    if turn_count <= 3:
        return {
            "goal": "introduce_doubt",
            "level": "moderate",
            "approach": "evidence_first",
            "num_counters": 2
        }
    
    # User making weak arguments: challenge harder
    if hasattr(analyzer_output, 'argument_strength'):
        if analyzer_output.argument_strength.overall_score < 5.0:
            return {
                "goal": "prove_wrong",
                "level": "high",
                "approach": "evidence_first",
                "num_counters": 3
            }
        
        # User making strong arguments: find middle ground
        if analyzer_output.argument_strength.overall_score > 7.0:
            return {
                "goal": "find_middle_ground",
                "level": "moderate",
                "approach": "values_first",
                "num_counters": 2
            }
    
    # Expert mode: always aggressive
    if difficulty == "expert":
        return {
            "goal": "prove_wrong",
            "level": "expert",
            "approach": "balanced",
            "num_counters": 4
        }
    
    # Casual mode: gentle
    if difficulty == "casual":
        return {
            "goal": "introduce_doubt",
            "level": "low",
            "approach": "evidence_first",
            "num_counters": 2
        }
    
    # Default: balanced challenge
    return {
        "goal": "introduce_doubt",
        "level": "moderate",
        "approach": "balanced",
        "num_counters": 2
    }


# ============================================================================
# MAIN GENERATION WITH STRUCTURED OUTPUT
# ============================================================================

def generate_counter_arguments(
    user_claim: str,
    topic: str,
    analyzer_output: Any,
    opposing_evidence: List[Any],
    supporting_evidence: List[Any],
    strategy: Dict[str, Any],
    difficulty: str,
) -> DevilsAdvocateOutput:
    """Generate structured counter-arguments using LLM"""
    
    # Create structured LLM
    model = init_chat_model("gemini-2.5-flash-lite", model_provider="google_genai", temperature=0.7)
    structured_llm = model.with_structured_output(DevilsAdvocateOutput)
    
    # Prepare evidence summaries
    opposing_summary = prepare_evidence_summary(opposing_evidence)
    supporting_summary = prepare_evidence_summary(supporting_evidence)
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", ADVOCATE_SYSTEM_PROMPT),
        ("human", "Generate the strongest possible counter-arguments.")
    ])
    
    try:
        output: DevilsAdvocateOutput = (prompt | structured_llm).invoke({
            "user_claim": user_claim,
            "opposing_evidence": opposing_summary,
            "supporting_evidence": supporting_summary,
            "strategy": str(strategy),
            "difficulty": difficulty
        })
        return output
        
    except Exception as e:
        print(f"[Devil's Advocate] Structured output failed: {e}, using fallback")
        return fallback_counter_generation(
            user_claim, topic, analyzer_output, opposing_evidence, 
            supporting_evidence, strategy
        )


def prepare_evidence_summary(evidence_list: List[Any]) -> str:
    """Prepare concise evidence summary"""
    if not evidence_list:
        return "No evidence available"
    
    summaries = []
    for ev in evidence_list[:3]:  # Top 3
        if isinstance(ev, dict):
            name = ev.get('source_name', 'Unknown')
            finding = ev.get('key_finding', 'N/A')
            summaries.append(f"{name}: {finding}")
        else:
            summaries.append(str(ev))
    
    return " | ".join(summaries)


def fallback_counter_generation(
    user_claim: str,
    topic: str,
    analyzer_output: Any,
    opposing_evidence: List[Any],
    supporting_evidence: List[Any],
    strategy: Dict[str, Any]
) -> DevilsAdvocateOutput:
    """Generate counter-arguments using templates when LLM fails"""
    
    counter_arguments = []
    
    # 1. Evidence-based counter (if we have opposing evidence)
    if opposing_evidence and len(opposing_evidence) > 0:
        best_evidence = opposing_evidence[0]
        if isinstance(best_evidence, dict):
            counter_arguments.append(
                CounterArgumentBuilder.evidence_based(best_evidence, user_claim)
            )
    
    # 2. Alternative explanation (if user used anecdotal evidence)
    if hasattr(analyzer_output, 'evidence_provided'):
        if analyzer_output.evidence_provided.evidence_type == "anecdotal":
            counter_arguments.append(
                CounterArgumentBuilder.alternative_explanation(
                    user_claim,
                    "a specific individual case"
                )
            )
    
    # 3. Edge case (if user made generalizations)
    if hasattr(analyzer_output, 'implicit_assumptions') and analyzer_output.implicit_assumptions:
        assumption = analyzer_output.implicit_assumptions[0]
        if assumption.counter_examples:
            counter_arguments.append(
                CounterArgumentBuilder.edge_case(
                    user_claim,
                    assumption.counter_examples
                )
            )
    
    # 4. Reframe (always useful)
    if "work" in user_claim.lower() and "ubi" in topic.lower():
        counter_arguments.append(
            CounterArgumentBuilder.reframe(
                "whether people will work for wages",
                "what kinds of valuable work people will do"
            )
        )
    
    # Ensure at least one counter-argument
    if not counter_arguments:
        counter_arguments.append(CounterArgument(
            type="logical_challenge",
            argument=f"Let's examine the evidence more carefully. The claim that '{user_claim}' may not hold up under scrutiny.",
            evidence_source=None,
            strength="moderate",
            addresses="main_claim"
        ))
    
    # Steel-man the opposing position
    opposing_position = steelman_opposing_position(user_claim, topic)
    
    # Determine concessions
    concessions = determine_concessions(user_claim, supporting_evidence, analyzer_output)
    
    return DevilsAdvocateOutput(
        opposing_position=opposing_position,
        counter_arguments=counter_arguments[:strategy.get('num_counters', 2)],
        concessions=concessions,
        challenge_level=strategy.get('level', 'moderate'),
        strategic_goal=strategy.get('goal', 'introduce_doubt'),
        rhetorical_approach=strategy.get('approach', 'balanced')
    )


# ============================================================================
# LANGGRAPH NODE IMPLEMENTATION
# ============================================================================

def devils_advocate_node(state: DebateState):
    """
    LangGraph node that generates counter-arguments
    
    Inputs from state:
    - user_claim: User's main claim
    - topic: Debate topic
    - analyzer_output: Analysis results
    - research_output: Research findings
    - difficulty: Difficulty level
    - user_skill_estimate: User skill
    - turn_count: Current turn
    
    Outputs to state:
    - advocate_output: Structured counter-arguments
    - agent_outputs['devils_advocate']: Formatted output
    """
    
    
    print("[Devil's Advocate] Generating counter-arguments...")
    
    # Extract inputs
    user_claim = state.get('user_claim', state.get('user_input', ''))
    topic = state.get('topic', '')
    analyzer_output = state.get('analyzer_output')
    research_output = state.get('research_output', {})
    difficulty = state.get('difficulty', 'standard')
    user_skill = state.get('user_skill_estimate', 0.5)
    turn_count = state.get('turn_count', 1)
    
    # Extract evidence from research
    opposing_evidence = []
    supporting_evidence = []
    
    if isinstance(research_output, dict):
        opposing_evidence = research_output.get('opposing_evidence', [])
        supporting_evidence = research_output.get('supporting_evidence', [])
    
    print(f"[Devil's Advocate] Found {len(opposing_evidence)} opposing evidence items")
    
    # Determine challenge strategy
    strategy = determine_challenge_strategy(
        analyzer_output=analyzer_output,
        user_skill=user_skill,
        turn_count=turn_count,
        difficulty=difficulty
    )
    
    print(f"[Devil's Advocate] Strategy: {strategy['goal']} at {strategy['level']} level")
    
    # Generate counter-arguments
    advocate_output = generate_counter_arguments(
        user_claim=user_claim,
        topic=topic,
        analyzer_output=analyzer_output,
        opposing_evidence=opposing_evidence,
        supporting_evidence=supporting_evidence,
        strategy=strategy,
        difficulty=difficulty,
    )
    
    print(f"[Devil's Advocate] Generated {len(advocate_output.counter_arguments)} counter-arguments")
    
    # Update state
    state['advocate_output'] = advocate_output
    
    # Track AI's counter-positions
    if 'ai_claims_history' not in state:
        state['ai_claims_history'] = []
    
    strong_counters = len([c for c in advocate_output.counter_arguments if c.strength == "strong"])
    state['ai_claims_history'].append({
        "turn": turn_count,
        "position": advocate_output.opposing_position.statement,
        "strength": strong_counters
    })
    
    # Format output for synthesis
    if 'agent_outputs' not in state:
        state['agent_outputs'] = {}
    
    state['agent_outputs']['devils_advocate'] = format_advocate_output(advocate_output)
    
    print("[Devil's Advocate] Complete")
    
    return state


def format_advocate_output(output: DevilsAdvocateOutput) -> str:
    """Format counter-arguments for natural synthesis"""
    
    lines = []
    
    # Start with concessions if any
    if output.concessions:
        lines.append(output.concessions[0].point)
        lines.append("")  # Blank line
    
    # Present opposing position
    lines.append(f"However, consider this: {output.opposing_position.statement}")
    lines.append("")
    
    # Add counter-arguments
    for counter in output.counter_arguments:
        if counter.evidence_source:
            lines.append(
                f"**{counter.type.replace('_', ' ').title()}:** {counter.argument} "
                f"(Source: {counter.evidence_source.name}, credibility: {counter.evidence_source.credibility:.2f})"
            )
        else:
            lines.append(f"**{counter.type.replace('_', ' ').title()}:** {counter.argument}")
    
    return "\n".join(lines)


# ============================================================================
# EXAMPLE USAGE
# ============================================================================

if __name__ == "__main__":
    # Mock outputs for testing
    from typing import NamedTuple
    
    class MockEvidence(NamedTuple):
        has_evidence: bool
        evidence_type: str
    
    class MockStrength(NamedTuple):
        overall_score: float
        nuance_score: float
    
    class MockAssumption(NamedTuple):
        assumption: str
        counter_examples: List[str]
    
    class MockAnalyzer:
        def __init__(self):
            self.evidence_provided = MockEvidence(True, "anecdotal")
            self.argument_strength = MockStrength(4.5, 3.0)
            self.implicit_assumptions = [
                MockAssumption("people only work for money", ["volunteers", "wealthy workers"])
            ]
    
    # Test state
    test_state = {
        "user_claim": "UBI destroys work ethic",
        "topic": "Universal Basic Income and work ethic",
        "analyzer_output": MockAnalyzer(),
        "research_output": {
            "opposing_evidence": [
                {
                    "source_name": "Finland UBI Pilot - KELA",
                    "key_finding": "employment rates unchanged at 58%",
                    "credibility": 0.92,
                    "url": "https://example.com"
                }
            ],
            "supporting_evidence": []
        },
        "difficulty": "standard",
        "user_skill_estimate": 0.45,
        "turn_count": 2,
        "agent_outputs": {}
    }
    
    # Run Devil's Advocate
    result_state = devils_advocate_node(test_state)
    
    print("\n" + "="*60)
    print("DEVIL'S ADVOCATE OUTPUT")
    print("="*60)
    print(result_state['agent_outputs']['devils_advocate'])