from typing import List, Dict, Optional, Literal
from pydantic import BaseModel, Field

# ============================================================================
# PYDANTIC SCHEMAS FOR STRUCTURED OUTPUT
# ============================================================================

class SearchQuery(BaseModel):
    """Schema for generated search queries"""
    queries: List[str] = Field(
        description="List of 3-4 focused search queries",
        min_items=3,
        max_items=4
    )


class EvidenceItem(BaseModel):
    """Schema for a single piece of evidence"""
    source_name: str = Field(description="Name of the source (study, article, report)")
    source_type: str = Field(description="Type: study, report, article, opinion, etc.")
    key_finding: str = Field(description="Main finding or conclusion (1-2 sentences)")
    methodology: Optional[str] = Field(
        default=None,
        description="Study methodology if applicable (sample size, duration, controls)"
    )
    limitations: Optional[str] = Field(
        default=None,
        description="Limitations or caveats of the evidence"
    )
    publication_year: Optional[int] = Field(
        default=None,
        description="Year of publication"
    )
    url: Optional[str] = Field(default=None, description="Source URL")


class CategorizedEvidence(BaseModel):
    """Schema for categorized search results"""
    supporting: List[Dict] = Field(
        default_factory=list,
        description="Evidence supporting the user's claim"
    )
    opposing: List[Dict] = Field(
        default_factory=list,
        description="Evidence opposing the user's claim"
    )
    neutral: List[Dict] = Field(
        default_factory=list,
        description="Neutral or mixed evidence"
    )


class DetailedEvidence(BaseModel):
    """Schema for detailed evidence extraction"""
    evidence_items: List[EvidenceItem] = Field(
        description="List of detailed evidence items extracted from sources"
    )


class ResearchOutput(BaseModel):
    """Complete research output schema"""
    supporting_evidence: List[EvidenceItem] = Field(default_factory=list)
    opposing_evidence: List[EvidenceItem] = Field(default_factory=list)
    neutral_evidence: List[EvidenceItem] = Field(default_factory=list)
    queries_used: List[str] = Field(default_factory=list)
    overall_evidence_strength: Literal["strong_support", "mixed", "strong_opposition"]
    strongest_source: Optional[Dict] = None
    total_sources_found: int = 0
    credibility_summary: Dict[str, int] = Field(default_factory=dict)


# ============================================================================
# PYDANTIC SCHEMAS FOR STRUCTURED OUTPUT
# ============================================================================

class Claim(BaseModel):
    """Individual claim in user's argument"""
    text: str = Field(description="The exact claim text")
    type: Literal["main_claim", "supporting_premise", "counter_claim"] = Field(
        description="Type of claim"
    )
    is_new: bool = Field(description="Whether this claim is new or repeated")


class Evidence(BaseModel):
    """Evidence assessment"""
    has_evidence: bool = Field(description="Whether user provided any evidence")
    evidence_type: Optional[Literal["anecdotal", "statistical", "expert", "study", "example"]] = Field(
        default=None,
        description="Type of evidence provided"
    )
    evidence_quality: float = Field(
        ge=0.0, le=1.0,
        description="Quality of evidence on 0-1 scale"
    )
    specific_evidence: Optional[str] = Field(
        default=None,
        description="The specific evidence text if provided"
    )


class ReasoningChain(BaseModel):
    """Analysis of reasoning structure"""
    premises: List[str] = Field(
        description="List of premises user is arguing from"
    )
    conclusion: str = Field(description="The conclusion user draws")
    logical_connection: Literal["strong", "moderate", "weak", "invalid"] = Field(
        description="Strength of logical connection"
    )
    gaps: List[str] = Field(
        default_factory=list,
        description="Logical gaps or leaps in reasoning"
    )


class Fallacy(BaseModel):
    """Detected logical fallacy"""
    type: str = Field(description="Name of the fallacy")
    text_span: str = Field(description="The specific text where fallacy occurs")
    explanation: str = Field(description="Why this is a fallacy")
    severity: Literal["minor", "moderate", "severe"] = Field(
        description="How serious the fallacy is"
    )


class Assumption(BaseModel):
    """Implicit assumption in argument"""
    assumption: str = Field(description="The unstated assumption")
    questionable: bool = Field(description="Whether this assumption is questionable")
    counter_examples: List[str] = Field(
        default_factory=list,
        description="Examples that challenge this assumption"
    )


class ArgumentStrength(BaseModel):
    """Multi-dimensional argument quality assessment"""
    overall_score: float = Field(
        ge=0.0, le=10.0,
        description="Overall argument quality 0-10"
    )
    logic_score: float = Field(
        ge=0.0, le=10.0,
        description="Logical reasoning quality 0-10"
    )
    evidence_score: float = Field(
        ge=0.0, le=10.0,
        description="Evidence quality 0-10"
    )
    clarity_score: float = Field(
        ge=0.0, le=10.0,
        description="Clarity and structure 0-10"
    )
    nuance_score: float = Field(
        ge=0.0, le=10.0,
        description="Nuance and sophistication 0-10"
    )
    breakdown: str = Field(description="Textual breakdown of scores")


