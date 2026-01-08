"""
SOCRATIC QUESTIONER AGENT - Complete Implementation with Structured Output
The deep thinker that asks probing questions to challenge assumptions
"""

from typing import List, Optional, Literal, Dict, Any
from langchain.chat_models import init_chat_model
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field
import re
from state import DebateState
from dotenv import load_dotenv
load_dotenv()
from models.agent_models import TeachingMoment, SocraticOutput, Question, FollowUpStrategy

# ============================================================================
# SYSTEM PROMPT
# ============================================================================

SOCRATIC_SYSTEM_PROMPT = """You are the Socratic Questioner in a debate system. Your role is to ask questions that make the user think MORE DEEPLY, not to lecture or argue.

**Key Principles:**

1. **ASK, DON'T TELL**
   - Instead of "That's wrong because X" → "How do you account for X?"
   - Instead of "You're assuming Y" → "What makes you think Y?"
   - Guide them to realize issues themselves

2. **TARGET SPECIFIC WEAKNESSES:**
   - Implicit assumptions → "You seem to assume X - what if Y?"
   - Missing evidence → "What evidence would support that?"
   - Logical gaps → "How does A lead to B?"
   - Vague terms → "What exactly do you mean by X?"
   - Fallacies → Gently expose without naming them

3. **USE CONCRETE EXAMPLES:**
   - Not: "What about other cases?"
   - Yes: "What about volunteers who work without pay? How does your theory explain them?"

4. **BUILD QUESTION SEQUENCES:**
   - Start with clarification
   - Then probe assumptions
   - Then introduce counter-examples
   - Guide toward nuanced thinking

5. **ADJUST TO SKILL LEVEL:**
   - Casual: Simple, friendly questions
   - Standard: Thought-provoking but accessible
   - Expert: Complex, multi-layered questions

6. **NEVER BE CONDESCENDING:**
   - Genuine curiosity, not "gotcha"
   - Acknowledge when they make good points
   - Treat their position seriously even when challenging it

**Context Provided:**
- Analyzer findings: {analyzer_summary}
- Research evidence: {research_summary}
- User's argument: {user_input}
- Difficulty level: {difficulty}
- User skill: {user_skill}

Generate 2-3 strategic questions that will advance their thinking."""


# ============================================================================
# QUESTION CRAFTING TEMPLATES
# ============================================================================

class QuestionTemplates:
    """Templates for different question types"""
    
    @staticmethod
    def assumption_challenge(assumption: str, counter_examples: List[str]) -> str:
        """Challenge an implicit assumption"""
        if counter_examples:
            return f"You seem to assume {assumption}. But what about {counter_examples[0]}? How does your theory explain them?"
        return f"You're assuming {assumption}. What makes you think that's always true?"
    
    @staticmethod
    def evidence_request(claim: str, has_anecdotal: bool = False) -> str:
        """Request evidence for a claim"""
        if has_anecdotal:
            return f"You mentioned a personal example. Do we have broader data showing this pattern holds generally across many people?"
        return f"What evidence supports the claim that {claim}?"
    
    @staticmethod
    def counter_evidence(source: str, finding: str, user_claim: str) -> str:
        """Present contradicting evidence"""
        return f"How do you account for {source}, which found that {finding}? Does this challenge your view, or is there a way to reconcile them?"
    
    @staticmethod
    def clarification(vague_term: str, possible_meanings: List[str]) -> str:
        """Ask for clarification of vague terms"""
        meanings = ", ".join(possible_meanings[:3])
        return f"What exactly do you mean by '{vague_term}'? That could mean: {meanings}. Which are you referring to?"
    
    @staticmethod
    def consequence_exploration(claim: str, implication: str) -> str:
        """Explore logical consequences"""
        return f"If {claim}, what would that imply about {implication}? Would you accept that consequence?"
    
    @staticmethod
    def consistency_check(previous: str, current: str) -> str:
        """Check for consistency"""
        return f"Earlier you suggested {previous}, but now you're saying {current}. How do these positions fit together?"
    
    @staticmethod
    def alternative_perspective(user_position: str, alternative: str) -> str:
        """Introduce alternative viewpoint"""
        return f"You're focused on {user_position}. Have you considered that {alternative}?"


