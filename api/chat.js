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

  // Try Groq first - completely free, no credits needed
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
      console.log('Groq status:', r.status, 'error:', d.error?.message || 'none');
      if (d.choices?.[0]?.message?.content) {
        return res.status(200).json({ reply: d.choices[0].message.content });
      }
    } catch (e) {
      console.log('Groq failed:', e.message);
    }
  }

  // Try OpenRouter with WORKING free models
  if (OR_KEY) {
    const freeModels = [
      'meta-llama/llama-3.1-8b-instruct:free',
      'microsoft/phi-3-mini-128k-instruct:free',
      'google/gemma-2-9b-it:free'
    ];

    for (const model of freeModels) {
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
            model: model,
            messages: allMessages,
            max_tokens: 800
          })
        });
        const d = await r.json();
        console.log('OR model:', model, 'status:', r.status, 'error:', d.error?.message || 'none');
        if (d.choices?.[0]?.message?.content) {
          return res.status(200).json({ reply: d.choices[0].message.content });
        }
      } catch (e) {
        console.log('OR model failed:', model, e.message);
      }
    }
  }

  return res.status(500).json({ error: 'All AI services failed. Check logs!' });
}
