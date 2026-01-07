"""
GROWTH TRACKER AGENT - Complete Implementation with Structured Output
The personal coach that tracks progress and provides personalized feedback
"""

from typing import List, Optional, Literal, Dict, Any
from langchain.chat_models import init_chat_model
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field
from datetime import datetime
from dotenv import load_dotenv
load_dotenv()
import statistics
from state import DebateState
from models.agent_models import PerformanceBreakdown, PatternsDetected, RecurringFallacy, HistoricalComparison, Achievement, SkillProgression, FallacyReduction, Recommendations, GrowthTrackerOutput, ImprovementArea, SessionSummary




# ============================================================================
# SYSTEM PROMPT
# ============================================================================

GROWTH_TRACKER_SYSTEM_PROMPT = """You are the Growth Tracker in a debate system. Your job is to help users become better debaters and thinkers over time.

**Key Principles:**

1. **TRACK PROGRESS, NOT PERFECTION:**
   - Focus on improvement, not absolute performance
   - Celebrate small wins
   - Be encouraging about persistent issues

2. **BE SPECIFIC:**
   - Not: "Your logic was weak"
   - Yes: "You claimed X leads to Y, but didn't explain the connection. Next time, spell out each step."

3. **IDENTIFY PATTERNS:**
   - Recurring fallacies
   - Topics they struggle with
   - Behavioral tendencies (dodging, emotional, rigid)
   - Improvement trends

4. **ACTIONABLE RECOMMENDATIONS:**
   - Not: "Be more logical"
   - Yes: "Before making a claim, ask: What evidence supports this? Can I cite a study?"

5. **BALANCED FEEDBACK:**
   - Start with what went well
   - Then areas for improvement
   - End with encouragement

6. **PERSONALIZED SUGGESTIONS:**
   - Recommend topics based on weaknesses
   - Adjust difficulty based on skill level
   - Suggest specific skills to focus on

**Context:**
Session data: {session_summary}
Performance metrics: {metrics}
Historical data: {history_summary}

Provide constructive, encouraging, actionable feedback."""


# ============================================================================
# METRIC CALCULATION FUNCTIONS
# ============================================================================

def calculate_session_metrics(state: DebateState) -> Dict[str, Any]:
    """Calculate performance metrics for the session"""
    
    # Get claims history
    claims_history = state.get('user_claims_history', [])
    
    # Argument strength average
    if claims_history:
        strengths = [claim.get('strength', 5.0) for claim in claims_history]
        avg_strength = statistics.mean(strengths)
    else:
        avg_strength = 5.0
    
    # Fallacy count
    fallacies_history = state.get('fallacies_history', [])
    fallacy_count = len(fallacies_history)
    
    # Evidence usage trend (simplified)
    # Would ideally track evidence quality over turns
    final_skill = state.get('user_skill_estimate', 0.5)
    initial_skill = 0.5  # Would need to track initial
    
    if final_skill > initial_skill + 0.1:
        evidence_usage = "improved"
    elif final_skill > initial_skill:
        evidence_usage = "same"
    elif final_skill < initial_skill - 0.1:
        evidence_usage = "declined"
    else:
        evidence_usage = "same"
    
    # Overall performance
    if avg_strength >= 7.5:
        overall = "excellent"
    elif avg_strength >= 6.0:
        overall = "good"
    elif avg_strength >= 4.0:
        overall = "fair"
    else:
        overall = "poor"
    
    return {
        "argument_strength_avg": round(avg_strength, 1),
        "fallacy_count": fallacy_count,
        "evidence_usage": evidence_usage,
        "overall_performance": overall,
        "total_turns": state.get('turn_count', 0)
    }


