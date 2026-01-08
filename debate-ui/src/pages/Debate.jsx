import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import MessageList from '../components/MessageList';
import InputArea from '../components/InputArea';
import FeedbackModal from '../components/FeedbackModal';
import { debateService, DebateStream } from '../services/debateService';

function Debate() {
  const { sessionId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [currentStream, setCurrentStream] = useState(null);

  const topic = location.state?.topic || 'Debate Topic';
  const difficulty = location.state?.difficulty || 'standard';

  const handleSendMessage = async (userInput) => {
    // Add user message immediately
    const userMessage = {
      role: 'user',
      content: userInput,
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    // Create AI message placeholder
    const aiMessageIndex = messages.length + 1;
    const aiMessage = {
      role: 'assistant',
      content: '',
    };
    setMessages((prev) => [...prev, aiMessage]);

    try {
      // Use streaming
      const stream = new DebateStream(
        sessionId,
        userInput,
        // On token received
        (token) => {
          setMessages((prev) => {
            const newMessages = [...prev];
            newMessages[aiMessageIndex] = {
              ...newMessages[aiMessageIndex],
              content: newMessages[aiMessageIndex].content + token,
            };
            return newMessages;
          });
        },
        // On complete
        (data) => {
          setIsLoading(false);
          // Check if debate ended
          if (data.debate_ended) {
            // Show feedback modal
            // Note: You'll need to fetch feedback separately
            // or include it in the complete event
          }
        },
        // On error
        (error) => {
          console.error('Streaming error:', error);
          setIsLoading(false);
          // Fallback to non-streaming
          handleSendMessageFallback(userInput, aiMessageIndex);
        }
      );
      
      setCurrentStream(stream);
    } catch (error) {
      console.error('Error:', error);
      setIsLoading(false);
    }
  };

  // Fallback if streaming fails
  const handleSendMessageFallback = async (userInput, messageIndex) => {
    try {
      const response = await debateService.sendMessage(sessionId, userInput);
      
      setMessages((prev) => {
        const newMessages = [...prev];
        newMessages[messageIndex] = {
          role: 'assistant',
          content: response.ai_response,
        };
        return newMessages;
      });

      if (response.debate_ended && response.growth_feedback) {
        setFeedback(response.growth_feedback);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    }
  };

  const handleEndDebate = async () => {
    if (!confirm('Are you sure you want to end this debate?')) {
      return;
    }

    try {
      const response = await debateService.endDebate(sessionId);
      // Fetch feedback if not included
      // setFeedback(response.growth_feedback);
      alert('Debate ended! (Feedback not implemented yet)');
    } catch (error) {
      console.error('Error ending debate:', error);
    }
  };

  const handleCloseFeedback = () => {
    setFeedback(null);
    navigate('/');
  };

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      if (currentStream) {
        currentStream.close();
      }
    };
  }, [currentStream]);

  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">{topic}</h2>
            <p className="text-gray-400 text-sm">
              Difficulty: {difficulty} | Turn: {Math.floor(messages.length / 2)}
            </p>
          </div>
          <button
            onClick={handleEndDebate}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            End Debate
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-hidden max-w-4xl w-full mx-auto">
        <MessageList messages={messages} />
      </div>

      {/* Input */}
      <div className="max-w-4xl w-full mx-auto">
        <InputArea onSendMessage={handleSendMessage} disabled={isLoading} />
      </div>

      {/* Feedback Modal */}
      {feedback && (
        <FeedbackModal feedback={feedback} onClose={handleCloseFeedback} />
      )}
    </div>
  );
}

export default Debate;