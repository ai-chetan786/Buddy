import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';

const G = { blue:'#2563EB', lb:'#EFF6FF', sky:'#BFDBFE', bg:'#F0F4FF', gray:'#9CA3AF', dark:'#1E293B', red:'#EF4444', green:'#16A34A', orange:'#EA580C' };

const STATUS_COLORS = {
  pending:   { bg:'#FEF3C7', text:'#92400E', label:'⏳ Pending' },
  confirmed: { bg:'#DBEAFE', text:'#1E40AF', label:'✅ Confirmed' },
  preparing: { bg:'#EDE9FE', text:'#5B21B6', label:'👨‍🍳 Preparing' },
  ready:     { bg:'#DCFCE7', text:'#166534', label:'📦 Ready' },
  picked_up: { bg:'#F0FDF4', text:'#15803D', label:'🛵 Picked Up' },
  delivered: { bg:'#D1FAE5', text:'#065F46', label:'✅ Delivered' },
  cancelled: { bg:'#FEE2E2', text:'#991B1B', label:'❌ Cancelled' },
};

const NEXT_STATUS = { pending:'confirmed', confirmed:'preparing', preparing:'ready', ready:'picked_up' };

function ago(ts) {
  const d = Math.floor((Date.now() - new Date(ts)) / 60000);
  if (d < 1) return 'just now';
  if (d < 60) return `${d}m ago`;
  return `${Math.floor(d/60)}h ago`;
}

