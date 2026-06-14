import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './BottomNav.css';

// ── GLOBAL BOTTOM NAV ────────────────────────
// Shows on: /home, /ai-chat, /image-creator, /news, /profile
// HIDDEN on: /feed (Feed has its own built-in nav)
//            /login, /register (auth pages)
//            /chat, /chat/* (old routes — now redirect to /feed)

const NAV_ITEMS = [
  { icon: '🏠', label: 'Home',    path: '/home'          },
  { icon: '🤖', label: 'AI Chat', path: '/ai-chat'       },
  { icon: '📱', label: 'Feed',    path: '/feed'          },
  { icon: '🎨', label: 'Create',  path: '/image-creator' },
  { icon: '👤', label: 'Profile', path: '/profile'       },
];

const HIDDEN_ON = ['/', '/login', '/register', '/feed'];

export default function BottomNav() {
  const navigate  = useNavigate();
  const location  = useLocation();

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
