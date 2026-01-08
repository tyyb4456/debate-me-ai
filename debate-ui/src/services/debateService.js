import api from './api';

// Dummy user ID for now (no auth yet)
const DUMMY_USER_ID = '8f3c2e7b-6b4a-4c9a-9e6f-2d5c1a8f7e42';

export const debateService = {
  // Start a new debate
  async startDebate(topic, difficulty = 'standard') {
    const response = await api.post('/debate/start', {
      user_id: DUMMY_USER_ID,
      topic,
      difficulty,
    });
    return response.data;
  },

  // Send a message (non-streaming, we'll add streaming later)
  async sendMessage(sessionId, userInput) {
    const response = await api.post('/debate/message', {
      session_id: sessionId,
      user_input: userInput,
    });
    return response.data;
  },

  // End debate
  async endDebate(sessionId) {
    const response = await api.post('/debate/end', {
      session_id: sessionId,
      explicit_end: true,
    });
    return response.data;
  },
};

// SSE Streaming connection (for later)
export class DebateStream {
  constructor(sessionId, message, onToken, onComplete, onError) {
    const encodedMessage = encodeURIComponent(message);
    const url = `http://127.0.0.1:8001/api/debate/stream/${sessionId}?user_input=${encodedMessage}`;
    
    this.eventSource = new EventSource(url);
    
    this.eventSource.addEventListener('token', (e) => {
      onToken(e.data);
    });
    
    this.eventSource.addEventListener('complete', (e) => {
      const data = JSON.parse(e.data);
      onComplete(data);
      this.close();
    });
    
    this.eventSource.onerror = (e) => {
      console.error('SSE Error:', e);
      onError(e);
      this.close();
    };
  }
  
  close() {
    if (this.eventSource) {
      this.eventSource.close();
    }
  }
}