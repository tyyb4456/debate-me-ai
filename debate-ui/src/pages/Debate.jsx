// debate-ui/src/pages/Debate.jsx

import { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { debateService, DebateStream } from '../services/debateService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Search, BookOpen, HelpCircle, Flame, ChevronDown, TrendingUp, TrendingDown, Minus, History, Zap } from 'lucide-react';
import PreviousDebatesSidebar from '../components/PreviousDebatesSidebar';

const CYPRUS = '#004643';
const SAND = '#F0EDE5';

// ============================================================================
// MARKDOWN RENDERER
// ============================================================================
function MarkdownMessage({ content }) {
  if (!content) return null;
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
      p: ({ children }) => <p style={{ margin: '0 0 0.55em 0', fontSize: '0.875rem', lineHeight: '1.7', color: '#1a1a1a', fontFamily: "'DM Sans', sans-serif" }}>{children}</p>,
      strong: ({ children }) => <strong style={{ fontWeight: 700, color: '#004643' }}>{children}</strong>,
      em: ({ children }) => <em style={{ fontStyle: 'italic', color: '#333' }}>{children}</em>,
      ul: ({ children }) => <ul style={{ margin: '0.35em 0 0.55em 0', paddingLeft: '1.25em', listStyleType: 'disc' }}>{children}</ul>,
      ol: ({ children }) => <ol style={{ margin: '0.35em 0 0.55em 0', paddingLeft: '1.35em', listStyleType: 'decimal' }}>{children}</ol>,
      li: ({ children }) => <li style={{ fontSize: '0.875rem', lineHeight: '1.6', color: '#1a1a1a', fontFamily: "'DM Sans', sans-serif", marginBottom: '0.2em' }}>{children}</li>,
      blockquote: ({ children }) => <blockquote style={{ borderLeft: '3px solid rgba(0,70,67,0.35)', margin: '0.5em 0', paddingLeft: '0.9em', color: 'rgba(0,0,0,0.6)', fontStyle: 'italic' }}>{children}</blockquote>,
      code: ({ node, inline, children, ...props }) => inline
        ? <code style={{ backgroundColor: 'rgba(0,70,67,0.09)', color: CYPRUS, borderRadius: '4px', padding: '1px 5px', fontSize: '0.8rem', fontFamily: 'monospace' }} {...props}>{children}</code>
        : <pre style={{ backgroundColor: 'rgba(0,70,67,0.06)', borderRadius: '8px', padding: '10px 14px', overflowX: 'auto', margin: '0.5em 0' }}><code style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: CYPRUS }} {...props}>{children}</code></pre>,
      hr: () => <hr style={{ border: 'none', borderTop: '1px solid rgba(0,70,67,0.15)', margin: '0.8em 0' }} />,
    }}>{content}</ReactMarkdown>
  );
}

// ============================================================================
// AGENT INSIGHTS
// ============================================================================
const AGENT_CONFIG = {
  analyzer:            { label: 'Analyzer',        icon: Search,     color: '#004643', bg: 'rgba(0,70,67,0.06)',    border: 'rgba(0,70,67,0.2)' },
  researcher:          { label: 'Researcher',       icon: BookOpen,   color: '#0369a1', bg: 'rgba(3,105,161,0.06)',  border: 'rgba(3,105,161,0.2)' },
  socratic_questioner: { label: 'Socratic',         icon: HelpCircle, color: '#7c3aed', bg: 'rgba(124,58,237,0.06)',border: 'rgba(124,58,237,0.2)' },
  devils_advocate:     { label: "Devil's Advocate", icon: Flame,      color: '#c05c3a', bg: 'rgba(192,92,58,0.06)', border: 'rgba(192,92,58,0.2)' },
};

