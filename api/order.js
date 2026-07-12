const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { customerId, shopId, productId, quantity, unitPrice, deliveryAddress, paymentMethod, notes } = req.body;

  if (!customerId || !shopId || !productId || !quantity || !unitPrice || !deliveryAddress) {
    return res.status(400).json({ error: 'Missing required fields: customerId, shopId, productId, quantity, unitPrice, deliveryAddress' });
  }

  const SB_URL = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
  const SB_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;

  if (!SB_URL || !SB_KEY) return res.status(500).json({ error: 'Supabase not configured' });

  const sb = createClient(SB_URL, SB_KEY);
  const totalAmount = Number(unitPrice) * Number(quantity);

  try {
    // ── 1. Check stock is still available ──────────────────────────
    const { data: product, error: prodErr } = await sb
      .from('products').select('id, name, stock, is_available, shop_id').eq('id', productId).single();

    if (prodErr || !product) return res.status(404).json({ error: 'Product not found' });
    if (!product.is_available) return res.status(400).json({ error: 'Product is no longer available' });
    if (product.stock < quantity) return res.status(400).json({ error: `Only ${product.stock} units in stock` });
    if (product.shop_id !== shopId) return res.status(400).json({ error: 'Product does not belong to this shop' });

    // ── 2. Create the order ────────────────────────────────────────
    const { data: order, error: orderErr } = await sb.from('orders').insert({
      customer_id: customerId,
      shop_id: shopId,
      total_amount: totalAmount,
      status: 'pending',
      payment_method: paymentMethod || 'cod',
      payment_status: 'pending',
      delivery_address: deliveryAddress,
      notes: notes || ''
    }).select().single();

    if (orderErr) { console.error('Order insert error:', orderErr); return res.status(500).json({ error: orderErr.message }); }

    // ── 3. Create order items ──────────────────────────────────────
    const { error: itemErr } = await sb.from('order_items').insert({
      order_id: order.id,
      product_id: productId,
      quantity: Number(quantity),
      unit_price: Number(unitPrice)
    });

    if (itemErr) {
      // Rollback order if items fail
      await sb.from('orders').delete().eq('id', order.id);
      return res.status(500).json({ error: itemErr.message });
    }

    // ── 4. Decrement stock ─────────────────────────────────────────
    await sb.from('products').update({ stock: product.stock - Number(quantity) }).eq('id', productId);

    // ── 5. Return success ──────────────────────────────────────────
    return res.status(200).json({
      success: true,
      orderId: order.id,
      orderCode: order.id.slice(-6).toUpperCase(),
      totalAmount,
      message: `✅ Order #${order.id.slice(-6).toUpperCase()} placed! Total: ₹${totalAmount}. Estimated delivery: 25–40 minutes.`
    });

  } catch (e) {
    console.error('Order creation failed:', e.message);
    return res.status(500).json({ error: 'Order creation failed: ' + e.message });
  }
};
