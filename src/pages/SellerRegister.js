import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';

const G = { blue:'#2563EB', lb:'#EFF6FF', sky:'#BFDBFE', bg:'#F0F4FF', gray:'#9CA3AF', dark:'#1E293B', red:'#EF4444', green:'#16A34A' };

export default function SellerRegister() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [existingShop, setExistingShop] = useState(null);
  const [form, setForm] = useState({ shop_name:'', description:'', category:'food', address:'', phone:'' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [imageFile, setImageFile] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return navigate('/login');
      setUser(session.user);
      const { data } = await supabase.from('shops').select('*').eq('owner_id', session.user.id).single();
      if (data) setExistingShop(data);
    });
  }, [navigate]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    let image_url = '';
    if (imageFile) {
      const path = `shops/${user.id}_${Date.now()}.${imageFile.name.split('.').pop()}`;
      const { error: upErr } = await supabase.storage.from('products').upload(path, imageFile);
      if (!upErr) {
        const { data: { publicUrl } } = supabase.storage.from('products').getPublicUrl(path);
        image_url = publicUrl;
      }
    }
    const { error } = await supabase.from('shops').insert({
      owner_id: user.id, ...form, image_url,
      verification_status: 'pending'
    });
    if (error) { setError(error.message); setSaving(false); return; }
    await supabase.from('profiles').update({ role: 'seller' }).eq('id', user.id);
    navigate('/seller/dashboard');
  };

  if (existingShop) return (
    <div style={{ minHeight:'100vh', background:G.bg, display:'flex', alignItems:'center', justifyContent:'center', padding:20, fontFamily:'Segoe UI,sans-serif' }}>
      <div style={{ background:'white', borderRadius:20, padding:30, textAlign:'center', maxWidth:380, width:'100%' }}>
        <div style={{ fontSize:48, marginBottom:12 }}>🏪</div>
        <h2 style={{ color:G.dark, marginBottom:8 }}>You already have a shop</h2>
        <p style={{ color:G.gray, fontSize:13, marginBottom:20 }}><b>{existingShop.shop_name}</b> — {existingShop.verification_status === 'approved' ? '✅ Approved' : '⏳ Pending verification'}</p>
        <button onClick={() => navigate('/seller/dashboard')} style={{ background:G.blue, color:'white', border:'none', borderRadius:14, padding:'12px 24px', fontSize:14, fontWeight:700, cursor:'pointer', width:'100%' }}>
          Go to Seller Dashboard →
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:'100vh', background:G.bg, fontFamily:'Segoe UI,sans-serif', paddingBottom:40 }}>
      {/* Header */}
      <div style={{ background:`linear-gradient(135deg,${G.blue},#1D4ED8)`, padding:'48px 16px 16px', display:'flex', alignItems:'center', gap:12 }}>
        <span onClick={() => navigate('/feed')} style={{ color:'white', fontSize:22, cursor:'pointer' }}>←</span>
        <div>
          <div style={{ color:'white', fontSize:18, fontWeight:800 }}>🏪 Register Your Shop</div>
          <div style={{ color:'rgba(255,255,255,.7)', fontSize:12 }}>Join Buddy Marketplace</div>
        </div>
      </div>

      <div style={{ maxWidth:480, margin:'0 auto', padding:'20px 16px' }}>
        {error && <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', color:G.red, padding:'10px 14px', borderRadius:12, fontSize:13, marginBottom:16 }}>⚠️ {error}</div>}

        <div style={{ background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:12, padding:'10px 14px', fontSize:12, color:'#92400E', marginBottom:16 }}>
          ⏳ Your shop will be reviewed by our team. You'll get notified once approved (usually within 24 hours).
        </div>

        <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {[
            { label:'Shop Name *', key:'shop_name', type:'text', ph:'e.g. Spice King Restaurant' },
            { label:'Description', key:'description', type:'text', ph:'What do you sell?' },
            { label:'Address *', key:'address', type:'text', ph:'Full shop address' },
            { label:'Phone Number *', key:'phone', type:'tel', ph:'Customer contact number' },
          ].map(f => (
            <div key={f.key}>
              <label style={{ fontSize:13, fontWeight:600, color:G.dark, display:'block', marginBottom:6 }}>{f.label}</label>
              <input value={form[f.key]} onChange={e => set(f.key, e.target.value)}
                placeholder={f.ph} required={f.label.includes('*')} type={f.type}
                style={{ width:'100%', border:`1.5px solid ${G.sky}`, borderRadius:12, padding:'11px 14px', fontSize:13, outline:'none', fontFamily:'inherit', color:G.dark }} />
            </div>
          ))}

          <div>
            <label style={{ fontSize:13, fontWeight:600, color:G.dark, display:'block', marginBottom:6 }}>Category *</label>
            <select value={form.category} onChange={e => set('category', e.target.value)}
              style={{ width:'100%', border:`1.5px solid ${G.sky}`, borderRadius:12, padding:'11px 14px', fontSize:13, outline:'none', fontFamily:'inherit', color:G.dark, background:'white' }}>
              {[['food','🍛 Food'],['grocery','🛒 Grocery'],['restaurant','🍽️ Restaurant'],['bakery','🥐 Bakery'],['pharmacy','💊 Pharmacy'],['other','📦 Other']].map(([v,l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize:13, fontWeight:600, color:G.dark, display:'block', marginBottom:6 }}>Shop Photo</label>
            <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files[0])}
              style={{ fontSize:13, color:G.gray }} />
          </div>

          <button type="submit" disabled={saving} style={{
            background:saving?'#e2e8f0':`linear-gradient(135deg,#60A5FA,${G.blue})`,
            color:saving?G.gray:'white', border:'none', borderRadius:14, padding:'14px',
            fontSize:15, fontWeight:700, cursor:saving?'default':'pointer', fontFamily:'inherit', marginTop:8
          }}>
            {saving ? '⏳ Registering...' : '🚀 Register My Shop'}
          </button>
        </form>
      </div>
    </div>
  );
}
