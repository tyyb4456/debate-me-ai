// debate-ui/src/pages/Debate.jsx

import { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { debateService, DebateStream } from '../services/debateService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Search, BookOpen, HelpCircle, Flame, ChevronDown, TrendingUp, TrendingDown, Minus } from 'lucide-react';

const CYPRUS = '#004643';
const SAND = '#F0EDE5';

// ============================================================================
// MARKDOWN RENDERER
// ============================================================================
function MarkdownMessage({ content }) {
  if (!content) return null;
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => (
          <p style={{ margin: '0 0 0.55em 0', fontSize: '0.875rem', lineHeight: '1.7', color: '#1a1a1a', fontFamily: "'DM Sans', sans-serif" }}>
            {children}
          </p>
        ),
        strong: ({ children }) => <strong style={{ fontWeight: 700, color: '#004643' }}>{children}</strong>,
        em: ({ children }) => <em style={{ fontStyle: 'italic', color: '#333' }}>{children}</em>,
        ul: ({ children }) => <ul style={{ margin: '0.35em 0 0.55em 0', paddingLeft: '1.25em', listStyleType: 'disc' }}>{children}</ul>,
        ol: ({ children }) => <ol style={{ margin: '0.35em 0 0.55em 0', paddingLeft: '1.35em', listStyleType: 'decimal' }}>{children}</ol>,
        li: ({ children }) => <li style={{ fontSize: '0.875rem', lineHeight: '1.6', color: '#1a1a1a', fontFamily: "'DM Sans', sans-serif", marginBottom: '0.2em' }}>{children}</li>,
        blockquote: ({ children }) => (
          <blockquote style={{ borderLeft: '3px solid rgba(0,70,67,0.35)', margin: '0.5em 0', paddingLeft: '0.9em', color: 'rgba(0,0,0,0.6)', fontStyle: 'italic' }}>
            {children}
          </blockquote>
        ),
        code: ({ node, inline, children, ...props }) =>
          inline ? (
            <code style={{ backgroundColor: 'rgba(0,70,67,0.09)', color: CYPRUS, borderRadius: '4px', padding: '1px 5px', fontSize: '0.8rem', fontFamily: 'monospace' }} {...props}>{children}</code>
          ) : (
            <pre style={{ backgroundColor: 'rgba(0,70,67,0.06)', borderRadius: '8px', padding: '10px 14px', overflowX: 'auto', margin: '0.5em 0' }}>
              <code style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: CYPRUS }} {...props}>{children}</code>
            </pre>
          ),
        hr: () => <hr style={{ border: 'none', borderTop: '1px solid rgba(0,70,67,0.15)', margin: '0.8em 0' }} />,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

// ============================================================================
// AGENT INSIGHTS BAR — rendered below each AI message
// ============================================================================

const AGENT_CONFIG = {
  analyzer:           { label: 'Analyzer',         icon: Search,       color: '#004643', bg: 'rgba(0,70,67,0.06)',     border: 'rgba(0,70,67,0.2)' },
  researcher:         { label: 'Researcher',        icon: BookOpen,     color: '#0369a1', bg: 'rgba(3,105,161,0.06)',   border: 'rgba(3,105,161,0.2)' },
  socratic_questioner:{ label: 'Socratic',          icon: HelpCircle,   color: '#7c3aed', bg: 'rgba(124,58,237,0.06)', border: 'rgba(124,58,237,0.2)' },
  devils_advocate:    { label: "Devil's Advocate",  icon: Flame,        color: '#c05c3a', bg: 'rgba(192,92,58,0.06)',  border: 'rgba(192,92,58,0.2)' },
};

