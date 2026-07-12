import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';

const G = { blue:'#2563EB', lb:'#EFF6FF', sky:'#BFDBFE', bg:'#F0F4FF', gray:'#9CA3AF', dark:'#1E293B', red:'#EF4444', green:'#16A34A', orange:'#EA580C' };

const STATUS_COLORS = {
  pending:   { bg:'#FEF3C7', text:'#92400E', label:'⏳ Pending', step:1 },
  confirmed: { bg:'#DBEAFE', text:'#1E40AF', label:'✅ Confirmed', step:2 },
  preparing: { bg:'#EDE9FE', text:'#5B21B6', label:'👨‍🍳 Preparing', step:3 },
  ready:     { bg:'#DCFCE7', text:'#166534', label:'📦 Ready', step:4 },
  picked_up: { bg:'#FFF7ED', text:'#92400E', label:'🛵 On the Way', step:5 },
  delivered: { bg:'#D1FAE5', text:'#065F46', label:'✅ Delivered', step:6 },
  cancelled: { bg:'#FEE2E2', text:'#991B1B', label:'❌ Cancelled', step:0 },
};

function ago(ts) {
  const d = Math.floor((Date.now() - new Date(ts)) / 60000);
  if (d < 1) return 'just now';
  if (d < 60) return `${d}m ago`;
  if (d < 1440) return `${Math.floor(d/60)}h ago`;
  return `${Math.floor(d/1440)}d ago`;
}

