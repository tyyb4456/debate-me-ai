import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const DUMMY_USER_ID = '8f3c2e7b-6b4a-4c9a-9e6f-2d5c1a8f7e42';

function PreviousDebatesSidebar({ isOpen, onClose, onSelectDebate }) {
  const [debates, setDebates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchDebates();
    }
  }, [isOpen]);

  const fetchDebates = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `http://127.0.0.1:8001/api/user/${DUMMY_USER_ID}/history?limit=20`
      );
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setDebates(data.debates || []);
    } catch (err) {
      console.error('Error fetching debates:', err);
      setError('Failed to load previous debates');
    } finally {
      setLoading(false);
    }
  };

  const handleResumeDebate = (debate) => {
    onSelectDebate({
      sessionId: debate.session_id,
      topic: debate.topic,
      difficulty: debate.difficulty,
      isResume: true
    });
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

  const getStatusColor = (ended_at, performance) => {
    if (!ended_at) return 'bg-green-500';
    if (performance === 'excellent') return 'bg-blue-500';
    if (performance === 'good') return 'bg-purple-500';
    if (performance === 'fair') return 'bg-yellow-500';
    return 'bg-gray-500';
  };

  const getStatusText = (ended_at, performance) => {
    if (!ended_at) return 'Active';
    return performance ? performance.charAt(0).toUpperCase() + performance.slice(1) : 'Completed';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
          />

          {/* Sidebar */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-200 bg-linear-to-r from-gray-50 to-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Previous Debates</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {debates.length} {debates.length === 1 ? 'session' : 'sessions'}
                  </p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 
                           flex items-center justify-center transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </motion.button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    className="w-12 h-12 border-4 border-gray-200 border-t-gray-900 rounded-full"
                  />
                  <p className="mt-4 text-gray-600">Loading debates...</p>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <svg className="w-16 h-16 text-red-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-gray-600">{error}</p>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={fetchDebates}
                    className="mt-4 px-4 py-2 bg-gray-900 text-white rounded-lg font-medium"
                  >
                    Try Again
                  </motion.button>
                </div>
              ) : debates.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <svg className="w-20 h-20 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Previous Debates</h3>
                  <p className="text-gray-600 text-sm">Start your first debate to see it here!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {debates.map((debate, index) => (
                    <motion.div
                      key={debate.session_id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ scale: 1.02 }}
                      onClick={() => handleResumeDebate(debate)}
                      className="relative bg-white border border-gray-200 rounded-xl p-4 cursor-pointer
                               hover:shadow-lg transition-all duration-200 group"
                    >
                      {/* Status Badge */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${getStatusColor(debate.ended_at, debate.performance)}`} />
                          <span className="text-xs font-semibold text-gray-600">
                            {getStatusText(debate.ended_at, debate.performance)}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {formatDate(debate.started_at)}
                        </span>
                      </div>

                      {/* Topic */}
                      <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-gray-700 pr-6">
                        {debate.topic}
                      </h3>

                      {/* Metadata */}
                      <div className="flex items-center gap-3 text-xs text-gray-600">
                        <div className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                  d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                          </svg>
                          <span>{debate.total_turns || 0} turns</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                  d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          <span className="capitalize">{debate.difficulty}</span>
                        </div>
                      </div>

                      {/* Resume Arrow */}
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
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