function WeeklyChart({ orders }) {
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const today = new Date().getDay();
  const data = days.map((_, i) => {
    const dayOrders = orders.filter(o => {
      const d = new Date(o.created_at);
      const diff = (today - d.getDay() + 7) % 7;
      return diff === (today - i + 7) % 7 && o.status === 'delivered';
    });
    return { day: days[i], revenue: dayOrders.reduce((s, o) => s + Number(o.total_amount), 0), count: dayOrders.length };
  });
  const max = Math.max(...data.map(d => d.revenue), 1);
  return (
    <div style={{ background:'white', borderRadius:16, padding:16, marginBottom:12, boxShadow:'0 2px 10px rgba(37,99,235,.07)' }}>
      <div style={{ fontSize:13, fontWeight:700, color:G.dark, marginBottom:12 }}>📊 Weekly Revenue</div>
      <div style={{ display:'flex', alignItems:'flex-end', gap:6, height:80 }}>
        {data.map((d, i) => (
          <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
            <div style={{ fontSize:9, color:G.gray, fontWeight:600 }}>
              {d.revenue > 0 ? `₹${d.revenue}` : ''}
            </div>
            <div style={{
              width:'100%', borderRadius:'4px 4px 0 0',
              height: `${Math.max((d.revenue / max) * 60, d.revenue > 0 ? 4 : 2)}px`,
              background: i === today ? G.blue : d.revenue > 0 ? G.sky : '#e2e8f0',
              transition:'height .3s ease'
            }} />
            <div style={{ fontSize:9, color: i === today ? G.blue : G.gray, fontWeight: i === today ? 700 : 400 }}>{d.day}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SellerDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [shop, setShop] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('active');
  const [updatingId, setUpdatingId] = useState(null);

  const loadData = useCallback(async (uid) => {
    const { data: shopData } = await supabase.from('shops').select('*').eq('owner_id', uid).single();
    if (!shopData) { setLoading(false); return; }
    setShop(shopData);
    const { data: ordersData } = await supabase.from('orders')
      .select('*, order_items(*, products(name,image_url)), profiles(full_name,phone,username)')
      .eq('shop_id', shopData.id)
      .order('created_at', { ascending: false })
      .limit(100);
    setOrders(ordersData || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return navigate('/login');
      setUser(session.user);
      await loadData(session.user.id);
      const ch = supabase.channel('seller_orders_v2')
        .on('postgres_changes', { event:'*', schema:'public', table:'orders' }, () => loadData(session.user.id))
        .subscribe();
      return () => ch.unsubscribe();
    });
  }, [navigate, loadData]);

  const updateStatus = async (orderId, newStatus) => {
    setUpdatingId(orderId);
    await supabase.from('orders').update({ status:newStatus, updated_at:new Date().toISOString() }).eq('id', orderId);
    setOrders(o => o.map(x => x.id === orderId ? {...x, status: newStatus} : x));
    setUpdatingId(null);
  };

  const cancelOrder = async (id) => {
    if (!window.confirm('Cancel this order?')) return;
    await updateStatus(id, 'cancelled');
  };

  const active    = orders.filter(o => !['delivered','cancelled'].includes(o.status));
  const history   = orders.filter(o => ['delivered','cancelled'].includes(o.status));
  const delivered = orders.filter(o => o.status === 'delivered');

  const todayRevenue   = delivered.filter(o => new Date(o.created_at).toDateString() === new Date().toDateString()).reduce((s,o) => s + Number(o.total_amount), 0);
  const totalRevenue   = delivered.reduce((s,o) => s + Number(o.total_amount), 0);
  const avgOrderValue  = delivered.length ? (totalRevenue / delivered.length).toFixed(0) : 0;

  if (loading) return (
    <div style={{ minHeight:'100vh', background:G.bg, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:12, fontFamily:'Segoe UI,sans-serif' }}>
      <div style={{ fontSize:44 }}>🏪</div>
      <p style={{ color:G.gray, fontSize:13 }}>Loading dashboard...</p>
    </div>
  );

  if (!shop) return (
    <div style={{ minHeight:'100vh', background:G.bg, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:16, padding:24, fontFamily:'Segoe UI,sans-serif' }}>
      <div style={{ fontSize:52 }}>🏪</div>
      <h2 style={{ color:G.dark, textAlign:'center' }}>No Shop Registered</h2>
      <p style={{ color:G.gray, textAlign:'center', fontSize:13 }}>Register your shop to start receiving orders</p>
      <button onClick={() => navigate('/seller/register')} style={{ background:G.blue, color:'white', border:'none', borderRadius:14, padding:'13px 28px', fontSize:14, fontWeight:700, cursor:'pointer' }}>Register My Shop →</button>
    </div>
  );

  return (
    <div style={{ minHeight:'100vh', background:G.bg, fontFamily:'Segoe UI,sans-serif', paddingBottom:24 }}>
      {/* Header */}
      <div style={{ background:`linear-gradient(135deg,${G.blue},#1D4ED8)`, padding:'48px 16px 16px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
          <span onClick={() => navigate('/feed')} style={{ color:'white', fontSize:22, cursor:'pointer' }}>←</span>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={() => navigate('/seller/products')} style={{ background:'rgba(255,255,255,.2)', color:'white', border:'none', borderRadius:20, padding:'7px 14px', fontSize:12, fontWeight:600, cursor:'pointer' }}>📦 Products</button>
            <button onClick={async () => {
              const nv = !shop.is_open;
              setShop(s => ({...s, is_open:nv}));
              await supabase.from('shops').update({ is_open:nv }).eq('id', shop.id);
            }} style={{ background: shop.is_open?'#16A34A':'#DC2626', color:'white', border:'none', borderRadius:20, padding:'7px 14px', fontSize:12, fontWeight:600, cursor:'pointer' }}>
              {shop.is_open ? '🟢 Open' : '🔴 Closed'}
            </button>
          </div>
        </div>

        <h1 style={{ color:'white', fontSize:20, fontWeight:800, margin:'0 0 2px' }}>🏪 {shop.shop_name}</h1>
        <p style={{ color:'rgba(255,255,255,.7)', fontSize:12, margin:'0 0 14px' }}>
          {shop.verification_status==='approved' ? '✅ Verified' : '⏳ Pending Verification'} · {shop.category}
        </p>

        {/* Stats grid */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:8 }}>
          {[
            { label:'Active', value:active.length, icon:'📋', color:'rgba(255,255,255,.2)' },
            { label:"Today ₹", value:todayRevenue, icon:'💰', color:'rgba(255,255,255,.2)' },
            { label:'All Orders', value:orders.length, icon:'📊', color:'rgba(255,255,255,.2)' },
            { label:'Avg Order', value:`₹${avgOrderValue}`, icon:'📈', color:'rgba(255,255,255,.2)' },
          ].map(st => (
            <div key={st.label} style={{ background:st.color, borderRadius:12, padding:'10px 8px', textAlign:'center' }}>
              <div style={{ fontSize:16 }}>{st.icon}</div>
              <div style={{ color:'white', fontSize:15, fontWeight:800 }}>{st.value}</div>
              <div style={{ color:'rgba(255,255,255,.65)', fontSize:9 }}>{st.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ maxWidth:480, margin:'0 auto', padding:'14px 16px 0' }}>
        <WeeklyChart orders={orders} />
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', background:'white', borderBottom:'1px solid #e8f0fe' }}>
        {[['active',`Active (${active.length})`],['history',`History (${history.length})`]].map(([id,label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            flex:1, padding:'13px', fontSize:13, fontWeight:700, cursor:'pointer',
            background:'none', border:'none', fontFamily:'inherit',
            color: tab===id ? G.blue : G.gray,
            borderBottom: tab===id ? `3px solid ${G.blue}` : '3px solid transparent'
          }}>{label}</button>
        ))}
      </div>

      <div style={{ padding:'12px 16px', maxWidth:480, margin:'0 auto' }}>
        {(tab==='active' ? active : history).length === 0 && (
          <div style={{ textAlign:'center', padding:'50px 20px', color:G.gray }}>
            <div style={{ fontSize:44, marginBottom:10 }}>📭</div>
            {tab==='active' ? 'No active orders right now' : 'No completed orders yet'}
          </div>
        )}
        {(tab==='active' ? active : history).map(order => {
          const st = STATUS_COLORS[order.status] || STATUS_COLORS.pending;
          const next = NEXT_STATUS[order.status];
          return (
            <div key={order.id} style={{ background:'white', borderRadius:16, padding:16, marginBottom:12, boxShadow:'0 2px 12px rgba(37,99,235,.08)' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:G.dark }}>#{order.id.slice(-6).toUpperCase()}</div>
                  <div style={{ fontSize:11, color:G.gray }}>👤 {order.profiles?.full_name||'Customer'} · {ago(order.created_at)}</div>
                  {order.profiles?.phone && <div style={{ fontSize:11, color:G.blue }}>📞 {order.profiles.phone}</div>}
                </div>
                <div style={{ background:st.bg, color:st.text, borderRadius:20, padding:'4px 10px', fontSize:11, fontWeight:700 }}>{st.label}</div>
              </div>

              <div style={{ background:'#F8FAFF', borderRadius:10, padding:'8px 10px', marginBottom:10 }}>
                {(order.order_items||[]).map((item,i) => (
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:G.dark, padding:'2px 0' }}>
                    <span>{item.quantity}× {item.products?.name||'Item'}</span>
                    <span style={{ fontWeight:600 }}>₹{(item.unit_price * item.quantity).toFixed(0)}</span>
                  </div>
                ))}
              </div>

              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                <div style={{ fontSize:13, fontWeight:700, color:G.dark }}>Total: ₹{Number(order.total_amount).toFixed(0)}</div>
                <div style={{ fontSize:11, color:G.gray }}>{order.payment_method==='cod'?'💵 COD':'📱 UPI'}</div>
              </div>

              {order.delivery_address && <div style={{ fontSize:11, color:G.gray, marginBottom:10 }}>📍 {order.delivery_address}</div>}
              {order.notes && <div style={{ fontSize:11, color:G.gray, marginBottom:10 }}>📝 {order.notes}</div>}

              {next && (
                <div style={{ display:'flex', gap:8 }}>
                  <button disabled={updatingId===order.id} onClick={() => updateStatus(order.id, next)} style={{
                    flex:1, background:`linear-gradient(135deg,#60A5FA,${G.blue})`, color:'white', border:'none',
                    borderRadius:12, padding:'10px', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit'
                  }}>{updatingId===order.id ? '...' : `Mark ${STATUS_COLORS[next]?.label}`}</button>
                  {order.status==='pending' && (
                    <button onClick={() => cancelOrder(order.id)} style={{
                      background:'#FEF2F2', color:G.red, border:`1px solid #FECACA`,
                      borderRadius:12, padding:'10px 14px', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit'
                    }}>Cancel</button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
