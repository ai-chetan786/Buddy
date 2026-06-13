import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import './AIChat.css';

const QUICK_PROMPTS = [
  { icon: '💡', text: 'Give me a creative idea' },
  { icon: '📝', text: 'Help me write something' },
  { icon: '🧠', text: 'Explain a concept simply' },
  { icon: '😂', text: 'Tell me a funny joke' },
];

export default function AIChat() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { navigate('/login'); return; }
      setUser(session.user);
      loadSessions(session.user.id);
    });
    // Setup speech recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-IN';
      recognitionRef.current.onresult = (e) => {
        const transcript = Array.from(e.results).map(r => r[0].transcript).join('');
        setInput(transcript);
        if (e.results[0].isFinal) {
          setIsListening(false);
        }
      };
      recognitionRef.current.onend = () => setIsListening(false);
      recognitionRef.current.onerror = () => setIsListening(false);
    }
    return () => {
      if (synthRef.current) synthRef.current.cancel();
    };
  }, [navigate]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const speak = (text) => {
    if (!voiceEnabled || !synthRef.current) return;
    synthRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-IN';
    utterance.rate = 0.95;
    utterance.pitch = 1.1;
    const voices = synthRef.current.getVoices();
    const preferred = voices.find(v => v.lang.includes('en') && v.name.includes('Female'))
      || voices.find(v => v.lang.includes('en'))
      || voices[0];
    if (preferred) utterance.voice = preferred;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    synthRef.current.speak(utterance);
  };

  const stopSpeaking = () => {
    if (synthRef.current) synthRef.current.cancel();
    setIsSpeaking(false);
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Voice not supported in this browser. Try Chrome!');
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setInput('');
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const loadSessions = async (userId) => {
    setLoadingHistory(true);
    try {
      const { data } = await supabase
        .from('ai_chats')
        .select('session_id, message, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (data && data.length > 0) {
        const sessionMap = {};
        data.forEach(chat => {
          if (!sessionMap[chat.session_id]) {
            sessionMap[chat.session_id] = {
              id: chat.session_id,
              title: chat.message.slice(0, 40) + (chat.message.length > 40 ? '...' : ''),
              time: chat.created_at
            };
          }
        });
        const sessionList = Object.values(sessionMap);
        setSessions(sessionList);
        await loadSession(userId, sessionList[0].id);
      } else {
        startNewChat();
      }
    } catch (e) {
      startNewChat();
    }
    setLoadingHistory(false);
  };

  const loadSession = async (userId, sessionId) => {
    setActiveSession(sessionId);
    try {
      const { data } = await supabase
        .from('ai_chats')
        .select('*')
        .eq('user_id', userId)
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (data && data.length > 0) {
        const history = [];
        data.forEach(chat => {
          history.push({ role: 'user', content: chat.message, time: new Date(chat.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
          history.push({ role: 'assistant', content: chat.reply, time: new Date(chat.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
        });
        setMessages(history);
      }
    } catch (e) { console.log('Load session error:', e); }
  };

  const startNewChat = () => {
    const newSessionId = `session_${Date.now()}`;
    setActiveSession(newSessionId);
    setMessages([{
      role: 'assistant',
      content: "Hey! I'm Buddy AI 🤖 Your smart companion! Ask me anything — or tap the 🎤 mic to speak! 😊",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
    setShowSidebar(false);
    inputRef.current?.focus();
  };

  const sendMessage = async (text) => {
    const userText = text || input.trim();
    if (!userText || loading) return;
    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); }
    if (isSpeaking) stopSpeaking();

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages(prev => [...prev, { role: 'user', content: userText, time: now }]);
    setInput('');
    setLoading(true);

    const contextMessages = [...messages.slice(-10), { role: 'user', content: userText }]
      .map(m => ({ role: m.role, content: m.content }));

    let reply = null;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: contextMessages }),
        signal: controller.signal
      });
      clearTimeout(timeout);
      if (res.ok) {
        const data = await res.json();
        if (data.reply) reply = data.reply;
      }
    } catch (err) { console.log('Fetch error:', err.message); }

    const aiMsg = {
      role: 'assistant',
      content: reply || "Sorry yaar! Something went wrong. Please try again! 😅",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, aiMsg]);
    setLoading(false);

    // Speak the reply if voice enabled
    if (reply && voiceEnabled) speak(reply);

    if (user && reply && activeSession) {
      try {
        await supabase.from('ai_chats').insert({
          user_id: user.id,
          session_id: activeSession,
          message: userText,
          reply: reply
        });
        setSessions(prev => {
          const exists = prev.find(s => s.id === activeSession);
          if (exists) return prev;
          return [{ id: activeSession, title: userText.slice(0, 40), time: new Date().toISOString() }, ...prev];
        });
      } catch (e) { console.log('Save error:', e.message); }
    }
    inputRef.current?.focus();
  };

  const deleteSession = async (sessionId, e) => {
    e.stopPropagation();
    try {
      await supabase.from('ai_chats').delete().eq('user_id', user.id).eq('session_id', sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      if (activeSession === sessionId) startNewChat();
    } catch (e) { console.log('Delete error:', e); }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const timeLabel = (dateStr) => {
    const diff = Math.floor((new Date() - new Date(dateStr)) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    if (diff < 7) return `${diff} days ago`;
    return new Date(dateStr).toLocaleDateString();
  };

  if (loadingHistory) {
    return (
      <div className="aichat-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px' }}>
        <div style={{ fontSize: '48px', animation: 'pulse 1.5s infinite' }}>🤖</div>
        <p style={{ color: '#64748b', fontFamily: 'Poppins' }}>Loading your chats...</p>
      </div>
    );
  }

  return (
    <div className="aichat-wrapper">
      {/* Sidebar */}
      <div className={`chat-sidebar ${showSidebar ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h3>💬 Chit-Chat AI</h3>
          <button className="close-sidebar" onClick={() => setShowSidebar(false)}>✕</button>
        </div>
        <button className="new-chat-btn-sidebar" onClick={startNewChat}>✏️ New Chat</button>
        <div className="sessions-list">
          {sessions.length === 0 ? (
            <p className="no-sessions">No chat history yet</p>
          ) : (
            sessions.map(session => (
              <div
                key={session.id}
                className={`session-item ${activeSession === session.id ? 'active' : ''}`}
                onClick={() => { loadSession(user.id, session.id); setShowSidebar(false); }}
              >
                <div className="session-info">
                  <p className="session-title">{session.title}</p>
                  <span className="session-time">{timeLabel(session.time)}</span>
                </div>
                <button className="session-delete" onClick={(e) => deleteSession(session.id, e)}>🗑️</button>
              </div>
            ))
          )}
        </div>
      </div>
      {showSidebar && <div className="sidebar-overlay" onClick={() => setShowSidebar(false)} />}

      {/* Main */}
      <div className="chat-container">
        <div className="chat-header">
          <button className="back-btn" onClick={() => setShowSidebar(true)}>☰</button>
          <div className="chat-header-info">
            <div className="ai-avatar">🤖</div>
            <div>
              <div className="ai-name">Buddy AI</div>
              <div className="ai-status">
                <span className="status-dot"></span>
                {loading ? 'Typing...' : isSpeaking ? '🔊 Speaking...' : isListening ? '🎤 Listening...' : 'Always online'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              className={`clear-btn ${voiceEnabled ? 'voice-on' : ''}`}
              onClick={() => { setVoiceEnabled(!voiceEnabled); if (isSpeaking) stopSpeaking(); }}
              title={voiceEnabled ? 'Voice ON - tap to mute' : 'Voice OFF - tap to enable'}
            >
              {voiceEnabled ? '🔊' : '🔇'}
            </button>
            <button className="clear-btn" onClick={startNewChat} title="New Chat">✏️</button>
            <button className="clear-btn" onClick={() => navigate('/home')}>🏠</button>
          </div>
        </div>

        <div className="chat-messages">
          {messages.length <= 1 && !loading && (
            <div className="quick-prompts">
              <p className="quick-title">Try asking:</p>
              <div className="quick-grid">
                {QUICK_PROMPTS.map((q, i) => (
                  <button key={i} className="quick-btn" onClick={() => sendMessage(q.text)} disabled={loading}>
                    {q.icon} {q.text}
                  </button>
                ))}
              </div>
              <p className="voice-hint">🎤 Tap mic to speak • 🔇 Tap speaker icon for voice replies</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`message-row ${msg.role === 'user' ? 'user-row' : 'ai-row'}`}>
              {msg.role === 'assistant' && <div className="msg-avatar">🤖</div>}
              <div className={`message-bubble ${msg.role === 'user' ? 'user-bubble' : 'ai-bubble'}`}>
                <p className="msg-text">{msg.content}</p>
                <div className="msg-footer">
                  <span className="msg-time">{msg.time}</span>
                  {msg.role === 'assistant' && (
                    <button
                      className="speak-btn"
                      onClick={() => isSpeaking ? stopSpeaking() : speak(msg.content)}
                      title="Listen to this message"
                    >
                      {isSpeaking ? '⏹️' : '🔊'}
                    </button>
                  )}
                </div>
              </div>
              {msg.role === 'user' && (
                <div className="msg-avatar user-av">
                  {user?.email?.[0]?.toUpperCase() || '👤'}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="message-row ai-row">
              <div className="msg-avatar">🤖</div>
              <div className="ai-bubble typing-bubble">
                <span className="dot"></span><span className="dot"></span><span className="dot"></span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="chat-input-area">
          <div className="input-box">
            <button
              className={`mic-btn ${isListening ? 'listening' : ''}`}
              onClick={toggleListening}
              title={isListening ? 'Stop listening' : 'Speak your message'}
            >
              {isListening ? '⏹️' : '🎤'}
            </button>
            <textarea
              ref={inputRef}
              className="chat-input"
              placeholder={isListening ? '🎤 Listening... speak now!' : 'Message Buddy AI...'}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={loading}
            />
            <button
              className={`send-btn ${input.trim() && !loading ? 'active' : ''}`}
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
            >
              {loading ? '⏳' : '🚀'}
            </button>
          </div>
          <p className="input-hint">🎤 Mic to speak • Enter to send • 🔊 Toggle voice replies</p>
        </div>
      </div>
    </div>
  );
}
