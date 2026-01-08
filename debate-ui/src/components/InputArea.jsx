import { useState } from 'react';
import { motion } from 'framer-motion';

function InputArea({ onSendMessage, disabled }) {
  const [input, setInput] = useState('');

  const handleSubmit = () => {
    if (!input.trim() || disabled) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const handleKeyDown = (e) => {
    // Enter → Send
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    // Shift+Enter → New line (default behavior, do nothing)
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="border-t border-gray-200 bg-white p-4"
    >
      <div className="flex items-end gap-3 max-w-4xl mx-auto">
        
        {/* Textarea */}
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your response…"
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none px-4 py-3 rounded-lg
                     border border-gray-300 text-gray-900 placeholder-gray-400
                     focus:outline-none focus:ring-2 focus:ring-gray-900
                     focus:border-gray-900
                     disabled:bg-gray-100 disabled:cursor-not-allowed"
        />

        {/* Send Button */}
        <motion.button
          onClick={handleSubmit}
          disabled={disabled || !input.trim()}
          whileHover={!disabled && input.trim() ? { scale: 1.05 } : {}}
          whileTap={!disabled && input.trim() ? { scale: 0.95 } : {}}
          className="px-6 py-3 rounded-lg font-medium
                     bg-gray-900 text-white
                     hover:bg-gray-800 transition
                     disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Send
        </motion.button>
      </div>

      {/* Hint */}
      <p className="mt-2 text-xs text-gray-400 max-w-4xl mx-auto">
        Press <span className="font-medium">Enter</span> to send ·{' '}
        <span className="font-medium">Shift + Enter</span> for new line
      </p>
    </motion.div>
  );
}

export default InputArea;