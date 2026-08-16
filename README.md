# NoteHub — AI-Powered Knowledge & Note Assistant

NoteHub is a production-grade, full-stack web application that transforms a user's collection of notes into an interactive, semantic personal knowledge base. By combining traditional note management with Retrieval-Augmented Generation (RAG) and a tool-equipped AI Agent, NoteHub lets users store, summarize, organize, and ask questions across all their notes with full data persistence, session security, and dynamic glassmorphic UX.

---

## 📖 Project Overview & The Problem

**The Problem**: Traditional note-taking tools are passive containers of text. As a user's collection of notes grows, search becomes increasingly difficult because keyword match requires exact words. Critical links, checklists, summaries, and structural insights get lost in a digital graveyard.

**The Solution**: NoteHub solves this by automatically processing note text into semantic chunks and vector embeddings. Users can search notes based on conceptual meaning, trigger dedicated AI tool summaries, improve drafts, extract todo lists, and converse with a dedicated AI Knowledge Assistant (Agent) that operates tools to fetch grounded context on their behalf.

---

## 🚀 Key Features

1. **Secure Session Authentication**: Register, login, and logout with password hashing (BcryptJS) and JWT session tokens. Complete user isolation ensures notes and semantic indices are private.
2. **Notes Management**: Create, view, edit, and delete notes containing title, content, category, and tags. Toggle pin priority.
3. **Advanced Filtering**: Categorize notes, sort by creation dates or alphabetical order, and filter by tags and categories dynamically.
4. **AI Actions Toolbar**:
   - **Summarize**: Generate clean bulleted markdown summaries.
   - **Improve Writing**: Refactor grammar, structure, and readability side-by-side with an "Apply" button to overwrite note text.
   - **Generate Tags**: Suggest descriptors that can be applied to the note in one click.
   - **Extract Actions**: Automatically build task checklists from notes.
   - **Ask About Note**: Grounded Q&A conversation restricted to a single note.
5. **AI Semantic Search (RAG)**: Search notes conceptually. Matches return segment snippets ranked by similarity score percentages.
6. **AI Knowledge Assistant (Agent)**: An interactive chat agent equipped with function-calling tools. The agent logs executed tools (e.g. `🔧 Executed Tool: searchNotes`) and lists clickable source citations.

---

## 🧱 Tech Stack

- **Frontend**: React 18, React Router DOM v6, Axios, Context API, Vanilla CSS (Glassmorphism design system).
- **Backend**: Node.js, Express, Sequelize (ORM), JWT, BcryptJS, `@google/generative-ai` SDK.
- **Database**: SQLite (local zero-configuration development) and PostgreSQL (production deployment) driver compatibility.
- **AI Models**:
  - `gemini-3.5-flash`: Chat conversations, agent reasoning, tag suggestions, and summaries.
  - `gemini-embedding-001`: 3072-dimension text vector embeddings.

---

## 📐 System Architecture

Here is the data-flow layout for the NoteHub full-stack application:

```text
User
 ↓
React Application (Vite/CRA)
 ↓
Backend API (Express Server)
 ├── Authentication (JWT + BcryptJS)
 ├── Notes Service (CRUD + Tags)
 ├── Search Service (Keyword Match)
 └── AI Service (Gemini SDK)
       ├── LLM (gemini-3.5-flash)
       ├── Embeddings (gemini-embedding-001)
       ├── Vector Search (Cosine Similarity)
       └── Agent Tools (Function Declarations)
              ↓
         PostgreSQL / SQLite Database
              +
          Vector Store (NoteChunks Table)
```

In simple technical terms:
1. The **React Application** manages state and sends authenticated API calls using an Axios interceptor that attaches a JWT header.
2. The **Express Backend** authenticates request routes and interacts with database tables via **Sequelize**.
3. The **AI Service** interfaces with the **Google Gemini API**. When creating/editing notes, the text is chunked, vectors are generated, and they are saved to a `NoteChunks` table.
4. When performing RAG search or chatting with the AI Agent, the backend queries the database, runs cosine similarity matches in memory, and submits the relevant segments as context to compile the final response.

