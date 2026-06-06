import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import './Chat.css';

export default function ChatList() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { navigate('/login'); return; }
      setUser(session.user);
      loadConversations(session.user.id);
      loadAllUsers(session.user.id);
    });
  }, [navigate]);

  const loadConversations = async (userId) => {
    setLoading(true);
    const { data } = await supabase
      .from('conversations')
      .select(`
        *,
        user1:profiles!conversations_user1_id_fkey(id, full_name, username, avatar_url),
        user2:profiles!conversations_user2_id_fkey(id, full_name, username, avatar_url)
      `)
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .order('last_message_time', { ascending: false });

    setConversations(data || []);
    setLoading(false);
  };

  const loadAllUsers = async (userId) => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url')
      .neq('id', userId);
    setAllUsers(data || []);
  };

  const startChat = async (otherUser) => {
    if (!user) return;

    // Check if conversation already exists
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .or(
        `and(user1_id.eq.${user.id},user2_id.eq.${otherUser.id}),and(user1_id.eq.${otherUser.id},user2_id.eq.${user.id})`
      )
      .single();

    if (existing) {
      navigate(`/chat/${existing.id}`);
      return;
    }

    // Create new conversation
    const { data: newConv } = await supabase
      .from('conversations')
      .insert({
        user1_id: user.id,
        user2_id: otherUser.id,
        last_message: '',
      })
      .select()
      .single();

    if (newConv) navigate(`/chat/${newConv.id}`);
  };

  const getOtherUser = (conv) => {
    if (!user) return null;
    return conv.user1?.id === user.id ? conv.user2 : conv.user1;
  };

  const getAvatar = (profile, size = 46) => {
    const style = {
      width: size, height: size,
      borderRadius: '50%',
      background: 'linear-gradient(135deg, #2563eb, #60a5fa)',
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 700,
      fontSize: size * 0.38,
      flexShrink: 0
    };
    if (profile?.avatar_url) {
      return <img src={profile.avatar_url} alt="" style={{ ...style, objectFit: 'cover' }} />;
    }
    const name = profile?.full_name || profile?.username || '?';
    return <div style={style}>{name[0]?.toUpperCase()}</div>;
  };

  const timeAgo = (date) => {
    if (!date) return '';
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return 'now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
  };

  const filteredUsers = allUsers.filter(u =>
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.username?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="chat-list-container">
      {/* Header */}
      <div className="chat-list-header">
        <button className="back-btn" onClick={() => navigate('/home')}>←</button>
        <h1 className="chat-list-title">💬 Messages</h1>
        <button className="new-chat-btn" onClick={() => setShowSearch(!showSearch)}>
          {showSearch ? '✕' : '✏️'}
        </button>
      </div>

      {/* Search New User */}
      {showSearch && (
        <div className="search-section">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              className="search-input"
              placeholder="Search users to chat..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          <div className="users-list">
            {filteredUsers.length === 0 ? (
              <p className="no-users">No users found</p>
            ) : (
              filteredUsers.map(u => (
                <div key={u.id} className="user-item" onClick={() => startChat(u)}>
                  {getAvatar(u, 44)}
                  <div className="user-item-info">
                    <span className="user-item-name">{u.full_name || 'Buddy User'}</span>
                    <span className="user-item-username">@{u.username || 'user'}</span>
                  </div>
                  <span className="user-item-chat">Chat →</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Conversations List */}
      <div className="conversations-list">
        {loading ? (
          <div className="chat-list-loading">
            <p>Loading chats... 💬</p>
          </div>
        ) : conversations.length === 0 ? (
          <div className="no-chats">
            <div className="no-chats-icon">💬</div>
            <h3>No chats yet!</h3>
            <p>Start a conversation with someone</p>
            <button className="btn-start-chat" onClick={() => setShowSearch(true)}>
              ✏️ New Chat
            </button>
          </div>
        ) : (
          conversations.map(conv => {
            const other = getOtherUser(conv);
            if (!other) return null;
            return (
              <div
                key={conv.id}
                className="conv-item"
                onClick={() => navigate(`/chat/${conv.id}`)}
              >
                {getAvatar(other, 52)}
                <div className="conv-info">
                  <div className="conv-top">
                    <span className="conv-name">{other.full_name || 'Buddy User'}</span>
                    <span className="conv-time">{timeAgo(conv.last_message_time)}</span>
                  </div>
                  <span className="conv-last">
                    {conv.last_message || 'Say hello! 👋'}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
