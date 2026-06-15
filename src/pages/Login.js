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

  // New state for forgot password flow
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [forgotError, setForgotError] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/feed');
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) navigate('/feed');
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    else navigate('/feed');
    setLoading(false);
  };

  // ✅ FIXED: now uses window.location.origin so it works on localhost AND Vercel
  const handleGoogle = async () => {
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/feed' }
    });
    if (error) setError(error.message);
    setLoading(false);
  };

  // ✅ NEW: Forgot password — sends a reset email via Supabase
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      setForgotError('Please enter your email address.');
      return;
    }
    setForgotLoading(true);
    setForgotError('');
    setForgotSuccess('');

    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: window.location.origin + '/login'
    });

    if (error) {
      setForgotError(error.message);
    } else {
      setForgotSuccess('✅ Password reset email sent! Check your inbox.');
    }
    setForgotLoading(false);
  };

  // ── Forgot Password Modal ──────────────────────────────────
  if (showForgot) {
    return (
      <div className="auth-bg-new">
        <div className="bg-circle bg-circle-1"></div>
        <div className="bg-circle bg-circle-2"></div>
        <div className="bg-circle bg-circle-3"></div>

        <div className="auth-card-new">
          <div className="brand-logo">
            <span className="brand-buddy">Buddy</span>
            <span className="brand-ai"> AI</span>
          </div>

          <h2 className="auth-heading-new">Reset Password 🔑</h2>
          <p className="auth-sub-new">Enter your email and we'll send a reset link</p>

          {forgotError && <div className="auth-error-new">⚠️ {forgotError}</div>}
          {forgotSuccess && (
            <div className="auth-error-new" style={{ background: '#d1fae5', color: '#065f46', borderColor: '#6ee7b7' }}>
              {forgotSuccess}
            </div>
          )}

          {!forgotSuccess && (
            <form onSubmit={handleForgotPassword} className="auth-form-new">
              <div className="input-group-new">
                <span className="input-icon-new">📧</span>
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  required
                  className="auth-input-new"
                  autoFocus
                />
              </div>
              <button type="submit" className="btn-login-new" disabled={forgotLoading}>
                {forgotLoading ? <span className="spinner-new"></span> : 'Send Reset Link 📨'}
              </button>
            </form>
          )}

          <p className="auth-switch-new" style={{ marginTop: '16px' }}>
            <button
              onClick={() => { setShowForgot(false); setForgotSuccess(''); setForgotError(''); }}
              style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '14px', fontFamily: 'inherit' }}
            >
              ← Back to Login
            </button>
          </p>
        </div>
      </div>
    );
  }

  // ── Main Login Form ──────────────────────────────────────
  return (
    <div className="auth-bg-new">
      <div className="bg-circle bg-circle-1"></div>
      <div className="bg-circle bg-circle-2"></div>
      <div className="bg-circle bg-circle-3"></div>

      <div className="auth-card-new">
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

        <div className="brand-logo">
          <span className="brand-buddy">Buddy</span>
          <span className="brand-ai"> AI</span>
        </div>

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
            {/* ✅ FIXED: Now opens forgot password screen instead of doing nothing */}
            <button
              type="button"
              className="forgot-new"
              onClick={() => { setShowForgot(true); setForgotEmail(email); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Forgot password?
            </button>
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
