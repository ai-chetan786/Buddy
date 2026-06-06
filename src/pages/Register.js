import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabase';
import './Auth.css';

export default function Register() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPass, setShowPass] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, username }
      }
    });

    if (error) {
      setError(error.message);
    } else {
      // Save profile
      if (data.user) {
        await supabase.from('profiles').insert({
          id: data.user.id,
          full_name: fullName,
          username: username,
          avatar_url: ''
        });
      }
      setSuccess('✅ Account created! Please check your email to verify, then login.');
    }
    setLoading(false);
  };

  const handleGoogle = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/home' }
    });
    if (error) setError(error.message);
    setLoading(false);
  };

  return (
    <div className="auth-bg">
      <div className="bubble bubble-1"></div>
      <div className="bubble bubble-2"></div>
      <div className="bubble bubble-3"></div>
      <div className="bubble bubble-4"></div>

      <div className="auth-card">
        <div className="auth-logo">
          <div className="logo-circle">
            <span className="logo-robot">🤖</span>
          </div>
          <h1 className="logo-text">Buddy AI</h1>
          <p className="logo-sub">Join the community!</p>
        </div>

        <h2 className="auth-title">Create Account 🎉</h2>
        <p className="auth-desc">Sign up to start your Buddy journey</p>

        {error && <div className="auth-error">⚠️ {error}</div>}
        {success && <div className="auth-success">{success}</div>}

        <form onSubmit={handleRegister} className="auth-form">
          <div className="input-group">
            <span className="input-icon">👤</span>
            <input
              type="text"
              placeholder="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="auth-input"
            />
          </div>

          <div className="input-group">
            <span className="input-icon">🏷️</span>
            <input
              type="text"
              placeholder="Username (e.g. chetan786)"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
              required
              className="auth-input"
            />
          </div>

          <div className="input-group">
            <span className="input-icon">📧</span>
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="auth-input"
            />
          </div>

          <div className="input-group">
            <span className="input-icon">🔒</span>
            <input
              type={showPass ? 'text' : 'password'}
              placeholder="Create password (min 6 chars)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="auth-input"
            />
            <span className="input-toggle" onClick={() => setShowPass(!showPass)}>
              {showPass ? '🙈' : '👁️'}
            </span>
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? <span className="spinner"></span> : '✨ Create Account'}
          </button>
        </form>

        <div className="divider"><span>or sign up with</span></div>

        <div className="social-btns">
          <button className="btn-social btn-google" onClick={handleGoogle} disabled={loading}>
            <img src="https://www.google.com/favicon.ico" alt="Google" width="18" />
            Google
          </button>
        </div>

        <p className="auth-switch">
          Already have an account? <Link to="/login" className="switch-link">Sign In</Link>
        </p>
      </div>
    </div>
  );
}
