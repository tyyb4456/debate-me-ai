"""
RESEARCH AGENT - Complete Implementation with Structured Output
The fact-finder and evidence gatherer for the debate system
"""

from typing import List, Dict, Optional, Literal
from langchain.chat_models import init_chat_model
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.tools import tool
from datetime import datetime
import re
from urllib.parse import urlparse
from state import DebateState
from dotenv import load_dotenv
load_dotenv()
from models.agent_models import ResearchOutput, SearchQuery, CategorizedEvidence, EvidenceItem, DetailedEvidence


# ============================================================================
# SYSTEM PROMPTS
# ============================================================================

RESEARCH_SYSTEM_PROMPT = """You are a Research Agent in a debate system. Your mission is to find FACTUAL EVIDENCE related to claims being debated.

**Key Principles:**

1. **Search for BOTH sides of the argument**
   - Find evidence supporting the claim
   - Find evidence opposing the claim
   - Note when evidence is mixed or contradictory

2. **Prioritize high-quality sources:**
   - Peer-reviewed studies > Government reports > Established news > Blogs
   - Recent sources > Outdated (unless historical context needed)
   - Primary research > Secondary analysis > Opinion pieces

3. **Be specific in extraction:**
   - Don't just say "studies show X"
   - Provide: Who conducted it, when, sample size, key findings, limitations
   - Include methodology details when available

4. **Acknowledge uncertainty and complexity:**
   - Real debates rarely have 100% clear evidence
   - Note limitations and contradictions
   - Distinguish "no evidence found" from "evidence suggests no effect"

**Current Context:**
Topic: {topic}
Claim to research: {claim}
Search focus: {focus}

Find the best available evidence."""

QUERY_GENERATION_PROMPT = """Generate 3-4 focused search queries to find evidence about this claim.

**Claim:** {claim}
**Topic:** {topic}

**Requirements:**
- Query 1: Broad search with main concepts
- Query 2: Specific real-world examples or pilot programs
- Query 3: Academic/research angle
- Query 4: Counter-perspective or alternative framing

Generate diverse queries that will find evidence from multiple angles."""

EVIDENCE_CATEGORIZATION_PROMPT = """Categorize these search results into supporting, opposing, or neutral evidence.

**User's Position:** {user_claim}

**Search Results:**
{search_results}

For each result, determine if it supports, opposes, or provides neutral/mixed evidence regarding the user's claim.
Consider the titles and snippets carefully to make accurate categorizations."""

EVIDENCE_EXTRACTION_PROMPT = """Extract specific, detailed evidence from these sources.

**Sources:** {sources}

For each source, extract:
- Source name and type (study, report, article, etc.)
- Key finding (specific statistics, conclusions)
- Methodology (if study: sample size, duration, controls)
- Limitations or caveats
- Publication year

Be specific and precise. Avoid vague statements like "studies show."
If information is not available, set the field to null."""


# ============================================================================
# CREDIBILITY SCORING
# ============================================================================

class SourceCredibility:
    """Calculate credibility scores for sources"""
    
    # Trusted domains and their base scores
    HIGH_CREDIBILITY_DOMAINS = {
        '.edu': 0.3,
        '.gov': 0.3,
        'nature.com': 0.35,
        'science.org': 0.35,
        'nejm.org': 0.35,
        'thelancet.com': 0.35,
        'nber.org': 0.3,
        'who.int': 0.3,
        'nih.gov': 0.3,
    }
    
    MEDIUM_CREDIBILITY_DOMAINS = {
        'nytimes.com': 0.2,
        'wsj.com': 0.2,
        'reuters.com': 0.2,
        'bbc.com': 0.2,
        'economist.com': 0.2,
        'apnews.com': 0.2,
        'ft.com': 0.2,
    }
    
    # Known low-quality or biased sources (to flag or filter)
    LOW_CREDIBILITY_DOMAINS = [
        'infowars.com',
        'naturalnews.com',
        'beforeitsnews.com',
    ]
    
    @staticmethod
    def calculate_credibility(
        url: str,
        source_type: str = "article",
        publication_year: Optional[int] = None
    ) -> float:
        """Calculate credibility score (0-1) for a source"""
        
        base_score = 0.5
        domain = urlparse(url).netloc.lower()
        
        # Check if it's a known low-quality source
        if any(bad in domain for bad in SourceCredibility.LOW_CREDIBILITY_DOMAINS):
            return 0.2
        
        # Domain-based credibility
        for trusted_domain, boost in SourceCredibility.HIGH_CREDIBILITY_DOMAINS.items():
            if trusted_domain in domain:
                base_score += boost
                break
        else:
            for medium_domain, boost in SourceCredibility.MEDIUM_CREDIBILITY_DOMAINS.items():
                if medium_domain in domain:
                    base_score += boost
                    break
        
        # Source type adjustments
        if source_type.lower() in ['peer-reviewed', 'peer reviewed', 'study', 'research']:
            base_score += 0.2
        elif source_type.lower() == 'primary research':
            base_score += 0.15
        elif source_type.lower() in ['opinion', 'editorial', 'blog']:
            base_score -= 0.15
        
        # Recency adjustment (for time-sensitive topics)
        if publication_year:
            current_year = datetime.now().year
            years_old = current_year - publication_year
            
            if years_old > 5:
                base_score -= 0.1
            if years_old > 10:
                base_score -= 0.2
        
        # Clamp between 0 and 1
        return max(0.0, min(1.0, base_score))


