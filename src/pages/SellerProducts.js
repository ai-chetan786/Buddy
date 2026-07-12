import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';

const G = { blue:'#2563EB', lb:'#EFF6FF', sky:'#BFDBFE', bg:'#F0F4FF', gray:'#9CA3AF', dark:'#1E293B', red:'#EF4444', green:'#16A34A' };

export default function SellerProducts() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [shop, setShop] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [form, setForm] = useState({ name:'', description:'', price:'', stock:'', category:'food' });
  const [imageFile, setImageFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadProducts = useCallback(async (shopId) => {
    const { data } = await supabase.from('products').select('*').eq('shop_id', shopId).order('created_at', { ascending:false });
    setProducts(data || []);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return navigate('/login');
      setUser(session.user);
      const { data: shopData } = await supabase.from('shops').select('*').eq('owner_id', session.user.id).single();
      if (!shopData) { setLoading(false); return; }
      setShop(shopData);
      await loadProducts(shopData.id);
      setLoading(false);
    });
  }, [navigate, loadProducts]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const openAddForm = () => { setEditProduct(null); setForm({ name:'', description:'', price:'', stock:'', category:'food' }); setImageFile(null); setShowForm(true); };
  const openEditForm = (p) => { setEditProduct(p); setForm({ name:p.name, description:p.description, price:String(p.price), stock:String(p.stock), category:p.category }); setImageFile(null); setShowForm(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    let image_url = editProduct?.image_url || '';
    if (imageFile) {
      const path = `products/${user.id}_${Date.now()}.${imageFile.name.split('.').pop()}`;
      const { error: upErr } = await supabase.storage.from('products').upload(path, imageFile);
      if (!upErr) {
        const { data: { publicUrl } } = supabase.storage.from('products').getPublicUrl(path);
        image_url = publicUrl;
      }
    }
    const payload = { ...form, price: Number(form.price), stock: Number(form.stock), image_url };
    if (editProduct) {
      const { error } = await supabase.from('products').update(payload).eq('id', editProduct.id);
      if (error) { setError(error.message); setSaving(false); return; }
      setProducts(p => p.map(x => x.id === editProduct.id ? { ...x, ...payload } : x));
    } else {
      const { data, error } = await supabase.from('products').insert({ ...payload, shop_id: shop.id }).select().single();
      if (error) { setError(error.message); setSaving(false); return; }
      setProducts(p => [data, ...p]);
    }
    setShowForm(false); setSaving(false);
  };

  const toggleAvailable = async (product) => {
    const newVal = !product.is_available;
    setProducts(p => p.map(x => x.id === product.id ? { ...x, is_available: newVal } : x));
    await supabase.from('products').update({ is_available: newVal }).eq('id', product.id);
  };

  const deleteProduct = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    setProducts(p => p.filter(x => x.id !== id));
    await supabase.from('products').delete().eq('id', id);
  };

  if (loading) return (
    <div style={{ minHeight:'100vh', background:G.bg, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Segoe UI,sans-serif' }}>
      <p style={{ color:G.gray }}>Loading products...</p>
    </div>
  );

  return (
    <div style={{ minHeight:'100vh', background:G.bg, fontFamily:'Segoe UI,sans-serif', paddingBottom:30 }}>
      <div style={{ background:`linear-gradient(135deg,${G.blue},#1D4ED8)`, padding:'48px 16px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <span onClick={() => navigate('/seller/dashboard')} style={{ color:'white', fontSize:22, cursor:'pointer' }}>←</span>
          <div>
            <div style={{ color:'white', fontSize:18, fontWeight:800 }}>📦 Products</div>
            <div style={{ color:'rgba(255,255,255,.7)', fontSize:12 }}>{shop?.shop_name} · {products.length} items</div>
          </div>
        </div>
        <button onClick={openAddForm} style={{ background:'rgba(255,255,255,.2)', color:'white', border:'1px solid rgba(255,255,255,.4)', borderRadius:20, padding:'8px 16px', fontSize:13, fontWeight:700, cursor:'pointer' }}>
          + Add Product
        </button>
      </div>

      <div style={{ maxWidth:480, margin:'0 auto', padding:'16px' }}>
        {products.length === 0 && !showForm && (
          <div style={{ textAlign:'center', padding:'50px 20px', color:G.gray }}>
            <div style={{ fontSize:48, marginBottom:12 }}>📦</div>
            <p>No products yet. Add your first product!</p>
            <button onClick={openAddForm} style={{ marginTop:16, background:G.blue, color:'white', border:'none', borderRadius:14, padding:'12px 24px', fontSize:14, fontWeight:700, cursor:'pointer' }}>
              + Add First Product
            </button>
          </div>
        )}

        {products.map(p => (
          <div key={p.id} style={{ background:'white', borderRadius:16, padding:14, marginBottom:10, boxShadow:'0 2px 10px rgba(37,99,235,.07)', display:'flex', gap:12 }}>
            <div style={{ width:64, height:64, borderRadius:12, background:G.lb, overflow:'hidden', flexShrink:0 }}>
              {p.image_url ? <img src={p.image_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:26 }}>📦</div>}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:14, fontWeight:700, color:G.dark }}>{p.name}</div>
              <div style={{ fontSize:13, color:G.blue, fontWeight:700 }}>₹{Number(p.price).toFixed(0)}</div>
              <div style={{ fontSize:11, color:G.gray }}>Stock: {p.stock} · {p.category}</div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:6, alignItems:'flex-end' }}>
              <div onClick={() => toggleAvailable(p)} style={{
                background: p.is_available ? '#DCFCE7' : '#FEE2E2',
                color: p.is_available ? G.green : G.red,
                borderRadius:20, padding:'3px 10px', fontSize:10, fontWeight:700, cursor:'pointer'
              }}>{p.is_available ? '✅ Available' : '❌ Hidden'}</div>
              <div style={{ display:'flex', gap:6 }}>
                <button onClick={() => openEditForm(p)} style={{ background:G.lb, color:G.blue, border:'none', borderRadius:8, padding:'4px 10px', fontSize:11, fontWeight:600, cursor:'pointer' }}>Edit</button>
                <button onClick={() => deleteProduct(p.id)} style={{ background:'#FEF2F2', color:G.red, border:'none', borderRadius:8, padding:'4px 10px', fontSize:11, fontWeight:600, cursor:'pointer' }}>🗑️</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit form bottom sheet */}
      {showForm && (
        <div onClick={e => e.target===e.currentTarget && setShowForm(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:300, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
          <div style={{ background:'white', borderRadius:'22px 22px 0 0', width:'100%', maxWidth:480, padding:20, maxHeight:'90vh', overflowY:'auto' }}>
            <div style={{ width:38, height:4, background:'#e2e8f0', borderRadius:2, margin:'0 auto 14px' }} />
            <div style={{ fontSize:16, fontWeight:700, color:G.dark, marginBottom:14 }}>{editProduct ? '✏️ Edit Product' : '➕ Add Product'}</div>
            {error && <div style={{ background:'#FEF2F2', color:G.red, padding:'8px 12px', borderRadius:10, fontSize:12, marginBottom:12 }}>⚠️ {error}</div>}
            <form onSubmit={handleSave} style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {[['Product Name *','name','text'],['Description','description','text'],['Price (₹) *','price','number'],['Stock Quantity *','stock','number']].map(([label,key,type]) => (
                <div key={key}>
                  <label style={{ fontSize:12, fontWeight:600, color:G.dark, display:'block', marginBottom:4 }}>{label}</label>
                  <input value={form[key]} onChange={e => set(key, e.target.value)} type={type} required={label.includes('*')} min={type==='number'?'0':undefined}
                    style={{ width:'100%', border:`1.5px solid ${G.sky}`, borderRadius:10, padding:'9px 12px', fontSize:13, outline:'none', fontFamily:'inherit' }} />
                </div>
              ))}
              <div>
                <label style={{ fontSize:12, fontWeight:600, color:G.dark, display:'block', marginBottom:4 }}>Category</label>
                <select value={form.category} onChange={e => set('category', e.target.value)} style={{ width:'100%', border:`1.5px solid ${G.sky}`, borderRadius:10, padding:'9px 12px', fontSize:13, outline:'none', fontFamily:'inherit', background:'white' }}>
                  {['food','grocery','restaurant','bakery','pharmacy','other'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize:12, fontWeight:600, color:G.dark, display:'block', marginBottom:4 }}>Product Image</label>
                <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files[0])} style={{ fontSize:12, color:G.gray }} />
              </div>
              <div style={{ display:'flex', gap:10, marginTop:6 }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ flex:1, background:'#F1F5FF', color:G.blue, border:'none', borderRadius:12, padding:'12px', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ flex:2, background:`linear-gradient(135deg,#60A5FA,${G.blue})`, color:'white', border:'none', borderRadius:12, padding:'12px', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                  {saving ? '⏳ Saving...' : (editProduct ? 'Update Product' : 'Add Product')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
