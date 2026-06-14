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
      .from('profiles').select('full_name, avatar_url').eq('id', userId).single();
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

  const firstName =
    profile?.full_name?.split(' ')[0] ||
    user?.user_metadata?.full_name?.split(' ')[0] ||
    user?.user_metadata?.name?.split(' ')[0] ||
    user?.email?.split('@')[0] ||
    'Friend';

  // ── Feature cards ──
  // "Friends Chat" removed — chat is now inside the Feed (Messages tab)
  const features = [
    { icon: '🤖', title: 'Buddy AI Chat',    sub: 'Chat with your smart AI',    path: '/ai-chat',        cls: 'ai-card' },
    { icon: '📱', title: 'Social Feed',       sub: 'Share posts with everyone',  path: '/feed',           cls: 'feed-card' },
    { icon: '👤', title: 'My Profile',        sub: 'Edit your profile',          path: '/profile',        cls: 'profile-card' },
    { icon: '🎨', title: 'AI Image Creator',  sub: 'Generate amazing images',    path: '/image-creator',  cls: 'image-card' },
    { icon: '📰', title: 'News Feed',         sub: 'Latest news & updates',      path: '/news',           cls: 'news-card' },
  ];

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
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt="profile" className="header-avatar" />
              : <div className="header-avatar-letter">{firstName[0]?.toUpperCase()}</div>}
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

      {/* Feature Grid — 5 cards, no Friends Chat */}
      <div className="features-grid">
        {features.map((f) => (
          <div key={f.title} className={`feature-card ${f.cls}`} onClick={() => navigate(f.path)}>
            <div className="feature-icon">{f.icon}</div>
            <div className="feature-info">
              <h3>{f.title}</h3>
              <p>{f.sub}</p>
            </div>
            <div className="feature-arrow">→</div>
          </div>
        ))}
      </div>

      <div className="home-footer">
        <p>Logged in as <strong>{user?.email}</strong></p>
      </div>
    </div>
  );
}
