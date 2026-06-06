import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../supabase';
import './Chat.css';

export default function ChatRoom() {
  const { id: conversationId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [otherUser, setOtherUser] = useState(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { navigate('/login'); return; }
      setUser(session.user);
      loadConversation(session.user.id);
      loadMessages();
    });
  }, [conversationId, navigate]);

  useEffect(() => {
    // Realtime subscription
    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, (payload) => {
        setMessages(prev => {
          const exists = prev.find(m => m.id === payload.new.id);
          if (exists) return prev;
          return [...prev, payload.new];
        });
        scrollToBottom();
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const loadConversation = async (userId) => {
    const { data } = await supabase
      .from('conversations')
      .select(`
        *,
        user1:profiles!conversations_user1_id_fkey(id, full_name, username, avatar_url),
        user2:profiles!conversations_user2_id_fkey(id, full_name, username, avatar_url)
      `)
      .eq('id', conversationId)
      .single();

    if (data) {
      const other = data.user1?.id === userId ? data.user2 : data.user1;
      setOtherUser(other);
    }
  };

  const loadMessages = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    setMessages(data || []);
    setLoading(false);
    scrollToBottom();
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || !user) return;

    setInput('');

    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: text
      })
      .select()
      .single();

    if (!error && data) {
      // Update last message in conversation
      await supabase
        .from('conversations')
        .update({
          last_message: text,
          last_message_time: new Date().toISOString()
        })
        .eq('id', conversationId);
    }

    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString([], {
      hour: '2-digit', minute: '2-digit'
    });
  };

  const getAvatar = (profile) => {
    if (profile?.avatar_url) {
      return <img src={profile.avatar_url} alt="" className="room-avatar-img" />;
    }
    const name = profile?.full_name || '?';
    return <div className="room-avatar-letter">{name[0]?.toUpperCase()}</div>;
  };

  // Group messages by date
  const groupedMessages = messages.reduce((groups, msg) => {
    const date = new Date(msg.created_at).toLocaleDateString();
    if (!groups[date]) groups[date] = [];
    groups[date].push(msg);
    return groups;
  }, {});

  return (
    <div className="chatroom-container">
      {/* Header */}
      <div className="chatroom-header">
        <button className="back-btn" onClick={() => navigate('/chat')}>←</button>
        <div className="chatroom-header-info">
          <div className="room-avatar">{getAvatar(otherUser)}</div>
          <div>
            <div className="room-name">{otherUser?.full_name || 'Buddy User'}</div>
            <div className="room-status">
              <span className="status-dot"></span> Active now
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="chatroom-messages">
        {loading ? (
          <div className="room-loading">Loading messages... 💬</div>
        ) : messages.length === 0 ? (
          <div className="room-empty">
            <div className="room-empty-icon">👋</div>
            <p>Say hello to {otherUser?.full_name || 'your friend'}!</p>
          </div>
        ) : (
          Object.entries(groupedMessages).map(([date, msgs]) => (
            <div key={date}>
              <div className="date-divider">
                <span>{date === new Date().toLocaleDateString() ? 'Today' : date}</span>
              </div>
              {msgs.map((msg, i) => {
                const isMe = msg.sender_id === user?.id;
                const showAvatar = !isMe && (i === 0 || msgs[i-1]?.sender_id !== msg.sender_id);
                return (
                  <div key={msg.id} className={`msg-row ${isMe ? 'msg-me' : 'msg-other'}`}>
                    {!isMe && (
                      <div className={`msg-side-avatar ${showAvatar ? '' : 'invisible'}`}>
                        {getAvatar(otherUser)}
                      </div>
                    )}
                    <div className={`msg-bubble ${isMe ? 'bubble-me' : 'bubble-other'}`}>
                      <p className="bubble-text">{msg.content}</p>
                      <span className="bubble-time">{formatTime(msg.created_at)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="chatroom-input-area">
        <div className="chatroom-input-box">
          <textarea
            ref={inputRef}
            className="chatroom-input"
            placeholder={`Message ${otherUser?.full_name || ''}...`}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
          />
          <button
            className={`chatroom-send-btn ${input.trim() ? 'active' : ''}`}
            onClick={sendMessage}
            disabled={!input.trim()}
          >
            🚀
          </button>
        </div>
        <p className="input-hint">Enter to send • Shift+Enter for new line</p>
      </div>
    </div>
  );
}
