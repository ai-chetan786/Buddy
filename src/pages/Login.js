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
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/home');
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) navigate('/home');
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    else navigate('/home');
    setLoading(false);
  };

  const handleGoogle = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: 'https://buddycom.vercel.app/home' }
    });
    if (error) setError(error.message);
    setLoading(false);
  };

  return (
    <div className="auth-bg-new">
      {/* Background bubbles */}
      <div className="bg-circle bg-circle-1"></div>
      <div className="bg-circle bg-circle-2"></div>
      <div className="bg-circle bg-circle-3"></div>

      <div className="auth-card-new">
        {/* Robot mascot */}
        <div className="robot-section">
          <div className="robot-bubble">Hey Buddy!</div>
          <div className="robot-container">
            <div className="robot-head">
              <div className="robot-face">
                <div className="robot-eyes">
                  <div className="robot-eye"><div className="robot-pupil"></div></div>
                  <div className="robot-eye"><div className="robot-pupil"></div></div>
                </div>
                <div className="robot-smile"></div>
              </div>
              <div className="robot-ear robot-ear-left"></div>
              <div className="robot-ear robot-ear-right"></div>
              <div className="robot-antenna"></div>
            </div>
            <div className="robot-body">
              <div className="robot-chest">
                <div className="robot-light"></div>
                <div className="robot-light"></div>
                <div className="robot-light"></div>
              </div>
              <div className="robot-arms">
                <div className="robot-arm robot-arm-left"></div>
                <div className="robot-arm robot-arm-right"></div>
              </div>
            </div>
          </div>
          <div className="welcome-back-line">
            <span className="line-dash">——</span>
            Welcome back buddy 👋
            <span className="line-dash">——</span>
          </div>
        </div>

        {/* Logo */}
        <div className="brand-logo">
          <span className="brand-buddy">Buddy</span>
          <span className="brand-ai"> AI</span>
        </div>

        {/* Form heading */}
        <h2 className="auth-heading-new">Glad to see you again</h2>
        <p className="auth-sub-new">Let's sign in to continue ✨</p>

        {error && <div className="auth-error-new">⚠️ {error}</div>}

        <form onSubmit={handleLogin} className="auth-form-new">
          <div className="input-group-new">
            <span className="input-icon-new">👤</span>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="auth-input-new"
            />
            <span className="input-icon-right">✉️</span>
          </div>

          <div className="input-group-new">
            <span className="input-icon-new">🔒</span>
            <input
              type={showPass ? 'text' : 'password'}
              placeholder="Enter your password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="auth-input-new"
            />
            <span className="input-icon-right toggle-pass" onClick={() => setShowPass(!showPass)}>
              {showPass ? '🙈' : '👁️'}
            </span>
          </div>

          <div className="auth-row-new">
            <label className="remember-new">
              <input type="checkbox" /> Remember me
            </label>
            <a href="#" className="forgot-new">Forgot password?</a>
          </div>

          <button type="submit" className="btn-login-new" disabled={loading}>
            {loading ? <span className="spinner-new"></span> : 'Login to Buddy'}
            {!loading && <span className="btn-arrow">✓</span>}
          </button>
        </form>

        <div className="divider-new">
          <span>• OR CONTINUE WITH •</span>
        </div>

        <div className="social-btns-new">
          <button className="btn-social-new btn-google-new" onClick={handleGoogle} disabled={loading}>
            <img src="https://www.google.com/favicon.ico" alt="Google" width="20" />
          </button>
        </div>

        <p className="auth-switch-new">
          Don't have an account? <Link to="/register" className="switch-link-new">Sign up →</Link>
        </p>
      </div>
    </div>
  );
}
