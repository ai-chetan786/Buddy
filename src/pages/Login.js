import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabase';
import buddyLogo from '../assets/buddy-logo.png';
import './Auth.css';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(true);
  const [showForgot, setShowForgot] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);

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

  const handleGoogle = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/feed' }
    });
    if (error) setError(error.message);
    setLoading(false);
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!resetEmail.trim()) return;
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: window.location.origin + '/login'
    });
    if (error) setError(error.message);
    else setResetSent(true);
    setLoading(false);
  };

  return (
    <div className="auth-bg-new">
      {/* Background bubbles */}
      <div className="bg-circle bg-circle-1"></div>
      <div className="bg-circle bg-circle-2"></div>
      <div className="bg-circle bg-circle-3"></div>

      <div className="auth-card-new">
        {/* Real Buddy logo replaces the old CSS robot mascot */}
        <div className="robot-section">
          <div className="robot-bubble">Hey Buddy!</div>
          <img src={buddyLogo} alt="Buddy AI" className="buddy-logo-img" />
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

        {!showForgot ? (
          <>
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
                  <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} /> Remember me
                </label>
                <button type="button" className="forgot-new" onClick={() => setShowForgot(true)}>
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
          </>
        ) : (
          <>
            {/* Forgot password panel */}
            <h2 className="auth-heading-new">Reset your password</h2>
            <p className="auth-sub-new">
              {resetSent ? 'Check your email for a reset link 📩' : "We'll email you a reset link 🔑"}
            </p>

            {error && <div className="auth-error-new">⚠️ {error}</div>}

            {!resetSent ? (
              <form onSubmit={handleForgotPassword} className="auth-form-new">
                <div className="input-group-new">
                  <span className="input-icon-new">✉️</span>
                  <input
                    type="email"
                    placeholder="Enter your account email"
                    value={resetEmail}
                    onChange={e => setResetEmail(e.target.value)}
                    required
                    className="auth-input-new"
                  />
                </div>
                <button type="submit" className="btn-login-new" disabled={loading}>
                  {loading ? <span className="spinner-new"></span> : 'Send Reset Link'}
                </button>
              </form>
            ) : null}

            <p className="auth-switch-new">
              <button type="button" className="switch-link-new" onClick={() => { setShowForgot(false); setResetSent(false); setError(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                ← Back to login
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
