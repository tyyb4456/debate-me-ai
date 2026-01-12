import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  BookOpen,
  HelpCircle,
  Flame,
  Frame
} from 'lucide-react';


// ============================================================================
// AGENT INSIGHTS PANEL - Shows real-time AI analysis
// ============================================================================

function AgentInsightsPanel({ 
  analyzerOutput, 
  researchOutput, 
  socraticOutput, 
  advocateOutput,
  currentAgent,
  isStreaming 
}) {
  const [expandedAgent, setExpandedAgent] = useState('analyzer');

  // AUTO-EXPAND: When new output arrives, expand that agent's card
  useEffect(() => {
    if (analyzerOutput && expandedAgent !== 'analyzer') {
      setExpandedAgent('analyzer');
    }
  }, [analyzerOutput]);

  useEffect(() => {
    if (researchOutput && expandedAgent !== 'researcher') {
      setExpandedAgent('researcher');
    }
  }, [researchOutput]);

  useEffect(() => {
    if (socraticOutput && expandedAgent !== 'socratic_questioner') {
      setExpandedAgent('socratic_questioner');
    }
  }, [socraticOutput]);

  useEffect(() => {
    if (advocateOutput && expandedAgent !== 'devils_advocate') {
      setExpandedAgent('devils_advocate');
    }
  }, [advocateOutput]);

  const toggleAgent = (agentName) => {
    setExpandedAgent(expandedAgent === agentName ? null : agentName);
  };

  return (
    <div className="h-full flex flex-col bg-white/40 backdrop-blur-xl border-l border-white/60 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/60">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900">AI Insights</h3>
            <p className="text-xs text-gray-600 mt-1">
              See how the AI analyzes your arguments
            </p>
          </div>
          <button
            onClick={() => setExpandedAgent(null)}
            className="text-xs text-gray-600 hover:text-gray-900 font-medium transition-colors"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Agent Cards - Enhanced Scrolling */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
        
        {/* ANALYZER */}
        <AgentCard
          name="analyzer"
          icon=<Search />
          title="Argument Analyzer"
          isActive={currentAgent === 'analyzer'}
          isExpanded={expandedAgent === 'analyzer'}
          onToggle={() => toggleAgent('analyzer')}
          hasOutput={!!analyzerOutput}
        >
          {analyzerOutput && (
            <AnalyzerInsights output={analyzerOutput} />
          )}
        </AgentCard>

        {/* RESEARCHER */}
        <AgentCard
          name="researcher"
          icon=<BookOpen/>
          title="Evidence Researcher"
          isActive={currentAgent === 'researcher'}
          isExpanded={expandedAgent === 'researcher'}
          onToggle={() => toggleAgent('researcher')}
          hasOutput={!!researchOutput}
        >
          {researchOutput && (
            <ResearchInsights output={researchOutput} />
          )}
        </AgentCard>

        {/* SOCRATIC QUESTIONER */}
        <AgentCard
          name="socratic_questioner"
          icon=<HelpCircle/>
          title="Socratic Questioner"
          isActive={currentAgent === 'socratic_questioner'}
          isExpanded={expandedAgent === 'socratic_questioner'}
          onToggle={() => toggleAgent('socratic_questioner')}
          hasOutput={!!socraticOutput}
        >
          {socraticOutput && (
            <SocraticInsights output={socraticOutput} />
          )}
        </AgentCard>

        {/* DEVIL'S ADVOCATE */}
        <AgentCard
          name="devils_advocate"
          icon=<Flame/>
          title="Devil's Advocate"
          isActive={currentAgent === 'devils_advocate'}
          isExpanded={expandedAgent === 'devils_advocate'}
          onToggle={() => toggleAgent('devils_advocate')}
          hasOutput={!!advocateOutput}
        >
          {advocateOutput && (
            <AdvocateInsights output={advocateOutput} />
          )}
        </AgentCard>
      </div>

      {/* Streaming Indicator */}
      {isStreaming && (
        <div className="p-3 border-t border-white/60 bg-gray-50/50">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <div className="flex gap-1">
              <motion.div
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ repeat: Infinity, duration: 0.8 }}
                className="w-2 h-2 rounded-full bg-gray-400"
              />
              <motion.div
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ repeat: Infinity, duration: 0.8, delay: 0.2 }}
                className="w-2 h-2 rounded-full bg-gray-400"
              />
              <motion.div
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ repeat: Infinity, duration: 0.8, delay: 0.4 }}
                className="w-2 h-2 rounded-full bg-gray-400"
              />
            </div>
            <span className="font-medium">AI analyzing...</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// AGENT CARD (Expandable Container)
// ============================================================================

