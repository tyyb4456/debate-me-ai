import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const CYPRUS = '#004643';
const SAND = '#F0EDE5';

const DUMMY_USER_ID = '8f3c2e7b-6b4a-4c9a-9e6f-2d5c1a8f7e42';

function PreviousDebatesSidebar({ isOpen, onClose, onSelectDebate }) {
  const [debates, setDebates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) fetchDebates();
  }, [isOpen]);

  const fetchDebates = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/user/${DUMMY_USER_ID}/history?limit=20`);
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setDebates(data.debates || []);
    } catch (err) {
      setError('Failed to load previous debates');
    } finally {
      setLoading(false);
    }
  };

  const handleResumeDebate = (debate) => {
    onSelectDebate({ sessionId: debate.session_id, topic: debate.topic, difficulty: debate.difficulty, isResume: true });
    onClose();
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getStatusDot = (ended_at, performance) => {
    if (!ended_at) return '#4ade80';
    if (performance === 'excellent') return '#60a5fa';
    if (performance === 'good') return '#a78bfa';
    if (performance === 'fair') return '#fbbf24';
    return 'rgba(240,237,229,0.3)';
  };

  const getStatusText = (ended_at, performance) => {
    if (!ended_at) return 'Active';
    return performance ? performance.charAt(0).toUpperCase() + performance.slice(1) : 'Completed';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40"
            style={{ backgroundColor: 'rgba(0,70,67,0.4)', backdropFilter: 'blur(4px)' }}
          />

          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            className="fixed right-0 top-0 h-full w-full max-w-md z-50 flex flex-col overflow-hidden"
            style={{ backgroundColor: SAND }}
          >
            {/* Header */}
            <div
              className="shrink-0 px-6 py-5 border-b flex items-center justify-between"
              style={{ borderColor: 'rgba(0,70,67,0.1)', backgroundColor: CYPRUS }}
            >
              <div>
                <h2
                  className="font-black uppercase"
                  style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.8rem', color: SAND, letterSpacing: '-0.01em' }}
                >
                  History
                </h2>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(240,237,229,0.5)', fontFamily: "'DM Sans', sans-serif" }}>
                  {debates.length} session{debates.length !== 1 ? 's' : ''}
                </p>
              </div>
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
                style={{ backgroundColor: 'rgba(240,237,229,0.1)', color: SAND }}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </motion.button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-full gap-4">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    className="w-10 h-10 rounded-full border-4"
                    style={{ borderColor: 'rgba(0,70,67,0.15)', borderTopColor: CYPRUS }}
                  />
                  <p className="text-sm" style={{ color: 'rgba(0,70,67,0.6)', fontFamily: "'DM Sans', sans-serif" }}>Loading debates…</p>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center h-full gap-4">
                  <p className="text-sm" style={{ color: '#c05c3a', fontFamily: "'DM Sans', sans-serif" }}>{error}</p>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={fetchDebates}
                    className="px-5 py-2.5 rounded-full text-sm font-semibold"
                    style={{ backgroundColor: CYPRUS, color: SAND, fontFamily: "'DM Sans', sans-serif" }}
                  >
                    Retry
                  </motion.button>
                </div>
              ) : debates.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center text-2xl"
                    style={{ backgroundColor: 'rgba(0,70,67,0.08)' }}
                  >
                    💬
                  </div>
                  <p className="text-sm font-medium" style={{ color: CYPRUS, fontFamily: "'DM Sans', sans-serif" }}>No debates yet</p>
                  <p className="text-xs text-center max-w-[200px]" style={{ color: 'rgba(0,70,67,0.5)', fontFamily: "'DM Sans', sans-serif" }}>
                    Start your first debate to see your history here
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {debates.map((debate, index) => (
                    <motion.div
                      key={debate.session_id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="rounded-2xl p-4 border cursor-pointer transition-all duration-200 group"
                      style={{ backgroundColor: 'white', borderColor: 'rgba(0,70,67,0.1)' }}
                      whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(0,70,67,0.12)' }}
                      onClick={() => handleResumeDebate(debate)}
                    >
                      {/* Status + Date */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: getStatusDot(debate.ended_at, debate.performance) }}
                          />
                          <span
                            className="text-xs font-semibold"
                            style={{ color: 'rgba(0,70,67,0.6)', fontFamily: "'DM Sans', sans-serif" }}
                          >
                            {getStatusText(debate.ended_at, debate.performance)}
                          </span>
                        </div>
                        <span className="text-xs" style={{ color: 'rgba(0,70,67,0.4)', fontFamily: "'DM Sans', sans-serif" }}>
                          {formatDate(debate.created_at)}
                        </span>
                      </div>

                      {/* Topic */}
                      <p
                        className="font-semibold text-sm mb-2 line-clamp-2"
                        style={{ color: '#1a1a1a', fontFamily: "'DM Sans', sans-serif" }}
                      >
                        {debate.topic}
                      </p>

                      {/* Meta */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className="px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize"
                            style={{ backgroundColor: 'rgba(0,70,67,0.08)', color: CYPRUS, fontFamily: "'DM Sans', sans-serif" }}
                          >
                            {debate.difficulty || 'standard'}
                          </span>
                          <span className="text-xs" style={{ color: 'rgba(0,70,67,0.5)', fontFamily: "'DM Sans', sans-serif" }}>
                            {debate.turn_count || 0} turns
                          </span>
                        </div>
                        <span
                          className="text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ color: CYPRUS, fontFamily: "'DM Sans', sans-serif" }}
                        >
                          Resume →
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default PreviousDebatesSidebar;