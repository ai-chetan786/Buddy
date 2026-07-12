import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../supabase';

const G = { blue:'#2563EB', lb:'#EFF6FF', sky:'#BFDBFE', bg:'#F0F4FF', gray:'#9CA3AF', dark:'#1E293B', red:'#EF4444', green:'#16A34A', orange:'#EA580C' };

const STEPS = [
  { key:'pending',    icon:'🛒', label:'Order Placed' },
  { key:'confirmed',  icon:'✅', label:'Confirmed' },
  { key:'preparing',  icon:'👨‍🍳', label:'Preparing' },
  { key:'ready',      icon:'📦', label:'Ready for Pickup' },
  { key:'picked_up',  icon:'🛵', label:'On the Way' },
  { key:'delivered',  icon:'🏠', label:'Delivered' },
];

export default function OrderTracking() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [items, setItems] = useState([]);
  const [delivery, setDelivery] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: orderData } = await supabase.from('orders')
        .select('*, shops(shop_name, address, phone), profiles(full_name, phone)')
        .eq('id', id).single();
      if (orderData) setOrder(orderData);

      const { data: itemsData } = await supabase.from('order_items')
        .select('*, products(name, image_url)').eq('order_id', id);
      setItems(itemsData || []);

      const { data: delivData } = await supabase.from('delivery_requests')
        .select('*, profiles(full_name, phone)').eq('order_id', id).single();
      if (delivData) setDelivery(delivData);
      setLoading(false);
    };
    load();

    // Live status updates
    const ch = supabase.channel(`order_track_${id}`)
      .on('postgres_changes', { event:'UPDATE', schema:'public', table:'orders', filter:`id=eq.${id}` },
        (payload) => setOrder(o => ({ ...o, ...payload.new })))
      .on('postgres_changes', { event:'*', schema:'public', table:'delivery_requests', filter:`order_id=eq.${id}` },
        (payload) => setDelivery(d => ({ ...d, ...payload.new })))
      .subscribe();
    return () => ch.unsubscribe();
  }, [id]);

  const currentStepIdx = STEPS.findIndex(s => s.key === order?.status);

  if (loading) return (
    <div style={{ minHeight:'100vh', background:G.bg, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Segoe UI,sans-serif' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:44, marginBottom:8 }}>📦</div>
        <p style={{ color:G.gray }}>Tracking your order...</p>
      </div>
    </div>
  );

  if (!order) return (
    <div style={{ minHeight:'100vh', background:G.bg, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Segoe UI,sans-serif' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:44, marginBottom:8 }}>❌</div>
        <p style={{ color:G.gray }}>Order not found</p>
        <button onClick={() => navigate('/feed')} style={{ marginTop:16, background:G.blue, color:'white', border:'none', borderRadius:14, padding:'10px 20px', fontSize:13, fontWeight:700, cursor:'pointer' }}>← Go Back</button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:'100vh', background:G.bg, fontFamily:'Segoe UI,sans-serif', paddingBottom:30 }}>
      {/* Header */}
      <div style={{ background:`linear-gradient(135deg,${G.blue},#1D4ED8)`, padding:'48px 16px 20px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
          <span onClick={() => navigate('/feed')} style={{ color:'white', fontSize:22, cursor:'pointer' }}>←</span>
          <div>
            <div style={{ color:'white', fontSize:18, fontWeight:800 }}>📦 Order Tracking</div>
            <div style={{ color:'rgba(255,255,255,.7)', fontSize:12 }}>#{id.slice(-8).toUpperCase()}</div>
          </div>
        </div>

        {/* Live status badge */}
        <div style={{ background:'rgba(255,255,255,.15)', borderRadius:14, padding:'12px 16px', display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ fontSize:30 }}>{STEPS[currentStepIdx]?.icon || '📋'}</div>
          <div>
            <div style={{ color:'white', fontSize:15, fontWeight:800 }}>{STEPS[currentStepIdx]?.label || order.status}</div>
            <div style={{ color:'rgba(255,255,255,.7)', fontSize:11 }}>
              {order.status === 'delivered' ? '✅ Your order has been delivered!' :
               order.status === 'cancelled' ? '❌ This order was cancelled' :
               '🔴 Live — updates automatically'}
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth:480, margin:'0 auto', padding:'16px' }}>

        {/* Progress stepper */}
        <div style={{ background:'white', borderRadius:16, padding:16, marginBottom:12, boxShadow:'0 2px 10px rgba(37,99,235,.07)' }}>
          <div style={{ fontSize:13, fontWeight:700, color:G.dark, marginBottom:14 }}>Order Progress</div>
          {STEPS.filter(s => s.key !== 'cancelled').map((step, i) => {
            const done = i <= currentStepIdx;
            const active = i === currentStepIdx;
            return (
              <div key={step.key} style={{ display:'flex', alignItems:'center', gap:10, marginBottom: i < STEPS.length - 2 ? 4 : 0 }}>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
                  <div style={{
                    width:32, height:32, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
                    background: done ? (active ? G.blue : G.green) : '#e2e8f0',
                    fontSize:15, flexShrink:0,
                    boxShadow: active ? `0 0 0 3px ${G.sky}` : 'none'
                  }}>{done ? (active ? step.icon : '✅') : step.icon}</div>
                  {i < STEPS.length - 2 && <div style={{ width:2, height:20, background: i < currentStepIdx ? G.green : '#e2e8f0', marginTop:2 }} />}
                </div>
                <div style={{ paddingBottom: i < STEPS.length - 2 ? 16 : 0 }}>
                  <div style={{ fontSize:13, fontWeight: active ? 700 : 500, color: done ? G.dark : G.gray }}>{step.label}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Shop info */}
        <div style={{ background:'white', borderRadius:16, padding:16, marginBottom:12, boxShadow:'0 2px 10px rgba(37,99,235,.07)' }}>
          <div style={{ fontSize:13, fontWeight:700, color:G.dark, marginBottom:10 }}>🏪 Shop Details</div>
          <div style={{ fontSize:13, color:G.dark, fontWeight:600 }}>{order.shops?.shop_name}</div>
          <div style={{ fontSize:12, color:G.gray }}>{order.shops?.address}</div>
          {order.shops?.phone && <div style={{ fontSize:12, color:G.blue, marginTop:4 }}>📞 {order.shops.phone}</div>}
        </div>

        {/* Order items */}
        <div style={{ background:'white', borderRadius:16, padding:16, marginBottom:12, boxShadow:'0 2px 10px rgba(37,99,235,.07)' }}>
          <div style={{ fontSize:13, fontWeight:700, color:G.dark, marginBottom:10 }}>🛒 Your Order</div>
          {items.map((item, i) => (
            <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom: i < items.length-1 ? '1px solid #f1f5f9' : 'none' }}>
              <div>
                <div style={{ fontSize:13, color:G.dark }}>{item.quantity}× {item.products?.name}</div>
                <div style={{ fontSize:11, color:G.gray }}>₹{Number(item.unit_price).toFixed(0)} each</div>
              </div>
              <div style={{ fontSize:13, fontWeight:700, color:G.dark }}>₹{(item.unit_price * item.quantity).toFixed(0)}</div>
            </div>
          ))}
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:10, paddingTop:10, borderTop:'1.5px solid #e8f0fe' }}>
            <span style={{ fontSize:14, fontWeight:700, color:G.dark }}>Total</span>
            <span style={{ fontSize:14, fontWeight:700, color:G.blue }}>₹{Number(order.total_amount).toFixed(0)}</span>
          </div>
          <div style={{ fontSize:11, color:G.gray, marginTop:4 }}>
            {order.payment_method === 'cod' ? '💵 Cash on Delivery' : '📱 UPI Payment'} · {order.payment_status}
          </div>
        </div>

        {/* Delivery partner info */}
        {delivery && delivery.partner_id && (
          <div style={{ background:'white', borderRadius:16, padding:16, marginBottom:12, boxShadow:'0 2px 10px rgba(37,99,235,.07)' }}>
            <div style={{ fontSize:13, fontWeight:700, color:G.dark, marginBottom:8 }}>🛵 Delivery Partner</div>
            <div style={{ fontSize:13, color:G.dark }}>{delivery.profiles?.full_name || 'Partner assigned'}</div>
            {delivery.profiles?.phone && <div style={{ fontSize:12, color:G.blue }}>📞 {delivery.profiles.phone}</div>}
            <div style={{ fontSize:12, color:G.gray, marginTop:4 }}>Earning ₹{delivery.earnings_amount} for this delivery</div>
          </div>
        )}

        {/* Delivery address */}
        <div style={{ background:'white', borderRadius:16, padding:16, boxShadow:'0 2px 10px rgba(37,99,235,.07)' }}>
          <div style={{ fontSize:13, fontWeight:700, color:G.dark, marginBottom:6 }}>📍 Delivery Address</div>
          <div style={{ fontSize:13, color:G.gray }}>{order.delivery_address}</div>
          {order.notes && <div style={{ fontSize:12, color:G.gray, marginTop:6 }}>📝 Note: {order.notes}</div>}
        </div>
      </div>
    </div>
  );
}