function AgentCard({ name, icon, title, isActive, isExpanded, onToggle, hasOutput, children }) {
  const [justCompleted, setJustCompleted] = useState(false);

  //  Show "Just Completed" pulse animation
  useEffect(() => {
    if (!isActive && hasOutput) {
      setJustCompleted(true);
      const timer = setTimeout(() => setJustCompleted(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isActive, hasOutput]);

  const getStatusColor = () => {
    if (isActive) return 'border-blue-400 bg-blue-50/50';
    if (justCompleted) return 'border-green-400 bg-green-50/50 animate-pulse';
    if (hasOutput) return 'border-green-400 bg-white/60';
    return 'border-gray-200 bg-white/40';
  };

  return (
    <motion.div
      layout
      className={`rounded-xl border-2 ${getStatusColor()} backdrop-blur-sm transition-all duration-300 overflow-hidden`}
    >
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-gray-900 text-sm">{title}</p>
              {justCompleted && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="px-2 py-0.5 text-xs font-bold text-white bg-green-500 rounded-full"
                >
                  NEW
                </motion.span>
              )}
            </div>
            {isActive && (
              <p className="text-xs text-blue-600 font-medium">Working...</p>
            )}
            {!isActive && hasOutput && (
              <p className="text-xs text-green-600 font-medium">Complete</p>
            )}
          </div>
        </div>
        <motion.svg
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.3 }}
          className="w-5 h-5 text-gray-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </motion.svg>
      </button>

      {/* Content */}
      <AnimatePresence>
        {isExpanded && hasOutput && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="border-t border-gray-200"
          >
            <div className="p-4 bg-white/50">
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
  // Handle both parsed object and JSON string
  const data = typeof output === 'string' ? JSON.parse(output) : output;

  return (
    <div className="space-y-3">
      {/* Argument Strength */}
      {data.argument_strength && (
        <div>
          <p className="text-xs font-semibold text-gray-700 mb-2">Argument Quality</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(data.argument_strength.overall_score / 10) * 100}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className={`h-full ${
                  data.argument_strength.overall_score >= 7 ? 'bg-green-500' :
                  data.argument_strength.overall_score >= 5 ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}
              />
            </div>
            <span className="text-sm font-bold text-gray-900">
              {data.argument_strength.overall_score}/10
            </span>
          </div>
          <p className="text-xs text-gray-600 mt-1">{data.argument_strength.breakdown}</p>
        </div>
      )}

      {/* Fallacies */}
      {data.fallacies_detected && data.fallacies_detected.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-700 mb-2">Logical Issues</p>
          <div className="space-y-2">
            {data.fallacies_detected.map((fallacy, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className={`p-2 rounded-lg border ${
                  fallacy.severity === 'severe' ? 'bg-red-50 border-red-300' :
                  fallacy.severity === 'moderate' ? 'bg-yellow-50 border-yellow-300' :
                  'bg-gray-50 border-gray-300'
                }`}
              >
                <p className="text-xs font-semibold text-gray-900 capitalize">
                  {fallacy.type.replace('_', ' ')}
                </p>
                <p className="text-xs text-gray-600 mt-1">{fallacy.explanation}</p>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Implicit Assumptions */}
      {data.implicit_assumptions && data.implicit_assumptions.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-700 mb-2">Assumptions</p>
          {data.implicit_assumptions.slice(0, 2).map((assumption, idx) => (
            <div key={idx} className="text-xs text-gray-600 mb-1">
              • {assumption.assumption}
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
      {/* Evidence Strength */}
      {data.overall_evidence_strength && (
        <div className="p-2 rounded-lg bg-gray-50 border border-gray-200">
          <p className="text-xs font-semibold text-gray-900 capitalize">
            {data.overall_evidence_strength.replace('_', ' ')}
          </p>
        </div>
      )}

      {/* Opposing Evidence */}
      {data.opposing_evidence && data.opposing_evidence.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-700 mb-2">
            Contradicting Sources ({data.opposing_evidence.length})
          </p>
          {data.opposing_evidence.slice(0, 2).map((evidence, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="p-2 mb-2 rounded-lg bg-red-50 border border-red-200"
            >
              <p className="text-xs font-semibold text-gray-900">{evidence.source_name}</p>
              <p className="text-xs text-gray-600 mt-1">{evidence.key_finding}</p>
              {evidence.url && (
                <a
                  href={evidence.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                >
                  View source →
                </a>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Supporting Evidence */}
      {data.supporting_evidence && data.supporting_evidence.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-700 mb-2">
            Supporting Sources ({data.supporting_evidence.length})
          </p>
          {data.supporting_evidence.slice(0, 2).map((evidence, idx) => (
            <div key={idx} className="p-2 mb-2 rounded-lg bg-green-50 border border-green-200">
              <p className="text-xs font-semibold text-gray-900">{evidence.source_name}</p>
              <p className="text-xs text-gray-600 mt-1">{evidence.key_finding}</p>
            </div>
          ))}
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
    <div className="space-y-3">
      {data.questions && data.questions.length > 0 && (
        <>
          <p className="text-xs font-semibold text-gray-700">Questions Being Asked</p>
          {data.questions.map((q, idx) => (
            <div key={idx} className="p-2 rounded-lg bg-blue-50 border border-blue-200">
              <p className="text-xs text-gray-900">{q.question_text}</p>
              <p className="text-xs text-gray-500 mt-1 capitalize">
                Type: {q.question_type.replace('_', ' ')}
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
      {/* Opposing Position */}
      {data.opposing_position && (
        <div className="p-2 rounded-lg bg-purple-50 border border-purple-200">
          <p className="text-xs font-semibold text-gray-900 mb-1">Counter-Position</p>
          <p className="text-xs text-gray-700">{data.opposing_position.statement}</p>
        </div>
      )}

      {/* Counter Arguments */}
      {data.counter_arguments && data.counter_arguments.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-700 mb-2">
            Counter-Arguments ({data.counter_arguments.length})
          </p>
          {data.counter_arguments.slice(0, 2).map((arg, idx) => (
            <div key={idx} className="p-2 mb-2 rounded-lg bg-orange-50 border border-orange-200">
              <p className="text-xs font-semibold text-gray-900 capitalize">
                {arg.type.replace('_', ' ')}
              </p>
              <p className="text-xs text-gray-600 mt-1">{arg.argument}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AgentInsightsPanel;