import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, BookOpen, HelpCircle, Flame, TrendingUp, TrendingDown, Minus } from 'lucide-react';

const CYPRUS = '#004643';
const SAND = '#F0EDE5';

// ============================================================================
// MAIN PANEL
// ============================================================================

function AgentInsightsPanel({ analyzerOutput, researchOutput, socraticOutput, advocateOutput, currentAgent, isStreaming }) {
  // Track which agent was most recently completed — auto-expand that one
  const [expandedAgent, setExpandedAgent] = useState(null);
  const prevOutputs = useRef({ analyzerOutput: null, researchOutput: null, socraticOutput: null, advocateOutput: null });

  useEffect(() => {
    // Only auto-expand when NEW output arrives (not on re-renders)
    if (analyzerOutput && analyzerOutput !== prevOutputs.current.analyzerOutput) {
      setExpandedAgent('analyzer');
      prevOutputs.current.analyzerOutput = analyzerOutput;
    }
  }, [analyzerOutput]);

  useEffect(() => {
    if (researchOutput && researchOutput !== prevOutputs.current.researchOutput) {
      setExpandedAgent('researcher');
      prevOutputs.current.researchOutput = researchOutput;
    }
  }, [researchOutput]);

  useEffect(() => {
    if (socraticOutput && socraticOutput !== prevOutputs.current.socraticOutput) {
      setExpandedAgent('socratic_questioner');
      prevOutputs.current.socraticOutput = socraticOutput;
    }
  }, [socraticOutput]);

  useEffect(() => {
    if (advocateOutput && advocateOutput !== prevOutputs.current.advocateOutput) {
      setExpandedAgent('devils_advocate');
      prevOutputs.current.advocateOutput = advocateOutput;
    }
  }, [advocateOutput]);

  const toggleAgent = (agentName) => {
    setExpandedAgent(prev => prev === agentName ? null : agentName);
  };

  const hasAnyOutput = analyzerOutput || researchOutput || socraticOutput || advocateOutput;

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ backgroundColor: 'rgba(0,70,67,0.02)' }}>
      {/* Header */}
      <div className="shrink-0 px-5 py-4 border-b" style={{ borderColor: 'rgba(0,70,67,0.1)' }}>
        <div className="flex items-center justify-between">
          <div>
            <h3
              className="font-black uppercase"
              style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.2rem', color: CYPRUS, letterSpacing: '-0.01em' }}
            >
              AI Insights
            </h3>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(0,70,67,0.5)', fontFamily: "'DM Sans', sans-serif" }}>
              Live argument analysis
            </p>
          </div>
          {isStreaming && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
              style={{ backgroundColor: 'rgba(0,70,67,0.1)', color: CYPRUS, fontFamily: "'DM Sans', sans-serif" }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Working
            </motion.div>
          )}
        </div>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        <AgentCard
          name="analyzer"
          icon={<Search size={14} />}
          title="Argument Analyzer"
          isActive={currentAgent === 'analyzer'}
          isExpanded={expandedAgent === 'analyzer'}
          onToggle={() => toggleAgent('analyzer')}
          hasOutput={!!analyzerOutput}
        >
          {analyzerOutput && <AnalyzerInsights output={analyzerOutput} />}
        </AgentCard>

        <AgentCard
          name="researcher"
          icon={<BookOpen size={14} />}
          title="Researcher"
          isActive={currentAgent === 'researcher'}
          isExpanded={expandedAgent === 'researcher'}
          onToggle={() => toggleAgent('researcher')}
          hasOutput={!!researchOutput}
        >
          {researchOutput && <ResearchInsights output={researchOutput} />}
        </AgentCard>

        <AgentCard
          name="socratic_questioner"
          icon={<HelpCircle size={14} />}
          title="Socratic Questioner"
          isActive={currentAgent === 'socratic_questioner'}
          isExpanded={expandedAgent === 'socratic_questioner'}
          onToggle={() => toggleAgent('socratic_questioner')}
          hasOutput={!!socraticOutput}
        >
          {socraticOutput && <SocraticInsights output={socraticOutput} />}
        </AgentCard>

        <AgentCard
          name="devils_advocate"
          icon={<Flame size={14} />}
          title="Devil's Advocate"
          isActive={currentAgent === 'devils_advocate'}
          isExpanded={expandedAgent === 'devils_advocate'}
          onToggle={() => toggleAgent('devils_advocate')}
          hasOutput={!!advocateOutput}
        >
          {advocateOutput && <AdvocateInsights output={advocateOutput} />}
        </AgentCard>

        {!hasAnyOutput && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'rgba(0,70,67,0.08)' }}
            >
              <Search size={18} color={CYPRUS} />
            </div>
            <p className="text-xs text-center" style={{ color: 'rgba(0,70,67,0.5)', fontFamily: "'DM Sans', sans-serif" }}>
              Agent insights will appear here as you debate
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// AGENT CARD
// ============================================================================

