import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';

const G = { blue:'#2563EB', lb:'#EFF6FF', sky:'#BFDBFE', bg:'#F0F4FF', gray:'#9CA3AF', dark:'#1E293B', red:'#EF4444', green:'#16A34A', orange:'#EA580C', gold:'#CA8A04' };

function StatCard({ icon, label, value, color }) {
  return (
    <div style={{ background:'white', borderRadius:16, padding:'16px 14px', boxShadow:'0 2px 10px rgba(37,99,235,.07)', textAlign:'center' }}>
      <div style={{ fontSize:26, marginBottom:4 }}>{icon}</div>
      <div style={{ fontSize:22, fontWeight:800, color: color || G.dark }}>{value}</div>
      <div style={{ fontSize:11, color:G.gray, marginTop:2 }}>{label}</div>
    </div>
  );
}

export default function AdminPanel() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [shops, setShops] = useState([]);
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [updatingId, setUpdatingId] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [
      { data: shopsData },
      { data: ordersData },
      { data: usersData },
    ] = await Promise.all([
      supabase.from('shops').select('*, profiles(full_name,email,phone)').order('created_at', { ascending:false }),
      supabase.from('orders').select('*, shops(shop_name), profiles(full_name)').order('created_at', { ascending:false }).limit(50),
      supabase.from('profiles').select('*').order('created_at', { ascending:false }).limit(100),
    ]);

    const sh = shopsData || [];
    const or = ordersData || [];
    const us = usersData || [];

    setShops(sh);
    setOrders(or);
    setUsers(us);

    const todayOrders = or.filter(o => new Date(o.created_at).toDateString() === new Date().toDateString());
    const revenue = or.filter(o=>o.status==='delivered').reduce((s,o)=>s+Number(o.total_amount),0);

    setStats({
      totalUsers: us.length,
      totalShops: sh.length,
      pendingShops: sh.filter(s=>s.verification_status==='pending').length,
      totalOrders: or.length,
      todayOrders: todayOrders.length,
      totalRevenue: revenue,
      sellers: us.filter(u=>u.role==='seller').length,
      delivery: us.filter(u=>u.role==='delivery').length,
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return navigate('/login');
      const { data: prof } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
      if (prof?.role !== 'admin') {
        navigate('/feed');
        return;
      }
      setUser(session.user);
      await loadData();
    });
  }, [navigate, loadData]);

  const verifyShop = async (shopId, status) => {
    setUpdatingId(shopId);
    await supabase.from('shops').update({ verification_status: status }).eq('id', shopId);
    if (status === 'approved') {
      const shop = shops.find(s => s.id === shopId);
      if (shop) await supabase.from('profiles').update({ role:'seller', is_verified:true }).eq('id', shop.owner_id);
    }
    setShops(s => s.map(x => x.id===shopId ? {...x, verification_status:status} : x));
    setStats(s => ({...s, pendingShops: shops.filter(sh=>sh.verification_status==='pending'&&sh.id!==shopId).length}));
    setUpdatingId(null);
  };

  const setUserRole = async (userId, role) => {
    setUpdatingId(userId);
    await supabase.from('profiles').update({ role }).eq('id', userId);
    setUsers(u => u.map(x => x.id===userId ? {...x, role} : x));
    setUpdatingId(null);
  };

  function ago(ts) {
    const d = Math.floor((Date.now() - new Date(ts)) / 60000);
    if (d < 60) return `${d}m ago`;
    if (d < 1440) return `${Math.floor(d/60)}h ago`;
    return `${Math.floor(d/1440)}d ago`;
  }

  if (loading) return (
    <div style={{ minHeight:'100vh', background:G.bg, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:12, fontFamily:'Segoe UI,sans-serif' }}>
      <div style={{ fontSize:44 }}>⚙️</div>
      <p style={{ color:G.gray }}>Loading admin panel...</p>
    </div>
  );

  const TABS = [
    { id:'overview', label:'📊 Overview' },
    { id:'shops',    label:`🏪 Shops (${stats.pendingShops} pending)` },
    { id:'orders',   label:'📋 Orders' },
    { id:'users',    label:'👥 Users' },
  ];

  const pendingShops = shops.filter(s=>s.verification_status==='pending');
  const approvedShops = shops.filter(s=>s.verification_status==='approved');
  const rejectedShops = shops.filter(s=>s.verification_status==='rejected');

  return (
    <div style={{ minHeight:'100vh', background:G.bg, fontFamily:'Segoe UI,sans-serif', paddingBottom:30 }}>
      {/* Header */}
      <div style={{ background:`linear-gradient(135deg,${G.gold},#92400E)`, padding:'48px 16px 16px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
          <span onClick={() => navigate('/feed')} style={{ color:'white', fontSize:22, cursor:'pointer' }}>←</span>
          <div>
            <div style={{ color:'white', fontSize:18, fontWeight:800 }}>⚙️ Admin Panel</div>
            <div style={{ color:'rgba(255,255,255,.7)', fontSize:12 }}>Buddy AI Marketplace Control</div>
          </div>
        </div>
      </div>

      {/* Tab nav */}
      <div style={{ display:'flex', background:'white', borderBottom:'1px solid #e8f0fe', overflowX:'auto' }} className="ns">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flexShrink:0, padding:'12px 14px', fontSize:12, fontWeight:700, cursor:'pointer',
            background:'none', border:'none', fontFamily:'inherit', whiteSpace:'nowrap',
            color: tab===t.id ? G.gold : G.gray,
            borderBottom: tab===t.id ? `3px solid ${G.gold}` : '3px solid transparent'
          }}>{t.label}</button>
        ))}
      </div>

      <div style={{ maxWidth:480, margin:'0 auto', padding:'14px 16px' }}>

        {/* ── OVERVIEW TAB ── */}
        {tab==='overview' && (
          <>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
              <StatCard icon="👥" label="Total Users"   value={stats.totalUsers}  color={G.blue} />
              <StatCard icon="🏪" label="Total Shops"   value={stats.totalShops}  color={G.gold} />
              <StatCard icon="📋" label="Total Orders"  value={stats.totalOrders} color={G.orange} />
              <StatCard icon="💰" label="Total Revenue" value={`₹${stats.totalRevenue?.toFixed(0)||0}`} color={G.green} />
              <StatCard icon="📦" label="Today's Orders" value={stats.todayOrders} color={G.blue} />
              <StatCard icon="⏳" label="Pending Shops"  value={stats.pendingShops} color={G.red} />
            </div>

            {/* Role breakdown */}
            <div style={{ background:'white', borderRadius:16, padding:16, boxShadow:'0 2px 10px rgba(37,99,235,.07)' }}>
              <div style={{ fontSize:13, fontWeight:700, color:G.dark, marginBottom:12 }}>👥 User Roles</div>
              {[
                { role:'customer', label:'Customers', icon:'🛍️', count: users.filter(u=>u.role==='customer'||!u.role).length, color:'#DBEAFE' },
                { role:'seller',   label:'Sellers',   icon:'🏪', count: stats.sellers,  color:'#EDE9FE' },
                { role:'delivery', label:'Delivery',  icon:'🛵', count: stats.delivery, color:'#FEF3C7' },
                { role:'admin',    label:'Admins',    icon:'⚙️', count: users.filter(u=>u.role==='admin').length, color:'#FEE2E2' },
              ].map(r => (
                <div key={r.role} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid #f1f5f9' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ width:32, height:32, borderRadius:8, background:r.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>{r.icon}</div>
                    <span style={{ fontSize:13, color:G.dark }}>{r.label}</span>
                  </div>
                  <span style={{ fontSize:16, fontWeight:800, color:G.dark }}>{r.count}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── SHOPS TAB ── */}
        {tab==='shops' && (
          <>
            {/* Pending shops — action required */}
            {pendingShops.length > 0 && (
              <>
                <div style={{ fontSize:12, fontWeight:700, color:G.red, marginBottom:8, display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ width:8, height:8, borderRadius:'50%', background:G.red, display:'inline-block' }} />
                  NEEDS REVIEW ({pendingShops.length})
                </div>
                {pendingShops.map(shop => (
                  <div key={shop.id} style={{ background:'white', borderRadius:16, padding:16, marginBottom:12, boxShadow:'0 2px 12px rgba(239,68,68,.1)', border:'1.5px solid #FECACA' }}>
                    <div style={{ display:'flex', gap:12, marginBottom:10 }}>
                      <div style={{ width:48, height:48, borderRadius:12, background:'#FEF3C7', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, flexShrink:0 }}>🏪</div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:14, fontWeight:700, color:G.dark }}>{shop.shop_name}</div>
                        <div style={{ fontSize:11, color:G.gray }}>{shop.category} · {shop.address}</div>
                        <div style={{ fontSize:11, color:G.blue }}>👤 {shop.profiles?.full_name||'Unknown'}</div>
                        {shop.phone && <div style={{ fontSize:11, color:G.gray }}>📞 {shop.phone}</div>}
                        <div style={{ fontSize:10, color:G.gray }}>{ago(shop.created_at)}</div>
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:8 }}>
                      <button disabled={updatingId===shop.id} onClick={() => verifyShop(shop.id,'approved')} style={{
                        flex:1, background:`linear-gradient(135deg,#4ADE80,${G.green})`, color:'white', border:'none',
                        borderRadius:12, padding:'10px', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit'
                      }}>{updatingId===shop.id?'...':'✅ Approve'}</button>
                      <button disabled={updatingId===shop.id} onClick={() => verifyShop(shop.id,'rejected')} style={{
                        flex:1, background:'#FEF2F2', color:G.red, border:`1px solid #FECACA`,
                        borderRadius:12, padding:'10px', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit'
                      }}>{updatingId===shop.id?'...':'❌ Reject'}</button>
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* Approved shops */}
            {approvedShops.length > 0 && (
              <>
                <div style={{ fontSize:12, fontWeight:700, color:G.green, marginBottom:8 }}>✅ APPROVED ({approvedShops.length})</div>
                {approvedShops.map(shop => (
                  <div key={shop.id} style={{ background:'white', borderRadius:14, padding:12, marginBottom:8, boxShadow:'0 1px 8px rgba(37,99,235,.06)' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <div>
                        <div style={{ fontSize:13, fontWeight:700, color:G.dark }}>{shop.shop_name}</div>
                        <div style={{ fontSize:11, color:G.gray }}>{shop.category} · {ago(shop.created_at)}</div>
                      </div>
                      <div style={{ background:'#DCFCE7', color:'#166534', borderRadius:20, padding:'3px 10px', fontSize:10, fontWeight:700 }}>✅ Active</div>
                    </div>
                  </div>
                ))}
              </>
            )}

            {rejectedShops.length > 0 && (
              <>
                <div style={{ fontSize:12, fontWeight:700, color:G.gray, marginBottom:8, marginTop:12 }}>❌ REJECTED ({rejectedShops.length})</div>
                {rejectedShops.map(shop => (
                  <div key={shop.id} style={{ background:'white', borderRadius:14, padding:12, marginBottom:8, opacity:0.6 }}>
                    <div style={{ fontSize:13, color:G.dark }}>{shop.shop_name}</div>
                    <div style={{ fontSize:11, color:G.gray }}>{shop.category}</div>
                  </div>
                ))}
              </>
            )}

            {shops.length === 0 && (
              <div style={{ textAlign:'center', padding:'50px 20px', color:G.gray }}>
                <div style={{ fontSize:44, marginBottom:10 }}>🏪</div>
                <p>No shops registered yet</p>
              </div>
            )}
          </>
        )}

        {/* ── ORDERS TAB ── */}
        {tab==='orders' && (
          <>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12 }}>
              <div style={{ fontSize:13, fontWeight:700, color:G.dark }}>All Platform Orders</div>
              <div style={{ fontSize:12, color:G.gray }}>{orders.length} total</div>
            </div>
            {orders.length === 0 && (
              <div style={{ textAlign:'center', padding:'50px 20px', color:G.gray }}>
                <div style={{ fontSize:44 }}>📋</div>
                <p>No orders yet</p>
              </div>
            )}
            {orders.map(order => {
              const statusColors = { pending:'#FEF3C7', confirmed:'#DBEAFE', preparing:'#EDE9FE', delivered:'#DCFCE7', cancelled:'#FEE2E2' };
              const bg = statusColors[order.status] || '#F1F5F9';
              return (
                <div key={order.id} style={{ background:'white', borderRadius:14, padding:12, marginBottom:8, boxShadow:'0 1px 8px rgba(37,99,235,.06)' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                    <div>
                      <div style={{ fontSize:12, fontWeight:700, color:G.dark }}>#{order.id.slice(-6).toUpperCase()}</div>
                      <div style={{ fontSize:11, color:G.gray }}>👤 {order.profiles?.full_name||'Customer'}</div>
                      <div style={{ fontSize:11, color:G.gray }}>🏪 {order.shops?.shop_name||'Shop'}</div>
                      <div style={{ fontSize:10, color:G.gray }}>{ago(order.created_at)}</div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:14, fontWeight:800, color:G.dark }}>₹{Number(order.total_amount).toFixed(0)}</div>
                      <div style={{ background:bg, borderRadius:20, padding:'2px 8px', fontSize:10, fontWeight:700, marginTop:4 }}>{order.status}</div>
                      <div style={{ fontSize:10, color:G.gray, marginTop:2 }}>{order.payment_method}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* ── USERS TAB ── */}
        {tab==='users' && (
          <>
            <div style={{ fontSize:13, fontWeight:700, color:G.dark, marginBottom:12 }}>All Platform Users ({users.length})</div>
            {users.map(u => (
              <div key={u.id} style={{ background:'white', borderRadius:14, padding:12, marginBottom:8, boxShadow:'0 1px 8px rgba(37,99,235,.06)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:700, color:G.dark }}>{u.full_name||u.username||'User'}</div>
                    <div style={{ fontSize:11, color:G.gray }}>@{u.username} · {ago(u.created_at)}</div>
                  </div>
                  <select value={u.role||'customer'} onChange={e => setUserRole(u.id, e.target.value)} disabled={updatingId===u.id}
                    style={{ border:`1px solid ${G.sky}`, borderRadius:8, padding:'4px 8px', fontSize:11, color:G.dark, cursor:'pointer', background:'white', fontFamily:'inherit' }}>
                    {['customer','seller','delivery','admin'].map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
            ))}
          </>
        )}

      </div>
    </div>
  );
}
