import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabase';

import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import AIChat from './pages/AIChat';
import Feed from './pages/Feed';
import ChatList from './pages/ChatList';
import ChatRoom from './pages/ChatRoom';
import Profile from './pages/Profile';
import ImageCreator from './pages/ImageCreator';
import News from './pages/News';
import BottomNav from './components/BottomNav';
import ErrorBoundary from './components/ErrorBoundary';

// ============================================
// ProtectedRoute — guards all pages behind login
// ============================================
// How it works:
//   - "loading" = we are checking if user is logged in (show spinner)
//   - "session" exists = user is logged in → show the page
//   - no session = user is NOT logged in → send to /login
function ProtectedRoute({ children }) {
  const [session, setSession] = useState(undefined); // undefined = still checking

  useEffect(() => {
    // Check current session once on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Listen for login/logout events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Still checking — show a simple loading screen
  if (session === undefined) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '12px',
        fontFamily: 'Poppins, sans-serif',
        background: '#f8fafc'
      }}>
        <div style={{ fontSize: '48px', animation: 'pulse 1.5s infinite' }}>🤖</div>
        <p style={{ color: '#64748b', fontSize: '14px' }}>Loading Buddy...</p>
      </div>
    );
  }

  // Not logged in → redirect to login
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // Logged in → show the actual page
  return children;
}

function App() {
  return (
    // ErrorBoundary wraps EVERYTHING — catches any crash anywhere in the app
    <ErrorBoundary>
      <Router>
        <Routes>
          {/* Public routes — anyone can access these */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected routes — must be logged in */}
          <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/ai-chat" element={<ProtectedRoute><AIChat /></ProtectedRoute>} />
          <Route path="/feed" element={<ProtectedRoute><Feed /></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute><ChatList /></ProtectedRoute>} />
          <Route path="/chat/:id" element={<ProtectedRoute><ChatRoom /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/image-creator" element={<ProtectedRoute><ImageCreator /></ProtectedRoute>} />
          <Route path="/news" element={<ProtectedRoute><News /></ProtectedRoute>} />

          {/* Catch-all — unknown URLs go to login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>

        {/* BottomNav shows on all protected pages automatically */}
        <BottomNav />
      </Router>
    </ErrorBoundary>
  );
}

export default App;
