import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotesProvider } from './context/NotesContext';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Assistant from './pages/Assistant';
import Schedule from './pages/Schedule';
import Friends from './pages/Friends';
import Messages from './pages/Messages';
import SharedNotes from './pages/SharedNotes';
import KnowledgeGraph from './pages/KnowledgeGraph';

import { LS, genId } from './utils/localStorage';

// ─── Seed Demo Data (Temporary Local Fallback) ────────────────────────
function seedDemoData() {
  const users = LS.get('noteflow_users', []);
  if (!users.find((u) => u.email === 'demo@noteflow.app')) {
    const demoUser = {
      id: 'demo-user-001',
      name: 'Hadia Khan',
      email: 'demo@noteflow.app',
      password: 'demo123',
    };
    LS.set('noteflow_users', [demoUser, ...users]);
    
    LS.set('noteflow_notes_demo-user-001', [
      {
        id: genId(),
        title: 'Operating System',
        content: 'Learn the basic operating system abstractions, mechanisms, and their implementations.',
        pinned: true,
        createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      },
      {
        id: genId(),
        title: 'Artificial Intelligence',
        content: 'Key topics: search, knowledge representation, planning, and machine learning.',
        pinned: false,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      },
    ]);
  }
}

// Protected Layout with Sidebar Shell
function ProtectedLayout() {
  const { isAuth } = useAuth();
  if (!isAuth) return <Navigate to="/login" replace />;
  
  return (
    <div className="app-shell">
      <Navbar />
      <div className="main-content">
        <Outlet />
      </div>
    </div>
  );
}

// Guard public paths (Login/Register)
function PublicOnlyRoute({ children }) {
  const { isAuth } = useAuth();
  if (isAuth) return <Navigate to="/dashboard" replace />;
  return children;
}

function App() {
  useEffect(() => {
    seedDemoData();
  }, []);

  return (
    <BrowserRouter>
      <AuthProvider>
        <NotesProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
            <Route path="/register" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />

            {/* Protected Routes */}
            <Route element={<ProtectedLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/assistant" element={<Assistant />} />
              <Route path="/schedule" element={<Schedule />} />
              <Route path="/friends" element={<Friends />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/shared-notes" element={<SharedNotes />} />
              <Route path="/graph" element={<KnowledgeGraph />} />

            </Route>

            {/* Default Redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </NotesProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;