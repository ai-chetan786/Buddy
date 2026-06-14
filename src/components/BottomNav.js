import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './BottomNav.css';

// =====================================================
// GLOBAL BOTTOM NAV
// =====================================================
// Hidden on /feed because Feed has its OWN built-in
// TikTok-style bottom nav with Messages inside it.
// Hidden on /chat/* because chat is now inside /feed.
// =====================================================

const NAV_ITEMS = [
  { icon: '🏠', label: 'Home',    path: '/home' },
  { icon: '🤖', label: 'AI Chat', path: '/ai-chat' },
  { icon: '📱', label: 'Feed',    path: '/feed' },
  { icon: '🎨', label: 'Create',  path: '/image-creator' },
  { icon: '👤', label: 'Profile', path: '/profile' },
];

const HIDDEN_ON = ['/', '/login', '/register', '/feed'];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  // Hide on feed (has own nav), auth pages, and old chat routes
  const shouldHide =
    HIDDEN_ON.includes(location.pathname) ||
    location.pathname.startsWith('/chat');

  if (shouldHide) return null;

  return (
    <div className="bottom-nav">
      {NAV_ITEMS.map((item, i) => {
        const isActive = location.pathname === item.path;
        return (
          <button
            key={i}
            className={`nav-item ${isActive ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
            {isActive && <span className="nav-dot"></span>}
          </button>
        );
      })}
    </div>
  );
}