def calculate_performance_breakdown(state: DebateState) -> PerformanceBreakdown:
    """Calculate scores for different skill dimensions"""
    
    claims_history = state.get('user_claims_history', [])
    fallacies_history = state.get('fallacies_history', [])
    
    # Logic Quality (10 - penalties for fallacies)
    logic_score = 10.0
    logic_score -= len(fallacies_history) * 1.0  # -1 per fallacy
    logic_score = max(0.0, min(10.0, logic_score))
    
    # Evidence Usage (based on final skill estimate and evidence quality)
    final_skill = state.get('user_skill_estimate', 0.5)
    evidence_score = final_skill * 10.0
    
    # Openness to Challenge (did they engage with counter-arguments?)
    # Check conversation length as proxy for engagement
    messages = state.get('conversation_history', [])
    if len(messages) > 10:
        openness_score = 8.0
    elif len(messages) > 5:
        openness_score = 6.5
    else:
        openness_score = 5.0
    
    # Clarity (average from claims if tracked, otherwise use skill)
    clarity_score = final_skill * 10.0 + 2.0  # Slight boost
    clarity_score = min(10.0, clarity_score)
    
    # Nuance (penalize if lots of absolutist language detected)
    nuance_score = 5.0
    if claims_history:
        # Check for absolutist indicators in fallacies
        absolutist_fallacies = ['hasty_generalization', 'false_dichotomy']
        absolutist_count = len([f for f in fallacies_history 
                               if f.get('fallacy') in absolutist_fallacies])
        nuance_score -= absolutist_count * 0.5
        nuance_score = max(0.0, nuance_score)
    
    return PerformanceBreakdown(
        logic_quality=round(logic_score, 1),
        evidence_usage=round(evidence_score, 1),
        openness_to_challenge=round(openness_score, 1),
        clarity=round(clarity_score, 1),
        nuance=round(nuance_score, 1)
    )


def detect_patterns(state: DebateState, user_history: List[Dict]) -> PatternsDetected:
    """Detect patterns across multiple debates"""
    
    current_fallacies = state.get('fallacies_history', [])
    
    # Recurring fallacies
    fallacy_counts = {}
    all_fallacies = current_fallacies.copy()
    
    # Add historical fallacies
    for session in user_history:
        all_fallacies.extend(session.get('fallacies', []))
    
    for fallacy in all_fallacies:
        f_type = fallacy.get('fallacy', 'unknown')
        fallacy_counts[f_type] = fallacy_counts.get(f_type, 0) + 1
    
    recurring = [
        RecurringFallacy(
            type=f_type,
            count=count,
            trend="stable"  # Would need more sessions to detect trend
        )
        for f_type, count in fallacy_counts.items()
        if count >= 2
    ]
    
    # Topic struggles (based on performance)
    topic = state.get('topic', '')
    topic_struggles = []
    if state.get('user_skill_estimate', 0.5) < 0.5:
        # Extract topic keywords
        if 'ubi' in topic.lower() or 'income' in topic.lower():
            topic_struggles.append("economic policy")
        if 'science' in topic.lower() or 'research' in topic.lower():
            topic_struggles.append("scientific claims")
    
    # Behavioral patterns
    behavioral = []
    messages = state.get('conversation_history', [])
    
    if len(messages) > 8:
        behavioral.append("engages well with questions")
    
    if len(current_fallacies) < len(messages) / 3:
        behavioral.append("improving logical reasoning")
    
    if state.get('user_skill_estimate', 0.5) > 0.5:
        behavioral.append("open to evidence")
    
    return PatternsDetected(
        recurring_fallacies=recurring,
        topic_struggles=topic_struggles,
        behavioral_patterns=behavioral or ["building debate skills"]
    )


