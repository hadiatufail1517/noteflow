# NoteFlow – MERN Stack Notes App (Frontend)

A production-grade React frontend for a MERN Stack Notes application, styled with the purple/card dashboard aesthetic.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm start
```

Open [http://localhost:3000](http://localhost:3000)

**Demo account:** `demo@noteflow.app` / `demo123`

---

## 📁 Project Structure

```
src/
├── components/
│   ├── Navbar.jsx       # Sidebar navigation
│   ├── NoteCard.jsx     # Note card with CRUD actions
│   ├── NoteForm.jsx     # Create/Edit modal form
│   └── SearchBar.jsx    # Live search input
├── context/
│   ├── AuthContext.jsx  # Auth state, login/logout/register
│   └── NotesContext.jsx # Notes CRUD state management
├── pages/
│   ├── Login.jsx        # /login
│   ├── Register.jsx     # /register
│   └── Dashboard.jsx    # /dashboard (protected)
├── services/
│   └── api.js           # API service layer (MERN-ready)
├── utils/
│   └── localStorage.js  # Temporary DB utilities
├── App.js               # Router + providers
└── index.js             # Entry point
```

---

## 🧱 Tech Stack

- **React 18** (functional components + hooks)
- **React Router DOM v6** (protected routes, nested routes)
- **Context API** (AuthContext + NotesContext)
- **localStorage** (temporary database — swap for backend)
- **Axios-ready** API structure in `services/api.js`

---

## 🔌 Connecting to Node.js + Express Backend

The app is fully structured for MERN backend integration.

### Step 1 — Create `.env`
```
REACT_APP_API_URL=http://localhost:5000/api
```

### Step 2 — Update `services/api.js`

Each function has a commented real implementation ready to uncomment:

```js
// Current (localStorage mock):
login: async (email, password) => { ... localStorage ... }

// Replace with (real backend):
login: async (email, password) => {
  const res = await axios.post(`${BASE_URL}/auth/login`, { email, password });
  return res.data; // { token, user }
}
```

### Expected Backend API Contract

| Method | Endpoint | Body | Response |
|--------|----------|------|----------|
| POST | `/api/auth/login` | `{ email, password }` | `{ token, user }` |
| POST | `/api/auth/register` | `{ name, email, password }` | `{ token, user }` |
| GET | `/api/notes` | — | `Note[]` |
| POST | `/api/notes` | `{ title, content, pinned }` | `Note` |
| PUT | `/api/notes/:id` | `{ title, content, pinned }` | `Note` |
| DELETE | `/api/notes/:id` | — | `{ success: true }` |

### Note Object Shape
```json
{
  "id": "string",
  "title": "string",
  "content": "string",
  "pinned": false,
  "createdAt": "ISO string",
  "updatedAt": "ISO string"
}
```

---

## ✨ Features

- 🔐 **Auth** — Login, Register, token stored in localStorage
- 📝 **Notes CRUD** — Create, Edit, Delete notes via modal
- 📌 **Pin System** — Pinned notes always appear at top
- 🔍 **Live Search** — Filter by title or content instantly
- 💾 **Persistence** — Data survives page refresh
- 📅 **Calendar** — Interactive mini calendar widget
- 📊 **Stats Row** — Total, pinned, today, detailed counts
- 🔒 **Protected Routes** — Dashboard requires login
- 📱 **Responsive** — Mobile + Desktop layout

---

## 🛠 Available Scripts

```bash
npm start       # Development server (localhost:3000)
npm run build   # Production build
npm test        # Run tests
```
