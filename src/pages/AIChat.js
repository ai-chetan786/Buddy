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
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { navigate('/login'); return; }
      setUser(session.user);
      loadChatHistory(session.user.id);
    });
  }, [navigate]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const loadChatHistory = async (userId) => {
    setLoadingHistory(true);
    try {
      const { data } = await supabase
        .from('ai_chats')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
        .limit(50);

      if (data && data.length > 0) {
        const history = [];
        data.forEach(chat => {
          history.push({
            role: 'user',
            content: chat.message,
            time: new Date(chat.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          });
          history.push({
            role: 'assistant',
            content: chat.reply,
            time: new Date(chat.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          });
        });
        setMessages(history);
      } else {
        setMessages([{
          role: 'assistant',
          content: "Hey! I'm Buddy AI 🤖 Your smart companion! Ask me anything — I'm here to help, chat, and make your day better! 😊",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
      }
    } catch (e) {
      setMessages([{
        role: 'assistant',
        content: "Hey! I'm Buddy AI 🤖 Ask me anything!",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    }
    setLoadingHistory(false);
  };

  const sendMessage = async (text) => {
    const userText = text || input.trim();
    if (!userText || loading) return;

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg = { role: 'user', content: userText, time: now };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    // Build conversation context (last 10 messages only)
    const contextMessages = [...messages.slice(-10), userMsg]
      .map(m => ({ role: m.role, content: m.content }));

    let reply = null;
    let attempts = 0;
    const maxAttempts = 3;

    while (!reply && attempts < maxAttempts) {
      attempts++;
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

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
      } catch (err) {
        console.log(`Attempt ${attempts} failed:`, err.message);
        if (attempts < maxAttempts) {
          await new Promise(r => setTimeout(r, 1000 * attempts)); // wait before retry
        }
      }
    }

    const aiMsg = {
      role: 'assistant',
      content: reply || "Sorry yaar! Something went wrong. Please try again! 😅",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, aiMsg]);
    setLoading(false);

    // Save to database only if we got a real reply
    if (user && reply) {
     try {
  await supabase.from('ai_chats').insert({
    user_id: user.id,
    message: userText,
    reply: reply
  });
} catch(e) {}
      

    inputRef.current?.focus();
  };

  const clearChat = async () => {
    if (!user) return;
    if (!window.confirm('Clear all chat history?')) return;

    await supabase.from('ai_chats').delete().eq('user_id', user.id);
    setMessages([{
      role: 'assistant',
      content: "Chat cleared! Fresh start 🌟 What's on your mind?",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (loadingHistory) {
    return (
      <div className="chat-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#64748b' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🤖</div>
          <p>Loading your chat history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <div className="chat-header">
        <button className="back-btn" onClick={() => navigate('/home')}>←</button>
        <div className="chat-header-info">
          <div className="ai-avatar">🤖</div>
          <div>
            <div className="ai-name">Buddy AI</div>
            <div className="ai-status">
              <span className="status-dot"></span>
              {loading ? 'Typing...' : 'Always online'}
            </div>
          </div>
        </div>
        <button className="clear-btn" onClick={clearChat} title="Clear chat history">🗑️</button>
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
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`message-row ${msg.role === 'user' ? 'user-row' : 'ai-row'}`}>
            {msg.role === 'assistant' && <div className="msg-avatar">🤖</div>}
            <div className={`message-bubble ${msg.role === 'user' ? 'user-bubble' : 'ai-bubble'}`}>
              <p className="msg-text">{msg.content}</p>
              <span className="msg-time">{msg.time}</span>
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
              <span className="dot"></span>
              <span className="dot"></span>
              <span className="dot"></span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="chat-input-area">
        <div className="input-box">
          <textarea
            ref={inputRef}
            className="chat-input"
            placeholder="Message Buddy AI..."
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
        <p className="input-hint">Press Enter to send • Shift+Enter for new line</p>
      </div>
    </div>
  );
}