def calculate_historical_comparison(user_history: List[Dict]) -> HistoricalComparison:
    """Compare recent performance to earlier performance"""
    
    total_debates = len(user_history)
    
    if total_debates < 3:
        # Not enough history - use defaults
        return HistoricalComparison(
            debates_completed=total_debates,
            skill_progression=SkillProgression(
                first_3_debates=4.5,
                last_3_debates=5.5,
                improvement="+22%"
            ),
            fallacy_reduction=FallacyReduction(
                early=8,
                recent=5,
                improvement="-37%"
            )
        )
    
    # Get first 3 and last 3 debates
    first_3 = user_history[:3]
    last_3 = user_history[-3:]
    
    # Calculate averages
    first_3_avg = statistics.mean([d.get('avg_strength', 5.0) for d in first_3])
    last_3_avg = statistics.mean([d.get('avg_strength', 5.0) for d in last_3])
    
    # Calculate improvement percentage
    if first_3_avg > 0:
        improvement_pct = ((last_3_avg - first_3_avg) / first_3_avg) * 100
    else:
        improvement_pct = 0
    
    # Fallacy reduction
    first_3_fallacies = statistics.mean([d.get('fallacy_count', 5) for d in first_3])
    last_3_fallacies = statistics.mean([d.get('fallacy_count', 3) for d in last_3])
    
    if first_3_fallacies > 0:
        fallacy_reduction_pct = ((first_3_fallacies - last_3_fallacies) / first_3_fallacies) * 100
    else:
        fallacy_reduction_pct = 0
    
    return HistoricalComparison(
        debates_completed=total_debates,
        skill_progression=SkillProgression(
            first_3_debates=round(first_3_avg, 1),
            last_3_debates=round(last_3_avg, 1),
            improvement=f"{'+' if improvement_pct >= 0 else ''}{improvement_pct:.0f}%"
        ),
        fallacy_reduction=FallacyReduction(
            early=int(first_3_fallacies),
            recent=int(last_3_fallacies),
            improvement=f"{'-' if fallacy_reduction_pct >= 0 else '+'}{abs(fallacy_reduction_pct):.0f}%"
        )
    )


def generate_recommendations(
    patterns: PatternsDetected,
    performance: PerformanceBreakdown,
    user_skill: float,
    difficulty: str
) -> Recommendations:
    """Generate personalized recommendations"""
    
    # Next topic based on struggles
    if patterns.topic_struggles:
        next_topic = f"{patterns.topic_struggles[0]} - an area to strengthen"
    else:
        next_topic = "Choose any topic you're curious about"
    
    # Difficulty adjustment
    if user_skill < 0.4 and difficulty != "casual":
        difficulty_adj = "decrease"
    elif user_skill > 0.75 and difficulty != "expert":
        difficulty_adj = "increase"
    else:
        difficulty_adj = f"stay_{difficulty}"
    
    # Focus areas based on weakest dimensions
    focus_areas = []
    if performance.evidence_usage < 5.0:
        focus_areas.append("evidence gathering")
    if performance.logic_quality < 6.0:
        focus_areas.append("logical reasoning")
    if performance.nuance < 5.0:
        focus_areas.append("examining assumptions")
    
    if not focus_areas:
        focus_areas = ["keep refining your skills"]
    
    # Time estimate
    if user_skill < 0.4:
        time_estimate = "8-10 more debates to reach intermediate level"
    elif user_skill < 0.6:
        time_estimate = "5-7 more debates to reach advanced level"
    elif user_skill < 0.8:
        time_estimate = "3-5 more debates to reach expert level"
    else:
        time_estimate = "You're at expert level - keep practicing!"
    
    return Recommendations(
        next_debate_topic=next_topic,
        difficulty_adjustment=difficulty_adj,
        focus_areas=focus_areas,
        estimated_time_to_next_level=time_estimate
    )


def check_achievements(state: DebateState, user_history: List[Dict]) -> List[Achievement]:
    """Check if user earned any achievements"""
    
    achievements = []
    
    # Fallacy Hunter: Completed debate with < 2 fallacies
    fallacy_count = len(state.get('fallacies_history', []))
    if fallacy_count < 2 and state.get('turn_count', 0) > 5:
        achievements.append(Achievement(
            badge="Fallacy Hunter",
            earned=True,
            description="Completed debate with minimal logical fallacies"
        ))
    
    # Open Mind: Skill improved during debate
    if state.get('user_skill_estimate', 0.5) > 0.5:
        achievements.append(Achievement(
            badge="Open Mind",
            earned=True,
            description="Showed growth and openness during the debate"
        ))
    
    # Depth Seeker: Long engagement (many turns)
    if state.get('turn_count', 0) >= 10:
        achievements.append(Achievement(
            badge="Depth Seeker",
            earned=True,
            description="Engaged deeply with the topic"
        ))
    
    # Marathon Debater: Completed many debates
    total_debates = len(user_history) + 1  # +1 for current
    if total_debates >= 10:
        achievements.append(Achievement(
            badge="Marathon Debater",
            earned=True,
            description="Completed 10+ debates - commitment to growth!"
        ))
    elif total_debates >= 5:
        achievements.append(Achievement(
            badge="Dedicated Learner",
            earned=True,
            description="Completed 5+ debates"
        ))
    
    # Evidence Advocate: Used evidence well
    if state.get('user_skill_estimate', 0.5) > 0.6:
        achievements.append(Achievement(
            badge="Evidence Advocate",
            earned=True,
            description="Demonstrated strong evidence-based reasoning"
        ))
    
    return achievements


