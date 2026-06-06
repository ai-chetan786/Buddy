import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import './AIChat.css';

const OPENROUTER_KEY = process.env.REACT_APP_OPENROUTER_KEY;
const GROQ_KEY = process.env.REACT_APP_GROQ_API_KEY;

const QUICK_PROMPTS = [
  { icon: '💡', text: 'Give me a creative idea' },
  { icon: '📝', text: 'Help me write something' },
  { icon: '🧠', text: 'Explain a concept simply' },
  { icon: '😂', text: 'Tell me a funny joke' },
];

const SYSTEM_PROMPT = `You are Buddy AI, a friendly, helpful, and fun AI assistant built into the Buddy social app. 
Be conversational, warm, and genuinely helpful. Keep responses concise but complete. 
Use emojis occasionally. You are talking to an Indian user so be culturally aware.`;

async function callGroq(messages, userText) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_KEY}`
    },
    body: JSON.stringify({
      model: 'llama3-8b-8192',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: userText }
      ],
      max_tokens: 1024
    })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.choices[0].message.content;
}

async function callOpenRouter(messages, userText) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_KEY}`,
      'HTTP-Referer': 'https://buddycom.vercel.app',
      'X-Title': 'Buddy AI'
    },
    body: JSON.stringify({
      model: 'mistralai/mistral-7b-instruct:free',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: userText }
      ],
      max_tokens: 1024
    })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.choices[0].message.content;
}

export default function AIChat() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: "Hey! I'm Buddy AI 🤖 Your smart companion! Ask me anything — I'm here to help, chat, and make your day better! 😊",
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate('/login');
      else setUser(session.user);
    });
  }, [navigate]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async (text) => {
    const userText = text || input.trim();
    if (!userText || loading) return;

    const userMsg = {
      role: 'user',
      content: userText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    let reply = null;

    // Try Groq first, then OpenRouter as fallback
    try {
      reply = await callGroq(messages, userText);
    } catch (e1) {
      console.log('Groq failed, trying OpenRouter...', e1.message);
      try {
        reply = await callOpenRouter(messages, userText);
      } catch (e2) {
        console.log('OpenRouter also failed:', e2.message);
        reply = null;
      }
    }

    const aiMsg = {
      role: 'assistant',
      content: reply || "I'm having a small break! 😅 Please try again in a moment.",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, aiMsg]);

    if (user && reply) {
      await supabase.from('ai_chats').insert({
        user_id: user.id,
        message: userText,
        reply: reply
      }).catch(() => {});
    }

    setLoading(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([{
      role: 'assistant',
      content: "Chat cleared! Fresh start 🌟 What's on your mind?",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <button className="back-btn" onClick={() => navigate('/home')}>←</button>
        <div className="chat-header-info">
          <div className="ai-avatar">🤖</div>
          <div>
            <div className="ai-name">Buddy AI</div>
            <div className="ai-status"><span className="status-dot"></span> Always online</div>
          </div>
        </div>
        <button className="clear-btn" onClick={clearChat}>🗑️</button>
      </div>

      <div className="chat-messages">
        {messages.length === 1 && (
          <div className="quick-prompts">
            <p className="quick-title">Try asking:</p>
            <div className="quick-grid">
              {QUICK_PROMPTS.map((q, i) => (
                <button key={i} className="quick-btn" onClick={() => sendMessage(q.text)}>
                  <span>{q.icon}</span> {q.text}
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
            onChange={(e) => setInput(e.target.value)}
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