# ============================================================================
# QUESTIONING TARGET IDENTIFICATION
# ============================================================================

class QuestioningTarget(BaseModel):
    """A specific point to question"""
    type: str
    content: str
    priority: int
    metadata: Dict[str, Any] = Field(default_factory=dict)


def identify_questioning_targets(
    analyzer_output: Any,
    research_output: Optional[Dict] = None
) -> List[QuestioningTarget]:
    """Identify what needs questioning based on analysis"""
    
    targets = []
    
    # Priority 1: Implicit assumptions (most impactful)
    if hasattr(analyzer_output, 'implicit_assumptions'):
        for assumption in analyzer_output.implicit_assumptions:
            if assumption.questionable:
                targets.append(QuestioningTarget(
                    type="assumption",
                    content=assumption.assumption,
                    priority=1,
                    metadata={
                        "counter_examples": assumption.counter_examples
                    }
                ))
    
    # Priority 2: Missing evidence
    if hasattr(analyzer_output, 'evidence_provided'):
        if not analyzer_output.evidence_provided.has_evidence:
            main_claim = analyzer_output.claims[0].text if analyzer_output.claims else "your claim"
            targets.append(QuestioningTarget(
                type="evidence_request",
                content=main_claim,
                priority=2,
                metadata={"has_anecdotal": False}
            ))
        elif analyzer_output.evidence_provided.evidence_type == "anecdotal":
            main_claim = analyzer_output.claims[0].text if analyzer_output.claims else "your claim"
            targets.append(QuestioningTarget(
                type="evidence_request",
                content=main_claim,
                priority=2,
                metadata={"has_anecdotal": True}
            ))
    
    # Priority 2: Fallacies (gentle correction)
    if hasattr(analyzer_output, 'fallacies_detected'):
        for fallacy in analyzer_output.fallacies_detected[:2]:  # Max 2 fallacies
            if fallacy.severity in ["moderate", "severe"]:
                targets.append(QuestioningTarget(
                    type="fallacy",
                    content=fallacy.text_span,
                    priority=2,
                    metadata={
                        "fallacy_type": fallacy.type,
                        "explanation": fallacy.explanation
                    }
                ))
    
    # Priority 2: Counter-evidence from research
    if research_output and research_output.get('opposing_evidence'):
        for evidence in research_output['opposing_evidence'][:1]:  # Just strongest
            if isinstance(evidence, dict):
                targets.append(QuestioningTarget(
                    type="counter_evidence",
                    content="contradicting research",
                    priority=2,
                    metadata={
                        "source": evidence.get('source_name', 'research'),
                        "finding": evidence.get('key_finding', 'contradictory findings')
                    }
                ))
    
    # Priority 3: Reasoning gaps
    if hasattr(analyzer_output, 'reasoning_chain'):
        for gap in analyzer_output.reasoning_chain.gaps[:1]:  # Just first gap
            targets.append(QuestioningTarget(
                type="reasoning_gap",
                content=gap,
                priority=3,
                metadata={}
            ))
    
    # Sort by priority (lower number = higher priority)
    targets.sort(key=lambda x: x.priority)
    
    return targets[:3]  # Max 3 targets


# ============================================================================
# TEACHING MOMENT LOGIC
# ============================================================================

