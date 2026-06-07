import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import './Home.css';

export default function Home() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { navigate('/login'); return; }
      setUser(session.user);
      loadProfile(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') navigate('/login');
      if (event === 'SIGNED_IN' && session) {
        setUser(session.user);
        loadProfile(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadProfile = async (userId) => {
    const { data } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', userId)
      .single();
    setProfile(data);
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="home-loading">
        <div className="loading-logo">🤖</div>
        <p>Loading Buddy...</p>
      </div>
    );
  }

  const firstName = profile?.full_name?.split(' ')[0]
    || user?.user_metadata?.full_name?.split(' ')[0]
    || user?.user_metadata?.name?.split(' ')[0]
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
        <div className="home-header-right">
          <button className="profile-icon-btn" onClick={() => navigate('/profile')}>
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="profile" className="header-avatar" />
            ) : (
              <div className="header-avatar-letter">
                {(firstName)[0]?.toUpperCase()}
              </div>
            )}
          </button>
          <button className="logout-btn" onClick={handleLogout}>🚪</button>
        </div>
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
            <p>Chat with your smart AI</p>
          </div>
          <div className="feature-arrow">→</div>
        </div>

        <div className="feature-card feed-card" onClick={() => navigate('/feed')}>
          <div className="feature-icon">📱</div>
          <div className="feature-info">
            <h3>Social Feed</h3>
            <p>Share posts with everyone</p>
          </div>
          <div className="feature-arrow">→</div>
        </div>

        <div className="feature-card chat-card" onClick={() => navigate('/chat')}>
          <div className="feature-icon">💬</div>
          <div className="feature-info">
            <h3>Friends Chat</h3>
            <p>Message your friends</p>
          </div>
          <div className="feature-arrow">→</div>
        </div>

        <div className="feature-card profile-card" onClick={() => navigate('/profile')}>
          <div className="feature-icon">👤</div>
          <div className="feature-info">
            <h3>My Profile</h3>
            <p>Edit your profile</p>
          </div>
          <div className="feature-arrow">→</div>
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
      </div>

      <div className="home-footer">
        <p>Logged in as <strong>{user?.email}</strong></p>
      </div>
    </div>
  );
}
