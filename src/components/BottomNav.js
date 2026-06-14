import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './BottomNav.css';

// ============================================
// GLOBAL BOTTOM NAV
// ============================================
// HIDDEN on /feed — Feed has its OWN built-in
// bottom nav (Home, Friends, +, Messages, Profile)
// Also hidden on /chat/* — chat is inside Feed now
// Also hidden on auth pages
// ============================================

const NAV_ITEMS = [
  { icon: '🏠', label: 'Home',    path: '/home' },
  { icon: '🤖', label: 'AI Chat', path: '/ai-chat' },
  { icon: '🎨', label: 'Create',  path: '/image-creator' },
  { icon: '📰', label: 'News',    path: '/news' },
  { icon: '👤', label: 'Profile', path: '/profile' },
];

// Pages where global BottomNav should NOT show
const HIDDEN_ON = ['/', '/login', '/register', '/feed'];

export default function BottomNav() {
  const navigate  = useNavigate();
  const location  = useLocation();

  // Hide on feed (has own nav), auth pages, old chat route
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
