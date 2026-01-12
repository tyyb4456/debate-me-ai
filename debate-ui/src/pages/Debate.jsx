// debate-ui/src/pages/Debate.jsx - UPDATED VERSION

import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { debateService, DebateStream } from '../services/debateService';
import AgentInsightsPanel from '../components/AgentInsightsPanel';

function Debate() {
  const { sessionId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [currentStream, setCurrentStream] = useState(null);

  // ========================================================================
  // NEW: Agent Outputs State
  // ========================================================================
  const [agentOutputs, setAgentOutputs] = useState({
    analyzer: null,
    researcher: null,
    socratic_questioner: null,
    devils_advocate: null,
  });
  
  const [currentAgent, setCurrentAgent] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');

  const topic = location.state?.topic || 'Debate Topic';
  const difficulty = location.state?.difficulty || 'standard';

  // ========================================================================
  // Load Previous Messages on Resume
  // ========================================================================
  useEffect(() => {
    if (location.state?.isResume) {
      loadPreviousMessages();
    }
  }, []);

  const loadPreviousMessages = async () => {
    try {
      const response = await fetch(
        `http://127.0.0.1:8001/api/user/debate/${sessionId}/turns`
      );
      const data = await response.json();
      
      const loadedMessages = data.turns.flatMap(turn => [
        { role: 'user', content: turn.user_input },
        { role: 'assistant', content: turn.ai_response }
      ]);
      
      setMessages(loadedMessages);
    } catch (error) {
      console.error('Error loading previous messages:', error);
    }
  };

  // ========================================================================
  // Send Message with Enhanced Streaming
  // ========================================================================
  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    // Add user message
    const userMessage = {
      role: 'user',
      content: input,
    };
    setMessages((prev) => [...prev, userMessage]);
    const userInput = input;
    setInput('');
    setIsLoading(true);

    // Create AI message placeholder
    const aiMessageIndex = messages.length + 1;
    const aiMessage = {
      role: 'assistant',
      content: '',
    };
    setMessages((prev) => [...prev, aiMessage]);

    // Reset agent outputs for new turn
    setAgentOutputs({
      analyzer: null,
      researcher: null,
      socratic_questioner: null,
      devils_advocate: null,
    });

    try {
      // ====================================================================
      // ENHANCED: Use new streaming with all callbacks
      // ====================================================================
      const stream = new DebateStream(sessionId, userInput, {
        // Token callback (word-by-word AI response)
        onToken: (token) => {
          setMessages((prev) => {
            const newMessages = [...prev];
            newMessages[aiMessageIndex] = {
              ...newMessages[aiMessageIndex],
              content: newMessages[aiMessageIndex].content + token,
            };
            return newMessages;
          });
        },

        // Status callback (which agent is working)
        onStatus: (data) => {
          console.log('[Status]', data);
          setCurrentAgent(data.agent);
          setStatusMessage(data.message);
        },

        // Agent output callback ⭐ THIS IS THE KEY ONE!
        onAgentOutput: (agent, output) => {
          // FILTER: Ignore the __clear__ marker
          if (agent === '__clear__') {
            console.log('[Agent Output] Skipping __clear__ marker');
            return;
          }
          
          
          // PARSE: If output is a JSON string, parse it
          let parsedOutput = output;
          if (typeof output === 'string') {
            try {
              parsedOutput = JSON.parse(output);
              console.log('Parsed JSON string to object');
            } catch (e) {
              console.warn('Could not parse output as JSON:', e);
            }
          }
          
          
          setAgentOutputs((prev) => ({
            ...prev,
            [agent]: parsedOutput,
          }));
          
          // FIX: Clear "Working" status after output received
          setTimeout(() => {
            setCurrentAgent((current) => current === agent ? null : current);
          }, 500); // Small delay so user sees the transition
        },

        // Complete callback
        onComplete: (data) => {
          console.log('[Complete]', data);
          setIsLoading(false);
          setCurrentAgent(null);
          
          // Check if debate ended
          if (data.debate_ended && data.growth_feedback) {
            setFeedback(data.growth_feedback);
          }
        },

        // Error callback
        onError: (error) => {
          console.error('[Streaming error]', error);
          setIsLoading(false);
          setCurrentAgent(null);
          // Fallback to non-streaming
          handleSendMessageFallback(userInput, aiMessageIndex);
        },
      });
      
      setCurrentStream(stream);
    } catch (error) {
      console.error('Error:', error);
      setIsLoading(false);
    }
  };

  // Fallback if streaming fails
  const handleSendMessageFallback = async (userInput, messageIndex) => {
    try {
      const response = await debateService.sendMessage(sessionId, userInput);
      
      setMessages((prev) => {
        const newMessages = [...prev];
        newMessages[messageIndex] = {
          role: 'assistant',
          content: response.ai_response,
        };
        return newMessages;
      });

      if (response.debate_ended && response.growth_feedback) {
        setFeedback(response.growth_feedback);
      }
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

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      if (currentStream) {
        currentStream.close();
      }
    };
  }, [currentStream]);

  return (
    <div className="h-screen bg-linear-to-br from-gray-50 via-white to-gray-100 relative overflow-hidden flex flex-col">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gray-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gray-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
      </div>

      {/* Header */}
      <div className="relative z-10 backdrop-blur-2xl bg-white/40 border-b border-white/60 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{topic}</h2>
            <div className="flex items-center gap-4 mt-2 text-sm">
              <span className="px-3 py-1 rounded-full backdrop-blur-xl bg-white/60 border border-white/80 text-gray-700 font-medium">
                Difficulty: {difficulty}
              </span>
              <span className="px-3 py-1 rounded-full backdrop-blur-xl bg-white/60 border border-white/80 text-gray-700 font-medium">
                Turn: {Math.floor(messages.length / 2)}
              </span>
            </div>
          </div>
          
          <motion.button
            onClick={handleEndDebate}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-6 py-3 rounded-xl backdrop-blur-xl 
                       bg-orange-500/90 hover:bg-orange-600/90 
                       text-white font-semibold
                       border border-orange-400/50
                       shadow-lg hover:shadow-xl
                       transition-all duration-300"
          >
            End Debate
          </motion.button>
        </div>
      </div>

      {/* ====================================================================
          MAIN CONTENT: SPLIT VIEW (Messages + Insights Panel)
          ==================================================================== */}
      <div className="flex-1 flex overflow-hidden relative z-10">
        
        {/* LEFT: Messages Area (70%) */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto max-w-4xl w-full mx-auto px-6 py-6">
            <AnimatePresence initial={false}>
              {messages.map((msg, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} mb-5`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl p-5 shadow-xl border
                      ${msg.role === 'user'
                        ? 'backdrop-blur-2xl bg-gray-900/90 text-white border-gray-700/50 rounded-br-md'
                        : 'backdrop-blur-2xl bg-white/70 text-gray-900 border-white/80 rounded-bl-md'
                      }
                      hover:shadow-2xl transition-all duration-300`}
                  >
                    <p className={`whitespace-pre-wrap text-sm leading-relaxed ${msg.role === 'user' ? 'text-gray-100' : 'text-gray-800'}`}>
                      {msg.content}
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Loading indicator */}
            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-start mb-5"
              >
                <div className="backdrop-blur-2xl bg-white/70 border border-white/80 rounded-2xl rounded-bl-md p-5 shadow-xl">
                  <div className="flex items-center gap-3">
                    <span className="text-xl"></span>
                    <div className="flex gap-1.5">
                      <motion.div
                        animate={{ scale: [1, 1.3, 1] }}
                        transition={{ repeat: Infinity, duration: 0.8, delay: 0 }}
                        className="w-2.5 h-2.5 rounded-full bg-gray-400"
                      />
                      <motion.div
                        animate={{ scale: [1, 1.3, 1] }}
                        transition={{ repeat: Infinity, duration: 0.8, delay: 0.2 }}
                        className="w-2.5 h-2.5 rounded-full bg-gray-400"
                      />
                      <motion.div
                        animate={{ scale: [1, 1.3, 1] }}
                        transition={{ repeat: Infinity, duration: 0.8, delay: 0.4 }}
                        className="w-2.5 h-2.5 rounded-full bg-gray-400"
                      />
                    </div>
                    {statusMessage && (
                      <span className="text-sm text-gray-600">{statusMessage}</span>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Input Area */}
          <div className="backdrop-blur-2xl bg-white/40 border-t border-white/60 shadow-lg">
            <div className="max-w-4xl mx-auto px-6 py-5">
              <div className="flex items-end gap-4">
                <div className="flex-1 backdrop-blur-xl bg-white/50 border border-white/80 rounded-2xl shadow-lg overflow-hidden
                              focus-within:ring-2 focus-within:ring-gray-400/50 transition-all duration-300">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your response..."
                    disabled={isLoading}
                    rows={1}
                    className="w-full resize-none px-5 py-4 bg-transparent text-gray-900 placeholder-gray-500
                               focus:outline-none disabled:opacity-50"
                  />
                </div>

                <motion.button
                  onClick={handleSendMessage}
                  disabled={isLoading || !input.trim()}
                  whileHover={!isLoading && input.trim() ? { scale: 1.05, y: -2 } : {}}
                  whileTap={!isLoading && input.trim() ? { scale: 0.95 } : {}}
                  className="px-8 py-4 rounded-2xl font-semibold
                             backdrop-blur-xl bg-gray-900/90 text-white
                             border border-gray-700/50
                             shadow-lg hover:shadow-xl
                             transition-all duration-300
                             disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : (
                    'Send'
                  )}
                </motion.button>
              </div>

              <p className="mt-3 text-xs text-gray-500 text-center">
                Press <span className="font-semibold">Enter</span> to send · <span className="font-semibold">Shift + Enter</span> for new line
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT: Agent Insights Panel (30%) */}
        <div className="w-100 hidden lg:block">
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

      {/* Feedback Modal - Keep existing implementation */}
      {feedback && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          onClick={handleCloseFeedback}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-8"
          >
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Debate Feedback</h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Overall Performance</h3>
                <p className="text-gray-700 capitalize">{feedback.overall_performance || 'Good'}</p>
              </div>

              {feedback.strengths && feedback.strengths.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Strengths</h3>
                  <ul className="list-disc list-inside space-y-1">
                    {feedback.strengths.map((strength, idx) => (
                      <li key={idx} className="text-gray-700">{strength}</li>
                    ))}
                  </ul>
                </div>
              )}

              {feedback.areas_for_improvement && feedback.areas_for_improvement.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Areas for Improvement</h3>
                  <ul className="list-disc list-inside space-y-1">
                    {feedback.areas_for_improvement.map((area, idx) => (
                      <li key={idx} className="text-gray-700">{area.issue || area}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <motion.button
              onClick={handleCloseFeedback}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="mt-8 w-full py-4 rounded-2xl bg-gray-900 text-white font-semibold
                         shadow-lg hover:shadow-xl transition-all duration-300"
            >
              Close
            </motion.button>
          </motion.div>
        </motion.div>
      )}

      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(20px, -20px) scale(1.1); }
          50% { transform: translate(-20px, 20px) scale(0.9); }
          75% { transform: translate(20px, 20px) scale(1.05); }
        }
        .animate-blob {
          animation: blob 10s infinite ease-in-out;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
      `}</style>
    </div>
  );
}

export default Debate;