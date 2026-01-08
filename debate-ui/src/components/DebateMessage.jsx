function DebateMessage({ message, isUser }) {
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-[80%] rounded-lg p-4 ${
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-gray-700 text-gray-100'
        }`}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium">
            {isUser ? '👤 You' : '🤖 AI'}
          </span>
        </div>
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  );
}

export default DebateMessage;