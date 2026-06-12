module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { messages } = req.body;
  const GROQ_KEY = process.env.GROQ_API_KEY;
  const OR_KEY = process.env.OPENROUTER_API_KEY;

  const systemMsg = {
    role: 'system',
    content: 'You are Buddy AI, a friendly helpful assistant. Be warm, concise. Use emojis occasionally.'
  };
  const allMessages = [systemMsg, ...(messages || [])];

  // Try Groq with NEW working model
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
          max_tokens: 800
        })
      });
      const d = await r.json();
      console.log('Groq:', r.status, d.error?.message || 'ok');
      if (d.choices?.[0]?.message?.content) {
        return res.status(200).json({ reply: d.choices[0].message.content });
      }
    } catch (e) {
      console.log('Groq failed:', e.message);
    }
  }

  // Try OpenRouter with NEW working free model
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
          model: 'google/gemma-3-4b-it:free',
          messages: allMessages,
          max_tokens: 800
        })
      });
      const d = await r.json();
      console.log('OR:', r.status, d.error?.message || 'ok');
      if (d.choices?.[0]?.message?.content) {
        return res.status(200).json({ reply: d.choices[0].message.content });
      }
    } catch (e) {
      console.log('OR failed:', e.message);
    }
  }

  return res.status(500).json({ error: 'All AI services failed' });
}
