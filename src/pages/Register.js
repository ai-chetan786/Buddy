import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabase';
import buddyLogo from '../assets/buddy-logo.png';
import './Auth.css';

const ROLES = [
  { id:'customer',  icon:'🛍️', label:'Customer',         desc:'Order food & groceries via AI chat' },
  { id:'seller',    icon:'🏪', label:'Seller / Shop',     desc:'Register your shop and sell products' },
  { id:'delivery',  icon:'🛵', label:'Delivery Partner',  desc:'Accept deliveries and earn money' },
];

export default function Register() {
  const navigate = useNavigate();
  const [role, setRole] = useState('customer');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
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
      options: { data: { full_name: fullName, username } }
    });
    if (error) { setError(error.message); setLoading(false); return; }
    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        full_name: fullName,
        username: username,
        phone: phone,
        role: role,
        avatar_url: ''
      });
    }
    setSuccess('✅ Account created! Check your email to verify, then login.');
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
      <div className="bg-circle bg-circle-1"></div>
      <div className="bg-circle bg-circle-2"></div>
      <div className="bg-circle bg-circle-3"></div>

      <div className="auth-card-new">
        <div className="robot-section">
          <div className="robot-bubble">Join us!</div>
          <img src={buddyLogo} alt="Buddy AI" className="buddy-logo-img" />
          <div className="welcome-back-line">
            <span className="line-dash">——</span>
            Start your Buddy journey 🎉
            <span className="line-dash">——</span>
          </div>
        </div>

        <div className="brand-logo">
          <span className="brand-buddy">Buddy</span>
          <span className="brand-ai"> AI</span>
        </div>

        <h2 className="auth-heading-new">Create your account</h2>
        <p className="auth-sub-new">Choose your role to get started ✨</p>

        {/* Role Picker */}
        <div style={{ display:'flex', gap:8, marginBottom:16 }}>
          {ROLES.map(r => (
            <div key={r.id} onClick={() => setRole(r.id)} style={{
              flex:1, padding:'10px 6px', borderRadius:14, cursor:'pointer', textAlign:'center',
              border: role===r.id ? '2px solid #2563EB' : '1.5px solid #e2e8f0',
              background: role===r.id ? '#EFF6FF' : 'white',
              transition:'all .2s'
            }}>
              <div style={{ fontSize:22 }}>{r.icon}</div>
              <div style={{ fontSize:10, fontWeight:700, color: role===r.id ? '#2563EB' : '#1E293B', marginTop:3 }}>{r.label}</div>
            </div>
          ))}
        </div>
        <p style={{ fontSize:11, color:'#64748B', textAlign:'center', marginBottom:14 }}>
          {ROLES.find(r=>r.id===role)?.desc}
        </p>

        {error && <div className="auth-error-new">⚠️ {error}</div>}
        {success && <div className="auth-success-new">{success}</div>}

        {!success && (
          <form onSubmit={handleRegister} className="auth-form-new">
            <div className="input-group-new">
              <span className="input-icon-new">👤</span>
              <input type="text" placeholder="Full Name" value={fullName}
                onChange={e=>setFullName(e.target.value)} required className="auth-input-new" />
            </div>
            <div className="input-group-new">
              <span className="input-icon-new">🏷️</span>
              <input type="text" placeholder="Username (e.g. chetan786)" value={username}
                onChange={e=>setUsername(e.target.value.toLowerCase().replace(/\s/g,''))}
                required className="auth-input-new" />
            </div>
            <div className="input-group-new">
              <span className="input-icon-new">📱</span>
              <input type="tel" placeholder="Phone number (for orders)" value={phone}
                onChange={e=>setPhone(e.target.value)} className="auth-input-new" />
            </div>
            <div className="input-group-new">
              <span className="input-icon-new">✉️</span>
              <input type="email" placeholder="Email address" value={email}
                onChange={e=>setEmail(e.target.value)} required className="auth-input-new" />
            </div>
            <div className="input-group-new">
              <span className="input-icon-new">🔒</span>
              <input type={showPass?'text':'password'} placeholder="Password (min 6 chars)"
                value={password} onChange={e=>setPassword(e.target.value)}
                required minLength={6} className="auth-input-new" />
              <span className="input-icon-right toggle-pass" onClick={()=>setShowPass(!showPass)}>
                {showPass?'🙈':'👁️'}
              </span>
            </div>
            <button type="submit" className="btn-login-new" disabled={loading}>
              {loading ? <span className="spinner-new"></span> : `Join as ${ROLES.find(r=>r.id===role)?.label}`}
              {!loading && <span className="btn-arrow">✓</span>}
            </button>
          </form>
        )}

        {!success && (
          <>
            <div className="divider-new"><span>• OR SIGN UP WITH •</span></div>
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
