import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { debateService } from '../services/debateService';
import PreviousDebatesSidebar from '../components/PreviousDebatesSidebar';

function Landing() {
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('standard');
  const [loading, setLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const handleStartDebate = async () => {
    if (!topic.trim()) return alert('Please enter a topic');

    setLoading(true);
    try {
      const response = await debateService.startDebate(topic, difficulty);
      navigate(`/debate/${response.session_id}`, {
        state: { topic, difficulty },
      });
    } finally {
      setLoading(false);
    }
  };

  const container = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const word = {
    hidden: {
      opacity: 0,
      y: 20,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: 'easeOut',
      },
    },
  };

  const headingWords = ['Sharpen', 'your', 'arguments'];

  const handleSelectDebate = (debate) => {
    navigate(`/debate/${debate.sessionId}`, {
      state: { 
        topic: debate.topic, 
        difficulty: debate.difficulty,
        isResume: true 
      },
    });
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 via-white to-gray-100 relative overflow-hidden">

            <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsSidebarOpen(true)}
        className="fixed top-6 right-6 z-30 px-5 py-3 rounded-xl
                   backdrop-blur-xl bg-white/60 border border-white/80
                   text-gray-700 font-semibold shadow-lg
                   hover:shadow-xl transition-all duration-300"
      >
        <svg className="w-5 h-5 inline-block mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
        Previous Debates
      </motion.button>
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-gray-200/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-gray-300/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <section className="relative max-w-7xl mx-auto px-6 py-24 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        {/* LEFT */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        >
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-block mb-4 px-4 py-2 text-sm font-medium 
                       backdrop-blur-xl bg-white/40 text-gray-700 rounded-full
                       border border-white/60 shadow-lg"
          >
            AI-Powered Debate Training
          </motion.span>

          <motion.h1
            variants={container}
            initial="hidden"
            animate="visible"
            className="text-5xl lg:text-6xl leading-tight"
          >
            <span className="block">
              {headingWords.map((w, i) => (
                <motion.span
                  key={i}
                  variants={word}
                  className="inline-block mr-3 font-extrabold 
                   bg-linear-to-r from-gray-900 via-gray-700 to-gray-600
                   bg-clip-text text-transparent"
                >
                  {w}
                </motion.span>
              ))}
            </span>

            <motion.span
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="block mt-2 font-semibold text-gray-600"
            >
              against an intelligent AI
            </motion.span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-6 text-lg text-gray-600 max-w-xl leading-relaxed"
          >
            Train logical reasoning, identify fallacies, and improve debate
            performance through real-time AI feedback.
          </motion.p>

          {/* INPUT */}
          <motion.input
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Enter a debate topic..."
            className="mt-8 w-full max-w-xl px-5 py-4 
                       backdrop-blur-xl bg-white/60 border border-white/80
                       rounded-2xl shadow-xl
                       focus:outline-none focus:ring-2 focus:ring-gray-400/50
                       placeholder-gray-500 text-gray-900 font-medium
                       transition-all duration-300"
          />

          {/* DIFFICULTY */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-5 flex gap-3"
          >
            {['casual', 'standard', 'expert'].map((level) => (
              <motion.button
                key={level}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setDifficulty(level)}
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold 
                  backdrop-blur-xl border transition-all duration-300 shadow-lg
                  ${difficulty === level
                    ? 'bg-gray-900/90 text-white border-gray-800 shadow-2xl'
                    : 'bg-white/50 text-gray-700 border-white/70 hover:bg-white/70'
                  }`}
              >
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </motion.button>
            ))}
          </motion.div>

          {/* CTA */}
          <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleStartDebate}
            disabled={loading}
            className="mt-6 w-full max-w-xl py-4 rounded-2xl 
                       bg-linear-to-r from-gray-800 to-gray-900 text-white 
                       font-bold text-lg shadow-2xl
                       hover:shadow-gray-900/50 transition-all duration-300
                       disabled:opacity-50 disabled:cursor-not-allowed
                       backdrop-blur-xl border border-gray-700"
          >
            {loading ? 'Starting...' : 'Start Debate →'}
          </motion.button>
        </motion.div>

        {/* RIGHT — MOCK UI */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="relative"
        >
          <div className="absolute -inset-6 bg-linear-to-tr 
                          from-gray-200/50 to-gray-300/30 rounded-3xl blur-3xl" />

          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
            className="relative backdrop-blur-2xl bg-white/70 border border-white/80
                       rounded-3xl shadow-2xl p-8"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="text-sm font-semibold text-gray-600 
                            backdrop-blur-xl bg-gray-100/60 px-4 py-2 rounded-full">
                💬 Live Debate Session
              </div>
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                <div className="w-3 h-3 rounded-full bg-yellow-500 animate-pulse" style={{ animationDelay: '0.3s' }} />
                <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" style={{ animationDelay: '0.6s' }} />
              </div>
            </div>

            <div className="space-y-4">
              <motion.div 
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="p-5 backdrop-blur-xl bg-gray-100/70 rounded-2xl 
                          border border-gray-200/50 shadow-lg"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-linear-to-br from-gray-600 to-gray-800 
                                flex items-center justify-center text-white text-sm font-bold">
                    AI
                  </div>
                  <p className="font-bold text-gray-900">AI Opponent</p>
                </div>
                <p className="text-gray-700 text-sm leading-relaxed">
                  Your claim assumes incentives are purely economic.
                  Can you support that assumption?
                </p>
              </motion.div>

              <motion.div 
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 1 }}
                className="p-5 backdrop-blur-xl bg-linear-to-br from-gray-800 to-gray-900
                          rounded-2xl ml-8 shadow-2xl border border-gray-700"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-white/20 
                                flex items-center justify-center text-white text-sm font-bold">
                    U
                  </div>
                  <p className="font-bold text-white">You</p>
                </div>
                <p className="text-gray-200 text-sm leading-relaxed">
                  Motivation also includes social recognition and autonomy...
                </p>
              </motion.div>
            </div>

            {/* Typing indicator */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
              className="mt-4 flex items-center gap-2 text-gray-500 text-sm"
            >
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" />
                <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
              <span className="font-medium">AI is analyzing...</span>
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

            <PreviousDebatesSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onSelectDebate={handleSelectDebate}
      />
    </div>
  );
}

export default Landing;