FALLACY_EXPLANATIONS = {
    "anecdotal": "Personal stories are valuable, but individual experiences vary widely. We need broader data to draw general conclusions.",
    "hasty_generalization": "It's natural to generalize from what we see, but we have to be careful about applying limited observations to everyone.",
    "false_dichotomy": "Most debates aren't either/or. There are usually more options than the two extremes.",
    "slippery_slope": "It's good to consider consequences, but we need evidence that one thing actually leads to another, not just speculation.",
    "ad_hominem": "Let's focus on the argument itself rather than who's making it.",
    "circular_reasoning": "We want to make sure our reasons are independent of our conclusion.",
    "appeal_to_emotion": "Emotions matter, but we also need logical reasoning to support our position.",
    "straw_man": "Let's make sure we're addressing the actual position, not a simplified version of it."
}


def create_teaching_moment(
    fallacies: List[Any],
    user_skill: float
) -> TeachingMoment:
    """Decide if/how to gently educate about a fallacy"""
    
    # Only teach if user skill suggests they might benefit
    if not fallacies or user_skill > 0.7:
        return TeachingMoment(include_in_response=False)
    
    # Find first moderate/severe fallacy
    for fallacy in fallacies:
        if fallacy.severity in ["moderate", "severe"]:
            explanation = FALLACY_EXPLANATIONS.get(fallacy.type)
            if explanation:
                return TeachingMoment(
                    fallacy_to_address=fallacy.type,
                    gentle_explanation=explanation,
                    include_in_response=True
                )
    
    return TeachingMoment(include_in_response=False)


# ============================================================================
# QUESTION GENERATION WITH STRUCTURED OUTPUT
# ============================================================================

def generate_socratic_questions(
    targets: List[QuestioningTarget],
    analyzer_output: Any,
    research_output: Optional[Dict],
    user_input: str,
    difficulty: str,
    user_skill: float,
    previous_questions: List[str],
) -> SocraticOutput:
    """Generate structured questions using LLM"""
    
    # Create structured LLM
    model = init_chat_model("gemini-2.5-flash-lite", model_provider="google_genai", temperature=0.7)
    structured_llm = model.with_structured_output(SocraticOutput)
    
    # Prepare summaries for context
    analyzer_summary = prepare_analyzer_summary(analyzer_output)
    research_summary = prepare_research_summary(research_output)
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", SOCRATIC_SYSTEM_PROMPT),
        ("human", "Generate strategic questions based on the analysis.")
    ])
    
    try:
        output: SocraticOutput = (prompt | structured_llm).invoke({
            "analyzer_summary": analyzer_summary,
            "research_summary": research_summary,
            "user_input": user_input,
            "difficulty": difficulty,
            "user_skill": f"{user_skill:.2f}"
        })
        return output
        
    except Exception as e:
        print(f"[Socratic] Structured output failed: {e}, using fallback")
        return fallback_question_generation(targets, analyzer_output, research_output, user_skill)


def prepare_analyzer_summary(analyzer_output: Any) -> str:
    """Prepare concise analyzer summary for context"""
    lines = []
    
    if hasattr(analyzer_output, 'implicit_assumptions') and analyzer_output.implicit_assumptions:
        assumptions = [a.assumption for a in analyzer_output.implicit_assumptions[:2]]
        lines.append(f"Assumptions: {', '.join(assumptions)}")
    
    if hasattr(analyzer_output, 'fallacies_detected') and analyzer_output.fallacies_detected:
        fallacies = [f.type for f in analyzer_output.fallacies_detected[:2]]
        lines.append(f"Fallacies: {', '.join(fallacies)}")
    
    if hasattr(analyzer_output, 'evidence_provided'):
        ev = analyzer_output.evidence_provided
        lines.append(f"Evidence: {ev.evidence_type or 'none'} (quality: {ev.evidence_quality:.2f})")
    
    return " | ".join(lines) if lines else "No major issues detected"


def prepare_research_summary(research_output: Optional[Dict]) -> str:
    """Prepare research summary for context"""
    if not research_output:
        return "No research available"
    
    lines = []
    
    if research_output.get('opposing_evidence'):
        lines.append(f"Found {len(research_output['opposing_evidence'])} opposing evidence items")
    
    if research_output.get('overall_evidence_strength'):
        lines.append(f"Overall: {research_output['overall_evidence_strength']}")
    
    return " | ".join(lines) if lines else "Research inconclusive"


