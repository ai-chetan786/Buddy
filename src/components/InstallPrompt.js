import React, { useState, useEffect } from 'react';

// ============================================================
// InstallPrompt — shows "Add Buddy to Home Screen" banner
// Uses the browser's native beforeinstallprompt event.
// Only appears on Android Chrome. iPhone shows a manual tip.
// Appears once per session, dismissible forever with localStorage.
// ============================================================

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Already installed as PWA? Don't show
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }
    // Dismissed before? Don't show
    if (localStorage.getItem('buddy-install-dismissed')) return;

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIsIOS(ios);

    if (ios) {
      // iOS doesn't support beforeinstallprompt — show manual tip after 8 seconds
      const t = setTimeout(() => setShow(true), 8000);
      return () => clearTimeout(t);
    }

    // Android Chrome: capture the prompt
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Show banner after 5 seconds of using the app
      setTimeout(() => setShow(true), 5000);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShow(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem('buddy-install-dismissed', '1');
  };

  if (isInstalled || !show) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 80, left: 12, right: 12, zIndex: 999,
      background: 'linear-gradient(135deg,#1E3A8A,#2563EB)',
      borderRadius: 18, padding: '14px 16px',
      boxShadow: '0 8px 32px rgba(37,99,235,.45)',
      display: 'flex', alignItems: 'center', gap: 12,
      animation: 'slideup .3s ease',
      fontFamily: "'Segoe UI',-apple-system,sans-serif"
    }}>
      {/* App icon */}
      <img src="/icons/icon-72.png" alt="Buddy" style={{ width:46, height:46, borderRadius:12, flexShrink:0 }} />

      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ color:'white', fontSize:13, fontWeight:800, marginBottom:2 }}>
          Install Buddy AI
        </div>
        {isIOS ? (
          <div style={{ color:'rgba(255,255,255,.8)', fontSize:11, lineHeight:1.4 }}>
            Tap <b>Share</b> then <b>"Add to Home Screen"</b> to install Buddy
          </div>
        ) : (
          <div style={{ color:'rgba(255,255,255,.8)', fontSize:11, lineHeight:1.4 }}>
            Add to home screen for the full app experience
          </div>
        )}
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:6, flexShrink:0 }}>
        {!isIOS && (
          <button onClick={handleInstall} style={{
            background:'white', color:'#2563EB', border:'none', borderRadius:10,
            padding:'7px 14px', fontSize:12, fontWeight:800, cursor:'pointer', fontFamily:'inherit',
            whiteSpace:'nowrap'
          }}>
            Install ⚡
          </button>
        )}
        <button onClick={handleDismiss} style={{
          background:'rgba(255,255,255,.15)', color:'white', border:'none', borderRadius:10,
          padding:'5px 14px', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit',
          whiteSpace:'nowrap'
        }}>
          {isIOS ? 'Got it' : 'Not now'}
        </button>
      </div>
    </div>
  );
}
