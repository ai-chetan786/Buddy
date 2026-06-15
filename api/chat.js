module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array required' });
  }

  const GROQ_KEY = process.env.GROQ_API_KEY;
  const OR_KEY   = process.env.OPENROUTER_API_KEY;

  const systemMsg = {
    role: 'system',
    content: 'You are Buddy AI, a friendly and helpful AI assistant built into a social platform. Be warm, helpful, and concise. Use emojis occasionally.'
  };

  const allMessages = [systemMsg, ...messages];

  // ── Try Groq first ───────────────────────
  if (GROQ_KEY) {
    try {
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_KEY}`
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: allMessages,
          max_tokens: 1000,
          temperature: 0.7
        })
      });
      const d = await r.json();
      const text = d.choices?.[0]?.message?.content;
      if (text) {
        // Return all 3 keys so any version of the frontend works
        return res.status(200).json({ reply: text, content: text, message: text });
      }
      console.log('Groq error:', d.error?.message || JSON.stringify(d));
    } catch (e) {
      console.log('Groq exception:', e.message);
    }
  }

  // ── Try OpenRouter fallback ──────────────
  if (OR_KEY) {
    try {
      const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OR_KEY}`,
          'HTTP-Referer': 'https://buddycom.vercel.app',
          'X-Title': 'Buddy AI'
        },
        body: JSON.stringify({
          model: 'meta-llama/llama-3.1-8b-instruct:free',
          messages: allMessages,
          max_tokens: 1000,
          temperature: 0.7
        })
      });
      const d = await r.json();
      const text = d.choices?.[0]?.message?.content;
      if (text) {
        return res.status(200).json({ reply: text, content: text, message: text });
      }
      console.log('OpenRouter error:', d.error?.message || JSON.stringify(d));
    } catch (e) {
      console.log('OpenRouter exception:', e.message);
    }
  }

  // ── Both failed — return friendly message ─
  const fallback = "I'm having trouble connecting right now. Please try again! 🤖";
  return res.status(200).json({ reply: fallback, content: fallback, message: fallback });
};
