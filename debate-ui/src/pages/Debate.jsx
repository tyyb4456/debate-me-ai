// debate-ui/src/pages/Debate.jsx

import { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { debateService, DebateStream } from '../services/debateService';
import AgentInsightsPanel from '../components/AgentInsightsPanel';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const CYPRUS = '#004643';
const SAND = '#F0EDE5';

// ============================================================================
// MARKDOWN RENDERER — styled to match the debate UI
// ============================================================================

function MarkdownMessage({ content }) {
  // Normalize single-asterisk italic (*word*) to proper markdown
  // and ensure the AI's inline emphasis renders correctly
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => (
          <p style={{
            margin: '0 0 0.55em 0',
            fontSize: '0.875rem',
            lineHeight: '1.7',
            color: '#1a1a1a',
            fontFamily: "'DM Sans', sans-serif",
          }}>
            {children}
          </p>
        ),
        strong: ({ children }) => (
          <strong style={{ fontWeight: 700, color: '#004643' }}>{children}</strong>
        ),
        em: ({ children }) => (
          <em style={{ fontStyle: 'italic', color: '#333' }}>{children}</em>
        ),
        h2: ({ children }) => (
          <h2 style={{
            fontSize: '0.9rem',
            fontWeight: 800,
            color: CYPRUS,
            margin: '0.9em 0 0.3em',
            fontFamily: "'Barlow Condensed', sans-serif",
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}>
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 style={{
            fontSize: '0.875rem',
            fontWeight: 700,
            color: CYPRUS,
            margin: '0.7em 0 0.25em',
            fontFamily: "'DM Sans', sans-serif",
          }}>
            {children}
          </h3>
        ),
        ul: ({ children }) => (
          <ul style={{
            margin: '0.35em 0 0.55em 0',
            paddingLeft: '1.25em',
            listStyleType: 'disc',
          }}>
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol style={{
            margin: '0.35em 0 0.55em 0',
            paddingLeft: '1.35em',
            listStyleType: 'decimal',
          }}>
            {children}
          </ol>
        ),
        li: ({ children }) => (
          <li style={{
            fontSize: '0.875rem',
            lineHeight: '1.6',
            color: '#1a1a1a',
            fontFamily: "'DM Sans', sans-serif",
            marginBottom: '0.2em',
          }}>
            {children}
          </li>
        ),
        code: ({ node, inline, children, ...props }) =>
          inline ? (
            <code style={{
              backgroundColor: 'rgba(0,70,67,0.09)',
              color: CYPRUS,
              borderRadius: '4px',
              padding: '1px 5px',
              fontSize: '0.8rem',
              fontFamily: 'monospace',
            }} {...props}>
              {children}
            </code>
          ) : (
            <pre style={{
              backgroundColor: 'rgba(0,70,67,0.06)',
              borderRadius: '8px',
              padding: '10px 14px',
              overflowX: 'auto',
              margin: '0.5em 0',
            }}>
              <code style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: CYPRUS }} {...props}>
                {children}
              </code>
            </pre>
          ),
        blockquote: ({ children }) => (
          <blockquote style={{
            borderLeft: '3px solid rgba(0,70,67,0.35)',
            margin: '0.5em 0',
            paddingLeft: '0.9em',
            color: 'rgba(0,0,0,0.6)',
            fontStyle: 'italic',
          }}>
            {children}
          </blockquote>
        ),
        hr: () => (
          <hr style={{
            border: 'none',
            borderTop: '1px solid rgba(0,70,67,0.15)',
            margin: '0.8em 0',
          }} />
        ),
      }}
    >
      {content}
    </ReactMarkdown>
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
  const [agentOutputs, setAgentOutputs] = useState({
    analyzer: null,
    researcher: null,
    socratic_questioner: null,
    devils_advocate: null,
  });
  const [currentAgent, setCurrentAgent] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');

  // Auto-scroll ref
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  const topic = location.state?.topic || 'Debate Topic';
  const difficulty = location.state?.difficulty || 'standard';

  // Scroll to bottom whenever messages change
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
        { role: 'assistant', content: turn.ai_response },
      ]);
      setMessages(loadedMessages);
    } catch (error) {
      console.error('Error loading previous messages:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    const userInput = input;
    setInput('');
    setIsLoading(true);

    // Reset agent outputs for new turn
    setAgentOutputs({ analyzer: null, researcher: null, socratic_questioner: null, devils_advocate: null });

    const aiMessageIndex = messages.length + 1;
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

    try {
      const stream = new DebateStream(sessionId, userInput, {
        onToken: (token) => {
          setMessages((prev) => {
            const newMessages = [...prev];
            if (newMessages[aiMessageIndex]) {
              newMessages[aiMessageIndex] = {
                ...newMessages[aiMessageIndex],
                content: newMessages[aiMessageIndex].content + token,
              };
            }
            return newMessages;
          });
        },
        onAgentOutput: (agent, output) => {
          setCurrentAgent(agent);
          setStatusMessage(`${agent.replace(/_/g, ' ')} working…`);
          setAgentOutputs((prev) => ({ ...prev, [agent]: output }));
          setTimeout(() => setCurrentAgent((current) => (current === agent ? null : current)), 500);
        },
        onComplete: (data) => {
          setIsLoading(false);
          setCurrentAgent(null);
          setStatusMessage('');
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
        const newMessages = [...prev];
        newMessages[messageIndex] = { role: 'assistant', content: response.ai_response };
        return newMessages;
      });
      if (response.debate_ended && response.growth_feedback) setFeedback(response.growth_feedback);
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    }
  };

  const handleEndDebate = async () => {
    if (!confirm('Are you sure you want to end this debate?')) return;
    try {
      await debateService.endDebate(sessionId);
      navigate('/');
    } catch (error) {
      console.error('Error ending debate:', error);
      alert('Failed to end debate');
    }
  };

  const handleCloseFeedback = () => {
    setFeedback(null);
    navigate('/');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  useEffect(() => {
    return () => { if (currentStream) currentStream.close(); };
  }, [currentStream]);

  return (
    <div
      className="h-screen flex flex-col overflow-hidden"
      style={{ backgroundColor: SAND, fontFamily: "'DM Sans', sans-serif" }}
    >
      <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800;900&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />

      {/* ================================================================
          HEADER
      ================================================================ */}
      <div
        className="shrink-0 border-b px-6 py-4 flex items-center justify-between"
        style={{ backgroundColor: CYPRUS, borderColor: 'rgba(240,237,229,0.1)' }}
      >
        <div>
          <h2
            className="font-black uppercase leading-none"
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 'clamp(1.2rem, 3vw, 1.8rem)',
              color: SAND,
              letterSpacing: '-0.01em',
            }}
          >
            {topic}
          </h2>
          <div className="flex items-center gap-3 mt-1.5">
            <span
              className="px-3 py-0.5 rounded-full text-xs font-semibold border"
              style={{ borderColor: 'rgba(240,237,229,0.3)', color: 'rgba(240,237,229,0.7)' }}
            >
              {difficulty}
            </span>
            <span
              className="px-3 py-0.5 rounded-full text-xs font-semibold border"
              style={{ borderColor: 'rgba(240,237,229,0.3)', color: 'rgba(240,237,229,0.7)' }}
            >
              Turn {Math.floor(messages.length / 2)}
            </span>
            <AnimatePresence>
              {currentAgent && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="px-3 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1.5"
                  style={{ backgroundColor: 'rgba(240,237,229,0.15)', color: SAND }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  {currentAgent.replace(/_/g, ' ')}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>

        <motion.button
          onClick={handleEndDebate}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="px-5 py-2.5 rounded-full text-sm font-semibold border-2 transition-all duration-200"
          style={{ borderColor: 'rgba(240,237,229,0.4)', color: SAND, fontFamily: "'DM Sans', sans-serif" }}
        >
          End Debate
        </motion.button>
      </div>

      {/* ================================================================
          MAIN CONTENT
      ================================================================ */}
      <div className="flex-1 flex overflow-hidden">

        {/* Messages Column */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto px-6 py-6"
          >
            <div className="max-w-3xl mx-auto">
              <AnimatePresence initial={false}>
                {messages.map((msg, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className={`flex mb-5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {/* AI Avatar */}
                    {msg.role === 'assistant' && (
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mr-3 mt-1"
                        style={{ backgroundColor: CYPRUS, color: SAND, fontFamily: "'Barlow Condensed', sans-serif" }}
                      >
                        AI
                      </div>
                    )}

                    {/* Bubble */}
                    <div
                      className="max-w-[78%] rounded-2xl px-5 py-4 shadow-sm"
                      style={
                        msg.role === 'user'
                          ? { backgroundColor: CYPRUS, color: SAND, borderBottomRightRadius: '4px' }
                          : { backgroundColor: 'white', border: `1px solid rgba(0,70,67,0.1)`, borderBottomLeftRadius: '4px' }
                      }
                    >
                      {msg.role === 'assistant' ? (
                        // ← MARKDOWN RENDERING for AI messages
                        msg.content
                          ? <MarkdownMessage content={msg.content} />
                          : <span style={{ color: 'rgba(0,70,67,0.3)', fontSize: '0.875rem' }}>…</span>
                      ) : (
                        // Plain text for user messages
                        <p
                          className="whitespace-pre-wrap text-sm leading-relaxed"
                          style={{ color: SAND, fontFamily: "'DM Sans', sans-serif" }}
                        >
                          {msg.content}
                        </p>
                      )}
                    </div>

                    {/* User Avatar */}
                    {msg.role === 'user' && (
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ml-3 mt-1"
                        style={{ backgroundColor: 'rgba(0,70,67,0.15)', color: CYPRUS, fontFamily: "'Barlow Condensed', sans-serif" }}
                      >
                        U
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Loading dots */}
              {isLoading && messages[messages.length - 1]?.content === '' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start mb-5"
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mr-3 mt-1"
                    style={{ backgroundColor: CYPRUS, color: SAND }}
                  >
                    AI
                  </div>
                  <div
                    className="rounded-2xl px-5 py-4 shadow-sm flex items-center gap-2"
                    style={{ backgroundColor: 'white', border: `1px solid rgba(0,70,67,0.1)` }}
                  >
                    {[0, 0.18, 0.36].map((d, i) => (
                      <motion.div
                        key={i}
                        animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }}
                        transition={{ repeat: Infinity, duration: 0.9, delay: d }}
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: CYPRUS }}
                      />
                    ))}
                    {statusMessage && (
                      <span className="text-xs ml-2" style={{ color: 'rgba(0,70,67,0.5)', fontFamily: "'DM Sans', sans-serif" }}>
                        {statusMessage}
                      </span>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Scroll anchor */}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* ================================================================
              INPUT AREA
          ================================================================ */}
          <div
            className="shrink-0 border-t px-6 py-4"
            style={{ backgroundColor: 'white', borderColor: 'rgba(0,70,67,0.1)' }}
          >
            <div className="max-w-3xl mx-auto flex items-end gap-3">
              <div
                className="flex-1 rounded-2xl overflow-hidden border-2 transition-all duration-200"
                style={{ borderColor: 'rgba(0,70,67,0.2)' }}
                onFocusCapture={(e) => (e.currentTarget.style.borderColor = CYPRUS)}
                onBlurCapture={(e) => (e.currentTarget.style.borderColor = 'rgba(0,70,67,0.2)')}
              >
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your argument…"
                  disabled={isLoading}
                  rows={1}
                  className="w-full resize-none px-5 py-4 bg-transparent text-sm focus:outline-none disabled:opacity-50"
                  style={{ color: '#1a1a1a', fontFamily: "'DM Sans', sans-serif" }}
                />
              </div>
              <motion.button
                onClick={handleSendMessage}
                disabled={isLoading || !input.trim()}
                whileHover={!isLoading && input.trim() ? { scale: 1.04 } : {}}
                whileTap={!isLoading && input.trim() ? { scale: 0.96 } : {}}
                className="px-6 py-4 rounded-2xl font-bold text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                style={{
                  backgroundColor: CYPRUS,
                  color: SAND,
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: '1rem',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                }}
              >
                {isLoading ? (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : 'Send →'}
              </motion.button>
            </div>
            <p className="mt-2 text-xs text-center" style={{ color: 'rgba(0,70,67,0.4)', fontFamily: "'DM Sans', sans-serif" }}>
              Enter to send · Shift + Enter for new line
            </p>
          </div>
        </div>

        {/* ================================================================
            RIGHT PANEL — Agent Insights
        ================================================================ */}
        <div
          className="w-96 hidden lg:flex flex-col border-l overflow-hidden"
          style={{ borderColor: 'rgba(0,70,67,0.1)', backgroundColor: 'rgba(0,70,67,0.02)' }}
        >
          <AgentInsightsPanel
            analyzerOutput={agentOutputs.analyzer}
            researchOutput={agentOutputs.researcher}
            socraticOutput={agentOutputs.socratic_questioner}
            advocateOutput={agentOutputs.devils_advocate}
            currentAgent={currentAgent}
            isStreaming={isLoading}
          />
        </div>
      </div>

      {/* ================================================================
          FEEDBACK MODAL
      ================================================================ */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            style={{ backgroundColor: 'rgba(0,70,67,0.5)', backdropFilter: 'blur(8px)' }}
            onClick={handleCloseFeedback}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="rounded-3xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-8"
              style={{ backgroundColor: SAND }}
            >
              <h2
                className="font-black uppercase mb-6"
                style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '2.5rem', color: CYPRUS, letterSpacing: '-0.02em' }}
              >
                Debate Complete
              </h2>

              <div className="space-y-6">
                {feedback.session_summary && (
                  <div>
                    <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: 'rgba(0,70,67,0.5)', fontFamily: "'DM Sans', sans-serif" }}>
                      Overall Performance
                    </p>
                    <p className="text-2xl font-black capitalize" style={{ color: CYPRUS, fontFamily: "'Barlow Condensed', sans-serif" }}>
                      {feedback.session_summary.overall_performance || 'Completed'}
                    </p>
                  </div>
                )}

                {feedback.what_went_well?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: CYPRUS, fontFamily: "'DM Sans', sans-serif" }}>
                      What Went Well
                    </p>
                    <ul className="space-y-2">
                      {feedback.what_went_well.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm" style={{ color: '#1a1a1a', fontFamily: "'DM Sans', sans-serif" }}>
                          <span style={{ color: '#16a34a', flexShrink: 0 }}>✓</span> {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {feedback.areas_for_improvement?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: CYPRUS, fontFamily: "'DM Sans', sans-serif" }}>
                      Areas to Improve
                    </p>
                    <ul className="space-y-2">
                      {feedback.areas_for_improvement.map((a, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm" style={{ color: '#1a1a1a', fontFamily: "'DM Sans', sans-serif" }}>
                          <span style={{ color: '#c05c3a', flexShrink: 0 }}>→</span>
                          <span><strong>{a.area}: </strong>{a.suggestion || a.issue || a}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {feedback.achievements?.filter(a => a.earned)?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: CYPRUS, fontFamily: "'DM Sans', sans-serif" }}>
                      Achievements
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {feedback.achievements.filter(a => a.earned).map((a, i) => (
                        <span
                          key={i}
                          className="px-3 py-1.5 rounded-full text-xs font-semibold"
                          style={{ backgroundColor: 'rgba(0,70,67,0.1)', color: CYPRUS, fontFamily: "'DM Sans', sans-serif" }}
                        >
                          {a.badge} {a.description}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <motion.button
                onClick={handleCloseFeedback}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="mt-8 w-full py-4 rounded-2xl font-bold transition-all duration-200"
                style={{
                  backgroundColor: CYPRUS,
                  color: SAND,
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: '1.1rem',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                }}
              >
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