---

## 📚 Document & RAG Pipeline

### Note Processing Pipeline
```text
Note Created/Updated
        ↓
Text Preprocessing
        ↓
Sliding Window Chunking (800 chars, 100 overlap)
        ↓
Embedding Generation (Gemini gemini-embedding-001)
        ↓
Persist to NoteChunks Table (userId, noteId, content, embedding vector array)
```

### Retrieval-Augmented Generation (RAG) Search
```text
User Question
        ↓
Generate Query Embedding (Gemini gemini-embedding-001)
        ↓
Query NoteChunks belonging to current userId
        ↓
Compute Cosine Similarity (in-memory Float32 array comparison)
        ↓
Filter & Rank top matching chunks (similarity score > 0.35)
        ↓
Construct context prompt -> Send to gemini-3.5-flash
        ↓
Return grounded answer + source citations mapping note IDs
```

---

## 🤖 AI Agent Tooling

The AI Knowledge Assistant is a tool-augmented agent. It uses native function calling to evaluate when to run operations on the user's database:

- `searchNotes(query)`: Executes semantic search across all chunks.
- `getNote(noteId)`: Fetches full content of a note.
- `listNotes(category, search)`: Returns notes based on categories or keywords.
- `summarizeNote(noteId)`: Generates summary.
- `generateTags(noteId)`: Analyzes content and suggests tags.
- `extractActionItems(noteId)`: Returns a checklist of tasks.

The agent loops through tool executions before presenting a response, displaying badges of executed tools and appending source metadata.

---

## ⚙️ Setup Instructions

### Prerequisites
- Node.js (v18+)
- npm (v9+)
- A Gemini API Key (Get one from [Google AI Studio](https://aistudio.google.com/))

### 1. Backend Setup
1. Open a terminal and navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install server packages:
   ```bash
   npm install
   ```
3. Create a `.env` file based on `.env.example`:
   ```env
   PORT=5000
   AUTH_SECRET=your_jwt_secret_key
   LLM_API_KEY=AIzaSy...your_gemini_api_key
   # DATABASE_URL=postgres://... (Optional: Omit to use local SQLite)
   ```
4. Start the server:
   ```bash
   npm start
   ```
   The backend will sync schemas in `database.sqlite` and start listening on [http://localhost:5000](http://localhost:5000).

### 2. Frontend Setup
1. Open a separate terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install frontend packages:
   ```bash
   npm install
   ```
3. Create a `.env` file based on `.env.example`:
   ```env
   REACT_APP_API_URL=http://localhost:5000/api
   ```
4. Start the development server:
   ```bash
   npm start
   ```
   The React application will open on [http://localhost:3000](http://localhost:3000).

---

## 🌐 Deployment Guidelines

### Backend Deployment (e.g. Render / Railway)
1. Commit code to GitHub (exclude `.env` and `database.sqlite` via `.gitignore`).
2. Deploy the `backend/` subdirectory.
3. Configure environment variables in the host platform dashboard:
   - `LLM_API_KEY` (Gemini API Key)
   - `AUTH_SECRET` (JWT Secret Key)
   - Setup a PostgreSQL database (e.g. Neon / Supabase) and paste the connection string into the `DATABASE_URL` environment variable. The backend automatically switches to PostgreSQL and syncs schemas on start.

### Frontend Deployment (e.g. Vercel / Netlify)
1. Deploy the `frontend/` subdirectory.
2. Configure build settings:
   - Build Command: `npm run build`
   - Output Directory: `build`
3. Add Environment Variable:
   - `REACT_APP_API_URL` (Points to your live deployed backend URL, e.g. `https://notehub-api.onrender.com/api`)

---

## 🔮 Future Improvements
- **Collaborative Sharing**: Implement permissions/keys to share notes between friends.
- **Auto-save drafts**: Debounce content changes and auto-save notes to the backend.
- **Audio Transcript Processing**: Upload voice recordings, transcribe them via Gemini, and chunk them automatically into meeting notes.
