import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';

const G = { blue:'#2563EB', lb:'#EFF6FF', sky:'#BFDBFE', bg:'#F0F4FF', gray:'#9CA3AF', dark:'#1E293B', red:'#EF4444', green:'#16A34A', orange:'#EA580C' };

const STEPS = ['Personal Info', 'Vehicle Details', 'Documents', 'Review & Submit'];

export default function DeliveryRegister() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [existing, setExisting] = useState(null);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [profilePreview, setProfilePreview] = useState(null);
  const [form, setForm] = useState({
    full_name: '', phone: '', address: '', city: '',
    vehicle_type: 'bike', vehicle_number: '', vehicle_brand: '',
    license_number: '', aadhar_number: '', upi_id: '',
  });

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return navigate('/login');
      setUser(session.user);
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      if (prof) {
        setForm(f => ({...f,
          full_name: prof.full_name || '',
          phone: prof.phone || '',
          address: prof.address || '',
        }));
        if (prof.role === 'delivery' && prof.vehicle_number) setExisting(prof);
      }
    });
  }, [navigate]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const pickPhoto = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setProfilePhoto(f);
    setProfilePreview(URL.createObjectURL(f));
  };

  const handleSubmit = async () => {
    setSaving(true); setError('');
    try {
      let avatar_url = '';
      if (profilePhoto) {
        const path = `avatars/${user.id}_${Date.now()}.jpg`;
        const { error: upErr } = await supabase.storage.from('products').upload(path, profilePhoto, { upsert: true });
        if (!upErr) {
          const { data: { publicUrl } } = supabase.storage.from('products').getPublicUrl(path);
          avatar_url = publicUrl;
        }
      }
      const { error } = await supabase.from('profiles').update({
        full_name: form.full_name,
        phone: form.phone,
        address: form.address,
        role: 'delivery',
        vehicle_type: form.vehicle_type,
        vehicle_number: form.vehicle_number.toUpperCase(),
        license_number: form.license_number,
        aadhar_number: form.aadhar_number,
        is_verified: false,
        delivery_active: false,
        ...(avatar_url ? { avatar_url } : {})
      }).eq('id', user.id);
      if (error) { setError(error.message); setSaving(false); return; }
      navigate('/delivery/dashboard');
    } catch(e) { setError(e.message); setSaving(false); }
  };

  if (existing) return (
    <div style={{ minHeight:'100vh', background:G.bg, display:'flex', alignItems:'center', justifyContent:'center', padding:20, fontFamily:'Segoe UI,sans-serif' }}>
      <div style={{ background:'white', borderRadius:20, padding:30, textAlign:'center', maxWidth:380, width:'100%', boxShadow:'0 4px 20px rgba(37,99,235,.1)' }}>
        <div style={{ fontSize:52, marginBottom:12 }}>🛵</div>
        <h2 style={{ color:G.dark, marginBottom:8 }}>Already Registered!</h2>
        <p style={{ color:G.gray, fontSize:13, marginBottom:6 }}>Vehicle: <b>{existing.vehicle_number}</b></p>
        <p style={{ color:G.gray, fontSize:13, marginBottom:20 }}>{existing.is_verified ? '✅ Verified Partner' : '⏳ Verification Pending'}</p>
        <button onClick={() => navigate('/delivery/dashboard')} style={{ background:G.orange, color:'white', border:'none', borderRadius:14, padding:'13px', fontSize:14, fontWeight:700, cursor:'pointer', width:'100%' }}>
          Go to Dashboard →
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:'100vh', background:G.bg, fontFamily:'Segoe UI,sans-serif', paddingBottom:40 }}>
      {/* Header */}
      <div style={{ background:`linear-gradient(135deg,${G.orange},#C2410C)`, padding:'48px 16px 20px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
          <span onClick={() => navigate('/feed')} style={{ color:'white', fontSize:22, cursor:'pointer' }}>←</span>
          <div>
            <div style={{ color:'white', fontSize:18, fontWeight:800 }}>🛵 Become a Delivery Partner</div>
            <div style={{ color:'rgba(255,255,255,.7)', fontSize:12 }}>Earn ₹300–₹800 per day</div>
          </div>
        </div>
        {/* Step progress */}
        <div style={{ display:'flex', gap:6 }}>
          {STEPS.map((s, i) => (
            <div key={i} style={{ flex:1, height:4, borderRadius:2, background: i <= step ? 'white' : 'rgba(255,255,255,.3)', transition:'background .3s' }} />
          ))}
        </div>
        <div style={{ color:'rgba(255,255,255,.8)', fontSize:11, marginTop:6 }}>Step {step+1} of {STEPS.length} — {STEPS[step]}</div>
      </div>

      <div style={{ maxWidth:480, margin:'0 auto', padding:'20px 16px' }}>
        {error && <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', color:G.red, padding:'10px 14px', borderRadius:12, fontSize:13, marginBottom:16 }}>⚠️ {error}</div>}

        {/* STEP 0 — Personal Info */}
        {step === 0 && (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ background:'white', borderRadius:16, padding:20, boxShadow:'0 2px 10px rgba(37,99,235,.07)' }}>
              <div style={{ fontSize:14, fontWeight:700, color:G.dark, marginBottom:16 }}>👤 Personal Information</div>

              {/* Profile photo */}
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', marginBottom:20 }}>
                <div onClick={() => document.getElementById('profilePhotoInput').click()} style={{ width:90, height:90, borderRadius:'50%', background:G.lb, border:`2px dashed ${G.sky}`, overflow:'hidden', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:32 }}>
                  {profilePreview ? <img src={profilePreview} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : '📷'}
                </div>
                <input id="profilePhotoInput" type="file" accept="image/*" style={{ display:'none' }} onChange={pickPhoto} />
                <div style={{ fontSize:11, color:G.gray, marginTop:6 }}>Tap to upload profile photo</div>
              </div>

              {[
                { label:'Full Name *', key:'full_name', type:'text', ph:'As per Aadhaar card' },
                { label:'Mobile Number *', key:'phone', type:'tel', ph:'10-digit mobile number' },
                { label:'Current Address *', key:'address', type:'text', ph:'Door no, Street, Area' },
                { label:'City *', key:'city', type:'text', ph:'e.g. Bangalore, Hyderabad' },
                { label:'UPI ID (for earnings)', key:'upi_id', type:'text', ph:'yourname@upi' },
              ].map(f => (
                <div key={f.key} style={{ marginBottom:12 }}>
                  <label style={{ fontSize:12, fontWeight:600, color:G.dark, display:'block', marginBottom:5 }}>{f.label}</label>
                  <input value={form[f.key]} onChange={e => set(f.key, e.target.value)} type={f.type}
                    placeholder={f.ph} style={{ width:'100%', border:`1.5px solid ${G.sky}`, borderRadius:10, padding:'10px 12px', fontSize:13, outline:'none', fontFamily:'inherit', color:G.dark }} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 1 — Vehicle Details */}
        {step === 1 && (
          <div style={{ background:'white', borderRadius:16, padding:20, boxShadow:'0 2px 10px rgba(37,99,235,.07)' }}>
            <div style={{ fontSize:14, fontWeight:700, color:G.dark, marginBottom:16 }}>🛵 Vehicle Details</div>

            {/* Vehicle type picker */}
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:12, fontWeight:600, color:G.dark, display:'block', marginBottom:8 }}>Vehicle Type *</label>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
                {[['bike','🏍️','Bike'],['scooter','🛵','Scooter'],['cycle','🚲','Cycle']].map(([v,icon,label]) => (
                  <div key={v} onClick={() => set('vehicle_type', v)} style={{
                    padding:'12px 8px', borderRadius:12, textAlign:'center', cursor:'pointer',
                    border: form.vehicle_type===v ? `2px solid ${G.orange}` : '1.5px solid #e2e8f0',
                    background: form.vehicle_type===v ? '#FFF7ED' : 'white'
                  }}>
                    <div style={{ fontSize:24 }}>{icon}</div>
                    <div style={{ fontSize:12, fontWeight:600, color: form.vehicle_type===v ? G.orange : G.dark }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>

            {[
              { label:'Vehicle Number *', key:'vehicle_number', type:'text', ph:'e.g. KA01AB1234', upper:true },
              { label:'Vehicle Brand & Model', key:'vehicle_brand', type:'text', ph:'e.g. Honda Activa 6G' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom:12 }}>
                <label style={{ fontSize:12, fontWeight:600, color:G.dark, display:'block', marginBottom:5 }}>{f.label}</label>
                <input value={form[f.key]} onChange={e => set(f.key, f.upper ? e.target.value.toUpperCase() : e.target.value)}
                  type={f.type} placeholder={f.ph} style={{ width:'100%', border:`1.5px solid ${G.sky}`, borderRadius:10, padding:'10px 12px', fontSize:13, outline:'none', fontFamily:'inherit', color:G.dark }} />
              </div>
            ))}

            <div style={{ background:'#FFF7ED', borderRadius:10, padding:12, fontSize:11, color:'#92400E', marginTop:8 }}>
              🏍️ Make sure your vehicle RC (Registration Certificate) matches the number you enter. This will be verified by our team.
            </div>
          </div>
        )}

        {/* STEP 2 — Documents */}
        {step === 2 && (
          <div style={{ background:'white', borderRadius:16, padding:20, boxShadow:'0 2px 10px rgba(37,99,235,.07)' }}>
            <div style={{ fontSize:14, fontWeight:700, color:G.dark, marginBottom:16 }}>📄 Document Details</div>
            <div style={{ background:'#EFF6FF', borderRadius:10, padding:12, fontSize:11, color:'#1E40AF', marginBottom:16 }}>
              🔒 Your documents are encrypted and only used for verification. We never share them with third parties.
            </div>
            {[
              { label:'Driving License Number *', key:'license_number', ph:'e.g. KA0120190012345', hint:'Must be valid for your vehicle type' },
              { label:'Aadhaar Card Number *', key:'aadhar_number', ph:'12-digit Aadhaar number', hint:'Used for identity verification only' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom:16 }}>
                <label style={{ fontSize:12, fontWeight:600, color:G.dark, display:'block', marginBottom:5 }}>{f.label}</label>
                <input value={form[f.key]} onChange={e => set(f.key, e.target.value.replace(/\D/g, f.key==='aadhar_number'?'':e.target.value))}
                  type="text" placeholder={f.ph} maxLength={f.key==='aadhar_number'?12:20}
                  style={{ width:'100%', border:`1.5px solid ${G.sky}`, borderRadius:10, padding:'10px 12px', fontSize:13, outline:'none', fontFamily:'inherit', color:G.dark }} />
                <div style={{ fontSize:10, color:G.gray, marginTop:3 }}>{f.hint}</div>
              </div>
            ))}
            <div style={{ background:'#DCFCE7', borderRadius:10, padding:12, fontSize:11, color:'#166534' }}>
              ✅ After submitting, our team verifies your details within 24 hours. You'll get a notification when approved.
            </div>
          </div>
        )}

        {/* STEP 3 — Review */}
        {step === 3 && (
          <div style={{ background:'white', borderRadius:16, padding:20, boxShadow:'0 2px 10px rgba(37,99,235,.07)' }}>
            <div style={{ fontSize:14, fontWeight:700, color:G.dark, marginBottom:16 }}>✅ Review Your Details</div>
            {profilePreview && (
              <div style={{ display:'flex', justifyContent:'center', marginBottom:16 }}>
                <img src={profilePreview} alt="" style={{ width:80, height:80, borderRadius:'50%', objectFit:'cover', border:`3px solid ${G.orange}` }} />
              </div>
            )}
            {[
              ['👤 Name', form.full_name],
              ['📱 Phone', form.phone],
              ['📍 Address', form.address],
              ['🌆 City', form.city],
              ['🛵 Vehicle', `${form.vehicle_type} — ${form.vehicle_number}`],
              ['🏍️ Brand', form.vehicle_brand],
              ['📄 License', form.license_number],
              ['🪪 Aadhaar', form.aadhar_number ? '••••' + form.aadhar_number.slice(-4) : ''],
              ['💳 UPI', form.upi_id],
            ].filter(([,v]) => v).map(([label, val]) => (
              <div key={label} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid #f1f5f9' }}>
                <span style={{ fontSize:12, color:G.gray }}>{label}</span>
                <span style={{ fontSize:12, fontWeight:600, color:G.dark }}>{val}</span>
              </div>
            ))}
            <div style={{ background:'#FFF7ED', borderRadius:10, padding:12, fontSize:11, color:'#92400E', marginTop:14 }}>
              ⚠️ By submitting you confirm all details are accurate. False information may result in account suspension.
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        <div style={{ display:'flex', gap:10, marginTop:20 }}>
          {step > 0 && (
            <button onClick={() => setStep(s => s-1)} style={{ flex:1, background:'#F1F5FF', color:G.blue, border:'none', borderRadius:14, padding:'13px', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
              ← Back
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button onClick={() => {
              if (step===0 && (!form.full_name||!form.phone||!form.address)) { setError('Please fill all required fields'); return; }
              if (step===1 && !form.vehicle_number) { setError('Please enter your vehicle number'); return; }
              if (step===2 && (!form.license_number||!form.aadhar_number)) { setError('Please enter your license and Aadhaar number'); return; }
              setError(''); setStep(s => s+1);
            }} style={{ flex:2, background:`linear-gradient(135deg,#FB923C,${G.orange})`, color:'white', border:'none', borderRadius:14, padding:'13px', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
              Continue →
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={saving} style={{ flex:2, background:saving?'#e2e8f0':`linear-gradient(135deg,#4ADE80,${G.green})`, color:saving?G.gray:'white', border:'none', borderRadius:14, padding:'13px', fontSize:14, fontWeight:700, cursor:saving?'default':'pointer', fontFamily:'inherit' }}>
              {saving ? '⏳ Submitting...' : '🚀 Submit Application'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
