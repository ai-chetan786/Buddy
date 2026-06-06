import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import './Home.css';

export default function Home() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        navigate('/login');
      } else {
        setUser(data.user);
      }
    });
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const firstName = user?.user_metadata?.full_name?.split(' ')[0]
    || user?.email?.split('@')[0]
    || 'Friend';

  return (
    <div className="home-bg">
      {/* Header */}
      <div className="home-header">
        <div className="home-header-left">
          <div className="home-logo-small">🤖</div>
          <span className="home-logo-text">Buddy AI</span>
        </div>
        <button className="logout-btn" onClick={handleLogout}>🚪 Logout</button>
      </div>

      {/* Welcome */}
      <div className="welcome-section">
        <div className="welcome-emoji">👋</div>
        <h1 className="welcome-title">Hey, {firstName}!</h1>
        <p className="welcome-sub">What would you like to do today?</p>
      </div>

      {/* Feature Cards */}
      <div className="features-grid">
        <div className="feature-card ai-card" onClick={() => navigate('/ai-chat')}>
          <div className="feature-icon">🤖</div>
          <div className="feature-info">
            <h3>Buddy AI Chat</h3>
            <p>Chat with your smart AI companion</p>
          </div>
          <div className="feature-arrow">→</div>
        </div>

        <div className="feature-card feed-card coming">
          <div className="feature-icon">📱</div>
          <div className="feature-info">
            <h3>Social Feed</h3>
            <p>Coming soon...</p>
          </div>
          <div className="coming-badge">Soon</div>
        </div>

        <div className="feature-card chat-card coming">
          <div className="feature-icon">💬</div>
          <div className="feature-info">
            <h3>Friends Chat</h3>
            <p>Coming soon...</p>
          </div>
          <div className="coming-badge">Soon</div>
        </div>

        <div className="feature-card image-card coming">
          <div className="feature-icon">🎨</div>
          <div className="feature-info">
            <h3>AI Image Creator</h3>
            <p>Coming soon...</p>
          </div>
          <div className="coming-badge">Soon</div>
        </div>

        <div className="feature-card news-card coming">
          <div className="feature-icon">📰</div>
          <div className="feature-info">
            <h3>News Feed</h3>
            <p>Coming soon...</p>
          </div>
          <div className="coming-badge">Soon</div>
        </div>

        <div className="feature-card profile-card coming">
          <div className="feature-icon">👤</div>
          <div className="feature-info">
            <h3>My Profile</h3>
            <p>Coming soon...</p>
          </div>
          <div className="coming-badge">Soon</div>
        </div>
      </div>

      {/* Bottom user info */}
      <div className="home-footer">
        <p>Logged in as <strong>{user?.email}</strong></p>
      </div>
    </div>
  );
}