class Patterns(BaseModel):
    """Behavioral patterns in user's argumentation"""
    repeated_claim: bool = Field(description="Is user repeating same claim")
    avoiding_counter_evidence: bool = Field(description="Is user ignoring counter-evidence")
    emotional_language: bool = Field(description="Is user using emotional language")
    improving_from_last_turn: Optional[bool] = Field(
        default=None,
        description="Whether argument quality improved since last turn"
    )


class AnalyzerOutput(BaseModel):
    """Complete structured output from Argument Analyzer"""
    claims: List[Claim] = Field(description="All claims identified")
    evidence_provided: Evidence = Field(description="Evidence assessment")
    reasoning_chain: ReasoningChain = Field(description="Reasoning structure")
    fallacies_detected: List[Fallacy] = Field(
        default_factory=list,
        description="All fallacies found"
    )
    implicit_assumptions: List[Assumption] = Field(
        default_factory=list,
        description="Unstated assumptions"
    )
    argument_strength: ArgumentStrength = Field(description="Quality scores")
    patterns: Patterns = Field(description="Behavioral patterns")


# ============================================================================
# PYDANTIC SCHEMAS FOR STRUCTURED OUTPUT
# ============================================================================

class Question(BaseModel):
    """Individual question to ask the user"""
    question_text: str = Field(description="The actual question to ask")
    question_type: Literal[
        "clarification",
        "assumption_challenge",
        "evidence_request",
        "counter_evidence",
        "consequence_exploration",
        "alternative_perspective",
        "consistency_check"
    ] = Field(description="Type of question")
    targets: str = Field(description="What this question targets")
    reasoning: str = Field(description="Why this question is being asked")


class FollowUpStrategy(BaseModel):
    """Strategy for handling user's response"""
    if_user_dodges: Literal["press_on_same_point", "try_different_angle", "move_on"] = Field(
        description="What to do if user avoids the question"
    )
    if_user_engages: Literal["go_deeper", "introduce_complexity", "acknowledge_and_pivot"] = Field(
        description="What to do if user engages thoughtfully"
    )
    if_user_concedes: Literal["explore_implications", "find_common_ground", "move_to_new_point"] = Field(
        description="What to do if user concedes the point"
    )


class TeachingMoment(BaseModel):
    """Optional gentle education about reasoning"""
    fallacy_to_address: Optional[str] = Field(
        default=None,
        description="Fallacy type to gently address"
    )
    gentle_explanation: Optional[str] = Field(
        default=None,
        description="Non-condescending explanation"
    )
    include_in_response: bool = Field(
        default=False,
        description="Whether to include this teaching moment"
    )


class SocraticOutput(BaseModel):
    """Complete structured output from Socratic Questioner"""
    questions: List[Question] = Field(
        min_length=1,
        max_length=3,
        description="2-3 strategic questions"
    )
    primary_focus: str = Field(description="Main weakness being targeted")
    tone: Literal["curious", "challenging", "supportive", "probing"] = Field(
        description="Overall tone of questions"
    )
    follow_up_strategy: FollowUpStrategy = Field(description="Response strategies")
    teaching_moment: TeachingMoment = Field(description="Optional educational moment")

# ============================================================================
# PYDANTIC SCHEMAS FOR STRUCTURED OUTPUT
# ============================================================================

class EvidenceSource(BaseModel):
    """Source of evidence for counter-argument"""
    name: str = Field(description="Name of the source")
    credibility: float = Field(
        ge=0.0, le=1.0,
        description="Credibility score 0-1"
    )
    url: Optional[str] = Field(default=None, description="URL if available")


class OpposingPosition(BaseModel):
    """The steel-manned opposing position"""
    statement: str = Field(description="Clear statement of opposing position")
    steel_manned: bool = Field(
        default=True,
        description="Whether this is the strongest version"
    )
    reasoning: str = Field(description="Why this position makes sense")


class CounterArgument(BaseModel):
    """Individual counter-argument"""
    type: Literal[
        "evidence_based",
        "alternative_explanation",
        "reframe",
        "edge_case",
        "value_tradeoff",
        "logical_challenge"
    ] = Field(description="Type of counter-argument")
    argument: str = Field(description="The actual counter-argument text")
    evidence_source: Optional[EvidenceSource] = Field(
        default=None,
        description="Source if evidence-based"
    )
    strength: Literal["weak", "moderate", "strong"] = Field(
        description="Strength of this argument"
    )
    addresses: str = Field(description="What aspect of user's argument this challenges")


class Concession(BaseModel):
    """Strategic concession to build credibility"""
    point: str = Field(description="What we're conceding")
    reasoning: str = Field(description="Why we're conceding this")


