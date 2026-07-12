import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';

const G = { blue:'#2563EB', lb:'#EFF6FF', sky:'#BFDBFE', bg:'#F0F4FF', gray:'#9CA3AF', dark:'#1E293B', red:'#EF4444', green:'#16A34A', orange:'#EA580C' };

function ago(ts) {
  const d = Math.floor((Date.now() - new Date(ts)) / 60000);
  if (d < 1) return 'just now';
  if (d < 60) return `${d}m ago`;
  return `${Math.floor(d/60)}h ago`;
}

function EarningsBreakdown({ deliveries }) {
  const delivered = deliveries.filter(d => d.status === 'delivered');
  const today = delivered.filter(d => new Date(d.delivered_at || d.created_at).toDateString() === new Date().toDateString());
  const thisWeek = delivered.filter(d => {
    const diff = (Date.now() - new Date(d.delivered_at || d.created_at)) / (1000*60*60*24);
    return diff <= 7;
  });
  const total = delivered.reduce((s,d) => s + Number(d.earnings_amount||0), 0);
  const todayTotal = today.reduce((s,d) => s + Number(d.earnings_amount||0), 0);
  const weekTotal = thisWeek.reduce((s,d) => s + Number(d.earnings_amount||0), 0);

  return (
    <div style={{ background:'white', borderRadius:16, padding:16, marginBottom:12, boxShadow:'0 2px 10px rgba(234,88,12,.08)' }}>
      <div style={{ fontSize:13, fontWeight:700, color:G.dark, marginBottom:12 }}>💰 Earnings Breakdown</div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
        {[
          { label:'Today', value:`₹${todayTotal}`, count:`${today.length} deliveries`, color:'#FEF3C7', tc:'#92400E' },
          { label:'This Week', value:`₹${weekTotal}`, count:`${thisWeek.length} deliveries`, color:'#DBEAFE', tc:'#1E40AF' },
          { label:'All Time', value:`₹${total}`, count:`${delivered.length} total`, color:'#DCFCE7', tc:'#166534' },
        ].map(st => (
          <div key={st.label} style={{ background:st.color, borderRadius:12, padding:'10px 8px', textAlign:'center' }}>
            <div style={{ fontSize:16, fontWeight:800, color:st.tc }}>{st.value}</div>
            <div style={{ fontSize:10, fontWeight:600, color:st.tc }}>{st.label}</div>
            <div style={{ fontSize:9, color:st.tc, opacity:.7, marginTop:2 }}>{st.count}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DeliveryDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [tab, setTab] = useState('available');
  const [available, setAvailable] = useState([]);
  const [mine, setMine] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  const loadData = useCallback(async (uid) => {
    const [{ data: avail }, { data: myDeliv }] = await Promise.all([
      supabase.from('delivery_requests')
        .select('*, orders(total_amount, delivery_address, shops(shop_name,address,phone), profiles(full_name,phone))')
        .eq('status','available').order('created_at', { ascending:false }).limit(20),
      supabase.from('delivery_requests')
        .select('*, orders(total_amount, delivery_address, shops(shop_name,address), profiles(full_name,phone))')
        .eq('partner_id', uid).order('created_at', { ascending:false }).limit(50)
    ]);
    setAvailable(avail || []);
    setMine(myDeliv || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return navigate('/login');
      setUser(session.user);
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      setProfile(prof);
      await loadData(session.user.id);

      const ch = supabase.channel('delivery_v2')
        .on('postgres_changes', { event:'*', schema:'public', table:'delivery_requests' }, () => loadData(session.user.id))
        .subscribe();
      return () => ch.unsubscribe();
    });
  }, [navigate, loadData]);

  const acceptDelivery = async (req) => {
    setUpdatingId(req.id);
    await supabase.from('delivery_requests').update({
      partner_id: user.id, status:'accepted', accepted_at: new Date().toISOString()
    }).eq('id', req.id).eq('status','available');
    await loadData(user.id);
    setUpdatingId(null);
  };

  const updateStatus = async (id, status, extra={}) => {
    setUpdatingId(id);
    await supabase.from('delivery_requests').update({ status, ...extra }).eq('id', id);
    if (status === 'delivered') {
      const req = mine.find(r => r.id === id);
      if (req) await supabase.from('orders').update({ status:'delivered' }).eq('id', req.order_id);
    }
    await loadData(user.id);
    setUpdatingId(null);
  };

  const activeDeliveries = mine.filter(d => !['delivered','cancelled'].includes(d.status));

  if (loading) return (
    <div style={{ minHeight:'100vh', background:G.bg, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:12, fontFamily:'Segoe UI,sans-serif' }}>
      <div style={{ fontSize:44 }}>🛵</div>
      <p style={{ color:G.gray, fontSize:13 }}>Loading deliveries...</p>
    </div>
  );

  return (
    <div style={{ minHeight:'100vh', background:G.bg, fontFamily:'Segoe UI,sans-serif', paddingBottom:24 }}>
      {/* Header */}
      <div style={{ background:`linear-gradient(135deg,${G.orange},#C2410C)`, padding:'48px 16px 16px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
          <span onClick={() => navigate('/feed')} style={{ color:'white', fontSize:22, cursor:'pointer' }}>←</span>
          <div>
            <div style={{ color:'white', fontSize:18, fontWeight:800 }}>🛵 Delivery Dashboard</div>
            <div style={{ color:'rgba(255,255,255,.7)', fontSize:12 }}>{profile?.full_name||'Delivery Partner'}</div>
          </div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
          {[
            { label:'Available', value:available.length, icon:'📋' },
            { label:'Active', value:activeDeliveries.length, icon:'🛵' },
            { label:'Completed', value:mine.filter(d=>d.status==='delivered').length, icon:'✅' },
          ].map(st => (
            <div key={st.label} style={{ background:'rgba(255,255,255,.15)', borderRadius:12, padding:'10px 8px', textAlign:'center' }}>
              <div style={{ fontSize:18 }}>{st.icon}</div>
              <div style={{ color:'white', fontSize:18, fontWeight:800 }}>{st.value}</div>
              <div style={{ color:'rgba(255,255,255,.7)', fontSize:9 }}>{st.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ maxWidth:480, margin:'0 auto', padding:'14px 16px 0' }}>
        <EarningsBreakdown deliveries={mine} />
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', background:'white', borderBottom:'1px solid #e8f0fe' }}>
        {[['available',`Available (${available.length})`],['active',`My Active (${activeDeliveries.length})`],['history','History']].map(([id,label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            flex:1, padding:'10px 4px', fontSize:11, fontWeight:700, cursor:'pointer',
            background:'none', border:'none', fontFamily:'inherit',
            color: tab===id ? G.orange : G.gray,
            borderBottom: tab===id ? `3px solid ${G.orange}` : '3px solid transparent'
          }}>{label}</button>
        ))}
      </div>

      <div style={{ padding:'12px 16px', maxWidth:480, margin:'0 auto' }}>
        {tab === 'available' && available.length === 0 && (
          <div style={{ textAlign:'center', padding:'50px 20px', color:G.gray }}>
            <div style={{ fontSize:44, marginBottom:10 }}>📭</div>
            <p style={{ fontSize:13 }}>No delivery requests right now</p>
            <p style={{ fontSize:11 }}>New orders will appear here automatically</p>
          </div>
        )}

        {tab === 'available' && available.map(req => (
          <div key={req.id} style={{ background:'white', borderRadius:16, padding:16, marginBottom:12, boxShadow:'0 2px 12px rgba(234,88,12,.1)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:G.dark }}>#{req.order_id?.slice(-6).toUpperCase()}</div>
                <div style={{ fontSize:11, color:G.gray }}>{ago(req.created_at)}</div>
              </div>
              <div style={{ background:'#FEF3C7', color:'#92400E', borderRadius:20, padding:'4px 12px', fontSize:13, fontWeight:800 }}>₹{req.earnings_amount} earn</div>
            </div>
            <div style={{ background:'#FFF7ED', borderRadius:10, padding:'10px 12px', marginBottom:12 }}>
              <div style={{ fontSize:12, color:G.dark, marginBottom:4 }}>🏪 <b>Pickup:</b> {req.orders?.shops?.shop_name}</div>
              <div style={{ fontSize:11, color:G.gray, marginBottom:6 }}>{req.orders?.shops?.address}</div>
              <div style={{ fontSize:12, color:G.dark, marginBottom:2 }}>📍 <b>Deliver to:</b></div>
              <div style={{ fontSize:11, color:G.gray, marginBottom:6 }}>{req.orders?.delivery_address}</div>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <div style={{ fontSize:12, color:G.dark }}>💰 Order: <b>₹{Number(req.orders?.total_amount||0).toFixed(0)}</b></div>
                {req.orders?.profiles?.phone && <div style={{ fontSize:11, color:G.blue }}>📞 {req.orders.profiles.phone}</div>}
              </div>
            </div>
            <button disabled={updatingId===req.id} onClick={() => acceptDelivery(req)} style={{
              width:'100%', background:`linear-gradient(135deg,#FB923C,${G.orange})`, color:'white', border:'none',
              borderRadius:12, padding:'12px', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit'
            }}>{updatingId===req.id ? '...' : '✅ Accept This Delivery'}</button>
          </div>
        ))}

        {tab === 'active' && activeDeliveries.length === 0 && (
          <div style={{ textAlign:'center', padding:'50px 20px', color:G.gray }}>
            <div style={{ fontSize:44, marginBottom:10 }}>🛵</div>
            <p>No active deliveries</p>
          </div>
        )}

        {tab === 'active' && activeDeliveries.map(req => (
          <div key={req.id} style={{ background:'white', borderRadius:16, padding:16, marginBottom:12, boxShadow:'0 2px 10px rgba(234,88,12,.1)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:G.dark }}>#{req.order_id?.slice(-6).toUpperCase()}</div>
                <div style={{ fontSize:11, color:G.gray }}>{req.orders?.shops?.shop_name}</div>
              </div>
              <div style={{ background:'#FEF3C7', color:'#92400E', borderRadius:20, padding:'4px 12px', fontSize:13, fontWeight:800 }}>₹{req.earnings_amount}</div>
            </div>
            <div style={{ fontSize:12, color:G.gray, marginBottom:12 }}>📍 {req.orders?.delivery_address}</div>
            {req.status === 'accepted' && (
              <button disabled={updatingId===req.id} onClick={() => updateStatus(req.id,'picked_up',{ picked_up_at:new Date().toISOString() })} style={{
                width:'100%', background:`linear-gradient(135deg,#FB923C,${G.orange})`, color:'white', border:'none',
                borderRadius:12, padding:'11px', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit'
              }}>{updatingId===req.id ? '...' : '📦 Picked Up from Shop'}</button>
            )}
            {req.status === 'picked_up' && (
              <button disabled={updatingId===req.id} onClick={() => updateStatus(req.id,'delivered',{ delivered_at:new Date().toISOString() })} style={{
                width:'100%', background:`linear-gradient(135deg,#4ADE80,${G.green})`, color:'white', border:'none',
                borderRadius:12, padding:'11px', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit'
              }}>{updatingId===req.id ? '...' : '✅ Delivered to Customer'}</button>
            )}
          </div>
        ))}

        {tab === 'history' && (
          <>
            {mine.filter(d => ['delivered','cancelled'].includes(d.status)).length === 0 && (
              <div style={{ textAlign:'center', padding:'50px 20px', color:G.gray }}>
                <div style={{ fontSize:44, marginBottom:10 }}>📋</div>
                <p>No delivery history yet</p>
              </div>
            )}
            {mine.filter(d => ['delivered','cancelled'].includes(d.status)).map(req => (
              <div key={req.id} style={{ background:'white', borderRadius:14, padding:14, marginBottom:10, boxShadow:'0 1px 8px rgba(37,99,235,.06)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:700, color:G.dark }}>#{req.order_id?.slice(-6).toUpperCase()}</div>
                    <div style={{ fontSize:11, color:G.gray }}>{req.orders?.shops?.shop_name} · {ago(req.delivered_at||req.created_at)}</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:14, fontWeight:800, color:req.status==='delivered'?G.green:G.red }}>
                      {req.status==='delivered'?`+₹${req.earnings_amount}`:'❌ Cancelled'}
                    </div>
                    <div style={{ fontSize:10, color:G.gray }}>{req.status}</div>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
