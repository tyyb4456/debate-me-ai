from typing import TypedDict, List, Dict, Literal, Annotated
from operator import add
from models.agent_models import GrowthTrackerOutput, DevilsAdvocateOutput, SocraticOutput, AnalyzerOutput, ResearchOutput


class DebateState(TypedDict):
    # Session info
    session_id: str
    topic: str
    difficulty: Literal["casual", "standard", "expert"]
    
    # Turn tracking
    turn_count: int
    current_phase: Literal["opening", "rebuttal", "deepening", "conclusion"]
    
    # User performance tracking
    user_skill_estimate: float  # 0.0 to 1.0
    
    # Conversation
    conversation_history: Annotated[List[Dict], add]  # Each dict has: role, content, turn
    user_input: str
    ai_response: str | None
    
    # Argument tracking
    user_claims: Annotated[List[str], add]
    ai_claims: Annotated[List[str], add]
    conceded_points: Annotated[List[str], add]
    fallacies_detected: Annotated[List[str], add]
    
    # Agent orchestration
    agent_outputs: Dict[str, str]  # {agent_name: output}
    next_agents: List[str]  # List of agent names to route to
    routing_decision: str  # Explanation of routing decision

    # Research Agent fields
    user_claim: str
    search_focus: str
    research_output: ResearchOutput | None
    
    # Analyzer Agent fields
    analyzer_output: AnalyzerOutput | None
    fallacies_history: Annotated[List[Dict], add]
    
    # Socratic Questioner fields
    socratic_output: SocraticOutput | None
    questions_asked: Annotated[List[Dict], add]

    # DEVIL'S ADVOCATE fields:
    advocate_output: DevilsAdvocateOutput | None 
    ai_claims_history: Annotated[List[Dict], add]

    # NEW FIELDS FOR GROWTH TRACKER:
    debate_ended: bool  # Flag to trigger end-of-debate feedback
    user_id: str  # User identifier for loading history
    user_claims_history: Annotated[List[Dict], add]  # Track claims with turn, claim text, and strength
    growth_feedback: GrowthTrackerOutput | None  # Complete feedback output (only at end)