function MessageInsights({ insights }) {
  const [openAgent, setOpenAgent] = useState(null);
  const activeAgents = Object.entries(insights).filter(([, v]) => v !== null);
  if (activeAgents.length === 0) return null;

  return (
    <div className="mt-3 space-y-1.5">
      {/* Pill row */}
      <div className="flex flex-wrap gap-1.5">
        {activeAgents.map(([agent]) => {
          const cfg = AGENT_CONFIG[agent];
          if (!cfg) return null;
          const Icon = cfg.icon;
          const isOpen = openAgent === agent;
          return (
            <motion.button
              key={agent}
              onClick={() => setOpenAgent(isOpen ? null : agent)}
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all"
              style={{
                backgroundColor: isOpen ? cfg.color : cfg.bg,
                borderColor: cfg.border,
                color: isOpen ? 'white' : cfg.color,
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              <Icon size={11} />
              {cfg.label}
              <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronDown size={11} />
              </motion.div>
            </motion.button>
          );
        })}
      </div>

      {/* Expanded detail */}
      <AnimatePresence>
        {openAgent && insights[openAgent] && (
          <motion.div
            key={openAgent}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="rounded-2xl p-4 border" style={{ backgroundColor: AGENT_CONFIG[openAgent]?.bg, borderColor: AGENT_CONFIG[openAgent]?.border }}>
              {openAgent === 'analyzer'            && <AnalyzerDetail    output={insights.analyzer} />}
              {openAgent === 'researcher'          && <ResearcherDetail  output={insights.researcher} />}
              {openAgent === 'socratic_questioner' && <SocraticDetail    output={insights.socratic_questioner} />}
              {openAgent === 'devils_advocate'     && <AdvocateDetail    output={insights.devils_advocate} />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Analyzer ─────────────────────────────────────────────────────────────────
function AnalyzerDetail({ output }) {
  let data;
  try { data = typeof output === 'string' ? JSON.parse(output) : output; } catch { return <p className="text-xs" style={{ color: 'rgba(0,70,67,0.5)' }}>Parse error.</p>; }
  return (
    <div className="space-y-3">
      {data.argument_strength && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold" style={{ color: CYPRUS, fontFamily: "'DM Sans', sans-serif" }}>Argument Quality</p>
            <span className="text-sm font-black" style={{ color: CYPRUS, fontFamily: "'Barlow Condensed', sans-serif" }}>{data.argument_strength.overall_score}/10</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(0,70,67,0.1)' }}>
            <motion.div initial={{ width: 0 }} animate={{ width: `${(data.argument_strength.overall_score / 10) * 100}%` }} transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full rounded-full"
              style={{ backgroundColor: data.argument_strength.overall_score >= 7 ? '#22c55e' : data.argument_strength.overall_score >= 5 ? '#f59e0b' : '#ef4444' }} />
          </div>
          {data.argument_strength.breakdown && <p className="text-xs mt-1.5" style={{ color: 'rgba(0,70,67,0.65)', fontFamily: "'DM Sans', sans-serif" }}>{data.argument_strength.breakdown}</p>}
        </div>
      )}
      {data.fallacies_detected?.length > 0 && (
        <div>
          <p className="text-xs font-semibold mb-1.5" style={{ color: CYPRUS, fontFamily: "'DM Sans', sans-serif" }}>Logical Issues</p>
          {data.fallacies_detected.map((f, i) => (
            <div key={i} className="p-2 rounded-xl mb-1.5 border"
              style={{ borderColor: f.severity === 'severe' ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)', backgroundColor: f.severity === 'severe' ? 'rgba(239,68,68,0.05)' : 'rgba(245,158,11,0.05)' }}>
              <p className="text-xs font-semibold capitalize" style={{ color: '#1a1a1a', fontFamily: "'DM Sans', sans-serif" }}>{f.type?.replace(/_/g, ' ')}</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(0,0,0,0.6)', fontFamily: "'DM Sans', sans-serif" }}>{f.explanation}</p>
            </div>
          ))}
        </div>
      )}
      {data.implicit_assumptions?.length > 0 && (
        <div>
          <p className="text-xs font-semibold mb-1" style={{ color: CYPRUS, fontFamily: "'DM Sans', sans-serif" }}>Assumptions</p>
          {data.implicit_assumptions.slice(0, 2).map((a, i) => (
            <p key={i} className="text-xs mb-0.5" style={{ color: 'rgba(0,70,67,0.7)', fontFamily: "'DM Sans', sans-serif" }}>· {a.assumption || a}</p>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Researcher ───────────────────────────────────────────────────────────────
function ResearcherDetail({ output }) {
  let data;
  try { data = typeof output === 'string' ? JSON.parse(output) : output; } catch { return <p className="text-xs" style={{ color: 'rgba(0,0,0,0.5)' }}>Parse error.</p>; }
  const supporting = data.supporting_evidence || [];
  const opposing   = data.opposing_evidence   || [];
  const strength   = data.overall_evidence_strength;
  const strongest  = data.strongest_source;
  const total      = data.total_sources_found || 0;
  const strengthCfg = {
    strong_support:    { label: 'Strong Support',  color: '#16a34a', Icon: TrendingUp },
    mixed:             { label: 'Mixed Evidence',  color: '#d97706', Icon: Minus },
    strong_opposition: { label: 'Mostly Against',  color: '#dc2626', Icon: TrendingDown },
  };
  const sc = strength ? strengthCfg[strength] : null;
  return (
    <div className="space-y-3">
      {sc && (
        <div className="flex items-center gap-2">
          <sc.Icon size={14} color={sc.color} />
          <p className="text-xs font-semibold" style={{ color: sc.color, fontFamily: "'DM Sans', sans-serif" }}>{sc.label} · {total} sources</p>
        </div>
      )}
      {strongest && (
        <div>
          <p className="text-xs font-semibold mb-1" style={{ color: '#0369a1', fontFamily: "'DM Sans', sans-serif" }}>Most Credible Source</p>
          <p className="text-xs font-medium" style={{ color: '#1a1a1a', fontFamily: "'DM Sans', sans-serif" }}>{strongest.title || strongest.source_name}</p>
          {strongest.url && <a href={strongest.url} target="_blank" rel="noopener noreferrer" className="text-xs block truncate" style={{ color: 'rgba(3,105,161,0.6)' }}>{strongest.url}</a>}
        </div>
      )}
      {supporting.length > 0 && (
        <div>
          <p className="text-xs font-semibold mb-1" style={{ color: '#16a34a', fontFamily: "'DM Sans', sans-serif" }}>Supporting ({supporting.length})</p>
          {supporting.slice(0, 2).map((ev, i) => (
            <div key={i} className="p-2 rounded-xl mb-1.5 border" style={{ borderColor: 'rgba(22,163,74,0.2)', backgroundColor: 'rgba(22,163,74,0.04)' }}>
              <p className="text-xs font-medium" style={{ color: '#1a1a1a', fontFamily: "'DM Sans', sans-serif" }}>{ev.source_name}</p>
              {ev.key_finding && <p className="text-xs mt-0.5" style={{ color: 'rgba(0,0,0,0.6)', fontFamily: "'DM Sans', sans-serif" }}>{ev.key_finding}</p>}
            </div>
          ))}
        </div>
      )}
      {opposing.length > 0 && (
        <div>
          <p className="text-xs font-semibold mb-1" style={{ color: '#dc2626', fontFamily: "'DM Sans', sans-serif" }}>Opposing ({opposing.length})</p>
          {opposing.slice(0, 2).map((ev, i) => (
            <div key={i} className="p-2 rounded-xl mb-1.5 border" style={{ borderColor: 'rgba(220,38,38,0.2)', backgroundColor: 'rgba(220,38,38,0.04)' }}>
              <p className="text-xs font-medium" style={{ color: '#1a1a1a', fontFamily: "'DM Sans', sans-serif" }}>{ev.source_name}</p>
              {ev.key_finding && <p className="text-xs mt-0.5" style={{ color: 'rgba(0,0,0,0.6)', fontFamily: "'DM Sans', sans-serif" }}>{ev.key_finding}</p>}
            </div>
          ))}
        </div>
      )}
      {supporting.length === 0 && opposing.length === 0 && (
        <p className="text-xs" style={{ color: 'rgba(0,0,0,0.4)', fontFamily: "'DM Sans', sans-serif" }}>Sources found but categorisation pending.</p>
      )}
    </div>
  );
}

// ── Socratic ─────────────────────────────────────────────────────────────────
function SocraticDetail({ output }) {
  let data;
  try { data = typeof output === 'string' ? JSON.parse(output) : output; } catch { return null; }
  return (
    <div className="space-y-2">
      {data.questions?.length > 0 && data.questions.map((q, i) => (
        <div key={i} className="p-2 rounded-xl border" style={{ borderColor: 'rgba(124,58,237,0.15)', backgroundColor: 'rgba(124,58,237,0.03)' }}>
          <p className="text-xs font-medium" style={{ color: '#1a1a1a', fontFamily: "'DM Sans', sans-serif" }}>{q.question_text || q}</p>
          {q.question_type && <p className="text-xs mt-0.5 capitalize" style={{ color: 'rgba(124,58,237,0.5)', fontFamily: "'DM Sans', sans-serif" }}>{q.question_type.replace(/_/g, ' ')}</p>}
        </div>
      ))}
    </div>
  );
}

// ── Devil's Advocate ─────────────────────────────────────────────────────────
function AdvocateDetail({ output }) {
  let data;
  try { data = typeof output === 'string' ? JSON.parse(output) : output; } catch { return null; }
  return (
    <div className="space-y-2">
      {data.opposing_position && (
        <div className="p-2 rounded-xl border" style={{ borderColor: 'rgba(192,92,58,0.2)', backgroundColor: 'rgba(192,92,58,0.04)' }}>
          <p className="text-xs font-semibold mb-0.5" style={{ color: '#c05c3a', fontFamily: "'DM Sans', sans-serif" }}>Counter-Position</p>
          <p className="text-xs" style={{ color: '#1a1a1a', fontFamily: "'DM Sans', sans-serif" }}>{data.opposing_position.statement || data.opposing_position}</p>
        </div>
      )}
      {data.counter_arguments?.slice(0, 2).map((arg, i) => (
        <div key={i} className="p-2 rounded-xl border" style={{ borderColor: 'rgba(192,92,58,0.15)', backgroundColor: 'rgba(192,92,58,0.03)' }}>
          <p className="text-xs font-semibold capitalize" style={{ color: '#c05c3a', fontFamily: "'DM Sans', sans-serif" }}>{arg.type?.replace(/_/g, ' ')}</p>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(0,0,0,0.65)', fontFamily: "'DM Sans', sans-serif" }}>{arg.argument}</p>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// MAIN DEBATE PAGE
// ============================================================================
function Debate() {
  const { sessionId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [currentStream, setCurrentStream] = useState(null);
  const [currentAgent, setCurrentAgent] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');

  // Collects agent outputs for the turn being streamed — attached to message on complete
  const pendingInsightsRef = useRef({ analyzer: null, researcher: null, socratic_questioner: null, devils_advocate: null });
  const messagesEndRef = useRef(null);

  const topic = location.state?.topic || 'Debate Topic';
  const difficulty = location.state?.difficulty || 'standard';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (location.state?.isResume) loadPreviousMessages();
  }, []);

  const loadPreviousMessages = async () => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/user/debate/${sessionId}/turns`);
      const data = await response.json();
      const loadedMessages = data.turns.flatMap((turn) => [
        { role: 'user', content: turn.user_input },
        {
          role: 'assistant',
          content: turn.ai_response,
          insights: {
            analyzer:            turn.analyzer_output  || null,
            researcher:          turn.research_output  || null,
            socratic_questioner: turn.socratic_output  || null,
            devils_advocate:     turn.advocate_output  || null,
          },
        },
      ]);
      setMessages(loadedMessages);
    } catch (error) {
      console.error('Error loading previous messages:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    setMessages((prev) => [...prev, { role: 'user', content: input }]);
    const userInput = input;
    setInput('');
    setIsLoading(true);

    // Reset pending insights
    pendingInsightsRef.current = { analyzer: null, researcher: null, socratic_questioner: null, devils_advocate: null };

    const aiMessageIndex = messages.length + 1;
    setMessages((prev) => [...prev, { role: 'assistant', content: '', insights: null }]);

    try {
      const stream = new DebateStream(sessionId, userInput, {
        onToken: (token) => {
          setMessages((prev) => {
            const next = [...prev];
            if (next[aiMessageIndex]) {
              next[aiMessageIndex] = { ...next[aiMessageIndex], content: next[aiMessageIndex].content + token };
            }
            return next;
          });
        },

        onAgentOutput: (agent, output) => {
          // Accumulate in ref — NOT in state yet
          pendingInsightsRef.current = { ...pendingInsightsRef.current, [agent]: output };
          setCurrentAgent(agent);
          setStatusMessage(`${agent.replace(/_/g, ' ')} working…`);
          setTimeout(() => setCurrentAgent((c) => (c === agent ? null : c)), 500);
        },

        onComplete: (data) => {
          setIsLoading(false);
          setCurrentAgent(null);
          setStatusMessage('');

          // Attach all collected insights to the AI message
          const finalInsights = { ...pendingInsightsRef.current };
          setMessages((prev) => {
            const next = [...prev];
            if (next[aiMessageIndex]) {
              next[aiMessageIndex] = { ...next[aiMessageIndex], insights: finalInsights };
            }
            return next;
          });

          if (data.debate_ended && data.growth_feedback) setFeedback(data.growth_feedback);
        },

        onError: (error) => {
          console.error('[Streaming error]', error);
          setIsLoading(false);
          setCurrentAgent(null);
          setStatusMessage('');
          handleSendMessageFallback(userInput, aiMessageIndex);
        },
      });
      setCurrentStream(stream);
    } catch (error) {
      console.error('Error:', error);
      setIsLoading(false);
    }
  };

  const handleSendMessageFallback = async (userInput, messageIndex) => {
    try {
      const response = await debateService.sendMessage(sessionId, userInput);
      setMessages((prev) => {
        const next = [...prev];
        next[messageIndex] = { role: 'assistant', content: response.ai_response, insights: null };
        return next;
      });
      if (response.debate_ended && response.growth_feedback) setFeedback(response.growth_feedback);
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    }
  };

  const handleEndDebate = async () => {
    if (!confirm('Are you sure you want to end this debate?')) return;
    try { await debateService.endDebate(sessionId); navigate('/'); }
    catch (error) { console.error('Error ending debate:', error); alert('Failed to end debate'); }
  };

  const handleCloseFeedback = () => { setFeedback(null); navigate('/'); };
  const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } };
  useEffect(() => { return () => { if (currentStream) currentStream.close(); }; }, [currentStream]);

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: SAND, fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800;900&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />

      {/* HEADER */}
      <div className="shrink-0 border-b px-6 py-4 flex items-center justify-between" style={{ backgroundColor: CYPRUS, borderColor: 'rgba(240,237,229,0.1)' }}>
        <div>
          <h2 className="font-black uppercase leading-none" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 'clamp(1.2rem, 3vw, 1.8rem)', color: SAND, letterSpacing: '-0.01em' }}>
            {topic}
          </h2>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="px-3 py-0.5 rounded-full text-xs font-semibold border" style={{ borderColor: 'rgba(240,237,229,0.3)', color: 'rgba(240,237,229,0.7)' }}>{difficulty}</span>
            <span className="px-3 py-0.5 rounded-full text-xs font-semibold border" style={{ borderColor: 'rgba(240,237,229,0.3)', color: 'rgba(240,237,229,0.7)' }}>Turn {Math.floor(messages.length / 2)}</span>
            <AnimatePresence>
              {currentAgent && (
                <motion.span initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                  className="px-3 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1.5"
                  style={{ backgroundColor: 'rgba(240,237,229,0.15)', color: SAND }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  {currentAgent.replace(/_/g, ' ')}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>
        <motion.button onClick={handleEndDebate} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          className="px-5 py-2.5 rounded-full text-sm font-semibold border-2"
          style={{ borderColor: 'rgba(240,237,229,0.4)', color: SAND, fontFamily: "'DM Sans', sans-serif" }}>
          End Debate
        </motion.button>
      </div>

      {/* MESSAGES */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-3xl mx-auto">
          <AnimatePresence initial={false}>
            {messages.map((msg, index) => (
              <motion.div key={index} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex mb-6 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>

                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mr-3 mt-1"
                    style={{ backgroundColor: CYPRUS, color: SAND, fontFamily: "'Barlow Condensed', sans-serif" }}>AI</div>
                )}

                {/* Column: bubble + insights */}
                <div className={msg.role === 'user' ? 'max-w-[78%]' : 'flex-1 min-w-0'}>
                  <div className="rounded-2xl px-5 py-4 shadow-sm"
                    style={msg.role === 'user'
                      ? { backgroundColor: CYPRUS, color: SAND, borderBottomRightRadius: '4px', display: 'inline-block', maxWidth: '100%' }
                      : { backgroundColor: 'white', border: `1px solid rgba(0,70,67,0.1)`, borderBottomLeftRadius: '4px' }
                    }>
                    {msg.role === 'assistant'
                      ? (msg.content ? <MarkdownMessage content={msg.content} /> : <span style={{ color: 'rgba(0,70,67,0.3)', fontSize: '0.875rem' }}>…</span>)
                      : <p className="whitespace-pre-wrap text-sm leading-relaxed" style={{ color: SAND, fontFamily: "'DM Sans', sans-serif" }}>{msg.content}</p>
                    }
                  </div>

                  {/* Agent insights pills — only on AI messages with insights */}
                  {msg.role === 'assistant' && msg.insights && (
                    <MessageInsights insights={msg.insights} />
                  )}
                </div>

                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ml-3 mt-1"
                    style={{ backgroundColor: 'rgba(0,70,67,0.15)', color: CYPRUS, fontFamily: "'Barlow Condensed', sans-serif" }}>U</div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Loading dots */}
          {isLoading && messages[messages.length - 1]?.content === '' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start mb-6">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mr-3 mt-1" style={{ backgroundColor: CYPRUS, color: SAND }}>AI</div>
              <div className="rounded-2xl px-5 py-4 shadow-sm flex items-center gap-2" style={{ backgroundColor: 'white', border: `1px solid rgba(0,70,67,0.1)` }}>
                {[0, 0.18, 0.36].map((d, i) => (
                  <motion.div key={i} animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 0.9, delay: d }}
                    className="w-2 h-2 rounded-full" style={{ backgroundColor: CYPRUS }} />
                ))}
                {statusMessage && <span className="text-xs ml-2" style={{ color: 'rgba(0,70,67,0.5)', fontFamily: "'DM Sans', sans-serif" }}>{statusMessage}</span>}
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* INPUT */}
      <div className="shrink-0 border-t px-6 py-4" style={{ backgroundColor: 'white', borderColor: 'rgba(0,70,67,0.1)' }}>
        <div className="max-w-3xl mx-auto flex items-end gap-3">
          <div className="flex-1 rounded-2xl overflow-hidden border-2 transition-all duration-200" style={{ borderColor: 'rgba(0,70,67,0.2)' }}
            onFocusCapture={(e) => (e.currentTarget.style.borderColor = CYPRUS)}
            onBlurCapture={(e) => (e.currentTarget.style.borderColor = 'rgba(0,70,67,0.2)')}>
            <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
              placeholder="Type your argument…" disabled={isLoading} rows={1}
              className="w-full resize-none px-5 py-4 bg-transparent text-sm focus:outline-none disabled:opacity-50"
              style={{ color: '#1a1a1a', fontFamily: "'DM Sans', sans-serif" }} />
          </div>
          <motion.button onClick={handleSendMessage} disabled={isLoading || !input.trim()}
            whileHover={!isLoading && input.trim() ? { scale: 1.04 } : {}}
            whileTap={!isLoading && input.trim() ? { scale: 0.96 } : {}}
            className="px-6 py-4 rounded-2xl font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            style={{ backgroundColor: CYPRUS, color: SAND, fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            {isLoading
              ? <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              : 'Send →'}
          </motion.button>
        </div>
        <p className="mt-2 text-xs text-center" style={{ color: 'rgba(0,70,67,0.4)', fontFamily: "'DM Sans', sans-serif" }}>Enter to send · Shift + Enter for new line</p>
      </div>

      {/* FEEDBACK MODAL */}
      <AnimatePresence>
        {feedback && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            style={{ backgroundColor: 'rgba(0,70,67,0.5)', backdropFilter: 'blur(8px)' }} onClick={handleCloseFeedback}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="rounded-3xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-8" style={{ backgroundColor: SAND }}>
              <h2 className="font-black uppercase mb-6" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '2.5rem', color: CYPRUS, letterSpacing: '-0.02em' }}>Debate Complete</h2>
              <div className="space-y-6">
                {feedback.session_summary && (
                  <div>
                    <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: 'rgba(0,70,67,0.5)', fontFamily: "'DM Sans', sans-serif" }}>Overall Performance</p>
                    <p className="text-2xl font-black capitalize" style={{ color: CYPRUS, fontFamily: "'Barlow Condensed', sans-serif" }}>{feedback.session_summary.overall_performance || 'Completed'}</p>
                  </div>
                )}
                {feedback.what_went_well?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: CYPRUS, fontFamily: "'DM Sans', sans-serif" }}>What Went Well</p>
                    <ul className="space-y-2">{feedback.what_went_well.map((s, i) => <li key={i} className="flex items-start gap-2 text-sm" style={{ color: '#1a1a1a', fontFamily: "'DM Sans', sans-serif" }}><span style={{ color: '#16a34a', flexShrink: 0 }}>✓</span>{s}</li>)}</ul>
                  </div>
                )}
                {feedback.areas_for_improvement?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: CYPRUS, fontFamily: "'DM Sans', sans-serif" }}>Areas to Improve</p>
                    <ul className="space-y-2">{feedback.areas_for_improvement.map((a, i) => <li key={i} className="flex items-start gap-2 text-sm" style={{ color: '#1a1a1a', fontFamily: "'DM Sans', sans-serif" }}><span style={{ color: '#c05c3a', flexShrink: 0 }}>→</span><span><strong>{a.area}: </strong>{a.suggestion || a.issue || a}</span></li>)}</ul>
                  </div>
                )}
              </div>
              <motion.button onClick={handleCloseFeedback} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="mt-8 w-full py-4 rounded-2xl font-bold"
                style={{ backgroundColor: CYPRUS, color: SAND, fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.1rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Return Home
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Debate;