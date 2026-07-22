import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';

const G = { blue:'#2563EB', lb:'#EFF6FF', sky:'#BFDBFE', bg:'#F0F4FF', gray:'#9CA3AF', dark:'#1E293B', red:'#EF4444', green:'#16A34A', orange:'#EA580C' };

const CATS = [
  { id:'all',        icon:'🍽️', label:'All' },
  { id:'restaurant', icon:'🍽️', label:'Restaurants' },
  { id:'grocery',    icon:'🛒', label:'Grocery' },
  { id:'food',       icon:'🍛', label:'Home Food' },
  { id:'bakery',     icon:'🥐', label:'Bakery' },
  { id:'pharmacy',   icon:'💊', label:'Pharmacy' },
];

function StarRating({ rating }) {
  return (
    <span style={{ fontSize:11, color:'#F59E0B', fontWeight:700 }}>
      {'★'.repeat(Math.round(rating||0))}{'☆'.repeat(5-Math.round(rating||0))} {rating||'New'}
    </span>
  );
}

function ShopCard({ shop, onSelect }) {
  return (
    <div onClick={() => onSelect(shop)} style={{ background:'white', borderRadius:16, overflow:'hidden', boxShadow:'0 2px 12px rgba(37,99,235,.08)', cursor:'pointer', marginBottom:14 }}>
      <div style={{ height:140, background:G.lb, position:'relative', overflow:'hidden' }}>
        {shop.image_url
          ? <img src={shop.image_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
          : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:52 }}>🏪</div>
        }
        <div style={{ position:'absolute', top:10, right:10, background: shop.is_open?G.green:G.red, color:'white', borderRadius:20, padding:'3px 10px', fontSize:10, fontWeight:700 }}>
          {shop.is_open ? '🟢 Open' : '🔴 Closed'}
        </div>
        {shop.verification_status !== 'approved' && (
          <div style={{ position:'absolute', top:10, left:10, background:'#FEF3C7', color:'#92400E', borderRadius:20, padding:'3px 10px', fontSize:10, fontWeight:700 }}>⏳ Pending</div>
        )}
      </div>
      <div style={{ padding:'12px 14px' }}>
        <div style={{ fontSize:15, fontWeight:700, color:G.dark, marginBottom:3 }}>{shop.shop_name}</div>
        <div style={{ fontSize:12, color:G.gray, marginBottom:6 }}>{shop.category} · {shop.address}</div>
        <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
          <StarRating rating={shop.rating} />
          {shop.delivery_time && <span style={{ fontSize:11, color:G.gray }}>⏱ {shop.delivery_time}</span>}
          {shop.min_order > 0 && <span style={{ fontSize:11, color:G.gray }}>Min ₹{shop.min_order}</span>}
        </div>
      </div>
    </div>
  );
}

