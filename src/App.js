import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabase';

import Login           from './pages/Login';
import Register        from './pages/Register';
import Feed            from './pages/Feed';
import Profile         from './pages/Profile';
import ImageCreator    from './pages/ImageCreator';
import News            from './pages/News';
import SellerDashboard from './pages/SellerDashboard';
import SellerProducts  from './pages/SellerProducts';
import SellerRegister  from './pages/SellerRegister';
import DeliveryDashboard from './pages/DeliveryDashboard';
import DeliveryRegister  from './pages/DeliveryRegister';
import OrderTracking   from './pages/OrderTracking';
import MyOrders        from './pages/MyOrders';
import AdminPanel      from './pages/AdminPanel';
import Browse          from './pages/Browse';
import ErrorBoundary   from './components/ErrorBoundary';

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

          {/* Social feed (home) */}
          <Route path="/feed"  element={<ProtectedRoute><Feed /></ProtectedRoute>} />
          <Route path="/home"  element={<Navigate to="/feed" replace />} />

          {/* Social pages */}
          <Route path="/profile"       element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/image-creator" element={<ProtectedRoute><ImageCreator /></ProtectedRoute>} />
          <Route path="/news"          element={<ProtectedRoute><News /></ProtectedRoute>} />

          {/* ── MARKETPLACE ROUTES ── */}
          <Route path="/my-orders"            element={<ProtectedRoute><MyOrders /></ProtectedRoute>} />
          <Route path="/admin"                element={<ProtectedRoute><AdminPanel /></ProtectedRoute>} />
          <Route path="/browse"               element={<ProtectedRoute><Browse /></ProtectedRoute>} />
          <Route path="/seller/register"      element={<ProtectedRoute><SellerRegister /></ProtectedRoute>} />
          <Route path="/delivery/register"    element={<ProtectedRoute><DeliveryRegister /></ProtectedRoute>} />
          <Route path="/seller/dashboard" element={<ProtectedRoute><SellerDashboard /></ProtectedRoute>} />
          <Route path="/seller/products"  element={<ProtectedRoute><SellerProducts /></ProtectedRoute>} />
          <Route path="/delivery/dashboard" element={<ProtectedRoute><DeliveryDashboard /></ProtectedRoute>} />
          <Route path="/order/:id"        element={<ProtectedRoute><OrderTracking /></ProtectedRoute>} />

          {/* Legacy redirects */}
          <Route path="/ai-chat" element={<Navigate to="/feed" replace />} />
          <Route path="/chat"    element={<Navigate to="/feed" replace />} />
          <Route path="/chat/*"  element={<Navigate to="/feed" replace />} />
          <Route path="*"        element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}
