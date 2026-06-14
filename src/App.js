import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabase';

import Login        from './pages/Login';
import Register     from './pages/Register';
import Home         from './pages/Home';
import AIChat       from './pages/AIChat';
import Feed         from './pages/Feed';
import Profile      from './pages/Profile';
import ImageCreator from './pages/ImageCreator';
import News         from './pages/News';
import BottomNav    from './components/BottomNav';
import ErrorBoundary from './components/ErrorBoundary';

// ── PROTECTED ROUTE ───────────────────────────
// Checks if user is logged in.
// If not → sends to /login
// If yes → shows the page
function ProtectedRoute({ children }) {
  const [session, setSession] = useState(undefined); // undefined = still checking

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Still checking login status
  if (session === undefined) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: '#F0F4FF', fontFamily: 'Segoe UI, sans-serif', gap: 12
      }}>
        <div style={{ fontSize: 48 }}>🤖</div>
        <p style={{ color: '#9CA3AF', fontSize: 14 }}>Loading Buddy...</p>
      </div>
    );
  }

  // Not logged in → go to login
  if (!session) return <Navigate to="/login" replace />;

  // Logged in → show the page
  return children;
}

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/"         element={<Navigate to="/login" replace />} />
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected routes — must be logged in */}
          <Route path="/home"          element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/ai-chat"       element={<ProtectedRoute><AIChat /></ProtectedRoute>} />
          <Route path="/feed"          element={<ProtectedRoute><Feed /></ProtectedRoute>} />
          <Route path="/profile"       element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/image-creator" element={<ProtectedRoute><ImageCreator /></ProtectedRoute>} />
          <Route path="/news"          element={<ProtectedRoute><News /></ProtectedRoute>} />

          {/* Old chat routes now redirect to feed (chat is inside feed now) */}
          <Route path="/chat"    element={<Navigate to="/feed" replace />} />
          <Route path="/chat/*"  element={<Navigate to="/feed" replace />} />

          {/* Any unknown URL → login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>

        {/* Global bottom nav — hides on /feed and auth pages automatically */}
        <BottomNav />
      </Router>
    </ErrorBoundary>
  );
}

export default App;
