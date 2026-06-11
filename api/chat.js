module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { messages } = req.body;
  const GROQ_KEY = process.env.GROQ_API_KEY;
  const OPENROUTER_KEY = process.env.OPENROUTER_KEY;

  let reply = null;

  // Try Groq first
  if (GROQ_KEY) {
    try {
      const res1 = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_KEY}`
        },
        body: JSON.stringify({
          model: 'llama3-8b-8192',
          messages: [
            { role: 'system', content: 'You are Buddy AI, a friendly helpful assistant. Be warm, concise, use emojis.' },
            ...(messages || [])
          ],
          max_tokens: 800
        })
      });
      const data = await res1.json();
      if (data.choices?.[0]?.message?.content) {
        reply = data.choices[0].message.content;
      }
    } catch (e) {
      console.log('Groq failed:', e.message);
    }
  }

  // Try OpenRouter as fallback
  if (!reply && OPENROUTER_KEY) {
    try {
      const res2 = await fetch('https://openrouter.ai/api/v1/chat/completions', {
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
            { role: 'system', content: 'You are Buddy AI, a friendly helpful assistant. Be warm, concise, use emojis.' },
            ...(messages || [])
          ],
          max_tokens: 800
        })
      });
      const data = await res2.json();
      if (data.choices?.[0]?.message?.content) {
        reply = data.choices[0].message.content;
      }
    } catch (e) {
      console.log('OpenRouter failed:', e.message);
    }
  }

  if (reply) {
    return res.status(200).json({ reply });
  } else {
    return res.status(500).json({ error: 'Both AI services failed. Check your API keys!' });
  }
}
