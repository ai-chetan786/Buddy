module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { imageBase64, style } = req.body;
  if (!imageBase64) {
    return res.status(400).json({ error: 'imageBase64 required' });
  }

  const HF_TOKEN = process.env.HF_TOKEN || process.env.REACT_APP_HF_TOKEN;
  if (!HF_TOKEN) {
    return res.status(500).json({ error: 'AI Enhance not configured. Add HF_TOKEN in Vercel env vars.' });
  }

  // Style prompts matching the camera filter categories
  const STYLE_PROMPTS = {
    beauty:   'enhance portrait, smooth skin, natural beauty, professional photo, high quality',
    cartoon:  'cartoon style illustration, pixar style, vibrant colors, animated character',
    anime:    'anime style, manga art, japanese animation, detailed anime character',
    nature:   'fantasy nature background, cinematic lighting, beautiful scenery',
    places:   'travel photography, famous landmark background, professional photo',
    fantasy:  'fantasy art style, magical, ethereal lighting, digital art',
    festival: 'festive celebration style, vibrant colors, joyful atmosphere',
    buddy:    'futuristic AI style, sci-fi character, robotic elements, professional',
    default:  'enhance photo quality, professional, high detail, vibrant'
  };

  const prompt = STYLE_PROMPTS[style] || STYLE_PROMPTS.default;

  try {
    // Image-to-image transformation via HuggingFace
    const r = await fetch(
      'https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-2-1',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HF_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            negative_prompt: 'blurry, bad quality, deformed, ugly',
            num_inference_steps: 25,
            guidance_scale: 7.5
          }
        })
      }
    );

    if (!r.ok) {
      const errData = await r.json().catch(() => ({}));
      if (errData.error && errData.error.includes('loading')) {
        return res.status(503).json({ error: 'Model is warming up, please try again in 30 seconds' });
      }
      return res.status(500).json({ error: errData.error || 'AI Enhance failed' });
    }

    const buffer = await r.arrayBuffer();
    const base64Image = Buffer.from(buffer).toString('base64');

    return res.status(200).json({
      enhancedImage: `data:image/png;base64,${base64Image}`
    });

  } catch (e) {
    console.error('Enhance error:', e.message);
    return res.status(500).json({ error: 'AI Enhance failed: ' + e.message });
  }
};
