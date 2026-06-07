import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import './ImageCreator.css';

const HF_TOKEN = process.env.REACT_APP_HF_TOKEN;

const STYLE_PRESETS = [
  { label: '🎨 Realistic', value: 'realistic, photographic, 4k, detailed' },
  { label: '🖼️ Oil Painting', value: 'oil painting, artistic, canvas, brush strokes' },
  { label: '🌸 Anime', value: 'anime style, manga, vibrant colors, detailed' },
  { label: '🌆 Cyberpunk', value: 'cyberpunk, neon lights, futuristic, dark city' },
  { label: '🧸 Cartoon', value: 'cartoon style, colorful, fun, cute' },
  { label: '🖤 Sketch', value: 'pencil sketch, black and white, artistic drawing' },
];

const QUICK_PROMPTS = [
  '🌅 Sunset over mountains',
  '🤖 Futuristic robot',
  '🌊 Ocean waves at night',
  '🦁 Majestic lion portrait',
  '🏙️ Cyberpunk city',
  '🌸 Cherry blossom garden',
];

export default function ImageCreator() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState(STYLE_PRESETS[0]);
  const [generating, setGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState([]);
  const [currentImage, setCurrentImage] = useState(null);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { navigate('/login'); return; }
      setUser(session.user);
    });
  }, [navigate]);

  const generateImage = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    setError('');
    setCurrentImage(null);
    setProgress(0);

    const fullPrompt = `${prompt}, ${selectedStyle.value}, high quality, masterpiece`;

    // Progress animation
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) { clearInterval(progressInterval); return 90; }
        return prev + Math.random() * 15;
      });
    }, 800);

    try {
      const response = await fetch(
        'https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-2-1',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${HF_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputs: fullPrompt,
            parameters: {
              negative_prompt: 'blurry, bad quality, ugly, deformed, nsfw',
              num_inference_steps: 25,
              guidance_scale: 7.5,
              width: 512,
              height: 512,
            }
          })
        }
      );

      clearInterval(progressInterval);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        if (errData.error?.includes('loading')) {
          setError('🔄 Model is warming up! Please wait 30 seconds and try again.');
        } else {
          throw new Error(errData.error || 'Generation failed');
        }
        setGenerating(false);
        setProgress(0);
        return;
      }

      const blob = await response.blob();
      const imageUrl = URL.createObjectURL(blob);

      setProgress(100);
      setCurrentImage(imageUrl);
      setGeneratedImages(prev => [{
        url: imageUrl,
        prompt: prompt,
        style: selectedStyle.label,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }, ...prev.slice(0, 7)]);

    } catch (err) {
      clearInterval(progressInterval);
      setError('❌ Failed to generate. Check your HF token or try again!');
      console.error(err);
    }

    setGenerating(false);
    setProgress(0);
  };

  const downloadImage = (url, promptText) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `buddy-ai-${promptText.slice(0, 20)}.png`;
    a.click();
  };

  const shareToFeed = async (imageUrl, promptText) => {
    try {
      // Convert blob URL to file
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const file = new File([blob], `buddy-ai-${Date.now()}.png`, { type: 'image/png' });

      // Upload to Supabase storage
      const fileName = `ai-${user.id}-${Date.now()}.png`;
      const { error: uploadError } = await supabase.storage
        .from('posts')
        .upload(fileName, file);

      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from('posts')
          .getPublicUrl(fileName);

        await supabase.from('posts').insert({
          user_id: user.id,
          content: `🎨 AI Generated: "${promptText}"`,
          image_url: urlData.publicUrl,
          likes_count: 0,
          comments_count: 0
        });

        alert('✅ Shared to your Feed!');
        navigate('/feed');
      }
    } catch (err) {
      alert('Failed to share. Try again!');
    }
  };

  return (
    <div className="image-creator-container">
      {/* Header */}
      <div className="image-header">
        <button className="back-btn" onClick={() => navigate('/home')}>←</button>
        <div className="image-header-info">
          <h1 className="image-title">🎨 AI Image Creator</h1>
          <p className="image-subtitle">Powered by Stable Diffusion</p>
        </div>
      </div>

      <div className="image-content">
        {/* Prompt Input */}
        <div className="prompt-section">
          <label className="section-label">✍️ Describe your image</label>
          <div className="prompt-box">
            <textarea
              className="prompt-input"
              placeholder="A majestic lion sitting on a mountain at sunset..."
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              rows={3}
              disabled={generating}
            />
          </div>

          {/* Quick Prompts */}
          <div className="quick-prompts-scroll">
            {QUICK_PROMPTS.map((q, i) => (
              <button
                key={i}
                className="quick-prompt-chip"
                onClick={() => setPrompt(q.replace(/^\S+\s/, ''))}
                disabled={generating}
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Style Selection */}
        <div className="style-section">
          <label className="section-label">🎭 Choose Style</label>
          <div className="style-grid">
            {STYLE_PRESETS.map((style, i) => (
              <button
                key={i}
                className={`style-btn ${selectedStyle.label === style.label ? 'active' : ''}`}
                onClick={() => setSelectedStyle(style)}
                disabled={generating}
              >
                {style.label}
              </button>
            ))}
          </div>
        </div>

        {/* Generate Button */}
        <button
          className={`btn-generate ${generating ? 'generating' : ''}`}
          onClick={generateImage}
          disabled={!prompt.trim() || generating}
        >
          {generating ? (
            <>
              <span className="gen-spinner"></span>
              Creating Magic... {Math.round(progress)}%
            </>
          ) : (
            '✨ Generate Image'
          )}
        </button>

        {/* Progress Bar */}
        {generating && (
          <div className="progress-bar-wrap">
            <div className="progress-bar" style={{ width: `${progress}%` }}></div>
          </div>
        )}

        {/* Error */}
        {error && <div className="image-error">{error}</div>}

        {/* Current Generated Image */}
        {currentImage && (
          <div className="generated-image-card">
            <div className="gen-image-wrap">
              <img src={currentImage} alt="AI Generated" className="gen-image" />
              <div className="gen-image-overlay">
                <button
                  className="img-action-btn"
                  onClick={() => downloadImage(currentImage, prompt)}
                >
                  ⬇️ Download
                </button>
                <button
                  className="img-action-btn share"
                  onClick={() => shareToFeed(currentImage, prompt)}
                >
                  📤 Share to Feed
                </button>
              </div>
            </div>
            <div className="gen-image-info">
              <p className="gen-prompt">"{prompt}"</p>
              <span className="gen-style">{selectedStyle.label}</span>
            </div>
          </div>
        )}

        {/* History */}
        {generatedImages.length > 1 && (
          <div className="history-section">
            <label className="section-label">🕒 Recent Creations</label>
            <div className="history-grid">
              {generatedImages.slice(1).map((img, i) => (
                <div
                  key={i}
                  className="history-item"
                  onClick={() => setCurrentImage(img.url)}
                >
                  <img src={img.url} alt="history" className="history-img" />
                  <div className="history-overlay">
                    <p>{img.prompt?.substring(0, 30)}...</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tips */}
        <div className="tips-card">
          <h4>💡 Tips for better images:</h4>
          <ul>
            <li>Be specific — "golden retriever playing in snow" is better than just "dog"</li>
            <li>If model is loading, wait 30 seconds and try again</li>
            <li>Try different styles for different results!</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
