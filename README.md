# **`🧠 Debate AI System`**

An AI-powered debate training platform that helps users sharpen their argumentation skills through real-time, intelligent debate sessions. The system uses a multi-agent LangGraph pipeline on the backend and a modern React frontend with live streaming.

---

## **`✨ Features`**

- **Multi-Agent AI Pipeline** — Moderator, Argument Analyzer, Researcher, Socratic Questioner, Devil's Advocate, and Growth Tracker agents working in concert
- **Real-Time Streaming** — SSE (Server-Sent Events) stream AI responses and live agent insights token by token
- **Growth Tracking** — Tracks argument strength, fallacy detection, skill level, and progression across sessions
- **Session History** — Resume previous debates, view past turns, and review performance breakdowns
- **Adaptive Difficulty** — Casual, Standard, and Expert modes that adjust AI challenge level
- **PostgreSQL Persistence** — All sessions, turns, fallacies, and user stats are stored in a relational database

---

## **`🏗️ Project Structure`**

```
.
├── debate-app/          # FastAPI backend
│   ├── main.py
│   ├── graph_builder.py
│   ├── state.py
│   ├── config/
│   │   ├── settings.py
│   │   └── database.py
│   ├── api/
│   │   ├── models.py
│   │   └── routes/
│   │       ├── debate.py
│   │       ├── streaming.py
│   │       ├── history.py
│   │       └── health.py
│   ├── nodes/
│   │   ├── moderator_agent.py
│   │   ├── argument_analyzer_agent.py
│   │   ├── research_agent.py
│   │   ├── socratic_questioner_agent.py
│   │   ├── devils_advocate_agent.py
│   │   └── growth_tracker_agent.py
│   ├── database/
│   │   └── models.py
│   ├── services/
│   │   └── debate_service.py
│   └── utils/
│       └── logger.py
│
└── debate-ui/           # React + Vite frontend
    ├── index.html
    ├── vite.config.js
    ├── package.json
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── pages/
        │   ├── Landing.jsx
        │   └── Debate.jsx
        ├── components/
        │   ├── AgentInsightsPanel.jsx
        │   └── PreviousDebatesSidebar.jsx
        └── services/
            └── debateService.js
```

---

## **`🔧 Tech Stack`**

### Backend
| Layer | Technology |
|---|---|
| Framework | FastAPI |
| AI Orchestration | LangGraph + LangChain |
| LLM | Anthropic Claude (via `langchain`) |
| Database | PostgreSQL (async via SQLAlchemy + asyncpg) |
| Streaming | SSE via `sse-starlette` |
| Config | Pydantic Settings |

### Frontend
| Layer | Technology |
|---|---|
| Framework | React 19 + Vite 7 |
| Routing | React Router v7 |
| Styling | Tailwind CSS v4 |
| Animations | Framer Motion |
| HTTP Client | Axios |
| Icons | Lucide React |

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 14+

---

### Backend Setup

```bash
cd debate-app

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

Create a `.env` file in `debate-app/`:

```env
APP_NAME=Debate AI System
ENVIRONMENT=development
DEBUG=True

DATABASE_URL=postgresql+asyncpg://your_user:your_password@localhost:5432/debate_ai

ANTHROPIC_API_KEY=your_anthropic_api_key_here

CORS_ORIGINS=http://localhost:5173,http://localhost:3000

SECRET_KEY=your-secret-key-change-in-production
```

Run the backend:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

API docs will be available at: [http://localhost:8000/docs](http://localhost:8000/docs)

---

### Frontend Setup

```bash
cd debate-ui

# Install dependencies
npm install

# Start the dev server
npm run dev
```

The app will be available at: [http://localhost:5173](http://localhost:5173)

---

## 🤖 Agent Architecture

The backend uses a **LangGraph StateGraph** where each node is a specialized AI agent. The **Moderator** is the entry point and routes to other agents based on the user's input.

```
User Input
    │
    ▼
Moderator ──────────────────────────────────────────┐
    │                                               │
    ├──► Argument Analyzer  ──────────────────────►│
    │                                               │
    ├──► Researcher  ────────────────────────────►│
    │                                               │
    ├──► Socratic Questioner ────────────────────►│
    │                                               │
    ├──► Devil's Advocate  ──────────────────────►│
    │                                               │
    └──► Growth Tracker  ──────────────────────► END
```

| Agent | Role |
|---|---|
| **Moderator** | Analyzes user input, decides routing, generates the final AI response |
| **Argument Analyzer** | Extracts claims, detects fallacies, scores argument strength |
| **Researcher** | Provides relevant facts, evidence, and data to enrich the debate |
| **Socratic Questioner** | Generates probing questions to deepen the user's thinking |
| **Devil's Advocate** | Constructs strong counter-arguments against the user's position |
| **Growth Tracker** | Tracks performance over time; generates a full feedback report at debate end |

---

## 📡 API Endpoints

### Debate
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/debate/start` | Start a new debate session |
| `POST` | `/api/debate/message` | Send a message (non-streaming) |
| `GET` | `/api/debate/stream` | Stream AI response via SSE |
| `POST` | `/api/debate/end` | Explicitly end a debate |

### User History
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/user/{user_id}/debates` | List all debates for a user |
| `GET` | `/api/user/{user_id}/stats` | Get aggregate user stats |
| `GET` | `/api/user/{user_id}/growth` | Get skill growth trajectory |
| `GET` | `/api/user/debate/{session_id}/turns` | Get all turns for a session |

### Health
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Health check |

---

## 🗃️ Database Schema

The PostgreSQL database has four core tables:

- **`users`** — User accounts and aggregate skill stats
- **`debate_sessions`** — Per-session metadata, difficulty, status, and final performance metrics
- **`turns`** — Individual user/AI message pairs with agent outputs stored as JSONB
- **`fallacies`** — Detected logical fallacies linked to specific turns
- **`achievements`** — Earned badges and milestones per user

---

## 🖥️ Frontend Pages

### Landing (`/`)
- Enter a debate topic and select difficulty (Casual / Standard / Expert)
- Access previous debates via a slide-out sidebar
- Animated hero section with a clean, editorial design

### Debate (`/debate/:sessionId`)
- Real-time chat interface with streaming AI responses
- **AI Insights Panel** — Live accordion panels showing what each agent found:
  - Argument Analyzer (claims, fallacies, strength score)
  - Researcher (evidence and facts)
  - Socratic Questioner (probing questions)
  - Devil's Advocate (counter-arguments)
- End debate to receive a full growth report with skill progression

---

## ⚙️ Environment Variables

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL async connection string | — |
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude | — |
| `CORS_ORIGINS` | Comma-separated list of allowed origins | `http://localhost:5173` |
| `ENVIRONMENT` | `development` or `production` | `development` |
| `DEBUG` | Enable SQLAlchemy query logging | `True` |
| `SECRET_KEY` | JWT secret key | — |

---

## 📦 Building for Production

### Backend
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

### Frontend
```bash
cd debate-ui
npm run build
# Output will be in debate-ui/dist/
```

