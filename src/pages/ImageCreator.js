import React, { useState } from 'react';
import './ImageCreator.css';
export default function ImageCreator() {
  const [prompt, setPrompt] = useState('');
  const [img, setImg] = useState(null);
  const [loading, setLoading] = useState(false);
  const generate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    try {
      const r = await fetch(`https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-2-1`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.REACT_APP_HF_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs: prompt })
      });
      const blob = await r.blob();
      setImg(URL.createObjectURL(blob));
    } catch(e) { alert('Error: ' + e.message); }
    setLoading(false);
  };
  return (
    <div style={{ minHeight:'100vh', background:'#F0F4FF', fontFamily:'Segoe UI,sans-serif', padding:20 }}>
      <h2 style={{ color:'#1E293B' }}>🎨 AI Image Creator</h2>
      <textarea value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="Describe the image you want..."
        style={{ width:'100%', minHeight:80, borderRadius:12, border:'1.5px solid #BFDBFE', padding:12, fontSize:14, outline:'none', marginBottom:12 }} />
      <button onClick={generate} disabled={loading} style={{ background:'#2563EB', color:'white', border:'none', borderRadius:12, padding:'12px 24px', fontSize:14, fontWeight:700, cursor:'pointer' }}>
        {loading ? '⏳ Generating...' : '✨ Generate'}
      </button>
      {img && <img src={img} alt="Generated" style={{ width:'100%', marginTop:20, borderRadius:16 }} />}
    </div>
  );
}