function ProductCard({ product, onAddToCart, cart }) {
  const qty = cart[product.id] || 0;
  return (
    <div style={{ background:'white', borderRadius:14, padding:12, marginBottom:10, boxShadow:'0 1px 8px rgba(37,99,235,.06)', display:'flex', gap:12 }}>
      <div style={{ width:72, height:72, borderRadius:12, background:G.lb, overflow:'hidden', flexShrink:0 }}>
        {product.image_url
          ? <img src={product.image_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
          : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28 }}>{product.is_veg ? '🥬' : '🍖'}</div>
        }
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:2 }}>
          <span style={{ fontSize:10, color: product.is_veg ? G.green : G.red, fontWeight:700 }}>{product.is_veg ? '🟢' : '🔴'}</span>
          <span style={{ fontSize:13, fontWeight:700, color:G.dark }}>{product.name}</span>
        </div>
        {product.description && <div style={{ fontSize:11, color:G.gray, marginBottom:4, lineHeight:1.4 }}>{product.description}</div>}
        {product.prep_time && <div style={{ fontSize:10, color:G.gray }}>⏱ {product.prep_time}</div>}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:6 }}>
          <span style={{ fontSize:15, fontWeight:800, color:G.dark }}>₹{Number(product.price).toFixed(0)}</span>
          {qty === 0 ? (
            <button onClick={() => onAddToCart(product, 1)} disabled={!product.is_available} style={{
              background: product.is_available ? `linear-gradient(135deg,#60A5FA,${G.blue})` : '#e2e8f0',
              color: product.is_available ? 'white' : G.gray,
              border:'none', borderRadius:20, padding:'6px 18px', fontSize:12, fontWeight:700, cursor: product.is_available ? 'pointer' : 'default', fontFamily:'inherit'
            }}>{product.is_available ? '+ ADD' : 'Unavailable'}</button>
          ) : (
            <div style={{ display:'flex', alignItems:'center', gap:8, background:G.lb, borderRadius:20, padding:'4px 10px' }}>
              <button onClick={() => onAddToCart(product, -1)} style={{ background:'none', border:'none', fontSize:18, fontWeight:700, color:G.blue, cursor:'pointer', lineHeight:1 }}>−</button>
              <span style={{ fontSize:13, fontWeight:700, color:G.blue, minWidth:16, textAlign:'center' }}>{qty}</span>
              <button onClick={() => onAddToCart(product, 1)} style={{ background:'none', border:'none', fontSize:18, fontWeight:700, color:G.blue, cursor:'pointer', lineHeight:1 }}>+</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Browse() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [query, setQuery] = useState('');
  const [activeCat, setActiveCat] = useState('all');
  const [shops, setShops] = useState([]);
  const [selectedShop, setSelectedShop] = useState(null);
  const [shopProducts, setShopProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState({});
  const [showCart, setShowCart] = useState(false);
  const [orderPlacing, setOrderPlacing] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const debounceRef = useRef(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return navigate('/login');
      setUser(session.user);
      supabase.from('profiles').select('address').eq('id', session.user.id).single()
        .then(({ data }) => { if (data?.address) setDeliveryAddress(data.address); });
    });
    loadShops();
  }, [navigate]);

  const loadShops = async (q = '', cat = 'all') => {
    setLoading(true);
    let query_builder = supabase.from('shops').select('*').eq('verification_status', 'approved');
    if (cat !== 'all') query_builder = query_builder.eq('category', cat);
    if (q.trim()) query_builder = query_builder.ilike('shop_name', `%${q}%`);
    const { data } = await query_builder.order('rating', { ascending: false }).limit(30);
    setShops(data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => loadShops(query, activeCat), 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, activeCat]);

  const openShop = async (shop) => {
    setSelectedShop(shop);
    setCart({});
    const { data } = await supabase.from('products').select('*').eq('shop_id', shop.id).eq('is_available', true).order('category');
    setShopProducts(data || []);
  };

  const handleCart = (product, delta) => {
    setCart(c => {
      const newQty = (c[product.id] || 0) + delta;
      if (newQty <= 0) { const n = {...c}; delete n[product.id]; return n; }
      return { ...c, [product.id]: newQty };
    });
  };

  const cartItems = Object.entries(cart).map(([id, qty]) => {
    const p = shopProducts.find(x => x.id === id);
    return p ? { ...p, qty } : null;
  }).filter(Boolean);

  const cartTotal = cartItems.reduce((s, i) => s + i.price * i.qty, 0);
  const cartCount = cartItems.reduce((s, i) => s + i.qty, 0);

  const placeOrder = async () => {
    if (!deliveryAddress.trim()) { alert('Please enter delivery address'); return; }
    if (cartItems.length === 0) return;
    setOrderPlacing(true);
    try {
      const { data: order, error: oErr } = await supabase.from('orders').insert({
        customer_id: user.id,
        shop_id: selectedShop.id,
        total_amount: cartTotal,
        status: 'pending',
        payment_method: paymentMethod,
        payment_status: 'pending',
        delivery_address: deliveryAddress,
      }).select().single();
      if (oErr) { alert('Order failed: ' + oErr.message); setOrderPlacing(false); return; }

      // Insert all cart items
      const items = cartItems.map(i => ({ order_id: order.id, product_id: i.id, quantity: i.qty, unit_price: i.price }));
      await supabase.from('order_items').insert(items);

      // Decrement stock
      for (const i of cartItems) {
        const prod = shopProducts.find(p => p.id === i.id);
        if (prod) await supabase.from('products').update({ stock: Math.max(0, prod.stock - i.qty) }).eq('id', i.id);
      }

      setCart({}); setShowCart(false); setOrderPlacing(false);
      alert(`✅ Order placed! #${order.id.slice(-6).toUpperCase()}\nTotal: ₹${cartTotal.toFixed(0)}\nEstimated delivery: ${selectedShop.delivery_time || '30-45 mins'}`);
      navigate(`/order/${order.id}`);
    } catch(e) { alert('Error: ' + e.message); setOrderPlacing(false); }
  };

  return (
    <div style={{ minHeight:'100vh', background:G.bg, fontFamily:'Segoe UI,sans-serif', paddingBottom:80 }}>
      {/* Header */}
      <div style={{ background:`linear-gradient(135deg,${G.blue},#1D4ED8)`, padding:'48px 16px 16px', position:'sticky', top:0, zIndex:100 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
          {selectedShop ? (
            <span onClick={() => { setSelectedShop(null); setCart({}); }} style={{ color:'white', fontSize:22, cursor:'pointer' }}>←</span>
          ) : (
            <span onClick={() => navigate('/feed')} style={{ color:'white', fontSize:22, cursor:'pointer' }}>←</span>
          )}
          <div style={{ flex:1, display:'flex', alignItems:'center', background:'rgba(255,255,255,.2)', borderRadius:22, padding:'9px 14px', gap:8 }}>
            <span style={{ fontSize:15, color:'white' }}>🔍</span>
            <input autoFocus={!selectedShop} value={query} onChange={e => setQuery(e.target.value)}
              placeholder={selectedShop ? `Search in ${selectedShop.shop_name}...` : 'Search shops, food, groceries...'}
              style={{ flex:1, border:'none', background:'transparent', color:'white', fontSize:14, outline:'none', fontFamily:'inherit' }} />
            {query && <span onClick={() => setQuery('')} style={{ color:'white', cursor:'pointer', fontSize:14 }}>✕</span>}
          </div>
        </div>

        {!selectedShop && (
          <div className="ns" style={{ display:'flex', gap:8, overflowX:'auto', paddingBottom:4 }}>
            {CATS.map(c => (
              <div key={c.id} onClick={() => setActiveCat(c.id)} style={{
                flexShrink:0, padding:'6px 14px', borderRadius:20, fontSize:12, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap',
                background: activeCat===c.id ? 'white' : 'rgba(255,255,255,.2)',
                color: activeCat===c.id ? G.blue : 'white'
              }}>{c.icon} {c.label}</div>
            ))}
          </div>
        )}
      </div>

      <div style={{ maxWidth:480, margin:'0 auto', padding:'14px 16px' }}>

        {/* Shop list */}
        {!selectedShop && (
          <>
            {loading && <div style={{ textAlign:'center', padding:'40px 0', color:G.gray }}>Loading shops...</div>}
            {!loading && shops.length === 0 && (
              <div style={{ textAlign:'center', padding:'50px 20px', color:G.gray }}>
                <div style={{ fontSize:48, marginBottom:12 }}>🏪</div>
                <p style={{ fontWeight:600, color:G.dark }}>No shops found</p>
                <p style={{ fontSize:12 }}>Try a different search or check back later</p>
              </div>
            )}
            {!loading && shops.map(shop => <ShopCard key={shop.id} shop={shop} onSelect={openShop} />)}
          </>
        )}

        {/* Shop detail — product listing */}
        {selectedShop && (
          <>
            {/* Shop hero */}
            <div style={{ background:'white', borderRadius:16, overflow:'hidden', marginBottom:14, boxShadow:'0 2px 12px rgba(37,99,235,.08)' }}>
              <div style={{ height:160, background:G.lb, position:'relative', overflow:'hidden' }}>
                {selectedShop.image_url
                  ? <img src={selectedShop.image_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                  : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:60 }}>🏪</div>
                }
              </div>
              <div style={{ padding:'14px 16px' }}>
                <div style={{ fontSize:18, fontWeight:800, color:G.dark }}>{selectedShop.shop_name}</div>
                {selectedShop.description && <div style={{ fontSize:12, color:G.gray, marginTop:3, marginBottom:8 }}>{selectedShop.description}</div>}
                <div style={{ display:'flex', flexWrap:'wrap', gap:12 }}>
                  <span style={{ fontSize:12, color:G.gray }}>⏱ {selectedShop.delivery_time || '30-45 mins'}</span>
                  <StarRating rating={selectedShop.rating} />
                  {selectedShop.min_order > 0 && <span style={{ fontSize:12, color:G.gray }}>Min ₹{selectedShop.min_order}</span>}
                  {selectedShop.phone && <span style={{ fontSize:12, color:G.blue }}>📞 {selectedShop.phone}</span>}
                </div>
                <div style={{ fontSize:11, color:G.gray, marginTop:6 }}>📍 {selectedShop.address}</div>
                {selectedShop.opening_time && <div style={{ fontSize:11, color:G.gray }}>🕐 {selectedShop.opening_time} – {selectedShop.closing_time}</div>}
              </div>
            </div>

            {/* Products */}
            {shopProducts.length === 0 && (
              <div style={{ textAlign:'center', padding:'40px 20px', color:G.gray }}>
                <div style={{ fontSize:44, marginBottom:10 }}>📦</div>
                <p>No products available yet</p>
              </div>
            )}
            {shopProducts.map(p => <ProductCard key={p.id} product={p} onAddToCart={handleCart} cart={cart} />)}
          </>
        )}
      </div>

      {/* Floating cart button */}
      {selectedShop && cartCount > 0 && (
        <div onClick={() => setShowCart(true)} style={{
          position:'fixed', bottom:20, left:'50%', transform:'translateX(-50%)',
          background:`linear-gradient(135deg,#60A5FA,${G.blue})`, color:'white',
          borderRadius:30, padding:'14px 28px', display:'flex', alignItems:'center', gap:12,
          boxShadow:'0 6px 24px rgba(37,99,235,.45)', cursor:'pointer', zIndex:200, minWidth:280, justifyContent:'space-between'
        }}>
          <div style={{ background:'rgba(255,255,255,.25)', borderRadius:20, padding:'3px 10px', fontSize:12, fontWeight:700 }}>{cartCount} items</div>
          <span style={{ fontSize:14, fontWeight:700 }}>View Cart</span>
          <span style={{ fontSize:15, fontWeight:800 }}>₹{cartTotal.toFixed(0)}</span>
        </div>
      )}

      {/* Cart bottom sheet */}
      {showCart && (
        <div onClick={e => e.target===e.currentTarget&&setShowCart(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:300, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
          <div style={{ background:'white', borderRadius:'22px 22px 0 0', width:'100%', maxWidth:480, padding:20, maxHeight:'85vh', overflowY:'auto' }}>
            <div style={{ width:38, height:4, background:'#e2e8f0', borderRadius:2, margin:'0 auto 14px' }} />
            <div style={{ fontSize:16, fontWeight:700, color:G.dark, marginBottom:16 }}>🛒 Your Cart — {selectedShop.shop_name}</div>

            {cartItems.map(item => (
              <div key={item.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:'1px solid #f1f5f9' }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:G.dark }}>{item.name}</div>
                  <div style={{ fontSize:12, color:G.gray }}>₹{item.price} × {item.qty}</div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, background:G.lb, borderRadius:20, padding:'4px 10px' }}>
                    <button onClick={() => handleCart(item, -1)} style={{ background:'none', border:'none', fontSize:16, fontWeight:700, color:G.blue, cursor:'pointer' }}>−</button>
                    <span style={{ fontSize:13, fontWeight:700, color:G.blue }}>{item.qty}</span>
                    <button onClick={() => handleCart(item, 1)} style={{ background:'none', border:'none', fontSize:16, fontWeight:700, color:G.blue, cursor:'pointer' }}>+</button>
                  </div>
                  <span style={{ fontSize:13, fontWeight:700, color:G.dark, minWidth:45, textAlign:'right' }}>₹{(item.price*item.qty).toFixed(0)}</span>
                </div>
              </div>
            ))}

            <div style={{ display:'flex', justifyContent:'space-between', padding:'12px 0', borderTop:'2px solid #e8f0fe', marginTop:4 }}>
              <span style={{ fontSize:15, fontWeight:700, color:G.dark }}>Total</span>
              <span style={{ fontSize:16, fontWeight:800, color:G.blue }}>₹{cartTotal.toFixed(0)}</span>
            </div>

            <div style={{ marginBottom:12 }}>
              <label style={{ fontSize:12, fontWeight:600, color:G.dark, display:'block', marginBottom:6 }}>📍 Delivery Address</label>
              <textarea value={deliveryAddress} onChange={e=>setDeliveryAddress(e.target.value)} rows={2}
                placeholder="Enter full delivery address..." style={{ width:'100%', border:`1.5px solid ${G.sky}`, borderRadius:10, padding:'9px 12px', fontSize:13, outline:'none', fontFamily:'inherit', resize:'none', color:G.dark }} />
            </div>

            <div style={{ display:'flex', gap:8, marginBottom:14 }}>
              {[['cod','💵 Cash on Delivery'],['upi','📱 Pay via UPI']].map(([m,label]) => (
                <button key={m} onClick={() => setPaymentMethod(m)} style={{
                  flex:1, padding:'9px', borderRadius:10, fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit',
                  border: paymentMethod===m ? `2px solid ${G.blue}` : '1.5px solid #e2e8f0',
                  background: paymentMethod===m ? G.lb : 'white', color: paymentMethod===m ? G.blue : G.gray
                }}>{label}</button>
              ))}
            </div>

            <button onClick={placeOrder} disabled={orderPlacing} style={{
              width:'100%', background:orderPlacing?'#e2e8f0':`linear-gradient(135deg,#60A5FA,${G.blue})`,
              color:orderPlacing?G.gray:'white', border:'none', borderRadius:14, padding:'14px',
              fontSize:15, fontWeight:700, cursor:orderPlacing?'default':'pointer', fontFamily:'inherit'
            }}>{orderPlacing ? '⏳ Placing Order...' : `🚀 Place Order · ₹${cartTotal.toFixed(0)}`}</button>
          </div>
        </div>
      )}
    </div>
  );
}