# ============================================================================
# STRUCTURED OUTPUT GENERATION
# ============================================================================

def generate_growth_feedback(
    state: DebateState,
    user_history: List[Dict],
) -> GrowthTrackerOutput:
    """Generate structured feedback using LLM"""
    
    # Calculate all metrics
    metrics = calculate_session_metrics(state)
    performance = calculate_performance_breakdown(state)
    patterns = detect_patterns(state, user_history)
    historical = calculate_historical_comparison(user_history)
    recommendations = generate_recommendations(
        patterns, performance,
        state.get('user_skill_estimate', 0.5),
        state.get('difficulty', 'standard')
    )
    achievements = check_achievements(state, user_history)
    
    # Create structured LLM
    model = init_chat_model("gemini-2.5-flash-lite", model_provider="google_genai", temperature=0.7)
    structured_llm = model.with_structured_output(GrowthTrackerOutput)
    
    # Prepare context summaries
    session_summary = f"Topic: {state.get('topic', 'Unknown')}, Turns: {metrics['total_turns']}, " \
                     f"Avg Strength: {metrics['argument_strength_avg']}, Fallacies: {metrics['fallacy_count']}"
    
    metrics_summary = f"Logic: {performance.logic_quality}, Evidence: {performance.evidence_usage}, " \
                     f"Openness: {performance.openness_to_challenge}"
    
    history_summary = f"Completed {historical.debates_completed} debates, " \
                     f"Skill: {historical.skill_progression.first_3_debates} → {historical.skill_progression.last_3_debates}"
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", GROWTH_TRACKER_SYSTEM_PROMPT),
        ("human", "Generate comprehensive feedback for this debate session.")
    ])
    
    try:
        output: GrowthTrackerOutput = (prompt | structured_llm).invoke({
            "session_summary": session_summary,
            "metrics": metrics_summary,
            "history_summary": history_summary
        })
        return output
        
    except Exception as e:
        print(f"[Growth Tracker] Structured output failed: {e}, using fallback")
        return fallback_feedback_generation(
            state, metrics, performance, patterns, 
            historical, recommendations, achievements
        )


def fallback_feedback_generation(
    state: DebateState,
    metrics: Dict,
    performance: PerformanceBreakdown,
    patterns: PatternsDetected,
    historical: HistoricalComparison,
    recommendations: Recommendations,
    achievements: List[Achievement]
) -> GrowthTrackerOutput:
    """Generate feedback using heuristics when LLM fails"""
    
    # What went well
    what_went_well = []
    if performance.openness_to_challenge > 7.0:
        what_went_well.append("You engaged thoughtfully with counter-arguments")
    if performance.logic_quality > 6.5:
        what_went_well.append("Your logical reasoning was generally sound")
    if len(state.get('fallacies_history', [])) < 3:
        what_went_well.append("You avoided most logical fallacies")
    if not what_went_well:
        what_went_well.append("You completed the debate and showed willingness to engage")
    
    # Areas for improvement
    areas = []
    if performance.evidence_usage < 5.0:
        areas.append(ImprovementArea(
            area="Evidence usage",
            issue="Need stronger evidence to support claims",
            suggestion="Before making claims, ask: What studies or data support this? Search for credible sources.",
            priority="high"
        ))
    if performance.nuance < 5.0:
        areas.append(ImprovementArea(
            area="Nuanced thinking",
            issue="Arguments sometimes too absolute",
            suggestion="Consider edge cases and exceptions. Use 'often' instead of 'always', 'many' instead of 'all'.",
            priority="medium"
        ))
    if performance.logic_quality < 6.0:
        areas.append(ImprovementArea(
            area="Logical reasoning",
            issue="Some gaps in reasoning chains",
            suggestion="Spell out each step: If A, then B because X. Make connections explicit.",
            priority="high"
        ))
    
    if not areas:
        areas.append(ImprovementArea(
            area="Consistency",
            issue="Keep up the good work",
            suggestion="Continue practicing to maintain your skill level",
            priority="low"
        ))
    
    return GrowthTrackerOutput(
        session_summary=SessionSummary(
            total_turns=metrics['total_turns'],
            argument_strength_avg=metrics['argument_strength_avg'],
            fallacies_count=metrics['fallacy_count'],
            evidence_usage=metrics['evidence_usage'],
            overall_performance=metrics['overall_performance']
        ),
        performance_breakdown=performance,
        what_went_well=what_went_well[:5],
        areas_for_improvement=areas[:3],
        patterns_detected=patterns,
        historical_comparison=historical,
        recommendations=recommendations,
        achievements=achievements
    )


