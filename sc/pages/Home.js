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

  return (
    <div className="home-bg">
      <div className="home-card">
        <div className="home-logo">🤖</div>
        <h1 className="home-title">Welcome to Buddy AI!</h1>
        <p className="home-email">
          Logged in as: <strong>{user?.email}</strong>
        </p>
        <p className="home-coming">
          🚀 Home Feed, AI Chat & more coming soon...
        </p>
        <button className="btn-logout" onClick={handleLogout}>
          🚪 Logout
        </button>
      </div>
    </div>
  );
}
