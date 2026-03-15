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
      navigate(`/debate/${response.session_id}`, { state: { topic, difficulty } });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDebate = (debate) => {
    navigate(`/debate/${debate.sessionId}`, {
      state: { topic: debate.topic, difficulty: debate.difficulty, isResume: true },
    });
  };

  const container = { hidden: {}, visible: { transition: { staggerChildren: 0.1 } } };
  const letter = {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
  };
  const headingWords = ['Sharpen', 'Your', 'Arguments'];

  return (
    <div
      style={{ backgroundColor: '#F0EDE5', fontFamily: "'Barlow Condensed', sans-serif" }}
      className="min-h-screen relative overflow-hidden"
    >
      {/* Google Fonts */}
      <link
        href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800;900&family=DM+Sans:wght@400;500;600&display=swap"
        rel="stylesheet"
      />

      {/* Subtle grain overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.4'/%3E%3C/svg%3E")`,
          backgroundSize: '200px 200px',
        }}
      />

      {/* Decorative Cyprus blobs */}
      <div
        className="absolute top-0 right-0 w-125 h-125 rounded-full opacity-10 pointer-events-none"
        style={{ backgroundColor: '#004643', filter: 'blur(120px)', transform: 'translate(30%, -30%)' }}
      />
      <div
        className="absolute bottom-0 left-0 w-100 h-100px rounded-full opacity-10 pointer-events-none"
        style={{ backgroundColor: '#004643', filter: 'blur(100px)', transform: 'translate(-30%, 30%)' }}
      />

      {/* Nav */}
      <nav className="relative z-20 flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black"
            style={{ backgroundColor: '#004643' }}
          >
            D
          </div>
          <span style={{ color: '#004643', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '1.1rem', letterSpacing: '0.05em' }}>
            DEBATEAI
          </span>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setIsSidebarOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold border-2 transition-all duration-200"
          style={{
            borderColor: '#004643',
            color: '#004643',
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          History
        </motion.button>
      </nav>

      {/* Hero */}
      <section className="relative z-10 max-w-7xl mx-auto px-8 pt-12 pb-24 grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
        {/* LEFT */}
        <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}>
          {/* Tag */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 text-xs font-semibold tracking-widest uppercase border"
            style={{ borderColor: '#004643', color: '#004643', fontFamily: "'DM Sans', sans-serif" }}
          >
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: '#004643' }} />
            AI-Powered Debate Training
          </motion.div>

          {/* Giant heading */}
          <motion.div
            variants={container}
            initial="hidden"
            animate="visible"
            className="overflow-hidden"
          >
            {headingWords.map((word, i) => (
              <motion.div key={i} variants={letter} className="overflow-hidden block">
                <span
                  className="block leading-none"
                  style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontWeight: 900,
                    fontSize: 'clamp(4rem, 9vw, 7.5rem)',
                    color: i === 2 ? '#004643' : '#1a1a1a',
                    letterSpacing: '-0.02em',
                    textTransform: 'uppercase',
                  }}
                >
                  {word}
                </span>
              </motion.div>
            ))}
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="mt-6 text-lg max-w-md leading-relaxed"
            style={{ fontFamily: "'DM Sans', sans-serif", color: '#4a5568', fontWeight: 400 }}
          >
            Challenge your thinking. Face AI opponents that expose weak logic, cite evidence, and push you further.
          </motion.p>

          {/* Input */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mt-10"
          >
            <label className="block text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: '#004643', fontFamily: "'DM Sans', sans-serif" }}>
              Debate Topic
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleStartDebate()}
              placeholder="e.g. AI will replace most jobs by 2040"
              className="w-full max-w-xl px-5 py-4 rounded-2xl border-2 text-base transition-all duration-200 outline-none"
              style={{
                borderColor: '#004643',
                backgroundColor: 'transparent',
                color: '#1a1a1a',
                fontFamily: "'DM Sans', sans-serif",
              }}
              onFocus={(e) => (e.target.style.backgroundColor = 'rgba(0,70,67,0.04)')}
              onBlur={(e) => (e.target.style.backgroundColor = 'transparent')}
            />
          </motion.div>

          {/* Difficulty */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
            className="mt-5 flex gap-3"
          >
            {['casual', 'standard', 'expert'].map((level) => (
              <motion.button
                key={level}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => setDifficulty(level)}
                className="px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 border-2"
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  borderColor: '#004643',
                  backgroundColor: difficulty === level ? '#004643' : 'transparent',
                  color: difficulty === level ? '#F0EDE5' : '#004643',
                  textTransform: 'capitalize',
                }}
              >
                {level}
              </motion.button>
            ))}
          </motion.div>

          {/* CTA */}
          <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleStartDebate}
            disabled={loading}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="mt-6 w-full max-w-xl py-4 rounded-2xl font-bold text-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            style={{
              backgroundColor: '#004643',
              color: '#F0EDE5',
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700,
              fontSize: '1.2rem',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Starting…
              </>
            ) : (
              'Begin Debate →'
            )}
          </motion.button>
        </motion.div>

        {/* RIGHT — Mock UI */}
        <motion.div
          initial={{ opacity: 0, x: 60 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="relative hidden lg:block"
        >
          {/* Card glow */}
          <div
            className="absolute -inset-4 rounded-3xl opacity-20"
            style={{ backgroundColor: '#004643', filter: 'blur(40px)' }}
          />

          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
            className="relative rounded-3xl overflow-hidden shadow-2xl border"
            style={{ backgroundColor: '#004643', borderColor: 'rgba(240,237,229,0.15)' }}
          >
            {/* Card header */}
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'rgba(240,237,229,0.1)' }}>
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
                <div className="w-3 h-3 rounded-full bg-green-400/80" />
              </div>
              <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'rgba(240,237,229,0.5)', fontFamily: "'DM Sans', sans-serif" }}>
                Live Session
              </span>
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            </div>

            <div className="p-6 space-y-4">
              {/* AI message */}
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="flex gap-3"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{ backgroundColor: '#F0EDE5', color: '#004643' }}
                >
                  AI
                </div>
                <div
                  className="rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed"
                  style={{ backgroundColor: 'rgba(240,237,229,0.1)', color: '#F0EDE5', fontFamily: "'DM Sans', sans-serif" }}
                >
                  Your claim assumes incentives are purely economic. Can you support that assumption with evidence?
                </div>
              </motion.div>

              {/* User message */}
              <motion.div
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 1 }}
                className="flex gap-3 justify-end"
              >
                <div
                  className="rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-relaxed"
                  style={{ backgroundColor: 'rgba(240,237,229,0.2)', color: '#F0EDE5', fontFamily: "'DM Sans', sans-serif" }}
                >
                  Motivation also includes social recognition and autonomy…
                </div>
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{ backgroundColor: 'rgba(240,237,229,0.2)', color: '#F0EDE5' }}
                >
                  U
                </div>
              </motion.div>

              {/* Typing */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
                className="flex items-center gap-2 pl-11"
              >
                <div className="flex gap-1">
                  {[0, 0.15, 0.3].map((d, i) => (
                    <div key={i} className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: 'rgba(240,237,229,0.4)', animationDelay: `${d}s` }} />
                  ))}
                </div>
                <span className="text-xs" style={{ color: 'rgba(240,237,229,0.4)', fontFamily: "'DM Sans', sans-serif" }}>AI is analyzing…</span>
              </motion.div>

              {/* Agent badges */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.4 }}
                className="flex flex-wrap gap-2 pt-2 border-t"
                style={{ borderColor: 'rgba(240,237,229,0.1)' }}
              >
                {['Analyzer', 'Researcher', 'Devil\'s Advocate'].map((a) => (
                  <span
                    key={a}
                    className="px-3 py-1 rounded-full text-xs font-semibold"
                    style={{ backgroundColor: 'rgba(240,237,229,0.1)', color: 'rgba(240,237,229,0.7)', fontFamily: "'DM Sans', sans-serif" }}
                  >
                    {a}
                  </span>
                ))}
              </motion.div>
            </div>
          </motion.div>

          {/* Floating stat card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.5 }}
            animate2={{ y: [0, -5, 0] }}
            className="absolute -bottom-6 -left-8 rounded-2xl px-5 py-4 shadow-xl border"
            style={{
              backgroundColor: '#F0EDE5',
              borderColor: 'rgba(0,70,67,0.1)',
            }}
          >
            <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: '#004643', fontFamily: "'DM Sans', sans-serif" }}>Argument Score</p>
            <div className="flex items-center gap-3">
              <span className="text-3xl font-black" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#004643' }}>8.4</span>
              <div className="w-20 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(0,70,67,0.15)' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '84%' }}
                  transition={{ delay: 1.8, duration: 1, ease: 'easeOut' }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: '#004643' }}
                />
              </div>
            </div>
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