def fallback_question_generation(
    targets: List[QuestioningTarget],
    analyzer_output: Any,
    research_output: Optional[Dict],
    user_skill: float
) -> SocraticOutput:
    """Generate questions using templates when LLM fails"""
    
    questions = []
    primary_focus = "general_inquiry"
    
    for target in targets[:3]:  # Max 3 questions
        question_text = None
        question_type = "clarification"
        
        if target.type == "assumption":
            question_text = QuestionTemplates.assumption_challenge(
                target.content,
                target.metadata.get('counter_examples', [])
            )
            question_type = "assumption_challenge"
            primary_focus = "implicit_assumptions"
        
        elif target.type == "evidence_request":
            question_text = QuestionTemplates.evidence_request(
                target.content,
                target.metadata.get('has_anecdotal', False)
            )
            question_type = "evidence_request"
            primary_focus = "missing_evidence"
        
        elif target.type == "counter_evidence":
            question_text = QuestionTemplates.counter_evidence(
                target.metadata.get('source', 'research'),
                target.metadata.get('finding', 'contradictory findings'),
                target.content
            )
            question_type = "counter_evidence"
            primary_focus = "contradicting_evidence"
        
        elif target.type == "reasoning_gap":
            question_text = f"Can you explain how you get from your premises to that conclusion? I'm trying to follow the logical steps."
            question_type = "clarification"
            primary_focus = "reasoning_gaps"
        
        if question_text:
            questions.append(Question(
                question_text=question_text,
                question_type=question_type,
                targets=target.type,
                reasoning=f"Addresses {target.type} in user's argument"
            ))
    
    # Ensure at least one question
    if not questions:
        questions.append(Question(
            question_text="Can you explain your reasoning a bit more? I want to make sure I understand your position.",
            question_type="clarification",
            targets="general",
            reasoning="Fallback question to continue dialogue"
        ))
    
    # Create teaching moment
    teaching_moment = create_teaching_moment(
        getattr(analyzer_output, 'fallacies_detected', []),
        user_skill
    )
    
    return SocraticOutput(
        questions=questions[:3],  # Max 3
        primary_focus=primary_focus,
        tone="curious" if user_skill < 0.5 else "probing",
        follow_up_strategy=FollowUpStrategy(
            if_user_dodges="press_on_same_point",
            if_user_engages="go_deeper",
            if_user_concedes="explore_implications"
        ),
        teaching_moment=teaching_moment
    )


# ============================================================================
# LANGGRAPH NODE IMPLEMENTATION
# ============================================================================

def socratic_questioner_node(state: DebateState):
    """
    LangGraph node that generates probing questions
    
    Inputs from state:
    - user_input: Current user message
    - analyzer_output: Analysis results
    - research_output: Research findings (optional)
    - conversation_history: Previous turns
    - difficulty: Difficulty level
    - user_skill_estimate: User skill
    
    Outputs to state:
    - socratic_output: Structured questions
    - agent_outputs['socratic_questioner']: Formatted output
    """

    print("[Socratic Questioner] Generating probing questions...")
    
    # Extract inputs (READ ONLY)
    user_input = state.get('user_input', '')
    analyzer_output = state.get('analyzer_output')
    research_output = state.get('research_output')
    difficulty = state.get('difficulty', 'standard')
    user_skill = state.get('user_skill_estimate', 0.5)
    conversation_history = state.get('conversation_history', [])
    turn_count = state.get('turn_count', 0)
    
    # Extract previous questions to avoid repetition
    previous_questions = []
    for msg in conversation_history[-6:]:  # Last 3 turns
        if msg.get('role') == 'assistant':
            content = msg.get('content', '')
            previous_questions.extend(re.findall(r'[^.!?]+\?', content))
    
    # Identify what to question
    targets = identify_questioning_targets(analyzer_output, research_output)
    print(f"[Socratic Questioner] Identified {len(targets)} questioning targets")
    
    # Generate questions
    socratic_output = generate_socratic_questions(
        targets=targets,
        analyzer_output=analyzer_output,
        research_output=research_output,
        user_input=user_input,
        difficulty=difficulty,
        user_skill=user_skill,
        previous_questions=previous_questions,
    )
    
    print(f"[Socratic Questioner] Generated {len(socratic_output.questions)} questions")
    print(f"[Socratic Questioner] Focus: {socratic_output.primary_focus}")
    
    # Prepare questions asked entry
    questions_entry = {
        "turn": turn_count,
        "focus": socratic_output.primary_focus,
        "num_questions": len(socratic_output.questions)
    }
    
    # Format output for synthesis
    formatted_output = format_socratic_output(socratic_output)
    
    print("[Socratic Questioner] Complete")
    
    # Return ONLY updates
    return {
        # Scalar updates
        "socratic_output": socratic_output,
        
        # List updates (accumulated)
        "questions_asked": [questions_entry],
        
        # Agent outputs 
        "agent_outputs": {
            "socratic_questioner": formatted_output
        }
    }