function AgentCard({ name, icon, title, isActive, isExpanded, onToggle, hasOutput, children }) {
  const [justCompleted, setJustCompleted] = useState(false);

  useEffect(() => {
    if (!isActive && hasOutput) {
      setJustCompleted(true);
      const timer = setTimeout(() => setJustCompleted(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isActive, hasOutput]);

  const borderColor = isActive
    ? CYPRUS
    : justCompleted
    ? '#22c55e'
    : hasOutput
    ? 'rgba(0,70,67,0.3)'
    : 'rgba(0,70,67,0.1)';

  const bgColor = isActive
    ? 'rgba(0,70,67,0.06)'
    : hasOutput
    ? 'rgba(0,70,67,0.02)'
    : 'transparent';

  return (
    <motion.div
      layout
      className="rounded-2xl border overflow-hidden transition-colors duration-300"
      style={{ borderColor, backgroundColor: bgColor }}
    >
      <button
        onClick={onToggle}
        disabled={!hasOutput && !isActive}
        className="w-full flex items-center justify-between px-4 py-3"
        style={{ cursor: hasOutput ? 'pointer' : 'default' }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
            style={{
              backgroundColor: isActive ? CYPRUS : hasOutput ? 'rgba(0,70,67,0.1)' : 'rgba(0,70,67,0.05)',
              color: isActive ? SAND : CYPRUS,
              transition: 'all 0.3s'
            }}
          >
            {icon}
          </div>
          <div className="text-left">
            <p className="text-xs font-semibold" style={{ color: CYPRUS, fontFamily: "'DM Sans', sans-serif" }}>{title}</p>
            <p
              className="text-xs"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                color: isActive ? CYPRUS : justCompleted ? '#22c55e' : hasOutput ? 'rgba(0,70,67,0.4)' : 'rgba(0,70,67,0.4)'
              }}
            >
              {isActive ? 'Analyzing…' : hasOutput ? 'Complete' : 'Waiting'}
            </p>
          </div>
        </div>

        {isActive ? (
          <div className="flex gap-1">
            {[0, 0.15, 0.3].map((d, i) => (
              <div key={i} className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: CYPRUS, animationDelay: `${d}s` }} />
            ))}
          </div>
        ) : hasOutput ? (
          <motion.svg
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="w-4 h-4 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            style={{ color: 'rgba(0,70,67,0.4)' }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </motion.svg>
        ) : null}
      </button>

      <AnimatePresence>
        {isExpanded && hasOutput && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="border-t overflow-hidden"
            style={{ borderColor: 'rgba(0,70,67,0.1)' }}
          >
            <div className="p-4" style={{ backgroundColor: 'rgba(0,70,67,0.02)' }}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ============================================================================
// ANALYZER INSIGHTS
// ============================================================================

function AnalyzerInsights({ output }) {
  let data;
  try {
    data = typeof output === 'string' ? JSON.parse(output) : output;
  } catch {
    return <p className="text-xs" style={{ color: 'rgba(0,70,67,0.5)' }}>Unable to parse output.</p>;
  }

  return (
    <div className="space-y-3">
      {/* Argument Strength Score */}
      {data.argument_strength && (
        <div>
          <p className="text-xs font-semibold mb-2" style={{ color: CYPRUS, fontFamily: "'DM Sans', sans-serif" }}>Argument Quality</p>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(0,70,67,0.1)' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(data.argument_strength.overall_score / 10) * 100}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="h-full rounded-full"
                style={{
                  backgroundColor:
                    data.argument_strength.overall_score >= 7 ? '#22c55e' :
                    data.argument_strength.overall_score >= 5 ? '#f59e0b' : '#ef4444'
                }}
              />
            </div>
            <span className="text-sm font-black" style={{ color: CYPRUS, fontFamily: "'Barlow Condensed', sans-serif" }}>
              {data.argument_strength.overall_score}/10
            </span>
          </div>
          {data.argument_strength.breakdown && (
            <p className="text-xs mt-1.5" style={{ color: 'rgba(0,70,67,0.6)', fontFamily: "'DM Sans', sans-serif" }}>{data.argument_strength.breakdown}</p>
          )}
        </div>
      )}

      {/* Fallacies */}
      {data.fallacies_detected?.length > 0 && (
        <div>
          <p className="text-xs font-semibold mb-2" style={{ color: CYPRUS, fontFamily: "'DM Sans', sans-serif" }}>Logical Issues</p>
          {data.fallacies_detected.map((fallacy, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.08 }}
              className="p-2.5 rounded-xl mb-2 border"
              style={{
                borderColor: fallacy.severity === 'severe' ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)',
                backgroundColor: fallacy.severity === 'severe' ? 'rgba(239,68,68,0.05)' : 'rgba(245,158,11,0.05)'
              }}
            >
              <p className="text-xs font-semibold capitalize" style={{ color: '#1a1a1a', fontFamily: "'DM Sans', sans-serif" }}>
                {fallacy.type?.replace(/_/g, ' ')}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(0,0,0,0.6)', fontFamily: "'DM Sans', sans-serif" }}>{fallacy.explanation}</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Assumptions */}
      {data.implicit_assumptions?.length > 0 && (
        <div>
          <p className="text-xs font-semibold mb-1.5" style={{ color: CYPRUS, fontFamily: "'DM Sans', sans-serif" }}>Assumptions</p>
          {data.implicit_assumptions.slice(0, 2).map((a, i) => (
            <div key={i} className="text-xs mb-1" style={{ color: 'rgba(0,70,67,0.7)', fontFamily: "'DM Sans', sans-serif" }}>
              · {a.assumption || a}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// RESEARCH INSIGHTS  ← FIXED: now reads actual ResearchOutput fields
// ============================================================================

function ResearchInsights({ output }) {
  let data;
  try {
    data = typeof output === 'string' ? JSON.parse(output) : output;
  } catch {
    return <p className="text-xs" style={{ color: 'rgba(0,70,67,0.5)' }}>Unable to parse research output.</p>;
  }

  const supporting = data.supporting_evidence || [];
  const opposing = data.opposing_evidence || [];
  const neutral = data.neutral_evidence || [];
  const totalSources = data.total_sources_found || 0;
  const strength = data.overall_evidence_strength || null;
  const strongest = data.strongest_source || null;
  const credibility = data.credibility_summary || {};

  const strengthConfig = {
    strong_support: { label: 'Strong Support', color: '#16a34a', bg: 'rgba(22,163,74,0.08)', border: 'rgba(22,163,74,0.25)', Icon: TrendingUp },
    mixed: { label: 'Mixed Evidence', color: '#d97706', bg: 'rgba(217,119,6,0.08)', border: 'rgba(217,119,6,0.25)', Icon: Minus },
    strong_opposition: { label: 'Mostly Against', color: '#dc2626', bg: 'rgba(220,38,38,0.08)', border: 'rgba(220,38,38,0.25)', Icon: TrendingDown },
  };

  const sc = strength ? strengthConfig[strength] : null;

  const hasContent = supporting.length > 0 || opposing.length > 0 || neutral.length > 0 || strongest || totalSources > 0;

  return (
    <div className="space-y-3">
      {/* Evidence Strength Badge */}
      {sc && (
        <div className="flex items-center gap-2 p-2.5 rounded-xl border" style={{ borderColor: sc.border, backgroundColor: sc.bg }}>
          <sc.Icon size={14} color={sc.color} />
          <div>
            <p className="text-xs font-semibold" style={{ color: sc.color, fontFamily: "'DM Sans', sans-serif" }}>{sc.label}</p>
            <p className="text-xs" style={{ color: 'rgba(0,0,0,0.5)', fontFamily: "'DM Sans', sans-serif" }}>
              {totalSources} source{totalSources !== 1 ? 's' : ''} analyzed
              {credibility.high_credibility_count > 0 && ` · ${credibility.high_credibility_count} high credibility`}
            </p>
          </div>
        </div>
      )}

      {/* Strongest Source */}
      {strongest && (
        <div>
          <p className="text-xs font-semibold mb-1.5" style={{ color: CYPRUS, fontFamily: "'DM Sans', sans-serif" }}>
            Most Credible Source
          </p>
          <div className="p-2.5 rounded-xl border" style={{ borderColor: 'rgba(0,70,67,0.15)', backgroundColor: 'rgba(0,70,67,0.03)' }}>
            <p className="text-xs font-medium" style={{ color: '#1a1a1a', fontFamily: "'DM Sans', sans-serif" }}>
              {strongest.title || strongest.source_name || 'Source'}
            </p>
            {strongest.url && (
              <a
                href={strongest.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs mt-0.5 block truncate"
                style={{ color: 'rgba(0,70,67,0.5)', fontFamily: "'DM Sans', sans-serif" }}
              >
                {strongest.url}
              </a>
            )}
          </div>
        </div>
      )}

      {/* Supporting Evidence */}
      {supporting.length > 0 && (
        <div>
          <p className="text-xs font-semibold mb-1.5" style={{ color: '#16a34a', fontFamily: "'DM Sans', sans-serif" }}>
            Supporting ({supporting.length})
          </p>
          {supporting.slice(0, 2).map((ev, i) => (
            <EvidenceItem key={i} ev={ev} accentColor="rgba(22,163,74,0.2)" accentBg="rgba(22,163,74,0.04)" />
          ))}
        </div>
      )}

      {/* Opposing Evidence */}
      {opposing.length > 0 && (
        <div>
          <p className="text-xs font-semibold mb-1.5" style={{ color: '#dc2626', fontFamily: "'DM Sans', sans-serif" }}>
            Opposing ({opposing.length})
          </p>
          {opposing.slice(0, 2).map((ev, i) => (
            <EvidenceItem key={i} ev={ev} accentColor="rgba(220,38,38,0.2)" accentBg="rgba(220,38,38,0.04)" />
          ))}
        </div>
      )}

      {/* Neutral Evidence */}
      {neutral.length > 0 && (
        <div>
          <p className="text-xs font-semibold mb-1.5" style={{ color: 'rgba(0,70,67,0.6)', fontFamily: "'DM Sans', sans-serif" }}>
            Neutral ({neutral.length})
          </p>
          {neutral.slice(0, 1).map((ev, i) => (
            <EvidenceItem key={i} ev={ev} accentColor="rgba(0,70,67,0.15)" accentBg="rgba(0,70,67,0.03)" />
          ))}
        </div>
      )}

      {/* Fallback — research ran but categorisation returned nothing */}
      {!hasContent && (
        <p className="text-xs" style={{ color: 'rgba(0,70,67,0.5)', fontFamily: "'DM Sans', sans-serif" }}>
          Research completed but no categorised evidence found. The AI will still use these findings in its response.
        </p>
      )}
    </div>
  );
}

// Small reusable evidence card
function EvidenceItem({ ev, accentColor, accentBg }) {
  return (
    <div
      className="p-2.5 rounded-xl mb-2 border"
      style={{ borderColor: accentColor, backgroundColor: accentBg }}
    >
      <p className="text-xs font-medium" style={{ color: '#1a1a1a', fontFamily: "'DM Sans', sans-serif" }}>
        {ev.source_name || ev.title || 'Source'}
      </p>
      {ev.key_finding && (
        <p className="text-xs mt-0.5" style={{ color: 'rgba(0,0,0,0.6)', fontFamily: "'DM Sans', sans-serif" }}>
          {ev.key_finding}
        </p>
      )}
      {ev.publication_year && (
        <p className="text-xs mt-0.5" style={{ color: 'rgba(0,0,0,0.35)', fontFamily: "'DM Sans', sans-serif" }}>
          {ev.publication_year}
        </p>
      )}
    </div>
  );
}

// ============================================================================
// SOCRATIC INSIGHTS
// ============================================================================

function SocraticInsights({ output }) {
  let data;
  try {
    data = typeof output === 'string' ? JSON.parse(output) : output;
  } catch {
    return <p className="text-xs" style={{ color: 'rgba(0,70,67,0.5)' }}>Unable to parse output.</p>;
  }

  return (
    <div className="space-y-2">
      {data.questions?.length > 0 ? (
        <>
          <p className="text-xs font-semibold mb-2" style={{ color: CYPRUS, fontFamily: "'DM Sans', sans-serif" }}>
            Questions Being Asked
          </p>
          {data.questions.map((q, i) => (
            <div
              key={i}
              className="p-2.5 rounded-xl border"
              style={{ borderColor: 'rgba(0,70,67,0.15)', backgroundColor: 'rgba(0,70,67,0.03)' }}
            >
              <p className="text-xs font-medium" style={{ color: '#1a1a1a', fontFamily: "'DM Sans', sans-serif" }}>
                {q.question_text || q}
              </p>
              {q.question_type && (
                <p className="text-xs mt-0.5 capitalize" style={{ color: 'rgba(0,70,67,0.5)', fontFamily: "'DM Sans', sans-serif" }}>
                  {q.question_type.replace(/_/g, ' ')}
                </p>
              )}
            </div>
          ))}
        </>
      ) : (
        <p className="text-xs" style={{ color: 'rgba(0,70,67,0.5)', fontFamily: "'DM Sans', sans-serif" }}>
          Probing questions generated.
        </p>
      )}
    </div>
  );
}

// ============================================================================
// ADVOCATE INSIGHTS
// ============================================================================

function AdvocateInsights({ output }) {
  let data;
  try {
    data = typeof output === 'string' ? JSON.parse(output) : output;
  } catch {
    return <p className="text-xs" style={{ color: 'rgba(0,70,67,0.5)' }}>Unable to parse output.</p>;
  }

  return (
    <div className="space-y-3">
      {/* Counter-Position */}
      {data.opposing_position && (
        <div
          className="p-2.5 rounded-xl border"
          style={{ borderColor: 'rgba(0,70,67,0.2)', backgroundColor: 'rgba(0,70,67,0.04)' }}
        >
          <p className="text-xs font-semibold mb-1" style={{ color: CYPRUS, fontFamily: "'DM Sans', sans-serif" }}>
            Counter-Position
          </p>
          <p className="text-xs" style={{ color: '#1a1a1a', fontFamily: "'DM Sans', sans-serif" }}>
            {data.opposing_position.statement || data.opposing_position}
          </p>
        </div>
      )}

      {/* Counter-Arguments */}
      {data.counter_arguments?.length > 0 && (
        <div>
          <p className="text-xs font-semibold mb-2" style={{ color: CYPRUS, fontFamily: "'DM Sans', sans-serif" }}>
            Counter-Arguments ({data.counter_arguments.length})
          </p>
          {data.counter_arguments.slice(0, 2).map((arg, i) => (
            <div
              key={i}
              className="p-2.5 rounded-xl mb-2 border"
              style={{ borderColor: 'rgba(192,92,58,0.2)', backgroundColor: 'rgba(192,92,58,0.04)' }}
            >
              <p className="text-xs font-semibold capitalize" style={{ color: '#1a1a1a', fontFamily: "'DM Sans', sans-serif" }}>
                {arg.type?.replace(/_/g, ' ') || 'Counter'}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(0,0,0,0.6)', fontFamily: "'DM Sans', sans-serif" }}>
                {arg.argument}
              </p>
              {arg.strength && (
                <p className="text-xs mt-0.5 capitalize" style={{ color: 'rgba(192,92,58,0.7)', fontFamily: "'DM Sans', sans-serif" }}>
                  {arg.strength} argument
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Concessions */}
      {data.concessions?.length > 0 && (
        <div>
          <p className="text-xs font-semibold mb-1.5" style={{ color: CYPRUS, fontFamily: "'DM Sans', sans-serif" }}>
            Conceded Points
          </p>
          {data.concessions.slice(0, 1).map((c, i) => (
            <div key={i} className="text-xs" style={{ color: 'rgba(0,70,67,0.7)', fontFamily: "'DM Sans', sans-serif" }}>
              · {c.point || c}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AgentInsightsPanel;