import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';

const G = { blue:'#2563EB', lb:'#EFF6FF', sky:'#BFDBFE', bg:'#F0F4FF', gray:'#9CA3AF', dark:'#1E293B', red:'#EF4444', green:'#16A34A', orange:'#EA580C' };

const STEPS = ['Shop Basics', 'Location & Hours', 'Business Details', 'Review & Submit'];

const CATEGORIES = [
  { id:'restaurant', icon:'🍽️', label:'Restaurant' },
  { id:'food',       icon:'🍛', label:'Home Food' },
  { id:'grocery',    icon:'🛒', label:'Grocery' },
  { id:'bakery',     icon:'🥐', label:'Bakery' },
  { id:'pharmacy',   icon:'💊', label:'Pharmacy' },
  { id:'other',      icon:'📦', label:'Other' },
];

export default function SellerRegister() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [existingShop, setExistingShop] = useState(null);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [shopImage, setShopImage] = useState(null);
  const [shopImagePreview, setShopImagePreview] = useState(null);
  const [form, setForm] = useState({
    shop_name:'', description:'', category:'restaurant',
    address:'', city:'', phone:'',
    opening_time:'09:00', closing_time:'22:00',
    delivery_time:'30-45 mins', min_order:'0',
    fssai_number:'', gst_number:''
  });

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return navigate('/login');
      setUser(session.user);
      const { data } = await supabase.from('shops').select('*').eq('owner_id', session.user.id).single();
      if (data) setExistingShop(data);
    });
  }, [navigate]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    setSaving(true); setError('');
    try {
      let image_url = '';
      if (shopImage) {
        const path = `shops/${user.id}_${Date.now()}.jpg`;
        const { error: upErr } = await supabase.storage.from('products').upload(path, shopImage);
        if (!upErr) {
          const { data: { publicUrl } } = supabase.storage.from('products').getPublicUrl(path);
          image_url = publicUrl;
        }
      }
      const { error } = await supabase.from('shops').insert({
        owner_id: user.id,
        shop_name: form.shop_name,
        description: form.description,
        category: form.category,
        address: form.address + (form.city ? ', ' + form.city : ''),
        phone: form.phone,
        opening_time: form.opening_time,
        closing_time: form.closing_time,
        delivery_time: form.delivery_time,
        min_order: Number(form.min_order) || 0,
        fssai_number: form.fssai_number,
        gst_number: form.gst_number,
        image_url,
        verification_status: 'pending',
        is_open: true,
      });
      if (error) { setError(error.message); setSaving(false); return; }
      await supabase.from('profiles').update({ role:'seller' }).eq('id', user.id);
      navigate('/seller/dashboard');
    } catch(e) { setError(e.message); setSaving(false); }
  };

  if (existingShop) return (
    <div style={{ minHeight:'100vh', background:G.bg, display:'flex', alignItems:'center', justifyContent:'center', padding:20, fontFamily:'Segoe UI,sans-serif' }}>
      <div style={{ background:'white', borderRadius:20, padding:30, textAlign:'center', maxWidth:380, width:'100%', boxShadow:'0 4px 20px rgba(37,99,235,.1)' }}>
        <div style={{ fontSize:52, marginBottom:12 }}>🏪</div>
        <h2 style={{ color:G.dark, marginBottom:8 }}>{existingShop.shop_name}</h2>
        <p style={{ color:G.gray, fontSize:13, marginBottom:6 }}>{existingShop.category} · {existingShop.address}</p>
        <div style={{ display:'inline-block', background: existingShop.verification_status==='approved'?'#DCFCE7':'#FEF3C7', color: existingShop.verification_status==='approved'?'#166534':'#92400E', borderRadius:20, padding:'4px 14px', fontSize:12, fontWeight:700, marginBottom:20 }}>
          {existingShop.verification_status==='approved' ? '✅ Verified Shop' : '⏳ Pending Verification'}
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <button onClick={() => navigate('/seller/dashboard')} style={{ background:G.blue, color:'white', border:'none', borderRadius:14, padding:'13px', fontSize:14, fontWeight:700, cursor:'pointer' }}>📊 Go to Dashboard</button>
          <button onClick={() => navigate('/seller/products')} style={{ background:G.lb, color:G.blue, border:`1.5px solid ${G.sky}`, borderRadius:14, padding:'13px', fontSize:14, fontWeight:700, cursor:'pointer' }}>📦 Manage Products</button>
          <button onClick={() => navigate('/seller/profile')} style={{ background:'#F1F5FF', color:G.blue, border:'none', borderRadius:14, padding:'13px', fontSize:14, fontWeight:700, cursor:'pointer' }}>✏️ Edit Shop Profile</button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:'100vh', background:G.bg, fontFamily:'Segoe UI,sans-serif', paddingBottom:40 }}>
      <div style={{ background:`linear-gradient(135deg,${G.blue},#1D4ED8)`, padding:'48px 16px 20px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
          <span onClick={() => navigate('/feed')} style={{ color:'white', fontSize:22, cursor:'pointer' }}>←</span>
          <div>
            <div style={{ color:'white', fontSize:18, fontWeight:800 }}>🏪 Register Your Shop</div>
            <div style={{ color:'rgba(255,255,255,.7)', fontSize:12 }}>Join Buddy Marketplace — Only 8% commission</div>
          </div>
        </div>
        <div style={{ display:'flex', gap:6 }}>
          {STEPS.map((s, i) => (
            <div key={i} style={{ flex:1, height:4, borderRadius:2, background: i <= step ? 'white' : 'rgba(255,255,255,.3)', transition:'background .3s' }} />
          ))}
        </div>
        <div style={{ color:'rgba(255,255,255,.8)', fontSize:11, marginTop:6 }}>Step {step+1} of {STEPS.length} — {STEPS[step]}</div>
      </div>

      <div style={{ maxWidth:480, margin:'0 auto', padding:'20px 16px' }}>
        {error && <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', color:G.red, padding:'10px 14px', borderRadius:12, fontSize:13, marginBottom:16 }}>⚠️ {error}</div>}

        {/* STEP 0 — Shop Basics */}
        {step === 0 && (
          <div style={{ background:'white', borderRadius:16, padding:20, boxShadow:'0 2px 10px rgba(37,99,235,.07)' }}>
            <div style={{ fontSize:14, fontWeight:700, color:G.dark, marginBottom:16 }}>🏪 Shop Basics</div>

            {/* Shop photo */}
            <div onClick={() => document.getElementById('shopPhotoInput').click()} style={{ width:'100%', height:140, borderRadius:14, background:shopImagePreview?'#000':G.lb, border:`2px dashed ${G.sky}`, overflow:'hidden', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:16, position:'relative' }}>
              {shopImagePreview ? <img src={shopImagePreview} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : (
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:32 }}>📸</div>
                  <div style={{ fontSize:12, color:G.gray, marginTop:6 }}>Tap to add shop photo</div>
                </div>
              )}
            </div>
            <input id="shopPhotoInput" type="file" accept="image/*" style={{ display:'none' }} onChange={e => { const f=e.target.files[0]; if(f){setShopImage(f);setShopImagePreview(URL.createObjectURL(f));} }} />

            <div style={{ marginBottom:12 }}>
              <label style={{ fontSize:12, fontWeight:600, color:G.dark, display:'block', marginBottom:5 }}>Shop Name *</label>
              <input value={form.shop_name} onChange={e=>set('shop_name',e.target.value)} placeholder="e.g. Spice King Restaurant" style={{ width:'100%', border:`1.5px solid ${G.sky}`, borderRadius:10, padding:'10px 12px', fontSize:13, outline:'none', fontFamily:'inherit', color:G.dark }} />
            </div>

            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:12, fontWeight:600, color:G.dark, display:'block', marginBottom:8 }}>Category *</label>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
                {CATEGORIES.map(c => (
                  <div key={c.id} onClick={() => set('category', c.id)} style={{
                    padding:'10px 6px', borderRadius:12, textAlign:'center', cursor:'pointer',
                    border: form.category===c.id ? `2px solid ${G.blue}` : '1.5px solid #e2e8f0',
                    background: form.category===c.id ? G.lb : 'white'
                  }}>
                    <div style={{ fontSize:22 }}>{c.icon}</div>
                    <div style={{ fontSize:10, fontWeight:600, color: form.category===c.id ? G.blue : G.dark, marginTop:3 }}>{c.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginBottom:12 }}>
              <label style={{ fontSize:12, fontWeight:600, color:G.dark, display:'block', marginBottom:5 }}>Description</label>
              <textarea value={form.description} onChange={e=>set('description',e.target.value)} placeholder="What makes your shop special? What do you sell?" rows={3} style={{ width:'100%', border:`1.5px solid ${G.sky}`, borderRadius:10, padding:'10px 12px', fontSize:13, outline:'none', fontFamily:'inherit', color:G.dark, resize:'none' }} />
            </div>

            <div>
              <label style={{ fontSize:12, fontWeight:600, color:G.dark, display:'block', marginBottom:5 }}>Contact Phone *</label>
              <input value={form.phone} onChange={e=>set('phone',e.target.value)} type="tel" placeholder="Customer contact number" style={{ width:'100%', border:`1.5px solid ${G.sky}`, borderRadius:10, padding:'10px 12px', fontSize:13, outline:'none', fontFamily:'inherit', color:G.dark }} />
            </div>
          </div>
        )}

        {/* STEP 1 — Location & Hours */}
        {step === 1 && (
          <div style={{ background:'white', borderRadius:16, padding:20, boxShadow:'0 2px 10px rgba(37,99,235,.07)' }}>
            <div style={{ fontSize:14, fontWeight:700, color:G.dark, marginBottom:16 }}>📍 Location & Hours</div>

            {[
              { label:'Shop Address *', key:'address', ph:'Door no, Street, Area, Landmark' },
              { label:'City *', key:'city', ph:'e.g. Bangalore, Hyderabad, Pune' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom:12 }}>
                <label style={{ fontSize:12, fontWeight:600, color:G.dark, display:'block', marginBottom:5 }}>{f.label}</label>
                <input value={form[f.key]} onChange={e=>set(f.key,e.target.value)} placeholder={f.ph} style={{ width:'100%', border:`1.5px solid ${G.sky}`, borderRadius:10, padding:'10px 12px', fontSize:13, outline:'none', fontFamily:'inherit', color:G.dark }} />
              </div>
            ))}

            <div style={{ marginBottom:12 }}>
              <label style={{ fontSize:12, fontWeight:600, color:G.dark, display:'block', marginBottom:8 }}>Opening Hours</label>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <div>
                  <div style={{ fontSize:11, color:G.gray, marginBottom:4 }}>Opens at</div>
                  <input type="time" value={form.opening_time} onChange={e=>set('opening_time',e.target.value)} style={{ width:'100%', border:`1.5px solid ${G.sky}`, borderRadius:10, padding:'9px 12px', fontSize:13, outline:'none', fontFamily:'inherit' }} />
                </div>
                <div>
                  <div style={{ fontSize:11, color:G.gray, marginBottom:4 }}>Closes at</div>
                  <input type="time" value={form.closing_time} onChange={e=>set('closing_time',e.target.value)} style={{ width:'100%', border:`1.5px solid ${G.sky}`, borderRadius:10, padding:'9px 12px', fontSize:13, outline:'none', fontFamily:'inherit' }} />
                </div>
              </div>
            </div>

            <div style={{ marginBottom:12 }}>
              <label style={{ fontSize:12, fontWeight:600, color:G.dark, display:'block', marginBottom:5 }}>Average Delivery Time</label>
              <select value={form.delivery_time} onChange={e=>set('delivery_time',e.target.value)} style={{ width:'100%', border:`1.5px solid ${G.sky}`, borderRadius:10, padding:'10px 12px', fontSize:13, outline:'none', fontFamily:'inherit', background:'white', color:G.dark }}>
                {['15-20 mins','20-30 mins','30-45 mins','45-60 mins','60-90 mins'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div>
              <label style={{ fontSize:12, fontWeight:600, color:G.dark, display:'block', marginBottom:5 }}>Minimum Order Amount (₹)</label>
              <input type="number" value={form.min_order} onChange={e=>set('min_order',e.target.value)} placeholder="0 = no minimum" min="0" style={{ width:'100%', border:`1.5px solid ${G.sky}`, borderRadius:10, padding:'10px 12px', fontSize:13, outline:'none', fontFamily:'inherit', color:G.dark }} />
            </div>
          </div>
        )}

        {/* STEP 2 — Business Details */}
        {step === 2 && (
          <div style={{ background:'white', borderRadius:16, padding:20, boxShadow:'0 2px 10px rgba(37,99,235,.07)' }}>
            <div style={{ fontSize:14, fontWeight:700, color:G.dark, marginBottom:16 }}>📄 Business Details (Optional)</div>
            <div style={{ background:'#EFF6FF', borderRadius:10, padding:12, fontSize:11, color:'#1E40AF', marginBottom:16 }}>
              💡 Adding FSSAI and GST numbers helps build customer trust and unlocks premium features.
            </div>
            {[
              { label:'FSSAI License Number', key:'fssai_number', ph:'14-digit FSSAI number', hint:'Required for food businesses. Apply at fssai.gov.in' },
              { label:'GST Number', key:'gst_number', ph:'15-digit GSTIN', hint:'Required if your annual turnover exceeds ₹40L' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom:16 }}>
                <label style={{ fontSize:12, fontWeight:600, color:G.dark, display:'block', marginBottom:5 }}>{f.label}</label>
                <input value={form[f.key]} onChange={e=>set(f.key,e.target.value.toUpperCase())} placeholder={f.ph} style={{ width:'100%', border:`1.5px solid ${G.sky}`, borderRadius:10, padding:'10px 12px', fontSize:13, outline:'none', fontFamily:'inherit', color:G.dark }} />
                <div style={{ fontSize:10, color:G.gray, marginTop:3 }}>{f.hint}</div>
              </div>
            ))}
            <div style={{ background:'#DCFCE7', borderRadius:10, padding:12, fontSize:11, color:'#166534' }}>
              ✅ Buddy charges only 8% commission per order — vs Swiggy/Zomato's 25-30%. Your savings go directly to profits!
            </div>
          </div>
        )}

        {/* STEP 3 — Review */}
        {step === 3 && (
          <div style={{ background:'white', borderRadius:16, padding:20, boxShadow:'0 2px 10px rgba(37,99,235,.07)' }}>
            <div style={{ fontSize:14, fontWeight:700, color:G.dark, marginBottom:16 }}>✅ Review Your Shop</div>
            {shopImagePreview && (
              <div style={{ width:'100%', height:120, borderRadius:12, overflow:'hidden', marginBottom:14 }}>
                <img src={shopImagePreview} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
              </div>
            )}
            {[
              ['🏪 Shop Name', form.shop_name],
              ['📂 Category', CATEGORIES.find(c=>c.id===form.category)?.label || form.category],
              ['📍 Address', form.address + (form.city?', '+form.city:'')],
              ['📞 Phone', form.phone],
              ['🕐 Hours', `${form.opening_time} – ${form.closing_time}`],
              ['🛵 Delivery', form.delivery_time],
              ['💰 Min Order', form.min_order>0?`₹${form.min_order}`:'No minimum'],
              ['📋 FSSAI', form.fssai_number || 'Not provided'],
            ].map(([label, val]) => (
              <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', padding:'8px 0', borderBottom:'1px solid #f1f5f9' }}>
                <span style={{ fontSize:12, color:G.gray, flexShrink:0 }}>{label}</span>
                <span style={{ fontSize:12, fontWeight:600, color:G.dark, textAlign:'right', maxWidth:'55%' }}>{val}</span>
              </div>
            ))}
            <div style={{ background:'#FEF3C7', borderRadius:10, padding:12, fontSize:11, color:'#92400E', marginTop:14 }}>
              ⏳ Your shop will be reviewed within 24 hours. You'll receive a notification once approved.
            </div>
          </div>
        )}

        {/* Navigation */}
        <div style={{ display:'flex', gap:10, marginTop:20 }}>
          {step > 0 && (
            <button onClick={() => setStep(s=>s-1)} style={{ flex:1, background:'#F1F5FF', color:G.blue, border:'none', borderRadius:14, padding:'13px', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>← Back</button>
          )}
          {step < STEPS.length-1 ? (
            <button onClick={() => {
              if (step===0 && (!form.shop_name||!form.phone)) { setError('Please fill Shop Name and Phone'); return; }
              if (step===1 && !form.address) { setError('Please enter your shop address'); return; }
              setError(''); setStep(s=>s+1);
            }} style={{ flex:2, background:`linear-gradient(135deg,#60A5FA,${G.blue})`, color:'white', border:'none', borderRadius:14, padding:'13px', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
              Continue →
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={saving} style={{ flex:2, background:saving?'#e2e8f0':`linear-gradient(135deg,#60A5FA,${G.blue})`, color:saving?G.gray:'white', border:'none', borderRadius:14, padding:'13px', fontSize:14, fontWeight:700, cursor:saving?'default':'pointer', fontFamily:'inherit' }}>
              {saving ? '⏳ Registering...' : '🚀 Register My Shop'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