# ============================================================================
# QUERY GENERATION WITH STRUCTURED OUTPUT
# ============================================================================

def generate_search_queries(claim: str, topic: str, llm) -> List[str]:
    """Generate focused search queries from a claim using structured output"""
    
    # Create structured LLM
    structured_llm = llm.with_structured_output(SearchQuery)
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are an expert at generating effective search queries for research."),
        ("human", QUERY_GENERATION_PROMPT)
    ])
    
    try:
        result: SearchQuery = (prompt | structured_llm).invoke({
            "claim": claim, 
            "topic": topic
        })
        return result.queries
    except Exception as e:
        print(f"[Research] Query generation error: {e}")
        # Fallback: Generate basic queries programmatically
        return generate_fallback_queries(claim, topic)


def generate_fallback_queries(claim: str, topic: str) -> List[str]:
    """Fallback query generation using simple rules"""
    key_concepts = extract_key_concepts(claim)
    return [
        f'"{topic}" {key_concepts[0]} study',
        f'{topic} pilot program results',
        f'{topic} research evidence',
        f'"{topic}" {key_concepts[0]} data'
    ][:4]


def extract_key_concepts(text: str) -> List[str]:
    """Extract key concepts from claim text"""
    stop_words = {'the', 'a', 'an', 'is', 'are', 'was', 'were', 'will', 'would', 
                  'should', 'could', 'have', 'has', 'had', 'do', 'does', 'did',
                  'because', 'if', 'when', 'where', 'why', 'how', 'that', 'this'}
    
    words = re.findall(r'\b\w+\b', text.lower())
    key_words = [w for w in words if w not in stop_words and len(w) > 3]
    
    return key_words[:3]


# ============================================================================
# EVIDENCE PROCESSING WITH STRUCTURED OUTPUT
# ============================================================================

def categorize_evidence(
    search_results: List[Dict],
    user_claim: str,
    llm
) -> Dict[str, List[Dict]]:
    """Categorize search results using structured output"""
    
    # Create structured LLM
    structured_llm = llm.with_structured_output(CategorizedEvidence)
    
    # Format search results for prompt
    formatted_results = "\n\n".join([
        f"[{i+1}] {result.get('title', 'Untitled')}\n"
        f"URL: {result.get('url', 'N/A')}\n"
        f"Snippet: {result.get('snippet', 'No description')}\n"
        f"Credibility: {result.get('credibility', 0.5):.2f}"
        for i, result in enumerate(search_results[:10])
    ])
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You analyze evidence and determine its relation to claims."),
        ("human", EVIDENCE_CATEGORIZATION_PROMPT)
    ])
    
    try:
        result: CategorizedEvidence = (prompt | structured_llm).invoke({
            "user_claim": user_claim,
            "search_results": formatted_results
        })
        
        return {
            "supporting": result.supporting,
            "opposing": result.opposing,
            "neutral": result.neutral
        }
    except Exception as e:
        print(f"[Research] Categorization error: {e}")
        # Fallback to simple keyword matching
        return simple_categorize(search_results, user_claim)


