module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { messages } = req.body;

  // Read ALL possible key names
  const GROQ_KEY = process.env.GROQ_API_KEY 
    || process.env.REACT_APP_GROQ_API_KEY 
    || process.env.GROQ_KEY;

  const OR_KEY = process.env.OPENROUTER_API_KEY 
    || process.env.OPENROUTER_KEY 
    || process.env.REACT_APP_OPENROUTER_KEY;

  // Debug info
  console.log('Keys check - GROQ:', GROQ_KEY ? 'found' : 'missing', '| OR:', OR_KEY ? 'found' : 'missing');
  console.log('All env keys:', Object.keys(process.env).filter(k => !k.startsWith('npm') && !k.startsWith('NODE')));

  if (!GROQ_KEY && !OR_KEY) {
    return res.status(500).json({ 
      error: 'No API keys found in environment!',
      hint: 'Add GROQ_API_KEY to Vercel environment variables'
    });
  }

  const systemMsg = {
    role: 'system',
    content: 'You are Buddy AI, a friendly helpful assistant inside Buddy app. Be warm, helpful, concise. Use emojis occasionally.'
  };

  const allMessages = [systemMsg, ...(messages || [])];

  // Try Groq
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
          messages: allMessages,
          max_tokens: 800
        })
      });
      const d = await r.json();
      console.log('Groq status:', r.status, '| error:', d.error?.message || 'none');
      if (d.choices?.[0]?.message?.content) {
        return res.status(200).json({ reply: d.choices[0].message.content });
      }
    } catch (e) {
      console.log('Groq exception:', e.message);
    }
  }

  // Try OpenRouter
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
          model: 'deepseek/deepseek-r1-0528:free',
          messages: allMessages,
          max_tokens: 800
        })
      });
      const d = await r.json();
      console.log('OR status:', r.status, '| error:', d.error?.message || 'none');
      if (d.choices?.[0]?.message?.content) {
        return res.status(200).json({ reply: d.choices[0].message.content });
      }
    } catch (e) {
      console.log('OR exception:', e.message);
    }
  }

  return res.status(500).json({ error: 'Both AI services failed' });
}
