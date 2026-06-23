import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabase';
import buddyLogo from '../assets/buddy-logo.png';
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
      options: { redirectTo: window.location.origin + '/feed' }
    });
    if (error) setError(error.message);
    setLoading(false);
  };

  return (
    <div className="auth-bg-new">
      {/* Background bubbles — same as Login for visual consistency */}
      <div className="bg-circle bg-circle-1"></div>
      <div className="bg-circle bg-circle-2"></div>
      <div className="bg-circle bg-circle-3"></div>

      <div className="auth-card-new">
        {/* Real Buddy logo — same as Login */}
        <div className="robot-section">
          <div className="robot-bubble">Join us!</div>
          <img src={buddyLogo} alt="Buddy AI" className="buddy-logo-img" />
          <div className="welcome-back-line">
            <span className="line-dash">——</span>
            Start your Buddy journey 🎉
            <span className="line-dash">——</span>
          </div>
        </div>

        {/* Logo */}
        <div className="brand-logo">
          <span className="brand-buddy">Buddy</span>
          <span className="brand-ai"> AI</span>
        </div>

        <h2 className="auth-heading-new">Create your account</h2>
        <p className="auth-sub-new">Join the Buddy community ✨</p>

        {error && <div className="auth-error-new">⚠️ {error}</div>}
        {success && <div className="auth-success-new">{success}</div>}

        {!success && (
          <form onSubmit={handleRegister} className="auth-form-new">
            <div className="input-group-new">
              <span className="input-icon-new">👤</span>
              <input
                type="text"
                placeholder="Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="auth-input-new"
              />
            </div>

            <div className="input-group-new">
              <span className="input-icon-new">🏷️</span>
              <input
                type="text"
                placeholder="Username (e.g. chetan786)"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                required
                className="auth-input-new"
              />
            </div>

            <div className="input-group-new">
              <span className="input-icon-new">👤</span>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="auth-input-new"
              />
              <span className="input-icon-right">✉️</span>
            </div>

            <div className="input-group-new">
              <span className="input-icon-new">🔒</span>
              <input
                type={showPass ? 'text' : 'password'}
                placeholder="Create password (min 6 chars)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="auth-input-new"
              />
              <span className="input-icon-right toggle-pass" onClick={() => setShowPass(!showPass)}>
                {showPass ? '🙈' : '👁️'}
              </span>
            </div>

            <button type="submit" className="btn-login-new" disabled={loading}>
              {loading ? <span className="spinner-new"></span> : 'Create Account'}
              {!loading && <span className="btn-arrow">✓</span>}
            </button>
          </form>
        )}

        {!success && (
          <>
            <div className="divider-new">
              <span>• OR SIGN UP WITH •</span>
            </div>

            <div className="social-btns-new">
              <button className="btn-social-new btn-google-new" onClick={handleGoogle} disabled={loading}>
                <img src="https://www.google.com/favicon.ico" alt="Google" width="20" />
              </button>
            </div>
          </>
        )}

        <p className="auth-switch-new">
          Already have an account? <Link to="/login" className="switch-link-new">Sign in →</Link>
        </p>
      </div>
    </div>
  );
}