def format_socratic_output(output: SocraticOutput) -> str:
    """Format questions for natural synthesis"""
    
    lines = []
    
    # Add questions
    if len(output.questions) == 1:
        lines.append(f"Let me ask you this: {output.questions[0].question_text}")
    else:
        lines.append("Let me ask you a few things:")
        for i, q in enumerate(output.questions, 1):
            lines.append(f"{i}. {q.question_text}")
    
    # Add teaching moment if present
    if output.teaching_moment.include_in_response:
        lines.append(f"\n{output.teaching_moment.gentle_explanation}")
    
    return "\n".join(lines)


# ============================================================================
# EXAMPLE USAGE
# ============================================================================

if __name__ == "__main__":
    # Mock analyzer output for testing
    from typing import NamedTuple
    
    class MockAssumption(NamedTuple):
        assumption: str
        questionable: bool
        counter_examples: List[str]
    
    class MockEvidence(NamedTuple):
        has_evidence: bool
        evidence_type: Optional[str]
        evidence_quality: float
    
    class MockFallacy(NamedTuple):
        type: str
        text_span: str
        explanation: str
        severity: str
    
    class MockClaim(NamedTuple):
        text: str
        type: str
        is_new: bool
    
    class MockReasoningChain(NamedTuple):
        premises: List[str]
        conclusion: str
        logical_connection: str
        gaps: List[str]
    
    class MockAnalyzerOutput:
        def __init__(self):
            self.claims = [MockClaim("UBI destroys work ethic", "main_claim", False)]
            self.implicit_assumptions = [
                MockAssumption(
                    "people only work for money",
                    True,
                    ["volunteers", "wealthy workers", "artists"]
                )
            ]
            self.evidence_provided = MockEvidence(True, "anecdotal", 0.2)
            self.fallacies_detected = [
                MockFallacy("anecdotal", "my uncle stopped working", 
                           "Single case doesn't prove pattern", "moderate")
            ]
            self.reasoning_chain = MockReasoningChain(
                ["people need money to survive"],
                "UBI destroys work ethic",
                "weak",
                ["assumes no intrinsic motivation"]
            )
    
    # Test state
    test_state = {
        "user_input": "My uncle got welfare and stopped working, so UBI destroys work ethic",
        "analyzer_output": MockAnalyzerOutput(),
        "research_output": None,
        "difficulty": "standard",
        "user_skill_estimate": 0.45,
        "conversation_history": [],
        "turn_count": 2,
        "agent_outputs": {}
    }
    
    # Run Socratic Questioner
    result_state = socratic_questioner_node(test_state)
    
    print("\n" + "="*60)
    print("SOCRATIC QUESTIONER OUTPUT")
    print("="*60)
    print(result_state['agent_outputs']['socratic_questioner'])