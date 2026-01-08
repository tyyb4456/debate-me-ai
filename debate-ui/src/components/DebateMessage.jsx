import { motion } from 'framer-motion';

function DebateMessage({ message, isUser }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
    >
      <div
        className={`max-w-[80%] rounded-xl p-4 shadow-md
          ${isUser
            ? 'bg-gray-900 text-white rounded-br-none'
            : 'bg-gray-100 text-gray-900 rounded-bl-none'
          }`}
      >
        {/* Sender */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-semibold">
            {isUser ? '👤 You' : '🤖 AI'}
          </span>
        </div>

        {/* Message Content */}
        <p className="whitespace-pre-wrap text-sm leading-relaxed">
          {message.content}
        </p>
      </div>
    </motion.div>
  );
}

export default DebateMessage;