def simple_categorize(results: List[Dict], claim: str) -> Dict[str, List[Dict]]:
    """Fallback categorization using keyword matching"""
    supporting = []
    opposing = []
    neutral = []
    
    negative_words = ['destroy', 'harm', 'bad', 'negative', 'reduce', 'decrease', 'worse']
    positive_words = ['benefit', 'help', 'good', 'positive', 'increase', 'improve', 'better']
    
    claim_negative = any(word in claim.lower() for word in negative_words)
    
    for result in results:
        text = (result.get('title', '') + ' ' + result.get('snippet', '')).lower()
        
        has_positive = any(word in text for word in positive_words)
        has_negative = any(word in text for word in negative_words)
        
        if claim_negative:
            if has_negative and not has_positive:
                supporting.append(result)
            elif has_positive and not has_negative:
                opposing.append(result)
            else:
                neutral.append(result)
        else:
            if has_positive and not has_negative:
                supporting.append(result)
            elif has_negative and not has_positive:
                opposing.append(result)
            else:
                neutral.append(result)
    
    return {"supporting": supporting, "opposing": opposing, "neutral": neutral}


def extract_detailed_evidence(
    sources: List[Dict],
    llm
) -> List[EvidenceItem]:
    """Extract detailed evidence using structured output"""
    
    if not sources:
        return []
    
    # Create structured LLM
    structured_llm = llm.with_structured_output(DetailedEvidence)
    
    formatted_sources = "\n\n".join([
        f"Source {i+1}:\n"
        f"Title: {s.get('title', 'N/A')}\n"
        f"URL: {s.get('url', 'N/A')}\n"
        f"Content: {s.get('snippet', 'N/A')}\n"
        f"Credibility: {s.get('credibility', 0.5):.2f}"
        for i, s in enumerate(sources[:5])
    ])
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You extract precise evidence from sources with full details."),
        ("human", EVIDENCE_EXTRACTION_PROMPT)
    ])
    
    try:
        result: DetailedEvidence = (prompt | structured_llm).invoke({
            "sources": formatted_sources
        })
        return result.evidence_items
    except Exception as e:
        print(f"[Research] Evidence extraction error: {e}")
        # Fallback: Convert sources to basic evidence items
        return [
            EvidenceItem(
                source_name=s.get('title', 'Unknown Source'),
                source_type='article',
                key_finding=s.get('snippet', 'No details available')[:200],
                url=s.get('url')
            )
            for s in sources[:3]
        ]


# ============================================================================
# MOCK WEB SEARCH (Replace with real implementation)
# ============================================================================

@tool
def web_search_tool(query: str) -> List[Dict]:
    """
    Search the web for information. Returns top results.
    
    NOTE: This is a mock implementation. In production, replace with:
    - LangChain's Tavily search tool
    - Google Custom Search API
    - Bing Search API
    - SerpAPI
    """
    
    # Mock results for demonstration
    return [
        {
            "title": f"Research Study on {query}",
            "url": f"https://example.edu/research/{query.replace(' ', '-')}",
            "snippet": f"Comprehensive study examining {query} with peer-reviewed methodology and significant findings across multiple demographics.",
            "date": "2024-01-15"
        },
        {
            "title": f"Government Report: {query}",
            "url": f"https://example.gov/reports/{query.replace(' ', '-')}",
            "snippet": f"Official government analysis of {query} including statistical data and policy recommendations.",
            "date": "2023-11-20"
        },
        {
            "title": f"News Analysis: {query}",
            "url": f"https://reuters.com/article/{query.replace(' ', '-')}",
            "snippet": f"Recent developments and expert opinions on {query} from leading researchers.",
            "date": "2024-12-01"
        }
    ]


# ============================================================================
# MAIN RESEARCH AGENT NODE
# ============================================================================

