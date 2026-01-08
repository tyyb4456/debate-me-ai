import { useEffect, useRef } from 'react';
import DebateMessage from './DebateMessage';

function MessageList({ messages }) {
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((msg, index) => (
        <DebateMessage
          key={index}
          message={msg}
          isUser={msg.role === 'user'}
        />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}

export default MessageList;