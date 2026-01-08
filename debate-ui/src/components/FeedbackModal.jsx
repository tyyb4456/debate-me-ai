function FeedbackModal({ feedback, onClose }) {
  if (!feedback) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6">
        <h2 className="text-2xl font-bold text-white mb-4">
          🎉 Debate Complete!
        </h2>

        {/* Session Summary */}
        <div className="bg-gray-700 rounded-lg p-4 mb-4">
          <h3 className="text-lg font-semibold text-white mb-2">
            Session Summary
          </h3>
          <div className="text-gray-300 space-y-1">
            <p>
              Performance:{' '}
              <span className="font-bold text-blue-400">
                {feedback.session_summary?.overall_performance?.toUpperCase()}
              </span>
            </p>
            <p>
              Argument Strength:{' '}
              <span className="font-bold">
                {feedback.session_summary?.argument_strength_avg}/10
              </span>
            </p>
            <p>
              Fallacies: {feedback.session_summary?.fallacies_count}
            </p>
          </div>
        </div>

        {/* What Went Well */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-green-400 mb-2">
            ✅ What Went Well
          </h3>
          <ul className="list-disc list-inside text-gray-300 space-y-1">
            {feedback.what_went_well?.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>

        {/* Areas for Improvement */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-yellow-400 mb-2">
            📈 Areas for Improvement
          </h3>
          <div className="space-y-3">
            {feedback.areas_for_improvement?.map((area, index) => (
              <div key={index} className="bg-gray-700 rounded p-3">
                <p className="text-white font-medium">{area.area}</p>
                <p className="text-gray-400 text-sm">{area.issue}</p>
                <p className="text-blue-400 text-sm mt-1">
                  💡 {area.suggestion}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Achievements */}
        {feedback.achievements?.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-purple-400 mb-2">
              🏆 Achievements Unlocked
            </h3>
            <div className="flex flex-wrap gap-2">
              {feedback.achievements.map((ach, index) => (
                <div
                  key={index}
                  className="bg-purple-900 px-3 py-2 rounded-lg"
                >
                  <span className="text-white font-medium">
                    {ach.badge}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition"
        >
          Start New Debate
        </button>
      </div>
    </div>
  );
}

export default FeedbackModal;