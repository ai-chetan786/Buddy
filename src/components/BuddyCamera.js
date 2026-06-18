import React, { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';

/* ============================================================
   BUDDY CAMERA — live camera + real-time CSS filters
   Ported from the user's HTML/JS prototype into React.
   Same filter approach: CSS filter + color tint + emoji
   particles + face sticker, applied directly to the live
   video feed (no AI needed for these — instant, free, on-device).
   AI Enhance is the one filter action that calls a real
   backend AI model via /api/enhance.
   ============================================================ */

const G = { blue:'#2563EB', lb:'#EFF6FF', sky:'#BFDBFE', bg:'#F0F4FF', gray:'#9CA3AF', dark:'#1E293B', red:'#EF4444' };

// Exact filter data ported from the prototype
const CAM_FILTERS = {
  beauty: [
    { icon:'✨', name:'Natural',    css:'brightness(1.08) saturate(1.1)',                tint:'',                          face:'',   par:[] },
    { icon:'🌸', name:'Smooth',     css:'brightness(1.12) saturate(1.2) contrast(0.95)',  tint:'rgba(255,200,220,0.12)',     face:'',   par:['💗','🌸'] },
    { icon:'💡', name:'Bright',     css:'brightness(1.3) saturate(1.15)',                 tint:'rgba(255,255,200,0.08)',     face:'',   par:['✨'] },
    { icon:'👔', name:'Pro Look',   css:'contrast(1.12) saturate(0.85) brightness(0.95)', tint:'rgba(0,0,40,0.1)',           face:'',   par:[] },
    { icon:'💫', name:'Glow',       css:'brightness(1.2) saturate(1.4)',                  tint:'rgba(180,220,255,0.15)',     face:'',   par:['✨','💫','⭐'] },
  ],
  cartoon: [
    { icon:'🎨', name:'Cartoon',    css:'saturate(2.2) contrast(1.4) brightness(1.05)',   tint:'rgba(255,240,0,0.06)',       face:'',   par:['🎨','💥'] },
    { icon:'💥', name:'Comic',      css:'contrast(1.7) saturate(1.8) brightness(1.1)',    tint:'rgba(255,80,80,0.08)',       face:'💥', par:['⭐','💥'] },
    { icon:'🏆', name:'Pixar',      css:'brightness(1.15) saturate(1.6) contrast(1.1)',   tint:'rgba(100,180,255,0.1)',      face:'',   par:['⭐','🌟'] },
    { icon:'👑', name:'Disney',     css:'brightness(1.2) saturate(1.7)',                  tint:'rgba(200,160,255,0.1)',      face:'👑', par:['✨','⭐','💫'] },
    { icon:'🎮', name:'3D Char',    css:'contrast(1.3) brightness(1.1) saturate(1.5)',    tint:'rgba(0,255,180,0.07)',       face:'',   par:['🎮','⚡'] },
  ],
  anime: [
    { icon:'⚔️', name:'Hero',       css:'contrast(1.4) saturate(1.9) brightness(1.05)',   tint:'rgba(0,0,80,0.15)',          face:'⚔️', par:['⚡','✨'] },
    { icon:'🌸', name:'Anime Girl', css:'brightness(1.15) saturate(1.5) hue-rotate(320deg)', tint:'rgba(255,150,200,0.12)',  face:'🌸', par:['🌸','💗','✨'] },
    { icon:'💙', name:'Anime Boy',  css:'brightness(1.08) saturate(1.4) contrast(1.15)',  tint:'rgba(80,140,255,0.1)',       face:'',   par:['⭐','💙'] },
    { icon:'📖', name:'Manga',      css:'grayscale(0.65) contrast(1.4) brightness(1.1)',  tint:'rgba(0,0,0,0.05)',           face:'',   par:['📖'] },
    { icon:'🎌', name:'Jp Art',     css:'saturate(1.7) brightness(1.1) hue-rotate(340deg)', tint:'rgba(255,100,100,0.1)',    face:'🎌', par:['🌸','🎌'] },
  ],
  nature: [
    { icon:'💧', name:'Waterfall',  css:'brightness(1.05) saturate(1.4) hue-rotate(180deg)', tint:'rgba(0,100,200,0.15)',   face:'',   par:['💧','🌊','💦'] },
    { icon:'🌳', name:'Forest',     css:'hue-rotate(80deg) saturate(1.5) brightness(0.95)', tint:'rgba(0,80,0,0.15)',        face:'',   par:['🍃','🌿','🦋'] },
    { icon:'⛰️', name:'Mountain',   css:'contrast(1.15) brightness(0.9) saturate(0.8)',   tint:'rgba(100,120,150,0.18)',     face:'',   par:['❄️','🌨️'] },
    { icon:'🏖️', name:'Beach',      css:'brightness(1.15) saturate(1.35) hue-rotate(20deg)', tint:'rgba(0,150,200,0.1)',     face:'',   par:['🌊','🌴','☀️'] },
    { icon:'🌻', name:'Garden',     css:'saturate(1.6) brightness(1.1) hue-rotate(60deg)', tint:'rgba(0,120,0,0.1)',         face:'',   par:['🌹','🌻','🦋','🌺'] },
  ],
  places: [
    { icon:'🗼', name:'Paris',      css:'brightness(1.05) hue-rotate(200deg) saturate(1.2)', tint:'rgba(30,60,160,0.12)',   face:'',   par:['🗼','❤️','🥐'] },
    { icon:'🏙️', name:'Dubai',      css:'brightness(1.15) saturate(1.3) hue-rotate(30deg)', tint:'rgba(200,140,0,0.1)',     face:'',   par:['🌇','✨','🕌'] },
    { icon:'🗽', name:'New York',   css:'contrast(1.2) brightness(0.95) saturate(0.9)',   tint:'rgba(0,0,30,0.18)',          face:'',   par:['🗽','🌆','🚕'] },
    { icon:'⛩️', name:'Tokyo',      css:'saturate(1.4) hue-rotate(320deg) brightness(1.05)', tint:'rgba(200,0,80,0.1)',     face:'',   par:['⛩️','🌸','🗾'] },
    { icon:'🌊', name:'Goa',        css:'brightness(1.2) saturate(1.5) hue-rotate(180deg)', tint:'rgba(0,150,220,0.12)',    face:'',   par:['🌴','🌊','🏄'] },
    { icon:'🎡', name:'London',     css:'contrast(1.12) brightness(0.92) saturate(0.85)', tint:'rgba(0,0,60,0.12)',          face:'',   par:['🎡','🌧️','☕'] },
  ],
  fantasy: [
    { icon:'🚀', name:'Space',      css:'brightness(0.85) saturate(1.6) hue-rotate(250deg)', tint:'rgba(0,0,40,0.3)',       face:'🚀', par:['⭐','🌙','🪐','💫'] },
    { icon:'🌌', name:'Galaxy',     css:'saturate(1.9) brightness(0.88) hue-rotate(280deg)', tint:'rgba(80,0,120,0.2)',     face:'🌌', par:['✨','💫','🌠','⭐'] },
    { icon:'⚡', name:'Cyberpunk',  css:'hue-rotate(200deg) saturate(1.8) contrast(1.3)', tint:'rgba(0,200,255,0.12)',       face:'',   par:['⚡','🔮','💜'] },
    { icon:'🧙', name:'Magic',      css:'saturate(1.7) brightness(0.82) hue-rotate(290deg)', tint:'rgba(100,0,150,0.2)',    face:'🧙', par:['🌟','💎','🔮','✨'] },
    { icon:'🌃', name:'Future City',css:'hue-rotate(210deg) contrast(1.25) saturate(1.5)', tint:'rgba(0,30,80,0.2)',        face:'',   par:['🌃','⚡','💡'] },
  ],
  festival: [
    { icon:'🎄', name:'Christmas',  css:'saturate(1.5) brightness(1.05) hue-rotate(100deg)', tint:'rgba(0,80,0,0.1)',       face:'🎅', par:['⛄','❄️','🎁','🎄'] },
    { icon:'🪔', name:'Diwali',     css:'brightness(1.2) saturate(1.6) hue-rotate(20deg)', tint:'rgba(200,120,0,0.12)',     face:'',   par:['🪔','✨','🎆','🌟'] },
    { icon:'🌙', name:'Eid',        css:'brightness(1.08) saturate(1.25) hue-rotate(200deg)', tint:'rgba(30,60,140,0.1)',   face:'',   par:['🌙','⭐','🕌','✨'] },
    { icon:'🎆', name:'New Year',   css:'brightness(1.1) contrast(1.1) saturate(1.2)',     tint:'rgba(0,0,20,0.12)',         face:'🥳', par:['🎆','🎇','🎉','🎊'] },
    { icon:'🎂', name:'Birthday',   css:'brightness(1.15) saturate(1.4) hue-rotate(340deg)', tint:'rgba(255,100,150,0.1)',  face:'🎂', par:['🎈','🎉','🎊','🎁'] },
  ],
  buddy: [
    { icon:'🤖', name:'AI Robot',   css:'hue-rotate(210deg) saturate(1.7) contrast(1.2)', tint:'rgba(0,80,200,0.18)',       face:'🤖', par:['⚡','💙','🔮'] },
    { icon:'🔮', name:'Future Self',css:'hue-rotate(280deg) saturate(1.8) brightness(0.9)', tint:'rgba(80,0,150,0.18)',     face:'🔮', par:['✨','🔭','💡','⭐'] },
    { icon:'💼', name:'Business',   css:'contrast(1.15) saturate(0.85) brightness(0.95)', tint:'rgba(0,0,20,0.12)',          face:'👔', par:['💼','📊'] },
    { icon:'🎓', name:'Graduation', css:'brightness(1.08) saturate(1.1) hue-rotate(200deg)', tint:'rgba(0,40,120,0.1)',     face:'🎓', par:['🎓','📜','🏅','🎉'] },
  ],
  ar: [
    { icon:'🕶️', name:'Glasses',    css:'',                                  tint:'',                          face:'🕶️', par:[] },
    { icon:'🎩', name:'Top Hat',    css:'',                                  tint:'',                          face:'🎩', par:['✨'] },
    { icon:'👑', name:'Crown',      css:'brightness(1.05)',                  tint:'rgba(255,200,0,0.06)',       face:'👑', par:['✨','💫','⭐'] },
    { icon:'😷', name:'Mask',       css:'',                                  tint:'rgba(0,200,200,0.06)',       face:'😷', par:[] },
    { icon:'💝', name:'Hearts',     css:'brightness(1.1) saturate(1.3)',     tint:'rgba(255,80,120,0.1)',       face:'',   par:['❤️','💕','💗','💖'] },
    { icon:'😇', name:'Neon Wings', css:'brightness(1.1) saturate(1.3)',     tint:'rgba(150,0,255,0.1)',        face:'😇', par:['💜','✨','💫'] },
  ],
};

const CATEGORIES = [
  { id:'beauty',   label:'😊 Beauty'   },
  { id:'cartoon',  label:'🎨 Cartoon'  },
  { id:'anime',    label:'🌸 Anime'    },
  { id:'nature',   label:'🌍 Nature'   },
  { id:'places',   label:'✈️ Places'   },
  { id:'fantasy',  label:'✨ Fantasy'  },
  { id:'festival', label:'🎭 Festival' },
  { id:'buddy',    label:'🤖 Buddy AI' },
  { id:'ar',       label:'👓 AR'       },
];

export default function BuddyCamera({ user, onClose, showToast, onPosted, onStoryAdded, onOpenReelUpload }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const particleContainerRef = useRef(null);
  const streamRef = useRef(null);
  const particleIntervalsRef = useRef([]);

  const [hasPermission, setHasPermission] = useState(null); // null = checking, true/false after
  const [facingMode, setFacingMode] = useState('user');
  const [activeCat, setActiveCat] = useState('beauty');
  const [activeFilterIdx, setActiveFilterIdx] = useState(0);
  const [flashOn, setFlashOn] = useState(false);
  const [showFlash, setShowFlash] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null); // data URL of captured frame
  const [saving, setSaving] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [enhancedImage, setEnhancedImage] = useState(null);

  const activeFilter = (CAM_FILTERS[activeCat] || [])[activeFilterIdx] || CAM_FILTERS.beauty[0];

  // ── Start camera ──────────────────────────
  const startCamera = useCallback(async () => {
    try {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setHasPermission(true);
    } catch (err) {
      console.warn('Camera permission denied or unavailable:', err.message);
      setHasPermission(false);
    }
  }, [facingMode]);

  useEffect(() => {
    startCamera();
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      particleIntervalsRef.current.forEach(id => clearInterval(id));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { startCamera(); }, [facingMode, startCamera]);

  // ── Particles ──────────────────────────────
  const clearParticles = useCallback(() => {
    particleIntervalsRef.current.forEach(id => clearInterval(id));
    particleIntervalsRef.current = [];
    if (particleContainerRef.current) particleContainerRef.current.innerHTML = '';
  }, []);

  const spawnParticles = useCallback((emojis) => {
    const pc = particleContainerRef.current;
    if (!pc || !emojis.length) return;
    const make = () => {
      const el = document.createElement('div');
      el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      const dur = 2.5 + Math.random() * 2.5;
      el.style.cssText = `position:absolute;left:${5 + Math.random() * 88}%;top:-30px;font-size:${14 + Math.random() * 16}px;pointer-events:none;z-index:2;animation:camParticleFall ${dur}s linear ${Math.random() * 0.8}s forwards;`;
      pc.appendChild(el);
      setTimeout(() => { if (el.parentNode) el.remove(); }, (dur + 1.5) * 1000);
    };
    for (let i = 0; i < 5; i++) make();
    particleIntervalsRef.current.push(setInterval(make, 800));
  }, []);

  useEffect(() => {
    clearParticles();
    if (activeFilter.par && activeFilter.par.length) spawnParticles(activeFilter.par);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCat, activeFilterIdx]);

  // ── Category / filter selection ───────────
  const selectCategory = (cat) => { setActiveCat(cat); setActiveFilterIdx(0); };

  // ── Flip camera ────────────────────────────
  const flipCamera = () => {
    setFacingMode(f => f === 'user' ? 'environment' : 'user');
    showToast(facingMode === 'user' ? '📷 Back camera' : '🤳 Front camera');
  };

  // ── Capture a REAL frame from the video ───
  const capturePhoto = () => {
    if (capturedImage) { setCapturedImage(null); setEnhancedImage(null); return; } // tap again = retake
    if (!videoRef.current) return;

    setShowFlash(true);
    setTimeout(() => setShowFlash(false), 200);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 720;
    canvas.height = video.videoHeight || 1280;
    const ctx = canvas.getContext('2d');

    // Mirror if front camera, to match what the user saw on screen
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    // Apply the same CSS filter to the captured frame so it matches the live preview
    ctx.filter = activeFilter.css || 'none';
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setCapturedImage(dataUrl);
    showToast('📸 Photo captured!');
  };

  // ── Convert data URL to a File for upload ─
  const dataUrlToFile = (dataUrl, filename) => {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new File([u8arr], filename, { type: mime });
  };

  const uploadCapturedPhoto = async () => {
    const photoToUpload = enhancedImage || capturedImage;
    const file = dataUrlToFile(photoToUpload, `camera_${user.id}_${Date.now()}.jpg`);
    const path = `camera/${user.id}_${Date.now()}.jpg`;
    const { error: upErr } = await supabase.storage.from('posts').upload(path, file);
    if (upErr) { showToast('❌ Upload failed: ' + upErr.message); return null; }
    const { data: { publicUrl } } = supabase.storage.from('posts').getPublicUrl(path);

    // Track in camera_photos table for the user's personal gallery
    await supabase.from('camera_photos').insert({
      user_id: user.id,
      image_url: publicUrl,
      filter_cat: activeCat,
      filter_name: activeFilter.name,
      is_ai_enhanced: !!enhancedImage
    });

    return publicUrl;
  };

  // ── Post-capture actions ──────────────────
  const handleSave = async () => {
    setSaving(true);
    const url = await uploadCapturedPhoto();
    setSaving(false);
    if (url) { showToast('💾 Saved to your Buddy Storage!'); resetCapture(); onClose(); }
  };

  const handleShare = async () => {
    const photoToUpload = enhancedImage || capturedImage;
    if (navigator.share) {
      try {
        const file = dataUrlToFile(photoToUpload, 'buddy-photo.jpg');
        await navigator.share({ files: [file], title: 'Buddy AI Camera' });
      } catch (e) { if (e.name !== 'AbortError') showToast('📤 Shared!'); }
    } else {
      showToast('📤 Sharing not supported on this browser');
    }
  };

  const handlePost = async () => {
    setSaving(true);
    const url = await uploadCapturedPhoto();
    setSaving(false);
    if (!url) return;
    const { data, error } = await supabase.from('posts')
      .insert({ user_id: user.id, content: `📸 ${activeFilter.name} filter`, image_url: url, likes_count: 0, comments_count: 0 })
      .select('*, profiles(full_name,username,avatar_url)').single();
    if (!error && data) { onPosted(data); showToast('📱 Posted to feed!'); resetCapture(); onClose(); }
    else showToast('❌ Could not post');
  };

  const handleAddToStory = async () => {
    setSaving(true);
    const url = await uploadCapturedPhoto();
    setSaving(false);
    if (!url) return;
    const { data, error } = await supabase.from('stories')
      .insert({ user_id: user.id, image_url: url, caption: '' })
      .select('*').single();
    if (!error && data) { onStoryAdded(data); showToast('📖 Added to your story!'); resetCapture(); onClose(); }
    else showToast('❌ Could not add to story');
  };

  const handleCreateReel = async () => {
    showToast('🎬 Opening Reel upload — photo capture is for Reels later, pick a video next');
    resetCapture();
    onClose();
    onOpenReelUpload();
  };

  const handleAIEnhance = async () => {
    setEnhancing(true);
    showToast('✨ AI enhancing your photo...');
    try {
      const res = await fetch('/api/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: capturedImage, style: activeCat })
      });
      const data = await res.json();
      if (data.enhancedImage) {
        setEnhancedImage(data.enhancedImage);
        showToast('✨ AI Enhance complete!');
      } else {
        showToast('❌ ' + (data.error || 'AI Enhance failed'));
      }
    } catch (e) {
      showToast('❌ AI Enhance failed: ' + e.message);
    }
    setEnhancing(false);
  };

  const resetCapture = () => { setCapturedImage(null); setEnhancedImage(null); };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 250, background: '#000', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <style>{`
        @keyframes camParticleFall {
          0% { transform: translateY(-30px) rotate(0deg); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: .8; }
          100% { transform: translateY(110vh) rotate(360deg); opacity: 0; }
        }
        @keyframes stickerBob {
          0%,100% { transform: translateX(-50%) translateY(0) rotate(-2deg); }
          50%     { transform: translateX(-50%) translateY(-8px) rotate(2deg); }
        }
      `}</style>

      <div style={{ position: 'relative', flex: 1, overflow: 'hidden', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>

        {/* Flash effect */}
        {showFlash && <div style={{ position: 'absolute', inset: 0, background: 'white', zIndex: 30, opacity: showFlash ? 1 : 0, transition: 'opacity .15s' }} />}

        {/* Captured photo preview (replaces live video once taken) */}
        {capturedImage ? (
          <img src={enhancedImage || capturedImage} alt="Captured" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
                transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
                filter: activeFilter.css || 'none',
                transition: 'filter .35s ease',
                display: hasPermission ? 'block' : 'none', zIndex: 1
              }}
            />
            {/* No permission fallback */}
            {hasPermission === false && (
              <div style={{ position: 'absolute', inset: 0, zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(160deg,#0f172a,#1e3a8a,#1e293b)', color: 'white', gap: 12, textAlign: 'center', padding: 20 }}>
                <div style={{ fontSize: 60 }}>📷</div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>Camera Access Needed</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,.65)', lineHeight: 1.5, maxWidth: 260 }}>Allow camera permission in your browser to use Buddy Camera live filters</div>
                <button onClick={startCamera} style={{ background: G.blue, color: 'white', border: 'none', borderRadius: 20, padding: '10px 24px', fontSize: 13, fontWeight: 700, cursor: 'pointer', marginTop: 6 }}>Allow Camera</button>
              </div>
            )}
            {hasPermission === null && (
              <div style={{ position: 'absolute', inset: 0, zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 14 }}>Starting camera...</div>
            )}

            {/* AR overlay layer — tint, face sticker, particles */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, background: activeFilter.tint || 'transparent', opacity: activeFilter.tint ? 1 : 0, transition: 'background .35s, opacity .35s' }} />
              {activeFilter.face && (
                <div style={{ position: 'absolute', top: '12%', left: '50%', transform: 'translateX(-50%)', fontSize: 64, lineHeight: 1, filter: 'drop-shadow(0 4px 12px rgba(0,0,0,.5))', animation: 'stickerBob 2.4s ease-in-out infinite', zIndex: 3 }}>
                  {activeFilter.face}
                </div>
              )}
              <div ref={particleContainerRef} />
            </div>
          </>
        )}

        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* Top bar */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, padding: '12px 14px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(to bottom, rgba(0,0,0,.6), transparent)' }}>
          <div onClick={() => { resetCapture(); onClose(); }} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,.2)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 20, cursor: 'pointer' }}>✕</div>
          <div style={{ color: 'white', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>⚡ Buddy Camera</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div onClick={() => { setFlashOn(f => !f); showToast(flashOn ? '⚡ Flash OFF' : '⚡ Flash ON'); }} style={{ width: 36, height: 36, borderRadius: '50%', background: flashOn ? 'rgba(37,99,235,.7)' : 'rgba(255,255,255,.2)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, cursor: 'pointer', color: 'white' }}>⚡</div>
          </div>
        </div>

        {!capturedImage && (
          <>
            {/* Filter category tabs */}
            <div style={{ position: 'absolute', bottom: 168, left: 0, right: 0, zIndex: 10, padding: '0 8px' }}>
              <div className="ns" style={{ display: 'flex', gap: 7, overflowX: 'auto', padding: '2px 4px 4px' }}>
                {CATEGORIES.map(c => (
                  <div key={c.id} onClick={() => selectCategory(c.id)} style={{
                    flexShrink: 0, padding: '6px 13px', borderRadius: 18,
                    border: `1.5px solid ${activeCat === c.id ? G.blue : 'rgba(255,255,255,.3)'}`,
                    color: activeCat === c.id ? 'white' : 'rgba(255,255,255,.8)',
                    fontSize: 11, fontWeight: 700, cursor: 'pointer',
                    background: activeCat === c.id ? G.blue : 'rgba(0,0,0,.3)',
                    backdropFilter: 'blur(8px)', whiteSpace: 'nowrap',
                    boxShadow: activeCat === c.id ? '0 2px 14px rgba(37,99,235,.55)' : 'none',
                    transition: 'all .2s'
                  }}>{c.label}</div>
                ))}
              </div>
            </div>

            {/* Filter items row */}
            <div style={{ position: 'absolute', bottom: 100, left: 0, right: 0, zIndex: 10, padding: '0 8px' }}>
              <div className="ns" style={{ display: 'flex', gap: 10, overflowX: 'auto', padding: '4px 4px' }}>
                {(CAM_FILTERS[activeCat] || []).map((f, i) => (
                  <div key={f.name} onClick={() => setActiveFilterIdx(i)} style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
                    <div style={{
                      width: 56, height: 56, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 26, border: `2.5px solid ${activeFilterIdx === i ? 'white' : 'rgba(255,255,255,.3)'}`,
                      background: activeFilterIdx === i ? 'rgba(37,99,235,.25)' : 'rgba(0,0,0,.35)', backdropFilter: 'blur(6px)',
                      boxShadow: activeFilterIdx === i ? `0 0 0 3px ${G.blue}, 0 4px 16px rgba(37,99,235,.6)` : '0 2px 8px rgba(0,0,0,.3)',
                      transform: activeFilterIdx === i ? 'scale(1.1)' : 'scale(1)', transition: 'all .2s'
                    }}>{f.icon}</div>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,.9)', fontWeight: 700, textAlign: 'center', maxWidth: 58, lineHeight: 1.2, textShadow: '0 1px 4px rgba(0,0,0,.8)' }}>{f.name}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Post-capture action menu */}
        {capturedImage && (
          <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: 9, zIndex: 10 }}>
            {[
              ['💾', 'Save', handleSave],
              ['📤', 'Share', handleShare],
              ['📱', 'Post', handlePost],
              ['🎬', 'Create Reel', handleCreateReel],
              ['✨', enhancing ? 'Enhancing...' : 'AI Enhance', handleAIEnhance],
              ['📖', 'Add to Story', handleAddToStory],
            ].map(([icon, label, fn]) => (
              <div key={label} onClick={!saving && !enhancing ? fn : undefined} style={{
                background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,.25)',
                color: 'white', borderRadius: 22, padding: '7px 13px', fontSize: 11, fontWeight: 700,
                cursor: saving || enhancing ? 'default' : 'pointer', whiteSpace: 'nowrap', opacity: saving || enhancing ? 0.6 : 1
              }}>{icon} {label}</div>
            ))}
          </div>
        )}

        {/* Bottom capture bar */}
        {!capturedImage && hasPermission && (
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10, padding: '6px 24px 20px', background: 'linear-gradient(to top, rgba(0,0,0,.75) 60%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div onClick={() => showToast('🖼️ Opening Gallery...')} style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(255,255,255,.15)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, cursor: 'pointer', border: '1.5px solid rgba(255,255,255,.2)' }}>🖼️</div>
            <div onClick={capturePhoto} style={{ width: 72, height: 72, borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 0 0 5px rgba(255,255,255,.35), 0 6px 24px rgba(0,0,0,.5)' }}>
              <div style={{ width: 58, height: 58, borderRadius: '50%', background: 'linear-gradient(135deg,#60A5FA,#2563EB)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>📷</div>
            </div>
            <div onClick={flipCamera} style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,.15)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, cursor: 'pointer' }}>🔄</div>
          </div>
        )}

        {/* Retake button when photo is captured */}
        {capturedImage && (
          <div onClick={capturePhoto} style={{ position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 10, background: 'rgba(255,255,255,.2)', backdropFilter: 'blur(6px)', color: 'white', borderRadius: 20, padding: '10px 22px', fontSize: 13, fontWeight: 700, cursor: 'pointer', border: '1.5px solid rgba(255,255,255,.3)' }}>
            🔄 Retake
          </div>
        )}
      </div>
    </div>
  );
}
