module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { messages } = req.body;
  const GROQ_KEY = process.env.REACT_APP_GROQ_API_KEY;

  if (!GROQ_KEY) return res.status(500).json({ error: 'No API key found' });

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_KEY}`
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        messages: [
          {
            role: 'system',
            content: 'You are Buddy AI, a friendly helpful assistant. Be warm, concise, helpful. Use emojis occasionally.'
          },
          ...messages
        ],
        max_tokens: 800,
        temperature: 0.7
      })
    });

    const data = await response.json();
    if (data.error) return res.status(400).json({ error: data.error.message });
    const reply = data.choices?.[0]?.message?.content;
    return res.status(200).json({ reply });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
