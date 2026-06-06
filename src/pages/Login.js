import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabase';
import './Auth.css';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    // If already logged in, go to home
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/home');
    });

    // This catches Google login redirect automatically
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          navigate('/home');
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
    } else {
      navigate('/home');
    }
    setLoading(false);
  };

  const handleGoogle = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'https://buddycom.vercel.app/home'
      }
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
          <p className="logo-sub">Your smart AI companion</p>
        </div>

        <h2 className="auth-title">Welcome Back! 👋</h2>
        <p className="auth-desc">Sign in to continue to Buddy</p>

        {error && <div className="auth-error">⚠️ {error}</div>}

        <form onSubmit={handleLogin} className="auth-form">
          <div className="input-group">
            <span className="input-icon">📧</span>
            <input
              type="email"
              placeholder="Enter your email"
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
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="auth-input"
            />
            <span className="input-toggle" onClick={() => setShowPass(!showPass)}>
              {showPass ? '🙈' : '👁️'}
            </span>
          </div>

          <div className="auth-row">
            <label className="remember-me">
              <input type="checkbox" /> Remember me
            </label>
            <a href="#" className="forgot-link">Forgot Password?</a>
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? <span className="spinner"></span> : '🚀 Sign In'}
          </button>
        </form>

        <div className="divider"><span>or continue with</span></div>

        <div className="social-btns">
          <button className="btn-social btn-google" onClick={handleGoogle} disabled={loading}>
            <img src="https://www.google.com/favicon.ico" alt="Google" width="18" />
            Google
          </button>
        </div>

        <p className="auth-switch">
          Don't have an account? <Link to="/register" className="switch-link">Sign Up</Link>
        </p>
      </div>
    </div>
  );
}
