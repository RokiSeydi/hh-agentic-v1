# Pea - AI Health Coordinator & Care Team Platform

An intelligent health support platform that connects students with AI-powered healthcare specialists. Pea acts as a triage coordinator, understanding your health concerns and assembling a personalized care team of AI specialists trained on real provider expertise.

## 🌟 Features

### Core Functionality

- **Intelligent Triage**: Pea analyzes conversations to understand health concerns and emotional state
- **Dynamic Care Team Recommendations**: AI recommends 2-3 relevant specialists based on conversation context
- **Persistent Conversations**: All chats saved to Redis with 7-day retention
- **Context Sharing**: Specialists receive conversation history from Pea (no need to repeat yourself)
- **Multi-line Messages**: Shift+Enter for new lines, Enter to send

### AI Specialists

6 specialized AI providers trained on real healthcare expertise:

- **Dr. Lisa Ahmed** - Mental Health & Wellbeing (Anxiety, Depression, Stress)
- **Dr. Sarah Chen** - Sexual & Reproductive Health
- **Tom Richardson** - Physical Health & Pain Management (Osteopathy)
- **Dr. Marcus Thompson** - ADHD & Executive Function Support
- **Sophie Martinez** - Nutrition & Eating Disorders
- **Dr. Sarah Bennett** - Disability Rights & Accommodations Navigator

### UI/UX

- **iMessage-style Chat Interface**: Familiar, comfortable design
- **Split-screen Provider View**: Chat with Pea while browsing recommended specialists
- **Mobile-optimized**: Scroll-to-bottom button, responsive design
- **Provider Persistence**: "View Your Team" button always available once providers recommended
- **Dismissible Recommendations**: Permanently remove providers if not needed

## 🏗️ Architecture

```
HH-AGENTIC/
├── frontend/          # React + Vite + Tailwind CSS
│   ├── src/
│   │   ├── App.jsx   # Main application component
│   │   └── index.css
│   └── package.json
│
├── backend/           # Express.js API server
│   ├── index.js      # Main server with all endpoints
│   ├── peaSystemPrompt.js  # Pea's personality & instructions
│   ├── providers.json      # Provider registry
│   ├── api/
│   │   └── index.js  # Vercel serverless handler
│   └── package.json
│
└── api/              # (Legacy - being phased out)
    └── chat.mjs
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Redis database (Vercel Redis or local Redis)
- Anthropic API key (Claude)

### Environment Variables

**Backend** (`backend/.env`):

```env
PORT=3001
ANTHROPIC_API_KEY=your_anthropic_api_key_here
ANTHROPIC_MODEL=claude-sonnet-4-5
FRONTEND_URL=http://localhost:5173
REDIS_URL=your_redis_connection_url_here
```

**Frontend** (Vercel environment variables):

```env
VITE_API_URL=https://your-backend-url.vercel.app
```

### Local Development

1. **Clone the repository**

```bash
git clone https://github.com/RokiSeydi/hh-agentic-v1.git
cd hh-agentic-v1
```

2. **Setup Backend**

```bash
cd backend
npm install
cp .env.example .env  # Add your API keys
node index.js
```

Backend runs on `http://localhost:3001`

3. **Setup Frontend** (in a new terminal)

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`

## 📡 API Endpoints

### Main Endpoints

- `POST /api/stream-chat` - Stream chat responses from Pea
- `POST /api/provider-chat` - Chat with specific AI specialist
- `POST /api/load-conversation` - Load conversation history on page refresh
- `POST /api/dismiss-providers` - Permanently dismiss provider recommendations
- `GET /api/providers` - Get all available providers

### How Provider Recommendations Work

1. User chats with Pea about health concerns
2. Backend analyzes conversation for:
   - User expressing interest in help/support
   - High gravity situation (crisis keywords detected)
   - Exchange count (4+ messages with interest, or 8+ messages total)
3. When triggered, Claude analyzes conversation and recommends 2-3 relevant specialists
4. Recommendations saved to Redis and persist across sessions
5. Users can dismiss or view team anytime

## 🗄️ Data Persistence

### Redis Storage Structure

```
conversation:{conversationId}           # Main Pea conversation (7-day TTL)
profile:{conversationId}                # User profile with recommendations (7-day TTL)
conversation:{conversationId}-{providerId}  # Provider-specific chats (7-day TTL)
```

### Storage Functions

- `getConversation(id)` - Retrieve messages
- `saveConversation(id, messages)` - Save messages with TTL
- `getUserProfile(id)` - Get user metadata
- `saveUserProfile(id, profile)` - Save user metadata

## 🎨 Key Features Deep Dive

### Context Passing to Specialists

When you first message a specialist, the backend:

1. Retrieves your full Pea conversation
2. Extracts all your messages (not Pea's responses)
3. Creates a context summary
4. Passes it to the specialist with: "The person you're talking to has shared the following with Pea..."
5. Specialist acknowledges context and provides informed support

### Multi-line Input

- Press **Enter** → Send message
- Press **Shift+Enter** → New line
- Textarea auto-expands up to 4 lines

### Scroll-to-Bottom Button

- Appears when scrolled up >100px
- Mobile-only (hidden on desktop)
- Works in all chat views

## 🚢 Deployment

### Vercel Deployment

**Backend:**

1. Connect GitHub repo to Vercel
2. Set Root Directory: `backend`
3. Add environment variables (see above)
4. Deploy

**Frontend:**

1. Connect GitHub repo to Vercel (separate project)
2. Set Root Directory: `frontend`
3. Set Framework: Vite
4. Add `VITE_API_URL` environment variable
5. Deploy

### Important Notes

- Backend uses serverless functions (Vercel handles scaling)
- Redis initialization is lazy (connects on first use in serverless)
- CORS configured to accept requests from frontend URL

## 🛠️ Tech Stack

**Frontend:**

- React 18
- Vite
- Tailwind CSS
- Lucide React (icons)

**Backend:**

- Node.js / Express
- Anthropic SDK (Claude Sonnet 4.5)
- Redis (node-redis client)
- dotenv

## 📝 Recent Updates

### November 2025

- ✅ Added Redis persistence for all conversations
- ✅ Fixed provider context passing bug
- ✅ Added page refresh persistence
- ✅ Added "View Your Team" CTA button
- ✅ Added "Dismiss Recommendations" feature
- ✅ Added multi-line textarea support (Shift+Enter)
- ✅ Added scroll-to-bottom button (mobile)
- ✅ Fixed Redis initialization for serverless environments

## 🤝 Contributing

This is a private project. For questions or access, contact the repository owner.

## 📄 License

Private - All rights reserved.

## 🐛 Known Issues

- None currently tracked

## 📞 Support

For issues or questions, open an issue on GitHub or contact the development team.

---

Built with ❤️ for student health and wellbeing
