// ============================================================
// BUDDY AI — Razorpay Payment Verification
// Verifies the payment signature after user pays
// Updates the Supabase order payment_status to 'paid'
// ============================================================
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, buddyOrderId } = req.body;
  const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

  if (!KEY_SECRET) return res.status(200).json({ verified: false, message: 'Razorpay not configured' });

  // Verify signature
  const expectedSig = crypto
    .createHmac('sha256', KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (expectedSig !== razorpay_signature) {
    return res.status(400).json({ verified: false, error: 'Invalid payment signature' });
  }

  // Update order payment status in Supabase
  const SB_URL = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
  const SB_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;

  if (SB_URL && SB_KEY && buddyOrderId) {
    const sb = createClient(SB_URL, SB_KEY);
    await sb.from('orders').update({
      payment_status: 'paid',
      payment_method: 'upi',
      updated_at: new Date().toISOString()
    }).eq('id', buddyOrderId);
  }

  return res.status(200).json({ verified: true, paymentId: razorpay_payment_id });
};
