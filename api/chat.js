const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { messages, userId, userAddress } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array required' });
  }

  const GROQ_KEY = process.env.GROQ_API_KEY;
  const OR_KEY   = process.env.OPENROUTER_API_KEY;
  const SB_URL   = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
  const SB_KEY   = process.env.SUPABASE_SERVICE_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;

  // ── Step 1: Detect food/grocery ordering intent BEFORE calling AI ──
  const lastMsg = messages[messages.length - 1]?.content || '';
  const orderKeywords = /\b(order|buy|get me|want|need|send|biryani|pizza|rice|chai|tea|coffee|food|roti|dal|sabji|sabzi|burger|noodles|bread|milk|eggs|tomato|onion|potato|grocery|groceries|vegetables|fruits|deliver|delivery)\b/i;
  const confirmKeywords = /\b(yes|haan|ok|okay|sure|confirm|place|go ahead|do it|proceed)\b/i;
  const isOrderIntent = orderKeywords.test(lastMsg);
  const isConfirmation = confirmKeywords.test(lastMsg) && messages.length > 1;

  // ── Step 2: If order intent detected, find matching products ─────────
  let productContext = '';
  let foundProducts = [];

  if ((isOrderIntent || isConfirmation) && SB_URL && SB_KEY && userId) {
    try {
      const sb = createClient(SB_URL, SB_KEY);
      // Find open, approved shops with their products
      const { data: products } = await sb
        .from('products')
        .select('id, name, description, price, stock, category, shop_id, shops(id, shop_name, address, is_open, verification_status)')
        .eq('is_available', true)
        .gt('stock', 0)
        .eq('shops.is_open', true)
        .eq('shops.verification_status', 'approved')
        .limit(30);

      if (products && products.length > 0) {
        foundProducts = products.filter(p => p.shops); // only keep those with open shops
        productContext = `\n\nAVAILABLE PRODUCTS ON BUDDY MARKETPLACE:\n` +
          foundProducts.map(p =>
            `[ID:${p.id}] ${p.name} - ₹${p.price} - Shop: ${p.shops?.shop_name} (${p.shops?.address}) - Stock: ${p.stock}`
          ).join('\n');
      }
    } catch (e) {
      console.log('Supabase product fetch error:', e.message);
    }
  }

  // ── Step 3: Build system prompt ──────────────────────────────────────
  const systemMsg = {
    role: 'system',
    content: `You are Buddy AI — a friendly social platform assistant AND a smart ordering companion for India.

PERSONALITY: Warm, helpful, concise. Use Hindi words occasionally (yaar, bhai, haan, theek hai). Use emojis.

ORDERING RULES:
- When a user wants to order food/groceries, help them order from the Buddy Marketplace.
- Always confirm the order details with the user BEFORE placing it. Never place an order without "yes" confirmation.
- If products are available, respond with a special JSON block so the app can show an order card.
- If no products match, say so honestly and suggest they try again later.
- Detect emotion context: if user says they're angry/sad/hungry, be empathetic first, then help order.
- Always quote prices in ₹ (Indian Rupees).
- Delivery address: ${userAddress || 'ask the user for their delivery address'}.

RESPONSE FORMAT FOR ORDER SUGGESTIONS:
When you find a matching product, include this EXACT block at the END of your message (after your friendly text):
<<<ORDER_INTENT>>>
{
  "product_id": "PRODUCT_UUID_HERE",
  "product_name": "Product Name",
  "shop_name": "Shop Name",
  "price": 180,
  "quantity": 1,
  "shop_id": "SHOP_UUID_HERE"
}
<<<END_ORDER_INTENT>>>

SOCIAL PLATFORM RULES:
- Help with posts, stories, reels questions about Buddy.
- Answer general knowledge, jokes, motivation, advice — anything a helpful friend would.
${productContext}`
  };

  const allMessages = [systemMsg, ...messages];
  const callAI = async (key, url, model, extraHeaders = {}) => {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}`, ...extraHeaders },
      body: JSON.stringify({ model, messages: allMessages, max_tokens: 1200, temperature: 0.75 })
    });
    const d = await r.json();
    return d.choices?.[0]?.message?.content;
  };

  // ── Step 4: Call AI ──────────────────────────────────────────────────
  let text = null;
  if (GROQ_KEY) {
    try { text = await callAI(GROQ_KEY, 'https://api.groq.com/openai/v1/chat/completions', 'llama-3.1-8b-instant'); }
    catch (e) { console.log('Groq error:', e.message); }
  }
  if (!text && OR_KEY) {
    try {
      text = await callAI(OR_KEY, 'https://openrouter.ai/api/v1/chat/completions', 'meta-llama/llama-3.1-8b-instruct:free', {
        'HTTP-Referer': 'https://buddycom.vercel.app', 'X-Title': 'Buddy AI'
      });
    } catch (e) { console.log('OpenRouter error:', e.message); }
  }

  if (!text) {
    const fallback = "I'm having trouble connecting right now. Please try again! 🤖";
    return res.status(200).json({ reply: fallback, content: fallback, message: fallback });
  }

  // ── Step 5: Parse ORDER_INTENT if present ────────────────────────────
  const intentMatch = text.match(/<<<ORDER_INTENT>>>([\s\S]*?)<<<END_ORDER_INTENT>>>/);
  let orderIntent = null;
  let cleanText = text.replace(/<<<ORDER_INTENT>>>[\s\S]*?<<<END_ORDER_INTENT>>>/g, '').trim();

  if (intentMatch) {
    try { orderIntent = JSON.parse(intentMatch[1].trim()); } catch (e) { console.log('JSON parse error:', e.message); }
  }

  return res.status(200).json({
    reply: cleanText, content: cleanText, message: cleanText,
    orderIntent: orderIntent || null
  });
};
