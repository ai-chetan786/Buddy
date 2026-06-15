import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabase';

import Login        from './pages/Login';
import Register     from './pages/Register';
import Feed         from './pages/Feed';      // Feed IS the home now
import Profile      from './pages/Profile';
import ImageCreator from './pages/ImageCreator';
import News         from './pages/News';
import ErrorBoundary from './components/ErrorBoundary';

// NO global BottomNav — Feed has its own built-in nav

function ProtectedRoute({ children }) {
  const [session, setSession] = useState(undefined);
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  if (session === undefined) return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'#F0F4FF', fontFamily:'Segoe UI, sans-serif', gap:12 }}>
      <div style={{ fontSize:48, animation:'pulse 1.5s infinite' }}>🤖</div>
      <p style={{ color:'#9CA3AF', fontSize:14 }}>Loading Buddy...</p>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </div>
  );
  if (!session) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          {/* Public */}
          <Route path="/"         element={<Navigate to="/login" replace />} />
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Feed IS home — /home and / both go to /feed */}
          <Route path="/feed"  element={<ProtectedRoute><Feed /></ProtectedRoute>} />
          <Route path="/home"  element={<Navigate to="/feed" replace />} />

          {/* Other pages */}
          <Route path="/profile"       element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/image-creator" element={<ProtectedRoute><ImageCreator /></ProtectedRoute>} />
          <Route path="/news"          element={<ProtectedRoute><News /></ProtectedRoute>} />

          {/* Legacy routes → feed */}
          <Route path="/ai-chat" element={<Navigate to="/feed" replace />} />
          <Route path="/chat"    element={<Navigate to="/feed" replace />} />
          <Route path="/chat/*"  element={<Navigate to="/feed" replace />} />

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}