# ============================================================================
# LANGGRAPH NODE IMPLEMENTATION
# ============================================================================

def growth_tracker_node(state: DebateState):
    """
    LangGraph node for growth tracking
    
    DURING DEBATE: Silent tracking (no output)
    AT END: Generate full feedback
    
    Inputs from state:
    - debate_ended: Whether debate is complete
    - All session data (fallacies, claims, skill estimate, etc.)
    - user_id: For loading history
    
    Outputs to state:
    - growth_feedback: Complete feedback (only at end)
    """
    
    # Check if debate has ended
    debate_ended = state.get('debate_ended', False)
    
    if not debate_ended:
        # SILENT TRACKING MODE - return empty updates
        print("[Growth Tracker] Tracking session data silently...")
        return {}
    
    # FEEDBACK GENERATION MODE - debate is complete
    print("[Growth Tracker] Generating final feedback...")
    
    # Load user history (READ ONLY)
    user_id = state.get('user_id', 'default_user')
    user_history = load_user_history(user_id)
    
    # Generate feedback (doesn't modify state)
    feedback = generate_growth_feedback(state, user_history)
    
    print(f"[Growth Tracker] Performance: {feedback.session_summary.overall_performance}")
    print(f"[Growth Tracker] Achievements: {len(feedback.achievements)}")
    
    # Save session to history (side effect, not state update)
    save_session_to_history(user_id, state, feedback)
    
    # Format for display
    formatted_output = format_growth_output(feedback)
    
    print("[Growth Tracker] Complete")
    
    # Return ONLY updates
    return {
        # Scalar updates
        "growth_feedback": feedback,
        
        # Agent outputs
        "agent_outputs": {
            "growth_tracker": formatted_output
        }
    }


def format_growth_output(feedback: GrowthTrackerOutput) -> str:
    """Format feedback for display"""
    
    lines = []
    
    lines.append("=" * 60)
    lines.append("🎉 DEBATE COMPLETE - YOUR GROWTH REPORT 🎉")
    lines.append("=" * 60)
    
    # Summary
    lines.append(f"\n**Session Summary:**")
    lines.append(f"Performance: {feedback.session_summary.overall_performance.upper()}")
    lines.append(f"Argument Strength: {feedback.session_summary.argument_strength_avg}/10")
    lines.append(f"Fallacies: {feedback.session_summary.fallacies_count}")
    
    # What went well
    lines.append(f"\n**✅ What Went Well:**")
    for item in feedback.what_went_well:
        lines.append(f"  • {item}")
    
    # Areas for improvement
    lines.append(f"\n**📈 Areas for Growth:**")
    for area in feedback.areas_for_improvement:
        lines.append(f"  • {area.area}: {area.issue}")
        lines.append(f"    → Try this: {area.suggestion}")
    
    # Achievements
    if feedback.achievements:
        lines.append(f"\n**🏆 Achievements Unlocked:**")
        for ach in feedback.achievements:
            lines.append(f"  • {ach.badge}: {ach.description}")
    
    # Recommendations
    lines.append(f"\n**🎯 Next Steps:**")
    lines.append(f"  • Recommended topic: {feedback.recommendations.next_debate_topic}")
    lines.append(f"  • Focus on: {', '.join(feedback.recommendations.focus_areas)}")
    lines.append(f"  • {feedback.recommendations.estimated_time_to_next_level}")
    
    return "\n".join(lines)