def research_agent_node(state: DebateState):
    """
    Main research node that finds and evaluates evidence
    
    Inputs from state:
    - user_input or user_claim: The claim to research
    - topic: Overall debate topic
    - search_focus (optional): Specific aspect to focus on
    
    Outputs to state:
    - research_output: Structured evidence with credibility ratings
    """
    
    # Initialize LLM
    model = init_chat_model("gemini-2.5-flash", model_provider="google_genai", temperature=0.7)
    
    # Extract research parameters (READ ONLY - don't modify state)
    claim = state.get('user_input') or state.get('user_claim', '')
    topic = state.get('topic', '')
    search_focus = state.get('search_focus', claim)
    
    print(f"[Research Agent] Researching: '{claim[:60]}...'")
    
    # Step 1: Generate search queries (with structured output)
    queries = generate_search_queries(claim, topic, model)
    print(f"[Research Agent] Generated {len(queries)} queries: {queries}")
    
    # Step 2: Execute searches
    all_results = []
    for query in queries:
        print(f"[Research Agent] Searching: {query}")
        results = web_search_tool(query)
        
        # Add credibility scores
        for result in results:
            # Extract year from date if available
            year = None
            if 'date' in result:
                try:
                    year = int(result['date'][:4])
                except:
                    pass
            
            # Calculate credibility
            result['credibility'] = SourceCredibility.calculate_credibility(
                url=result.get('url', ''),
                source_type=result.get('type', 'article'),
                publication_year=year
            )
        
        all_results.extend(results)
    
    # Step 3: Filter low-quality sources
    quality_threshold = 0.4
    filtered_results = [r for r in all_results if r.get('credibility', 0) >= quality_threshold]
    print(f"[Research Agent] Found {len(filtered_results)} quality sources")
    
    # Step 4: Categorize evidence (with structured output)
    categorized = categorize_evidence(filtered_results, claim, model)
    
    # Step 5: Extract detailed evidence (with structured output)
    supporting_detailed = extract_detailed_evidence(
        categorized['supporting'][:3], model
    ) if categorized['supporting'] else []
    
    opposing_detailed = extract_detailed_evidence(
        categorized['opposing'][:3], model
    ) if categorized['opposing'] else []
    
    neutral_detailed = extract_detailed_evidence(
        categorized['neutral'][:2], model
    ) if categorized['neutral'] else []
    
    # Step 6: Determine overall evidence strength
    num_supporting = len(categorized['supporting'])
    num_opposing = len(categorized['opposing'])
    
    if num_supporting > num_opposing * 2:
        overall_strength = "strong_support"
    elif num_opposing > num_supporting * 2:
        overall_strength = "strong_opposition"
    else:
        overall_strength = "mixed"
    
    # Find strongest source
    strongest_source = None
    if filtered_results:
        strongest_source = max(filtered_results, key=lambda x: x.get('credibility', 0))
    
    # Step 7: Create structured output using Pydantic model
    research_output = ResearchOutput(
        supporting_evidence=supporting_detailed,
        opposing_evidence=opposing_detailed,
        neutral_evidence=neutral_detailed,
        queries_used=queries,
        overall_evidence_strength=overall_strength,
        strongest_source=strongest_source,
        total_sources_found=len(filtered_results),
        credibility_summary={
            "high_credibility_count": len([r for r in filtered_results if r.get('credibility', 0) >= 0.8]),
            "medium_credibility_count": len([r for r in filtered_results if 0.5 <= r.get('credibility', 0) < 0.8]),
            "low_credibility_count": len([r for r in filtered_results if r.get('credibility', 0) < 0.5])
        }
    )
    
    # Format output for synthesis
    formatted_output = format_research_output(research_output)
    
    print(f"[Research Agent] Complete - {overall_strength} evidence")
    
    # Return ONLY updates (don't modify state directly)
    return {
        # Scalar updates - replace values
        "research_output": research_output,
        
        # Agent outputs
        "agent_outputs": {
            "researcher": formatted_output
        }
    }

def format_research_output(research: ResearchOutput) -> str:
    """Format research output into readable text for synthesis"""
    
    lines = []
    
    # Overall assessment
    lines.append(f"Evidence assessment: {research.overall_evidence_strength.replace('_', ' ').title()}")
    lines.append(f"Found {research.total_sources_found} relevant sources")
    
    # Supporting evidence
    if research.supporting_evidence:
        lines.append("\n**Supporting Evidence:**")
        for ev in research.supporting_evidence[:2]:
            lines.append(f"- {ev.source_name}: {ev.key_finding}")
            if ev.limitations:
                lines.append(f"  (Limitation: {ev.limitations})")
    
    # Opposing evidence
    if research.opposing_evidence:
        lines.append("\n**Opposing Evidence:**")
        for ev in research.opposing_evidence[:2]:
            lines.append(f"- {ev.source_name}: {ev.key_finding}")
            if ev.limitations:
                lines.append(f"  (Limitation: {ev.limitations})")
    
    # Strongest source
    if research.strongest_source:
        source = research.strongest_source
        lines.append(f"\n**Most Credible Source:** {source.get('title', 'N/A')} (credibility: {source.get('credibility', 0):.2f})")
    
    return "\n".join(lines)


# ============================================================================
# EXAMPLE USAGE
# ============================================================================

if __name__ == "__main__":
    # Example state
    test_state = {
        "topic": "Universal Basic Income and work ethic",
        "user_input": "I think UBI destroys work ethic because people won't work if they get free money",
        "user_claim": "UBI destroys work ethic",
        "agent_outputs": {}
    }
    
    # Run research agent
    result_state = research_agent_node(test_state)
    
    print("\n" + "="*60)
    print("RESEARCH AGENT OUTPUT")
    print("="*60)
    print(result_state['agent_outputs']['researcher'])