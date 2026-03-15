import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, BookOpen, HelpCircle, Flame } from 'lucide-react';

const CYPRUS = '#004643';
const SAND = '#F0EDE5';

function AgentInsightsPanel({ analyzerOutput, researchOutput, socraticOutput, advocateOutput, currentAgent, isStreaming }) {
  const [expandedAgent, setExpandedAgent] = useState('analyzer');

  useEffect(() => { if (analyzerOutput) setExpandedAgent('analyzer'); }, [analyzerOutput]);
  useEffect(() => { if (researchOutput) setExpandedAgent('researcher'); }, [researchOutput]);
  useEffect(() => { if (socraticOutput) setExpandedAgent('socratic_questioner'); }, [socraticOutput]);
  useEffect(() => { if (advocateOutput) setExpandedAgent('devils_advocate'); }, [advocateOutput]);

  const toggleAgent = (agentName) => setExpandedAgent(expandedAgent === agentName ? null : agentName);

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

        {!analyzerOutput && !researchOutput && !socraticOutput && !advocateOutput && (
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
    ? 'white'
    : 'rgba(255,255,255,0.5)';

  return (
    <motion.div
      layout
      className="rounded-2xl overflow-hidden border transition-all duration-300"
      style={{ borderColor, backgroundColor: bgColor }}
    >
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between transition-colors"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: isActive || hasOutput ? 'rgba(0,70,67,0.1)' : 'rgba(0,70,67,0.05)', color: CYPRUS }}
          >
            {icon}
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-sm" style={{ color: '#1a1a1a' }}>{title}</p>
              {justCompleted && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="px-1.5 py-0.5 text-xs font-bold text-white rounded-full"
                  style={{ backgroundColor: '#22c55e', fontSize: '0.6rem' }}
                >
                  NEW
                </motion.span>
              )}
            </div>
            <p className="text-xs" style={{ color: isActive ? CYPRUS : hasOutput ? '#22c55e' : 'rgba(0,70,67,0.4)' }}>
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
        ) : (
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
        )}
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
  const data = typeof output === 'string' ? JSON.parse(output) : output;

  return (
    <div className="space-y-3">
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
                {fallacy.type.replace('_', ' ')}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(0,0,0,0.6)', fontFamily: "'DM Sans', sans-serif" }}>{fallacy.explanation}</p>
            </motion.div>
          ))}
        </div>
      )}

      {data.implicit_assumptions?.length > 0 && (
        <div>
          <p className="text-xs font-semibold mb-1.5" style={{ color: CYPRUS, fontFamily: "'DM Sans', sans-serif" }}>Assumptions</p>
          {data.implicit_assumptions.slice(0, 2).map((a, i) => (
            <div key={i} className="text-xs mb-1" style={{ color: 'rgba(0,70,67,0.7)', fontFamily: "'DM Sans', sans-serif" }}>
              · {a.assumption}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// RESEARCH INSIGHTS
// ============================================================================

function ResearchInsights({ output }) {
  const data = typeof output === 'string' ? JSON.parse(output) : output;

  return (
    <div className="space-y-3">
      {data.key_facts?.length > 0 && (
        <div>
          <p className="text-xs font-semibold mb-2" style={{ color: CYPRUS, fontFamily: "'DM Sans', sans-serif" }}>Key Facts</p>
          {data.key_facts.slice(0, 3).map((fact, i) => (
            <div key={i} className="p-2.5 rounded-xl mb-2 border" style={{ borderColor: 'rgba(0,70,67,0.15)', backgroundColor: 'rgba(0,70,67,0.03)' }}>
              <p className="text-xs" style={{ color: '#1a1a1a', fontFamily: "'DM Sans', sans-serif" }}>{fact.fact || fact}</p>
            </div>
          ))}
        </div>
      )}
      {data.evidence_summary && (
        <div>
          <p className="text-xs font-semibold mb-1.5" style={{ color: CYPRUS, fontFamily: "'DM Sans', sans-serif" }}>Evidence Summary</p>
          <p className="text-xs" style={{ color: 'rgba(0,70,67,0.7)', fontFamily: "'DM Sans', sans-serif" }}>{data.evidence_summary}</p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SOCRATIC INSIGHTS
// ============================================================================

function SocraticInsights({ output }) {
  const data = typeof output === 'string' ? JSON.parse(output) : output;

  return (
    <div className="space-y-2">
      {data.questions?.length > 0 && (
        <>
          <p className="text-xs font-semibold mb-2" style={{ color: CYPRUS, fontFamily: "'DM Sans', sans-serif" }}>Questions Being Asked</p>
          {data.questions.map((q, i) => (
            <div key={i} className="p-2.5 rounded-xl border" style={{ borderColor: 'rgba(0,70,67,0.15)', backgroundColor: 'rgba(0,70,67,0.03)' }}>
              <p className="text-xs font-medium" style={{ color: '#1a1a1a', fontFamily: "'DM Sans', sans-serif" }}>{q.question_text}</p>
              <p className="text-xs mt-0.5 capitalize" style={{ color: 'rgba(0,70,67,0.5)', fontFamily: "'DM Sans', sans-serif" }}>
                {q.question_type?.replace('_', ' ')}
              </p>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ============================================================================
// ADVOCATE INSIGHTS
// ============================================================================

function AdvocateInsights({ output }) {
  const data = typeof output === 'string' ? JSON.parse(output) : output;

  return (
    <div className="space-y-3">
      {data.opposing_position && (
        <div className="p-2.5 rounded-xl border" style={{ borderColor: 'rgba(0,70,67,0.2)', backgroundColor: 'rgba(0,70,67,0.04)' }}>
          <p className="text-xs font-semibold mb-1" style={{ color: CYPRUS, fontFamily: "'DM Sans', sans-serif" }}>Counter-Position</p>
          <p className="text-xs" style={{ color: '#1a1a1a', fontFamily: "'DM Sans', sans-serif" }}>{data.opposing_position.statement}</p>
        </div>
      )}

      {data.counter_arguments?.length > 0 && (
        <div>
          <p className="text-xs font-semibold mb-2" style={{ color: CYPRUS, fontFamily: "'DM Sans', sans-serif" }}>
            Counter-Arguments ({data.counter_arguments.length})
          </p>
          {data.counter_arguments.slice(0, 2).map((arg, i) => (
            <div key={i} className="p-2.5 rounded-xl mb-2 border" style={{ borderColor: 'rgba(192,92,58,0.2)', backgroundColor: 'rgba(192,92,58,0.04)' }}>
              <p className="text-xs font-semibold capitalize" style={{ color: '#1a1a1a', fontFamily: "'DM Sans', sans-serif" }}>
                {arg.type.replace('_', ' ')}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(0,0,0,0.6)', fontFamily: "'DM Sans', sans-serif" }}>{arg.argument}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AgentInsightsPanel;