import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { debateService } from '../services/debateService';

function Landing() {
  const navigate = useNavigate();
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('standard');
  const [loading, setLoading] = useState(false);

  const handleStartDebate = async () => {
    if (!topic.trim()) {
      alert('Please enter a topic');
      return;
    }

    setLoading(true);
    try {
      const response = await debateService.startDebate(topic, difficulty);
      // Navigate to debate page with session ID
      navigate(`/debate/${response.session_id}`, {
        state: { topic, difficulty },
      });
    } catch (error) {
      console.error('Error starting debate:', error);
      alert('Failed to start debate. Make sure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-gray-800 rounded-lg p-8 shadow-xl">
        <h1 className="text-3xl font-bold text-white mb-6 text-center">
          🎤 Debate Me
        </h1>
        
        <div className="space-y-6">
          {/* Topic Input */}
          <div>
            <label className="block text-gray-300 mb-2">
              What do you want to debate?
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., Universal Basic Income destroys work ethic"
              className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Difficulty Selector */}
          <div>
            <label className="block text-gray-300 mb-2">Difficulty</label>
            <div className="flex gap-2">
              {['casual', 'standard', 'expert'].map((level) => (
                <button
                  key={level}
                  onClick={() => setDifficulty(level)}
                  className={`flex-1 py-2 rounded-lg font-medium transition ${
                    difficulty === level
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Start Button */}
          <button
            onClick={handleStartDebate}
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Starting...' : 'Start Debate →'}
          </button>
        </div>

        {/* Quick Topics */}
        <div className="mt-6 pt-6 border-t border-gray-700">
          <p className="text-gray-400 text-sm mb-2">Quick topics:</p>
          <div className="flex flex-wrap gap-2">
            {[
              'UBI and work ethic',
              'Climate change policy',
              'Privacy vs security',
            ].map((quickTopic) => (
              <button
                key={quickTopic}
                onClick={() => setTopic(quickTopic)}
                className="px-3 py-1 bg-gray-700 text-gray-300 rounded text-sm hover:bg-gray-600 transition"
              >
                {quickTopic}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Landing;