function MessageInsights({ insights }) {
  const [openAgent, setOpenAgent] = useState(null);
  const active = Object.entries(insights).filter(([, v]) => v !== null);
  if (active.length === 0) return null;
  return (
    <div className="mt-3 space-y-1.5">
      <div className="flex flex-wrap gap-1.5">
        {active.map(([agent]) => {
          const cfg = AGENT_CONFIG[agent]; if (!cfg) return null;
          const Icon = cfg.icon; const isOpen = openAgent === agent;
          return (
            <motion.button key={agent} onClick={() => setOpenAgent(isOpen ? null : agent)}
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all"
              style={{ backgroundColor: isOpen ? cfg.color : cfg.bg, borderColor: cfg.border, color: isOpen ? 'white' : cfg.color, fontFamily: "'DM Sans', sans-serif" }}>
              <Icon size={11} />{cfg.label}
              <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}><ChevronDown size={11} /></motion.div>
            </motion.button>
          );
        })}
      </div>
      <AnimatePresence>
        {openAgent && insights[openAgent] && (
          <motion.div key={openAgent} initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
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

function AnalyzerDetail({ output }) {
  let data; try { data = typeof output === 'string' ? JSON.parse(output) : output; } catch { return null; }
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
              className="h-full rounded-full" style={{ backgroundColor: data.argument_strength.overall_score >= 7 ? '#22c55e' : data.argument_strength.overall_score >= 5 ? '#f59e0b' : '#ef4444' }} />
          </div>
          {data.argument_strength.breakdown && <p className="text-xs mt-1.5" style={{ color: 'rgba(0,70,67,0.65)', fontFamily: "'DM Sans', sans-serif" }}>{data.argument_strength.breakdown}</p>}
        </div>
      )}
      {data.fallacies_detected?.length > 0 && (
        <div>
          <p className="text-xs font-semibold mb-1.5" style={{ color: CYPRUS, fontFamily: "'DM Sans', sans-serif" }}>Logical Issues</p>
          {data.fallacies_detected.map((f, i) => (
            <div key={i} className="p-2 rounded-xl mb-1.5 border" style={{ borderColor: f.severity === 'severe' ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)', backgroundColor: f.severity === 'severe' ? 'rgba(239,68,68,0.05)' : 'rgba(245,158,11,0.05)' }}>
              <p className="text-xs font-semibold capitalize" style={{ color: '#1a1a1a', fontFamily: "'DM Sans', sans-serif" }}>{f.type?.replace(/_/g, ' ')}</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(0,0,0,0.6)', fontFamily: "'DM Sans', sans-serif" }}>{f.explanation}</p>
            </div>
          ))}
        </div>
      )}
      {data.implicit_assumptions?.length > 0 && (
        <div>
          <p className="text-xs font-semibold mb-1" style={{ color: CYPRUS, fontFamily: "'DM Sans', sans-serif" }}>Assumptions</p>
          {data.implicit_assumptions.slice(0, 2).map((a, i) => <p key={i} className="text-xs mb-0.5" style={{ color: 'rgba(0,70,67,0.7)', fontFamily: "'DM Sans', sans-serif" }}>· {a.assumption || a}</p>)}
        </div>
      )}
    </div>
  );
}

function ResearcherDetail({ output }) {
  let data; try { data = typeof output === 'string' ? JSON.parse(output) : output; } catch { return null; }
  const supporting = data.supporting_evidence || [], opposing = data.opposing_evidence || [];
  const sc = data.overall_evidence_strength ? { strong_support: { label: 'Strong Support', color: '#16a34a', Icon: TrendingUp }, mixed: { label: 'Mixed Evidence', color: '#d97706', Icon: Minus }, strong_opposition: { label: 'Mostly Against', color: '#dc2626', Icon: TrendingDown } }[data.overall_evidence_strength] : null;
  return (
    <div className="space-y-3">
      {sc && <div className="flex items-center gap-2"><sc.Icon size={14} color={sc.color} /><p className="text-xs font-semibold" style={{ color: sc.color, fontFamily: "'DM Sans', sans-serif" }}>{sc.label} · {data.total_sources_found || 0} sources</p></div>}
      {data.strongest_source && <div><p className="text-xs font-semibold mb-1" style={{ color: '#0369a1', fontFamily: "'DM Sans', sans-serif" }}>Most Credible</p><p className="text-xs" style={{ color: '#1a1a1a', fontFamily: "'DM Sans', sans-serif" }}>{data.strongest_source.title || data.strongest_source.source_name}</p></div>}
      {supporting.length > 0 && <div><p className="text-xs font-semibold mb-1" style={{ color: '#16a34a', fontFamily: "'DM Sans', sans-serif" }}>Supporting ({supporting.length})</p>{supporting.slice(0, 2).map((ev, i) => <div key={i} className="p-2 rounded-xl mb-1 border" style={{ borderColor: 'rgba(22,163,74,0.2)', backgroundColor: 'rgba(22,163,74,0.04)' }}><p className="text-xs font-medium" style={{ color: '#1a1a1a', fontFamily: "'DM Sans', sans-serif" }}>{ev.source_name}</p>{ev.key_finding && <p className="text-xs mt-0.5" style={{ color: 'rgba(0,0,0,0.6)', fontFamily: "'DM Sans', sans-serif" }}>{ev.key_finding}</p>}</div>)}</div>}
      {opposing.length > 0 && <div><p className="text-xs font-semibold mb-1" style={{ color: '#dc2626', fontFamily: "'DM Sans', sans-serif" }}>Opposing ({opposing.length})</p>{opposing.slice(0, 2).map((ev, i) => <div key={i} className="p-2 rounded-xl mb-1 border" style={{ borderColor: 'rgba(220,38,38,0.2)', backgroundColor: 'rgba(220,38,38,0.04)' }}><p className="text-xs font-medium" style={{ color: '#1a1a1a', fontFamily: "'DM Sans', sans-serif" }}>{ev.source_name}</p>{ev.key_finding && <p className="text-xs mt-0.5" style={{ color: 'rgba(0,0,0,0.6)', fontFamily: "'DM Sans', sans-serif" }}>{ev.key_finding}</p>}</div>)}</div>}
    </div>
  );
}

function SocraticDetail({ output }) {
  let data; try { data = typeof output === 'string' ? JSON.parse(output) : output; } catch { return null; }
  return <div className="space-y-2">{data.questions?.map((q, i) => <div key={i} className="p-2 rounded-xl border" style={{ borderColor: 'rgba(124,58,237,0.15)', backgroundColor: 'rgba(124,58,237,0.03)' }}><p className="text-xs font-medium" style={{ color: '#1a1a1a', fontFamily: "'DM Sans', sans-serif" }}>{q.question_text || q}</p>{q.question_type && <p className="text-xs mt-0.5 capitalize" style={{ color: 'rgba(124,58,237,0.5)', fontFamily: "'DM Sans', sans-serif" }}>{q.question_type.replace(/_/g, ' ')}</p>}</div>)}</div>;
}

function AdvocateDetail({ output }) {
  let data; try { data = typeof output === 'string' ? JSON.parse(output) : output; } catch { return null; }
  return (
    <div className="space-y-2">
      {data.opposing_position && <div className="p-2 rounded-xl border" style={{ borderColor: 'rgba(192,92,58,0.2)', backgroundColor: 'rgba(192,92,58,0.04)' }}><p className="text-xs font-semibold mb-0.5" style={{ color: '#c05c3a', fontFamily: "'DM Sans', sans-serif" }}>Counter-Position</p><p className="text-xs" style={{ color: '#1a1a1a', fontFamily: "'DM Sans', sans-serif" }}>{data.opposing_position.statement || data.opposing_position}</p></div>}
      {data.counter_arguments?.slice(0, 2).map((arg, i) => <div key={i} className="p-2 rounded-xl border" style={{ borderColor: 'rgba(192,92,58,0.15)', backgroundColor: 'rgba(192,92,58,0.03)' }}><p className="text-xs font-semibold capitalize" style={{ color: '#c05c3a', fontFamily: "'DM Sans', sans-serif" }}>{arg.type?.replace(/_/g, ' ')}</p><p className="text-xs mt-0.5" style={{ color: 'rgba(0,0,0,0.65)', fontFamily: "'DM Sans', sans-serif" }}>{arg.argument}</p></div>)}
    </div>
  );
}

// ============================================================================
// MAIN PAGE
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
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const pendingInsightsRef = useRef({ analyzer: null, researcher: null, socratic_questioner: null, devils_advocate: null });
  const messagesEndRef = useRef(null);

  const topic = location.state?.topic || 'Debate Topic';
  const difficulty = location.state?.difficulty || 'standard';
  const turnCount = Math.floor(messages.length / 2);

  const difficultyColor = { casual: '#22c55e', standard: '#f59e0b', expert: '#ef4444' }[difficulty] || '#f59e0b';

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  // useEffect(() => { if (location.state?.isResume) loadPreviousMessages(); }, []);

  // useEffect(() => {
  //   if (location.state?.isResume) loadPreviousMessages();
  //   else if (!location.state?.isResume && sessionId) loadPreviousMessages(); // always load
  // }, []);

  useEffect(() => {
    loadPreviousMessages(); // always load — works for new, resume, and completed
  }, []);

  const loadPreviousMessages = async () => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/user/debate/${sessionId}/turns`);
      const data = await res.json();
      setMessages(data.turns.flatMap((t) => [
        { role: 'user', content: t.user_input },
        { role: 'assistant', content: t.ai_response, insights: { analyzer: t.analyzer_output || null, researcher: t.research_output || null, socratic_questioner: t.socratic_output || null, devils_advocate: t.advocate_output || null } },
      ]));
    } catch (e) { console.error(e); }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;
    setMessages((p) => [...p, { role: 'user', content: input }]);
    const userInput = input; setInput(''); setIsLoading(true);
    pendingInsightsRef.current = { analyzer: null, researcher: null, socratic_questioner: null, devils_advocate: null };
    const idx = messages.length + 1;
    setMessages((p) => [...p, { role: 'assistant', content: '', insights: null }]);
    try {
      const stream = new DebateStream(sessionId, userInput, {
        onToken: (token) => setMessages((p) => { const n = [...p]; if (n[idx]) n[idx] = { ...n[idx], content: n[idx].content + token }; return n; }),
        onAgentOutput: (agent, output) => {
          pendingInsightsRef.current = { ...pendingInsightsRef.current, [agent]: output };
          setCurrentAgent(agent); setStatusMessage(`${agent.replace(/_/g, ' ')} working…`);
          setTimeout(() => setCurrentAgent((c) => c === agent ? null : c), 500);
        },
        onComplete: (data) => {
          setIsLoading(false); setCurrentAgent(null); setStatusMessage('');
          const fi = { ...pendingInsightsRef.current };
          setMessages((p) => { const n = [...p]; if (n[idx]) n[idx] = { ...n[idx], insights: fi }; return n; });
          if (data.debate_ended && data.growth_feedback) setFeedback(data.growth_feedback);
        },
        onError: (err) => { console.error(err); setIsLoading(false); setCurrentAgent(null); setStatusMessage(''); handleFallback(userInput, idx); },
      });
      setCurrentStream(stream);
    } catch (e) { setIsLoading(false); }
  };

  const handleFallback = async (userInput, idx) => {
    try {
      const res = await debateService.sendMessage(sessionId, userInput);
      setMessages((p) => { const n = [...p]; n[idx] = { role: 'assistant', content: res.ai_response, insights: null }; return n; });
      if (res.debate_ended && res.growth_feedback) setFeedback(res.growth_feedback);
    } catch { alert('Failed to send message'); }
  };

  const handleEndDebate = async () => {
    if (!confirm('End this debate?')) return;
    try { await debateService.endDebate(sessionId); navigate('/'); } catch { alert('Failed to end debate'); }
  };

  const handleSelectDebate = (debate) => {
    navigate(`/debate/${debate.sessionId}`, { state: { topic: debate.topic, difficulty: debate.difficulty, isResume: true } });
  };

  const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } };
  useEffect(() => { return () => { if (currentStream) currentStream.close(); }; }, [currentStream]);

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: SAND, fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800;900&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />

      {/* ================================================================
          HEADER
      ================================================================ */}
      <div className="shrink-0 relative overflow-hidden" style={{ backgroundColor: CYPRUS }}>
        {/* Grain texture */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.07]"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`, backgroundSize: '150px' }} />
        {/* Top shimmer line */}
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(240,237,229,0.25) 30%, rgba(240,237,229,0.5) 50%, rgba(240,237,229,0.25) 70%, transparent)' }} />

        <div className="relative px-5 py-3.5 flex items-center justify-between gap-4">

          {/* LEFT */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Icon */}
            <div className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'rgba(240,237,229,0.1)', border: '1px solid rgba(240,237,229,0.15)' }}>
              <AnimatePresence mode="wait">
                {currentAgent
                  ? <motion.div key="a" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ duration: 0.15 }}><Zap size={14} color="#4ade80" fill="#4ade80" /></motion.div>
                  : <motion.div key="b" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}><Zap size={14} color="rgba(240,237,229,0.4)" /></motion.div>
                }
              </AnimatePresence>
            </div>

            {/* Topic + badges */}
            <div className="min-w-0">
              <h2 className="font-black uppercase leading-none truncate"
                style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 'clamp(1rem, 2.2vw, 1.5rem)', color: SAND, letterSpacing: '-0.01em', maxWidth: '50vw' }}>
                {topic}
              </h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {/* Difficulty */}
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                  style={{ backgroundColor: `${difficultyColor}20`, border: `1px solid ${difficultyColor}40`, color: difficultyColor, fontFamily: "'DM Sans', sans-serif" }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: difficultyColor }} />
                  {difficulty}
                </span>
                {/* Turn */}
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                  style={{ backgroundColor: 'rgba(240,237,229,0.09)', border: '1px solid rgba(240,237,229,0.14)', color: 'rgba(240,237,229,0.65)', fontFamily: "'DM Sans', sans-serif" }}>
                  Turn {turnCount}
                </span>
                {/* Live agent */}
                <AnimatePresence>
                  {currentAgent && (
                    <motion.span initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -6 }}
                      className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold"
                      style={{ backgroundColor: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.25)', color: '#4ade80', fontFamily: "'DM Sans', sans-serif" }}>
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                      {currentAgent.replace(/_/g, ' ')}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div className="flex items-center gap-2 shrink-0">
            {/* History */}
            <motion.button onClick={() => setIsHistoryOpen(true)}
              whileHover={{ scale: 1.05, backgroundColor: 'rgba(240,237,229,0.16)' }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all"
              style={{ backgroundColor: 'rgba(240,237,229,0.09)', border: '1px solid rgba(240,237,229,0.18)', color: 'rgba(240,237,229,0.75)', fontFamily: "'DM Sans', sans-serif" }}>
              <History size={14} />
              <span className="hidden sm:inline text-xs">History</span>
            </motion.button>

            <div className="w-px h-5" style={{ backgroundColor: 'rgba(240,237,229,0.12)' }} />

            {/* End Debate */}
            <motion.button onClick={handleEndDebate}
              whileHover={{ scale: 1.05, backgroundColor: 'rgba(239,68,68,0.18)', borderColor: 'rgba(239,68,68,0.4)', color: '#fca5a5' }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all"
              style={{ backgroundColor: 'rgba(240,237,229,0.09)', border: '1px solid rgba(240,237,229,0.18)', color: 'rgba(240,237,229,0.7)', fontFamily: "'DM Sans', sans-serif" }}>
              End Debate
            </motion.button>
          </div>
        </div>

        {/* Bottom border glow */}
        <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(240,237,229,0.08) 50%, transparent)' }} />
      </div>

      {/* ================================================================
          MESSAGES
      ================================================================ */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-3xl mx-auto">
          <AnimatePresence initial={false}>
            {messages.map((msg, index) => (
              <motion.div key={index} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }} className={`flex mb-6 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mr-3 mt-1"
                    style={{ backgroundColor: CYPRUS, color: SAND, fontFamily: "'Barlow Condensed', sans-serif" }}>AI</div>
                )}
                <div className={msg.role === 'user' ? 'max-w-[78%]' : 'flex-1 min-w-0'}>
                  <div className="rounded-2xl px-5 py-4 shadow-sm"
                    style={msg.role === 'user'
                      ? { backgroundColor: CYPRUS, color: SAND, borderBottomRightRadius: '4px', display: 'inline-block', maxWidth: '100%' }
                      : { backgroundColor: 'white', border: `1px solid rgba(0,70,67,0.1)`, borderBottomLeftRadius: '4px' }}>
                    {msg.role === 'assistant'
                      ? (msg.content ? <MarkdownMessage content={msg.content} /> : <span style={{ color: 'rgba(0,70,67,0.3)', fontSize: '0.875rem' }}>…</span>)
                      : <p className="whitespace-pre-wrap text-sm leading-relaxed" style={{ color: SAND, fontFamily: "'DM Sans', sans-serif" }}>{msg.content}</p>
                    }
                  </div>
                  {msg.role === 'assistant' && msg.insights && <MessageInsights insights={msg.insights} />}
                </div>
                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ml-3 mt-1"
                    style={{ backgroundColor: 'rgba(0,70,67,0.15)', color: CYPRUS, fontFamily: "'Barlow Condensed', sans-serif" }}>U</div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

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

      {/* ================================================================
          INPUT
      ================================================================ */}
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
            {isLoading ? <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> : 'Send →'}
          </motion.button>
        </div>
        <p className="mt-2 text-xs text-center" style={{ color: 'rgba(0,70,67,0.4)', fontFamily: "'DM Sans', sans-serif" }}>Enter to send · Shift + Enter for new line</p>
      </div>

      {/* ================================================================
          HISTORY SIDEBAR
      ================================================================ */}
      <PreviousDebatesSidebar
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onSelectDebate={handleSelectDebate}
      />

      {/* ================================================================
          FEEDBACK MODAL
      ================================================================ */}
      <AnimatePresence>
        {feedback && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            style={{ backgroundColor: 'rgba(0,70,67,0.5)', backdropFilter: 'blur(8px)' }} onClick={() => { setFeedback(null); navigate('/'); }}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="rounded-3xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-8" style={{ backgroundColor: SAND }}>
              <h2 className="font-black uppercase mb-6" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '2.5rem', color: CYPRUS, letterSpacing: '-0.02em' }}>Debate Complete</h2>
              <div className="space-y-6">
                {feedback.session_summary && <div><p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: 'rgba(0,70,67,0.5)', fontFamily: "'DM Sans', sans-serif" }}>Overall Performance</p><p className="text-2xl font-black capitalize" style={{ color: CYPRUS, fontFamily: "'Barlow Condensed', sans-serif" }}>{feedback.session_summary.overall_performance || 'Completed'}</p></div>}
                {feedback.what_went_well?.length > 0 && <div><p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: CYPRUS, fontFamily: "'DM Sans', sans-serif" }}>What Went Well</p><ul className="space-y-2">{feedback.what_went_well.map((s, i) => <li key={i} className="flex items-start gap-2 text-sm" style={{ color: '#1a1a1a', fontFamily: "'DM Sans', sans-serif" }}><span style={{ color: '#16a34a', flexShrink: 0 }}>✓</span>{s}</li>)}</ul></div>}
                {feedback.areas_for_improvement?.length > 0 && <div><p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: CYPRUS, fontFamily: "'DM Sans', sans-serif" }}>Areas to Improve</p><ul className="space-y-2">{feedback.areas_for_improvement.map((a, i) => <li key={i} className="flex items-start gap-2 text-sm" style={{ color: '#1a1a1a', fontFamily: "'DM Sans', sans-serif" }}><span style={{ color: '#c05c3a', flexShrink: 0 }}>→</span><span><strong>{a.area}: </strong>{a.suggestion || a.issue || a}</span></li>)}</ul></div>}
              </div>
              <motion.button onClick={() => { setFeedback(null); navigate('/'); }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
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