// debate-ui/src/services/debateService.js - ENHANCED VERSION

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

// ============================================================================
// ENHANCED SSE STREAMING WITH AGENT OUTPUTS
// ============================================================================

export class DebateStream {
  constructor(sessionId, message, callbacks) {
    const {
      onToken,           // (token: string) => void
      onStatus,          // (status: {agent, message}) => void
      onAgentOutput,     // (agent: string, output: object) => void
      onComplete,        // (data: object) => void
      onError,           // (error: Error) => void
    } = callbacks;

    const encodedMessage = encodeURIComponent(message);
    const url = `http://127.0.0.1:8001/api/debate/stream/${sessionId}?user_input=${encodedMessage}`;
    
    this.eventSource = new EventSource(url);
    
    // ========================================================================
    // EVENT: TOKEN (AI response word-by-word)
    // ========================================================================
    this.eventSource.addEventListener('token', (e) => {
      if (onToken) onToken(e.data);
    });
    
    // ========================================================================
    // EVENT: STATUS (which agent is working)
    // ========================================================================
    this.eventSource.addEventListener('status', (e) => {
      try {
        const data = JSON.parse(e.data);
        // data = { status: "processing", agent: "analyzer", message: "Examining..." }
        if (onStatus) onStatus(data);
      } catch (error) {
        console.error('Failed to parse status event:', error);
      }
    });
    
    // ========================================================================
    // EVENT: AGENT_OUTPUT (structured insights from each agent) ⭐ NEW!
    // ========================================================================
    this.eventSource.addEventListener('agent_output', (e) => {
      try {
        const data = JSON.parse(e.data);
        // data = { agent: "analyzer", output: {...}, timestamp: "..." }
        if (onAgentOutput) onAgentOutput(data.agent, data.output);
      } catch (error) {
        console.error('Failed to parse agent_output event:', error);
      }
    });
    
    // ========================================================================
    // EVENT: COMPLETE (debate turn finished)
    // ========================================================================
    this.eventSource.addEventListener('complete', (e) => {
      try {
        const data = JSON.parse(e.data);
        if (onComplete) onComplete(data);
        this.close();
      } catch (error) {
        console.error('Failed to parse complete event:', error);
      }
    });
    
    // ========================================================================
    // EVENT: ERROR (connection failed)
    // ========================================================================
    this.eventSource.addEventListener('error', (e) => {
      try {
        const data = JSON.parse(e.data);
        if (onError) onError(new Error(data.error || 'Stream error'));
      } catch (error) {
        if (onError) onError(new Error('Connection error'));
      }
    });
    
    this.eventSource.onerror = (e) => {
      console.error('SSE Error:', e);
      if (onError) onError(new Error('SSE connection failed'));
      this.close();
    };
  }
  
  close() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }
}