class DevilsAdvocateOutput(BaseModel):
    """Complete structured output from Devil's Advocate"""
    opposing_position: OpposingPosition = Field(description="Steel-manned opposite view")
    counter_arguments: List[CounterArgument] = Field(
        min_length=1,
        max_length=4,
        description="2-4 strategic counter-arguments"
    )
    concessions: List[Concession] = Field(
        default_factory=list,
        description="Points to concede for credibility"
    )
    challenge_level: Literal["low", "moderate", "high", "expert"] = Field(
        description="How aggressive the challenge is"
    )
    strategic_goal: Literal[
        "introduce_doubt",
        "prove_wrong",
        "find_middle_ground",
        "shift_frame"
    ] = Field(description="Goal of this challenge")
    rhetorical_approach: Literal[
        "evidence_first",
        "logic_first",
        "values_first",
        "balanced"
    ] = Field(description="Primary rhetorical strategy")

# ============================================================================
# PYDANTIC SCHEMAS FOR STRUCTURED OUTPUT
# ============================================================================

class SessionSummary(BaseModel):
    """Summary statistics for the debate session"""
    total_turns: int = Field(description="Number of turns in debate")
    argument_strength_avg: float = Field(
        ge=0.0, le=10.0,
        description="Average argument strength"
    )
    fallacies_count: int = Field(description="Total fallacies detected")
    evidence_usage: Literal["none", "declined", "same", "improved", "excellent"] = Field(
        description="Trend in evidence usage"
    )
    overall_performance: Literal["poor", "fair", "good", "excellent"] = Field(
        description="Overall performance rating"
    )


class PerformanceBreakdown(BaseModel):
    """Detailed breakdown of performance across dimensions"""
    logic_quality: float = Field(ge=0.0, le=10.0, description="Logical reasoning quality")
    evidence_usage: float = Field(ge=0.0, le=10.0, description="Evidence quality and usage")
    openness_to_challenge: float = Field(ge=0.0, le=10.0, description="Engagement with counter-arguments")
    clarity: float = Field(ge=0.0, le=10.0, description="Clarity of communication")
    nuance: float = Field(ge=0.0, le=10.0, description="Nuance and sophistication")


class ImprovementArea(BaseModel):
    """Specific area needing improvement"""
    area: str = Field(description="Skill area needing work")
    issue: str = Field(description="Specific issue observed")
    suggestion: str = Field(description="Actionable suggestion")
    priority: Literal["low", "medium", "high"] = Field(description="Priority level")


class RecurringFallacy(BaseModel):
    """Fallacy that appears across multiple debates"""
    type: str = Field(description="Fallacy type")
    count: int = Field(description="Number of occurrences")
    trend: Literal["increasing", "stable", "decreasing"] = Field(description="Trend over time")


class PatternsDetected(BaseModel):
    """Behavioral and performance patterns"""
    recurring_fallacies: List[RecurringFallacy] = Field(
        default_factory=list,
        description="Fallacies that keep appearing"
    )
    topic_struggles: List[str] = Field(
        default_factory=list,
        description="Topics user struggles with"
    )
    behavioral_patterns: List[str] = Field(
        default_factory=list,
        description="Behavioral tendencies observed"
    )


class SkillProgression(BaseModel):
    """Skill progression over time"""
    first_3_debates: float = Field(description="Average from first 3 debates")
    last_3_debates: float = Field(description="Average from last 3 debates")
    improvement: str = Field(description="Improvement percentage")


class FallacyReduction(BaseModel):
    """Fallacy reduction over time"""
    early: int = Field(description="Average fallacies in early debates")
    recent: int = Field(description="Average fallacies in recent debates")
    improvement: str = Field(description="Improvement percentage")


class HistoricalComparison(BaseModel):
    """Comparison with past performance"""
    debates_completed: int = Field(description="Total debates completed")
    skill_progression: SkillProgression = Field(description="Skill improvement")
    fallacy_reduction: FallacyReduction = Field(description="Fallacy reduction")


class Recommendations(BaseModel):
    """Personalized recommendations for growth"""
    next_debate_topic: str = Field(description="Suggested next topic")
    difficulty_adjustment: Literal[
        "increase",
        "decrease",
        "stay_standard",
        "stay_casual",
        "stay_expert"
    ] = Field(description="Difficulty recommendation")
    focus_areas: List[str] = Field(description="Skills to focus on")
    estimated_time_to_next_level: str = Field(description="Time estimate for improvement")


class Achievement(BaseModel):
    """Achievement/badge earned"""
    badge: str = Field(description="Badge name")
    earned: bool = Field(description="Whether earned this session")
    description: str = Field(description="What this badge represents")


class GrowthTrackerOutput(BaseModel):
    """Complete structured output from Growth Tracker (END of debate only)"""
    session_summary: SessionSummary
    performance_breakdown: PerformanceBreakdown
    what_went_well: List[str] = Field(
        min_length=1,
        max_length=5,
        description="Positive highlights"
    )
    areas_for_improvement: List[ImprovementArea] = Field(
        min_length=1,
        max_length=3,
        description="Areas needing work"
    )
    patterns_detected: PatternsDetected
    historical_comparison: HistoricalComparison
    recommendations: Recommendations
    achievements: List[Achievement] = Field(default_factory=list)