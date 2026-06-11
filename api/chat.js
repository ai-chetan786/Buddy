module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { messages } = req.body;

  // Match EXACTLY what you named in Vercel
  const GROQ_KEY = process.env.GROQ_API_KEY;
  const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;

  let reply = null;

  // Try Groq first
  if (GROQ_KEY) {
    try {
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_KEY}`
        },
        body: JSON.stringify({
          model: 'llama3-8b-8192',
          messages: [
            { role: 'system', content: 'You are Buddy AI, a friendly helpful assistant. Be warm and concise. Use emojis occasionally.' },
            ...(messages || [])
          ],
          max_tokens: 800
        })
      });
      const d = await r.json();
      if (d.choices?.[0]?.message?.content) {
        reply = d.choices[0].message.content;
      }
    } catch (e) {
      console.log('Groq error:', e.message);
    }
  }

  // Try OpenRouter as fallback
  if (!reply && OPENROUTER_KEY) {
    try {
      const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENROUTER_KEY}`,
          'HTTP-Referer': 'https://buddycom.vercel.app',
          'X-Title': 'Buddy AI'
        },
        body: JSON.stringify({
          model: 'deepseek/deepseek-r1-0528:free',
          messages: [
            { role: 'system', content: 'You are Buddy AI, a friendly helpful assistant.' },
            ...(messages || [])
          ],
          max_tokens: 800
        })
      });
      const d = await r.json();
      if (d.choices?.[0]?.message?.content) {
        reply = d.choices[0].message.content;
      }
    } catch (e) {
      console.log('OpenRouter error:', e.message);
    }
  }

  if (reply) return res.status(200).json({ reply });
  return res.status(500).json({ error: 'AI service failed. Check API keys!' });
}