# ============================================================================
# DATABASE MOCK FUNCTIONS
# ============================================================================

def load_user_history(user_id: str) -> List[Dict]:
    """Load user's debate history from database (mock)"""
    # In production, query database
    # For now, return mock data
    return [
        {
            "session_id": "prev1",
            "topic": "Climate change",
            "avg_strength": 5.2,
            "fallacy_count": 6,
            "fallacies": [{"fallacy": "anecdotal"}, {"fallacy": "hasty_generalization"}]
        },
        {
            "session_id": "prev2",
            "topic": "Healthcare policy",
            "avg_strength": 5.8,
            "fallacy_count": 4,
            "fallacies": [{"fallacy": "anecdotal"}]
        },
        {
            "session_id": "prev3",
            "topic": "Education reform",
            "avg_strength": 6.5,
            "fallacy_count": 3,
            "fallacies": []
        }
    ]


def save_session_to_history(user_id: str, state: DebateState, feedback: GrowthTrackerOutput):
    """Save completed session to user history (mock)"""
    # In production, insert into database
    session_record = {
        "user_id": user_id,
        "session_id": state.get('session_id'),
        "topic": state.get('topic'),
        "difficulty": state.get('difficulty'),
        "total_turns": feedback.session_summary.total_turns,
        "avg_strength": feedback.session_summary.argument_strength_avg,
        "fallacy_count": feedback.session_summary.fallacies_count,
        "overall_performance": feedback.session_summary.overall_performance,
        "timestamp": datetime.now().isoformat()
    }
    print(f"[Growth Tracker] Saved session: {session_record['session_id']}")


# ============================================================================
# EXAMPLE USAGE
# ============================================================================

if __name__ == "__main__":
    # Test state (debate ended)
    test_state = {
        "user_id": "test_user_123",
        "session_id": "debate_456",
        "topic": "Universal Basic Income and work ethic",
        "difficulty": "standard",
        "turn_count": 8,
        "user_skill_estimate": 0.62,
        "debate_ended": True,
        "user_claims_history": [
            {"turn": 1, "claim": "UBI destroys work ethic", "strength": 4.0},
            {"turn": 2, "claim": "people won't work if given money", "strength": 3.5},
            {"turn": 4, "claim": "evidence shows mixed results", "strength": 6.5},
            {"turn": 6, "claim": "there are other factors", "strength": 7.0}
        ],
        "fallacies_history": [
            {"turn": 1, "fallacy": "anecdotal", "severity": "moderate"},
            {"turn": 2, "fallacy": "hasty_generalization", "severity": "moderate"},
            {"turn": 4, "fallacy": "false_dichotomy", "severity": "minor"}
        ],
        "conversation_history": [
            {"role": "user", "content": "UBI destroys work ethic", "turn": 1},
            {"role": "assistant", "content": "Interesting claim...", "turn": 1},
            {"role": "user", "content": "My uncle example...", "turn": 2},
            {"role": "assistant", "content": "But what about...", "turn": 2},
            {"role": "user", "content": "Good point about volunteers", "turn": 4},
            {"role": "assistant", "content": "Research shows...", "turn": 4},
            {"role": "user", "content": "I see the evidence is mixed", "turn": 6},
            {"role": "assistant", "content": "Exactly...", "turn": 6}
        ],
        "agent_outputs": {}
    }
    
    # Run Growth Tracker
    result_state = growth_tracker_node(test_state)
    
    print("\n" + "="*60)
    print("GROWTH TRACKER OUTPUT")
    print("="*60)
    if 'agent_outputs' in result_state and 'growth_tracker' in result_state['agent_outputs']:
        print(result_state['agent_outputs']['growth_tracker'])