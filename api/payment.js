// ============================================================
// BUDDY AI — Razorpay Payment Integration
// Creates a Razorpay order and returns order_id + key_id
// The frontend then opens Razorpay checkout using these
// ============================================================
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { amount, orderId, customerName, customerPhone } = req.body;
  if (!amount || !orderId) return res.status(400).json({ error: 'amount and orderId required' });

  const KEY_ID     = process.env.RAZORPAY_KEY_ID;
  const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

  if (!KEY_ID || !KEY_SECRET) {
    // Razorpay not configured — return COD fallback
    return res.status(200).json({
      fallback: true,
      message: 'UPI payment not configured yet. Your order will use Cash on Delivery.',
      paymentMethod: 'cod'
    });
  }

  try {
    const auth = Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString('base64');
    const r = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Basic ${auth}` },
      body: JSON.stringify({
        amount: Math.round(Number(amount) * 100), // Razorpay uses paise (₹1 = 100 paise)
        currency: 'INR',
        receipt: `buddy_${orderId.slice(-8)}`,
        notes: { buddy_order_id: orderId, customer: customerName || 'Buddy User' }
      })
    });

    const rzpOrder = await r.json();
    if (rzpOrder.error) return res.status(400).json({ error: rzpOrder.error.description });

    return res.status(200).json({
      razorpayOrderId: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      keyId: KEY_ID,
      customerName: customerName || 'Buddy User',
      customerPhone: customerPhone || ''
    });
  } catch (e) {
    console.error('Razorpay error:', e.message);
    return res.status(500).json({ error: 'Payment initiation failed: ' + e.message });
  }
};