export default function MyOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('active');

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return navigate('/login');

      const { data } = await supabase.from('orders')
        .select('*, order_items(*, products(name,image_url)), shops(shop_name,address,phone)')
        .eq('customer_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      setOrders(data || []);
      setLoading(false);

      // Live order status updates
      const ch = supabase.channel('my_orders')
        .on('postgres_changes', { event:'UPDATE', schema:'public', table:'orders', filter:`customer_id=eq.${session.user.id}` },
          (payload) => setOrders(o => o.map(x => x.id === payload.new.id ? {...x, ...payload.new} : x)))
        .subscribe();
      return () => ch.unsubscribe();
    };
    load();
  }, [navigate]);

  const active = orders.filter(o => !['delivered','cancelled'].includes(o.status));
  const history = orders.filter(o => ['delivered','cancelled'].includes(o.status));
  const list = tab === 'active' ? active : history;

  if (loading) return (
    <div style={{ minHeight:'100vh', background:G.bg, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:12, fontFamily:'Segoe UI,sans-serif' }}>
      <div style={{ fontSize:44 }}>🛒</div>
      <p style={{ color:G.gray, fontSize:13 }}>Loading your orders...</p>
    </div>
  );

  return (
    <div style={{ minHeight:'100vh', background:G.bg, fontFamily:'Segoe UI,sans-serif', paddingBottom:24 }}>
      {/* Header */}
      <div style={{ background:`linear-gradient(135deg,${G.blue},#1D4ED8)`, padding:'48px 16px 16px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
          <span onClick={() => navigate('/feed')} style={{ color:'white', fontSize:22, cursor:'pointer' }}>←</span>
          <div>
            <div style={{ color:'white', fontSize:18, fontWeight:800 }}>🛒 My Orders</div>
            <div style={{ color:'rgba(255,255,255,.7)', fontSize:12 }}>{orders.length} total orders</div>
          </div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
          {[
            { label:'Active', value:active.length, icon:'📋' },
            { label:'Delivered', value:orders.filter(o=>o.status==='delivered').length, icon:'✅' },
            { label:'Total Spent', value:`₹${orders.filter(o=>o.status==='delivered').reduce((s,o)=>s+Number(o.total_amount),0).toFixed(0)}`, icon:'💰' },
          ].map(st => (
            <div key={st.label} style={{ background:'rgba(255,255,255,.15)', borderRadius:12, padding:'10px 8px', textAlign:'center' }}>
              <div style={{ fontSize:16 }}>{st.icon}</div>
              <div style={{ color:'white', fontSize:14, fontWeight:800 }}>{st.value}</div>
              <div style={{ color:'rgba(255,255,255,.7)', fontSize:9 }}>{st.label}</div>
            </div>
          ))}
        </div>
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
        {list.length === 0 && (
          <div style={{ textAlign:'center', padding:'60px 20px', color:G.gray }}>
            <div style={{ fontSize:52, marginBottom:12 }}>🛒</div>
            <div style={{ fontSize:15, fontWeight:600, color:G.dark, marginBottom:6 }}>
              {tab==='active' ? 'No active orders' : 'No order history yet'}
            </div>
            <p style={{ fontSize:12, lineHeight:1.6 }}>
              {tab==='active'
                ? 'Talk to Buddy AI and say "Order biryani" to place your first order!'
                : 'Completed orders will appear here'}
            </p>
            {tab==='active' && (
              <button onClick={() => navigate('/feed')} style={{ marginTop:16, background:G.blue, color:'white', border:'none', borderRadius:14, padding:'12px 24px', fontSize:13, fontWeight:700, cursor:'pointer' }}>
                🤖 Chat with Buddy AI
              </button>
            )}
          </div>
        )}

        {list.map(order => {
          const st = STATUS_COLORS[order.status] || STATUS_COLORS.pending;
          return (
            <div key={order.id} style={{ background:'white', borderRadius:16, marginBottom:14, overflow:'hidden', boxShadow:'0 2px 12px rgba(37,99,235,.08)' }}>
              {/* Status bar */}
              <div style={{ background:st.bg, padding:'8px 14px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:12, fontWeight:700, color:st.text }}>{st.label}</span>
                <span style={{ fontSize:11, color:st.text, opacity:.8 }}>{ago(order.created_at)}</span>
              </div>

              <div style={{ padding:14 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                  <div>
                    <div style={{ fontSize:12, fontWeight:700, color:G.dark }}>#{order.id.slice(-6).toUpperCase()}</div>
                    <div style={{ fontSize:12, color:G.gray }}>🏪 {order.shops?.shop_name}</div>
                  </div>
                  <div style={{ fontSize:15, fontWeight:800, color:G.blue }}>₹{Number(order.total_amount).toFixed(0)}</div>
                </div>

                {/* Items */}
                <div style={{ background:'#F8FAFF', borderRadius:10, padding:'8px 10px', marginBottom:10 }}>
                  {(order.order_items||[]).map((item,i) => (
                    <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:G.dark, padding:'2px 0' }}>
                      <span>{item.quantity}× {item.products?.name||'Item'}</span>
                      <span style={{ fontWeight:600 }}>₹{(item.unit_price*item.quantity).toFixed(0)}</span>
                    </div>
                  ))}
                </div>

                {/* Mini progress bar for active orders */}
                {!['delivered','cancelled'].includes(order.status) && st.step > 0 && (
                  <div style={{ marginBottom:10 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                      <span style={{ fontSize:10, color:G.gray }}>Order progress</span>
                      <span style={{ fontSize:10, color:G.blue, fontWeight:600 }}>{st.step}/6 steps</span>
                    </div>
                    <div style={{ height:4, background:'#e2e8f0', borderRadius:2 }}>
                      <div style={{ height:'100%', width:`${(st.step/6)*100}%`, background:G.blue, borderRadius:2, transition:'width .4s ease' }} />
                    </div>
                  </div>
                )}

                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={() => navigate(`/order/${order.id}`)} style={{
                    flex:1, background:G.lb, color:G.blue, border:`1.5px solid ${G.sky}`,
                    borderRadius:12, padding:'10px', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit'
                  }}>📍 Track Order</button>
                  {order.status==='delivered' && (
                    <button style={{
                      flex:1, background:'#F0FDF4', color:G.green, border:'1.5px solid #BBF7D0',
                      borderRadius:12, padding:'10px', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit'
                    }}>⭐ Rate</button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
