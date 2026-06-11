import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './BottomNav.css';

const NAV_ITEMS = [
  { icon: '🏠', label: 'Home', path: '/home' },
  { icon: '📱', label: 'Feed', path: '/feed' },
  { icon: '🤖', label: 'AI', path: '/ai-chat' },
  { icon: '💬', label: 'Chat', path: '/chat' },
  { icon: '👤', label: 'Profile', path: '/profile' },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  // Don't show on auth pages
  const hiddenPaths = ['/', '/login', '/register'];
  if (hiddenPaths.includes(location.pathname)) return null;

  return (
    <div className="bottom-nav">
      {NAV_ITEMS.map((item, i) => {
        const isActive = location.pathname === item.path ||
          (item.path === '/chat' && location.pathname.startsWith('/chat'));
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

