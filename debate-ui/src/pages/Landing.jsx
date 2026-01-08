import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { debateService } from '../services/debateService';
import { motion } from 'framer-motion';

function Landing() {
  const navigate = useNavigate();
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('standard');
  const [loading, setLoading] = useState(false);

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


  return (
    <div className="min-h-screen bg-white">
      <section className="max-w-7xl mx-auto px-6 py-24 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

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
            className="inline-block mb-4 px-3 py-1 text-sm font-medium 
                       bg-gray-100 text-gray-700 rounded-full"
          >
            AI-Powered Debate Training
          </motion.span>

          <motion.h1
            variants={container}
            initial="hidden"
            animate="visible"
            className="text-4xl lg:text-5xl leading-tight"
          >
            <span className="block">
              {headingWords.map((w, i) => (
                <motion.span
                  key={i}
                  variants={word}
                  className="inline-block mr-3 font-extrabold 
                   bg-linear-to-r from-gray-900 via-gray-700 to-gray-500
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
              className="block mt-2 font-medium text-gray-600"
            >
              against an intelligent AI
            </motion.span>
          </motion.h1>



          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-6 text-lg text-gray-500 max-w-xl"
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
            placeholder="Enter a debate topic"
            className="mt-8 w-full max-w-xl px-4 py-3 border border-gray-300 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-gray-900"
          />

          {/* DIFFICULTY */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-4 flex gap-3"
          >
            {['casual', 'standard', 'expert'].map((level) => (
              <motion.button
                key={level}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setDifficulty(level)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition
                  ${difficulty === level
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                  }`}
              >
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </motion.button>
            ))}
          </motion.div>

          {/* CTA */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleStartDebate}
            disabled={loading}
            className="mt-6 w-full max-w-xl py-3 rounded-lg bg-gray-600 text-white 
                       font-semibold hover:bg-gray-800 transition
                       disabled:opacity-50"
          >
            {loading ? 'Starting…' : 'Start Debate'}
          </motion.button>
        </motion.div>

        {/* RIGHT — MOCK UI */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="relative"
        >
          <div className="absolute -inset-4 bg-linear-to-tr 
                          from-gray-100 to-gray-200 rounded-2xl blur-2xl opacity-70" />

          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
            className="relative bg-white border border-gray-200 
                       rounded-2xl shadow-xl p-6"
          >
            <div className="text-sm text-gray-500 mb-3">
              Live Debate Session
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-900">AI Opponent</p>
                <p className="text-gray-600 text-sm mt-1">
                  Your claim assumes incentives are purely economic.
                  Can you support that?
                </p>
              </div>

              <div className="p-4 bg-gray-900 rounded-lg text-white ml-8">
                <p className="font-medium">You</p>
                <p className="text-sm mt-1">
                  Motivation also includes social recognition and autonomy.
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>

      </section>
    </div>
  );
}

export default Landing;