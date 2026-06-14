import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import './Feed.css';

// ─── HELPERS ────────────────────────────────────────────────────────────────
function fmtCount(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}
function timeAgo(ts) {
  const s = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  return Math.floor(s / 86400) + 'd ago';
}
function getInitial(name) {
  return name ? name.charAt(0).toUpperCase() : '?';
}

// ─── TOAST ───────────────────────────────────────────────────────────────────
function Toast({ msg }) {
  return msg ? (
    <div style={{
      position: 'fixed', top: 18, left: '50%', transform: 'translateX(-50%)',
      background: '#1e293b', color: 'white', padding: '9px 20px',
      borderRadius: 22, fontSize: 12.5, zIndex: 9999,
      whiteSpace: 'nowrap', boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
      animation: 'fadeIn 0.2s ease'
    }}>{msg}</div>
  ) : null;
}

// ─── STORY VIEWER ────────────────────────────────────────────────────────────
function StoryViewer({ story, onClose }) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    setProgress(0);
    const timer = setTimeout(() => onClose(), 5000);
    const interval = setInterval(() => setProgress(p => Math.min(p + 2, 100)), 100);
    return () => { clearTimeout(timer); clearInterval(interval); };
  }, [story, onClose]);

  if (!story) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'black',
      zIndex: 300, display: 'flex', flexDirection: 'column'
    }}>
      <div style={{ display: 'flex', gap: 4, padding: '14px 14px 6px' }}>
        <div style={{ flex: 1, height: 2.5, background: 'rgba(255,255,255,0.3)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', background: 'white', width: progress + '%', transition: 'width 0.1s linear' }} />
        </div>
      </div>
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(180deg,#1e3a8a,#2563eb,#60a5fa)', position: 'relative'
      }}>
        <div style={{ position: 'absolute', top: 10, left: 14, display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18
          }}>{story.emoji}</div>
          <div>
            <div style={{ color: 'white', fontWeight: 700, fontSize: 13 }}>{story.name}</div>
            <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 10 }}>Just now</div>
          </div>
        </div>
        <div style={{ fontSize: 80, animation: 'floaty 3s ease-in-out infinite' }}>{story.emoji}</div>
        <div style={{
          position: 'absolute', top: 10, right: 14,
          color: 'white', fontSize: 24, cursor: 'pointer'
        }} onClick={onClose}>✕</div>
        <div style={{
          position: 'absolute', bottom: 90, left: '50%', transform: 'translateX(-50%)',
          color: 'white', fontSize: 15, fontWeight: 700, textAlign: 'center',
          width: '80%', textShadow: '0 2px 8px rgba(0,0,0,0.5)'
        }}>{story.caption}</div>
      </div>
      <div style={{ padding: '10px 14px 20px', display: 'flex', gap: 9, background: 'black' }}>
        <input placeholder="Reply to story..." style={{
          flex: 1, background: 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.3)', color: 'white',
          borderRadius: 22, padding: '9px 14px', fontSize: 12.5, outline: 'none'
        }} />
        <span style={{ color: 'white', fontSize: 22, cursor: 'pointer' }}>➤</span>
      </div>
    </div>
  );
}

// ─── COMMENTS SHEET ──────────────────────────────────────────────────────────
function CommentsSheet({ postId, user, onClose }) {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!postId) return;
    supabase.from('comments')
      .select('*, profiles(full_name, username, avatar_url)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
      .then(({ data }) => setComments(data || []));
  }, [postId]);

  const sendComment = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    const { data, error } = await supabase.from('comments').insert({
      post_id: postId, user_id: user.id, content: text.trim()
    }).select('*, profiles(full_name, username, avatar_url)').single();
    if (!error && data) {
      setComments(c => [...c, data]);
      await supabase.rpc('increment_comments', { post_id: postId });
    }
    setText(''); setSending(false);
  };

  const staticComments = [
    { id: 's1', emoji: '🤖', name: 'Buddy AI', text: 'This is amazing! 🚀' },
    { id: 's2', emoji: '👩', name: 'Maya', text: 'So inspiring!! 💙✨' },
    { id: 's3', emoji: '👦', name: 'Akash', text: 'Best content today! 🔥' },
  ];

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
      zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center'
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'white', borderRadius: '22px 22px 0 0',
        width: '100%', maxWidth: 430, padding: 18,
        maxHeight: '75vh', overflowY: 'auto',
        animation: 'slideUp 0.28s ease'
      }}>
        <div style={{ width: 38, height: 4, background: '#e2e8f0', borderRadius: 2, margin: '0 auto 14px' }} />
        <div style={{ fontSize: 15, fontWeight: 700, color: '#1E293B', marginBottom: 14 }}>💬 Comments</div>

        {staticComments.map(c => (
          <div key={c.id} style={{ display: 'flex', gap: 9, padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'linear-gradient(135deg,#60A5FA,#2563EB)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0
            }}>{c.emoji}</div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#1E293B' }}>{c.name}</div>
              <div style={{ fontSize: 12.5, color: '#475569', marginTop: 2 }}>{c.text}</div>
            </div>
            <div style={{ fontSize: 17, cursor: 'pointer', marginLeft: 'auto', alignSelf: 'center' }}>🤍</div>
          </div>
        ))}

        {comments.map(c => (
          <div key={c.id} style={{ display: 'flex', gap: 9, padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'linear-gradient(135deg,#93C5FD,#1D4ED8)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 700, color: 'white', flexShrink: 0
            }}>
              {c.profiles?.avatar_url
                ? <img src={c.profiles.avatar_url} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                : getInitial(c.profiles?.full_name)}
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#1E293B' }}>{c.profiles?.full_name || 'User'}</div>
              <div style={{ fontSize: 12.5, color: '#475569', marginTop: 2 }}>{c.content}</div>
            </div>
          </div>
        ))}

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 10 }}>
          <input
            value={text} onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendComment()}
            placeholder="Add a comment..."
            style={{
              flex: 1, border: '1.5px solid #BFDBFE', borderRadius: 18,
              padding: '9px 14px', fontSize: 12.5, outline: 'none', fontFamily: 'inherit'
            }}
          />
          <button onClick={sendComment} disabled={sending} style={{
            width: 36, height: 36, background: '#2563EB', border: 'none',
            borderRadius: '50%', color: 'white', fontSize: 15, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>➤</button>
        </div>
      </div>
    </div>
  );
}

// ─── FOLLOW SUGGESTIONS ──────────────────────────────────────────────────────
function FollowSuggestions({ currentUserId, following, onFollow }) {
  const suggestions = [
    { id: 'maya', emoji: '👩', name: 'Maya', role: 'AI Artist', bg: 'linear-gradient(135deg,#F9A8D4,#EC4899)' },
    { id: 'akash', emoji: '👦', name: 'Akash', role: 'Developer', bg: 'linear-gradient(135deg,#86EFAC,#22C55E)' },
    { id: 'priya', emoji: '👧', name: 'Priya', role: 'Photographer', bg: 'linear-gradient(135deg,#FDE68A,#F59E0B)' },
    { id: 'rohan', emoji: '🧒', name: 'Rohan', role: 'Musician', bg: 'linear-gradient(135deg,#C4B5FD,#7C3AED)' },
  ];
  return (
    <div style={{ padding: '8px 10px' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#1E293B', marginBottom: 9 }}>People You May Know</div>
      <div style={{ display: 'flex', gap: 9, overflowX: 'auto', scrollbarWidth: 'none' }}>
        {suggestions.map(s => (
          <div key={s.id} style={{
            background: 'white', borderRadius: 15, padding: '13px 11px',
            minWidth: 120, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
            boxShadow: '0 2px 8px rgba(37,99,235,0.07)', flexShrink: 0
          }}>
            <div style={{
              width: 50, height: 50, borderRadius: '50%',
              background: s.bg, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 22
            }}>{s.emoji}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#1E293B' }}>{s.name}</div>
            <div style={{ fontSize: 10, color: '#9CA3AF' }}>{s.role}</div>
            <button
              onClick={() => onFollow(s.id)}
              style={{
                background: following[s.id] ? '#EFF6FF' : '#2563EB',
                color: following[s.id] ? '#2563EB' : 'white',
                border: following[s.id] ? '1.5px solid #BFDBFE' : 'none',
                borderRadius: 18, padding: '5px 16px',
                fontSize: 11, fontWeight: 600, cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >{following[s.id] ? 'Following ✓' : 'Follow'}</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── MESSAGES SCREEN ─────────────────────────────────────────────────────────
function MessagesScreen({ onClose, currentUser }) {
  const contacts = [
    { id: 'buddy', name: 'Buddy', emoji: '🤖', status: 'Online', verified: true, bg: 'linear-gradient(135deg,#60A5FA,#2563EB)', msgs: [
      { me: false, txt: "Hello! 👋 How's it going?" },
      { me: true, txt: "Hi Buddy! I'm good. Just chilling at home. 👋" },
      { me: false, txt: "That sounds like fun! 🎉 Want me to find some funny memes?" },
      { me: true, txt: "Sure, let's see some memes!" },
      { me: false, txt: "I found a good one for you! 😄", meme: true },
    ]},
    { id: 'maya', name: 'Maya', emoji: '👩', status: 'Offline', verified: true, bg: 'linear-gradient(135deg,#F9A8D4,#EC4899)', msgs: [
      { me: false, txt: "Hey! Check out my new AI artwork 🎨" },
      { me: true, txt: "Wow Maya! That looks amazing! 😍" },
      { me: false, txt: "Thanks! Been working on it all night 😅" },
    ]},
    { id: 'akash', name: 'Akash', emoji: '👦', status: 'Online', verified: false, bg: 'linear-gradient(135deg,#86EFAC,#22C55E)', msgs: [
      { me: true, txt: "Bhai, code review kar sakta hai? 💻" },
      { me: false, txt: "Haan bhai! Send kar link 🔗" },
      { me: false, txt: "Bahut accha code hai! Just fix the null checks 🛠️" },
    ]},
    { id: 'priya', name: 'Priya', emoji: '👧', status: 'Away', verified: true, bg: 'linear-gradient(135deg,#FDE68A,#F59E0B)', msgs: [
      { me: false, txt: "New photos uploaded! 📸 Check my profile" },
      { me: true, txt: "Priya your photography is 🔥🔥" },
      { me: false, txt: "Hehe thank you! 😊 Golden hour hits different" },
    ]},
    { id: 'support', name: 'Support', emoji: '🛡️', status: 'Online', verified: false, bg: 'linear-gradient(135deg,#60A5FA,#2563EB)', msgs: [
      { me: false, txt: "Hi! Welcome to Buddy AI Support 🤖 How can we help?" },
      { me: true, txt: "I need help with my account" },
      { me: false, txt: "Sure! Go to Profile → Settings. Let us know if you need more help 😊" },
    ]},
  ];

  const [active, setActive] = useState('buddy');
  const [chatData, setChatData] = useState(() => {
    const d = {};
    contacts.forEach(c => { d[c.id] = [...c.msgs]; });
    return d;
  });
  const [inputVal, setInputVal] = useState('');
  const [typing, setTyping] = useState(false);
  const msgsRef = useRef(null);

  const activeContact = contacts.find(c => c.id === active);

  const scrollBottom = () => {
    setTimeout(() => {
      if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight;
    }, 50);
  };

  useEffect(() => scrollBottom(), [active, chatData]);

  const sendMsg = () => {
    if (!inputVal.trim()) return;
    const txt = inputVal.trim();
    setInputVal('');
    setChatData(d => ({ ...d, [active]: [...d[active], { me: true, txt }] }));
    setTyping(true);
    const replies = active === 'buddy'
      ? ["That's great! 😊 How can I help?", "Awesome! I'm always here for you 🤖💙", "Interesting! Want me to search something? 🔍"]
      : ["That's so cool! 😊", "Interesting! Tell me more 🤔", "Haha that's funny! 😂", "Love that! ❤️"];
    setTimeout(() => {
      const reply = replies[Math.floor(Math.random() * replies.length)];
      setChatData(d => ({ ...d, [active]: [...d[active], { me: false, txt: reply }] }));
      setTyping(false);
    }, 1200 + Math.random() * 800);
  };

  const emojis = ['😊','😂','❤️','🔥','👍','😍','🎉','🙏','💯','😎'];

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 50,
      background: '#EFF6FF', display: 'flex', flexDirection: 'column'
    }}>
      {/* Top bar */}
      <div style={{
        background: 'white', padding: '14px 16px 10px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid #e8f0fe', flexShrink: 0
      }}>
        <span style={{ fontSize: 22, cursor: 'pointer' }} onClick={onClose}>←</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 17, fontWeight: 800, color: '#1E293B' }}>
          <div style={{
            width: 28, height: 28, background: 'linear-gradient(135deg,#60A5FA,#2563EB)',
            borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14
          }}>🤖</div>
          Messages
        </div>
        <span style={{ fontSize: 20, cursor: 'pointer', color: '#2563EB' }}>✏️</span>
      </div>

      {/* Body: sidebar + chat */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Sidebar */}
        <div style={{
          width: 110, flexShrink: 0, background: 'white',
          borderRight: '1px solid #e8f0fe', overflowY: 'auto'
        }}>
          {contacts.map(c => (
            <div key={c.id} onClick={() => setActive(c.id)} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 5, padding: '14px 8px', cursor: 'pointer',
              borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s',
              background: active === c.id ? '#EFF6FF' : 'white',
              borderLeft: active === c.id ? '3px solid #2563EB' : '3px solid transparent'
            }}>
              <div style={{
                width: 46, height: 46, borderRadius: '50%', background: c.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, position: 'relative'
              }}>
                {c.emoji}
                {c.status === 'Online' && (
                  <div style={{
                    position: 'absolute', bottom: 1, right: 1,
                    width: 12, height: 12, background: '#22C55E',
                    borderRadius: '50%', border: '2px solid white'
                  }} />
                )}
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#1E293B', textAlign: 'center' }}>{c.name}</div>
              <div style={{ fontSize: 9, color: c.status === 'Online' ? '#22C55E' : '#9CA3AF', fontWeight: 500 }}>{c.status}</div>
            </div>
          ))}
        </div>

        {/* Chat panel */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#EFF6FF' }}>
          {/* Chat header */}
          <div style={{
            background: 'white', padding: '10px 14px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderBottom: '1px solid #e8f0fe', flexShrink: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <div style={{
                width: 38, height: 38, borderRadius: '50%',
                background: activeContact.bg, display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontSize: 18
              }}>{activeContact.emoji}</div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: '#1E293B' }}>
                  {activeContact.name} {activeContact.verified && <span style={{ color: '#2563EB', fontSize: 11 }}>✔️</span>}
                </div>
                <div style={{ fontSize: 10, color: activeContact.status === 'Online' ? '#22C55E' : '#9CA3AF' }}>
                  {activeContact.status}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 14 }}>
              <span style={{ fontSize: 20, cursor: 'pointer', color: '#2563EB' }}>📞</span>
              <span style={{ fontSize: 20, cursor: 'pointer', color: '#2563EB' }}>📹</span>
            </div>
          </div>

          {/* Messages */}
          <div ref={msgsRef} style={{
            flex: 1, overflowY: 'auto', padding: '12px 10px',
            display: 'flex', flexDirection: 'column', gap: 10
          }}>
            {(chatData[active] || []).map((m, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-end', gap: 7,
                flexDirection: m.me ? 'row-reverse' : 'row'
              }}>
                {!m.me && (
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%',
                    background: activeContact.bg, display: 'flex',
                    alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0
                  }}>{activeContact.emoji}</div>
                )}
                {m.meme ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: '72%' }}>
                    <div style={{
                      background: 'white', padding: '9px 13px', borderRadius: 18,
                      borderBottomLeftRadius: 4, fontSize: 12.5, color: '#1E293B',
                      boxShadow: '0 1px 6px rgba(37,99,235,0.08)'
                    }}>{m.txt}</div>
                    <div style={{
                      background: 'linear-gradient(135deg,#dbeafe,#bfdbfe,#93c5fd)',
                      borderRadius: 14, overflow: 'hidden', maxWidth: 200,
                      boxShadow: '0 3px 12px rgba(37,99,235,0.2)', cursor: 'pointer'
                    }}>
                      <div style={{ padding: '10px 10px 6px', fontSize: 10.5, color: '#1e40af', fontWeight: 500 }}>
                        When you finish a difficult task and walk into the room:
                      </div>
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: 8, fontSize: 48,
                        background: 'linear-gradient(135deg,#bfdbfe,#93c5fd)', position: 'relative'
                      }}>
                        🤖
                        <div style={{
                          position: 'absolute', bottom: 6, left: 8,
                          width: 22, height: 22, background: 'rgba(37,99,235,0.8)',
                          borderRadius: '50%', display: 'flex', alignItems: 'center',
                          justifyContent: 'center', color: 'white', fontSize: 10
                        }}>▶</div>
                      </div>
                      <div style={{ background: 'rgba(30,58,138,0.75)', color: 'white', padding: '5px 8px', fontSize: 11, fontWeight: 700, textAlign: 'center' }}>
                        I'm doing my best
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{
                    maxWidth: '68%', padding: '9px 13px', borderRadius: 18,
                    fontSize: 12.5, lineHeight: 1.45, wordBreak: 'break-word',
                    ...(m.me
                      ? { background: 'linear-gradient(135deg,#3B82F6,#2563EB)', color: 'white', borderBottomRightRadius: 4, boxShadow: '0 2px 10px rgba(37,99,235,0.3)' }
                      : { background: 'white', color: '#1E293B', borderBottomLeftRadius: 4, boxShadow: '0 1px 6px rgba(37,99,235,0.08)' })
                  }}>
                    {m.txt}
                    {m.me && <span style={{ fontSize: 10, opacity: 0.8, float: 'right', marginLeft: 6, marginTop: 2 }}>✓✓</span>}
                  </div>
                )}
              </div>
            ))}
            {typing && (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 7 }}>
                <div style={{
                  width: 26, height: 26, borderRadius: '50%',
                  background: activeContact.bg, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', fontSize: 13
                }}>{activeContact.emoji}</div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 4, padding: '8px 12px',
                  background: 'white', borderRadius: 18, borderBottomLeftRadius: 4,
                  boxShadow: '0 1px 6px rgba(37,99,235,0.08)'
                }}>
                  {[0, 0.2, 0.4].map((d, i) => (
                    <div key={i} style={{
                      width: 6, height: 6, background: '#93c5fd', borderRadius: '50%',
                      animation: `typebounce 1.2s ${d}s infinite`
                    }} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Input bar */}
          <div style={{
            background: 'white', padding: '10px 12px 14px',
            display: 'flex', alignItems: 'center', gap: 8,
            borderTop: '1px solid #e8f0fe', flexShrink: 0
          }}>
            <div style={{ display: 'flex', gap: 4 }}>
              {['📎','🖼️'].map((ic, i) => (
                <div key={i} style={{
                  width: 30, height: 30, borderRadius: 8, background: '#EFF6FF',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, cursor: 'pointer'
                }}>{ic}</div>
              ))}
            </div>
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center',
              background: '#F1F5FF', borderRadius: 22, padding: '8px 12px', gap: 6,
              border: '1.5px solid #e8f0fe'
            }}>
              <input
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMsg()}
                placeholder="Type a message..."
                style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 12.5, color: '#1E293B', outline: 'none', fontFamily: 'inherit' }}
              />
              <span
                onClick={() => {
                  const e = emojis[Math.floor(Math.random() * emojis.length)];
                  setInputVal(v => v + e);
                }}
                style={{ fontSize: 17, cursor: 'pointer' }}>🙂</span>
            </div>
            {inputVal.trim()
              ? <button onClick={sendMsg} style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: 'linear-gradient(135deg,#60A5FA,#2563EB)',
                  border: 'none', color: 'white', fontSize: 15, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 2px 10px rgba(37,99,235,0.35)'
                }}>➤</button>
              : <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: 'linear-gradient(135deg,#60A5FA,#2563EB)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, cursor: 'pointer',
                  boxShadow: '0 2px 10px rgba(37,99,235,0.35)'
                }}>🎤</div>
            }
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── CREATE POST SHEET ────────────────────────────────────────────────────────
function CreateSheet({ user, profile, onClose, onPosted }) {
  const [text, setText] = useState('');
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [posting, setPosting] = useState(false);
  const fileRef = useRef(null);

  const pickImage = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setImage(f);
    setPreview(URL.createObjectURL(f));
  };

  const submit = async () => {
    if (!text.trim() || posting) return;
    setPosting(true);
    let imageUrl = '';
    if (image) {
      const ext = image.name.split('.').pop();
      const path = `posts/${user.id}_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('posts').upload(path, image);
      if (!upErr) {
        const { data: { publicUrl } } = supabase.storage.from('posts').getPublicUrl(path);
        imageUrl = publicUrl;
      }
    }
    const { data, error } = await supabase.from('posts').insert({
      user_id: user.id, content: text.trim(), image_url: imageUrl,
      likes_count: 0, comments_count: 0
    }).select('*, profiles(full_name, username, avatar_url)').single();
    if (!error && data) onPosted(data);
    setPosting(false);
    onClose();
  };

  const options = [
    { icon: '📸', label: 'Photo', onClick: () => fileRef.current.click() },
    { icon: '🎵', label: 'Music', onClick: () => {} },
    { icon: '🤖', label: 'AI Art', onClick: () => {} },
    { icon: '📰', label: 'News', onClick: () => {} },
  ];

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
      zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center'
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'white', borderRadius: '22px 22px 0 0',
        width: '100%', maxWidth: 430, padding: 18,
        animation: 'slideUp 0.28s ease'
      }}>
        <div style={{ width: 38, height: 4, background: '#e2e8f0', borderRadius: 2, margin: '0 auto 14px' }} />
        <div style={{ fontSize: 15, fontWeight: 700, color: '#1E293B', marginBottom: 14 }}>✨ Create Post</div>
        <textarea
          value={text} onChange={e => setText(e.target.value)}
          placeholder="What's on your mind? Share with the world! 🌍"
          style={{
            width: '100%', minHeight: 90, border: '1.5px solid #BFDBFE',
            borderRadius: 14, padding: '10px 14px', fontSize: 13,
            outline: 'none', resize: 'none', fontFamily: 'inherit', color: '#1E293B'
          }}
        />
        {preview && (
          <div style={{ position: 'relative', marginTop: 10 }}>
            <img src={preview} alt="" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 12 }} />
            <button onClick={() => { setImage(null); setPreview(null); }} style={{
              position: 'absolute', top: 6, right: 6,
              background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none',
              borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', fontSize: 12
            }}>✕</button>
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
          {options.map(o => (
            <div key={o.label} onClick={o.onClick} style={{
              background: '#EFF6FF', borderRadius: 14, padding: '18px 10px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
              cursor: 'pointer', border: '2px solid transparent', transition: 'all 0.2s'
            }}>
              <div style={{ fontSize: 30 }}>{o.icon}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#1E293B' }}>{o.label}</div>
            </div>
          ))}
        </div>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={pickImage} />
        <button onClick={submit} disabled={!text.trim() || posting} style={{
          width: '100%', marginTop: 14, padding: '13px',
          background: text.trim() ? 'linear-gradient(135deg,#60A5FA,#2563EB)' : '#e2e8f0',
          color: text.trim() ? 'white' : '#9CA3AF',
          border: 'none', borderRadius: 14, fontSize: 14, fontWeight: 700,
          cursor: text.trim() ? 'pointer' : 'default', transition: 'all 0.2s'
        }}>
          {posting ? '⏳ Posting...' : '🚀 Share Post'}
        </button>
      </div>
    </div>
  );
}

// ─── POST CARD ────────────────────────────────────────────────────────────────
function PostCard({ post, currentUserId, isLiked, onLike, onComment, onDelete, onShare, isReel }) {
  const [liked, setLiked] = useState(isLiked);
  const [likeCount, setLikeCount] = useState(post.likes_count || 0);

  const handleLike = () => {
    const newLiked = !liked;
    setLiked(newLiked);
    setLikeCount(c => newLiked ? c + 1 : c - 1);
    onLike(post.id, newLiked);
  };

  const authorName = post.profiles?.full_name || 'User';
  const isOwn = post.user_id === currentUserId;

  return (
    <div style={{
      background: 'white', margin: '8px 10px', borderRadius: 18, overflow: 'hidden',
      boxShadow: '0 2px 10px rgba(37,99,235,0.07)'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '11px 13px 7px', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            background: 'linear-gradient(135deg,#93C5FD,#1D4ED8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700, color: 'white', overflow: 'hidden', flexShrink: 0
          }}>
            {post.profiles?.avatar_url
              ? <img src={post.profiles.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : getInitial(authorName)}
          </div>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: '#1E293B', display: 'flex', alignItems: 'center', gap: 3 }}>
              {authorName}
            </div>
            <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 1 }}>{timeAgo(post.created_at)}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {isOwn && (
            <button onClick={() => onDelete(post.id)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#EF4444', fontSize: 16, padding: 4
            }}>🗑️</button>
          )}
          <div style={{ color: '#9CA3AF', fontSize: 18, cursor: 'pointer' }}>···</div>
        </div>
      </div>

      {/* Text */}
      {post.content && (
        <div style={{ padding: '3px 13px 9px', fontSize: 13, color: '#1E293B', lineHeight: 1.5 }}>
          {post.content.split(/(#\w+)/g).map((p, i) =>
            p.startsWith('#')
              ? <span key={i} style={{ color: '#2563EB', fontWeight: 600 }}>{p}</span>
              : p
          )}
        </div>
      )}

      {/* Image */}
      {post.image_url && (
        <div style={{ width: '100%', maxHeight: 280, overflow: 'hidden' }}>
          <img src={post.image_url} alt="" style={{ width: '100%', objectFit: 'cover' }} />
        </div>
      )}

      {/* Reel placeholder for posts without image */}
      {!post.image_url && isReel && (
        <div style={{
          position: 'relative', width: '100%', height: 240,
          overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(180deg,#e0f0ff,#b3d4ff 40%,#7eb8ff)'
        }}>
          <div style={{ fontSize: 80, animation: 'floaty 3s ease-in-out infinite' }}>🤖</div>
          <div style={{
            position: 'absolute', top: 16, right: 16,
            background: 'white', borderRadius: '18px 18px 18px 4px',
            padding: '9px 14px', fontSize: 13, fontWeight: 700, color: '#2563EB',
            boxShadow: '0 4px 14px rgba(37,99,235,0.18)'
          }}>You can do it!</div>
          <div style={{ position: 'absolute', right: 11, bottom: 55, display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
            {[['❤️', fmtCount(likeCount)], ['💬', '5.3K'], ['🔗', 'Share'], ['🔖', '13K']].map(([ic, lb], i) => (
              <div key={i} onClick={i === 0 ? handleLike : undefined} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, cursor: 'pointer' }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.22)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19
                }}>{ic}</div>
                <span style={{ fontSize: 10, color: 'white', fontWeight: 600, textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>{lb}</span>
              </div>
            ))}
          </div>
          <div style={{
            position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)',
            width: 48, height: 48, background: 'rgba(37,99,235,0.85)',
            borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, color: 'white', cursor: 'pointer'
          }}>▶</div>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg,transparent,#60A5FA,#2563EB,transparent)' }} />
        </div>
      )}

      {/* Footer */}
      <div style={{ padding: '9px 13px 11px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div onClick={handleLike} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', color: liked ? '#EF4444' : '#9CA3AF', fontSize: 12.5 }}>
            <span style={{ fontSize: 19, transition: 'transform 0.15s', display: 'inline-block' }}>{liked ? '❤️' : '🤍'}</span>
            <span>{fmtCount(likeCount)}</span>
          </div>
          <div onClick={() => onComment(post.id)} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', color: '#9CA3AF', fontSize: 12.5 }}>
            <span style={{ fontSize: 19 }}>💬</span>
            <span>{post.comments_count || 0}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div onClick={() => onShare()} style={{ cursor: 'pointer', fontSize: 19, color: '#9CA3AF' }}>📤</div>
          <div style={{ cursor: 'pointer', fontSize: 19, color: '#9CA3AF' }}>🔖</div>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN FEED COMPONENT ──────────────────────────────────────────────────────
export default function Feed() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [likedPosts, setLikedPosts] = useState({});
  const [following, setFollowing] = useState({});

  // UI states
  const [activeNav, setActiveNav] = useState('home');
  const [showMessages, setShowMessages] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [activeStory, setActiveStory] = useState(null);
  const [commentPostId, setCommentPostId] = useState(null);
  const [toast, setToast] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2200);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { navigate('/login'); return; }
      setUser(session.user);
      loadProfile(session.user.id);
      loadPosts(session.user.id);
    });
  }, [navigate]);

  const loadProfile = async (uid) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).single();
    if (data) setProfile(data);
  };

  const loadPosts = async (uid) => {
    setLoading(true);
    const { data: postsData } = await supabase
      .from('posts')
      .select('*, profiles(full_name, username, avatar_url)')
      .order('created_at', { ascending: false })
      .limit(50);
    if (postsData) setPosts(postsData);

    const { data: likesData } = await supabase.from('likes').select('post_id').eq('user_id', uid);
    if (likesData) {
      const liked = {};
      likesData.forEach(l => { liked[l.post_id] = true; });
      setLikedPosts(liked);
    }
    setLoading(false);
  };

  const handleLike = async (postId, nowLiked) => {
    setLikedPosts(l => ({ ...l, [postId]: nowLiked }));
    if (nowLiked) {
      await supabase.from('likes').insert({ post_id: postId, user_id: user.id });
      await supabase.from('posts').update({ likes_count: supabase.rpc('increment') }).eq('id', postId);
    } else {
      await supabase.from('likes').delete().eq('post_id', postId).eq('user_id', user.id);
    }
  };

  const handleDelete = async (postId) => {
    if (!window.confirm('Delete this post?')) return;
    await supabase.from('likes').delete().eq('post_id', postId);
    await supabase.from('comments').delete().eq('post_id', postId);
    await supabase.from('posts').delete().eq('id', postId).eq('user_id', user.id);
    setPosts(p => p.filter(x => x.id !== postId));
    showToast('🗑️ Post deleted');
  };

  const handleFollow = (personId) => {
    setFollowing(f => {
      const nowFollowing = !f[personId];
      showToast(nowFollowing ? '✅ Following!' : 'Unfollowed');
      return { ...f, [personId]: nowFollowing };
    });
  };

  const handlePosted = (newPost) => {
    setPosts(p => [newPost, ...p]);
    showToast('🚀 Post shared!');
  };

  const stories = [
    { id: 'you', name: 'Your Story', emoji: '🧑', caption: 'Your story here!', isYou: true },
    { id: 'buddy', name: 'Buddy', emoji: '🤖', caption: 'AI is the future! 🚀' },
    { id: 'maya', name: 'Maya', emoji: '👩', caption: 'New AI artwork drop 🎨' },
    { id: 'akash', name: 'Akash', emoji: '👦', caption: 'Just deployed! 💻' },
    { id: 'priya', name: 'Priya', emoji: '👧', caption: 'Golden hour 🌅' },
    { id: 'rohan', name: 'Rohan', emoji: '🧒', caption: 'New beat out! 🎵' },
  ];

  const storyGradients = [
    null,
    'linear-gradient(135deg,#60A5FA,#7C3AED)',
    'linear-gradient(135deg,#60A5FA,#2563EB)',
    'linear-gradient(135deg,#F9A8D4,#EC4899)',
    'linear-gradient(135deg,#86EFAC,#22C55E)',
    'linear-gradient(135deg,#FDE68A,#F59E0B)',
    'linear-gradient(135deg,#C4B5FD,#7C3AED)',
  ];

  const navItems = [
    { id: 'home', icon: '🏠', label: 'Home' },
    { id: 'explore', icon: '🔍', label: 'Explore' },
    { id: 'messages', icon: '💬', label: 'Messages', badge: 3 },
    { id: 'profile', icon: '👤', label: 'Profile' },
  ];

  const handleNavClick = (id) => {
    if (id === 'messages') { setShowMessages(true); setActiveNav('messages'); return; }
    if (id === 'profile') { navigate('/profile'); return; }
    if (id === 'explore') { showToast('🔍 Explore coming soon!'); return; }
    setActiveNav(id);
  };

  return (
    <>
      <style>{`
        @keyframes floaty { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes slideUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes typebounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-6px)} }
      `}</style>

      <Toast msg={toast} />

      {/* Story viewer */}
      {activeStory && <StoryViewer story={activeStory} onClose={() => setActiveStory(null)} />}

      {/* Comments sheet */}
      {commentPostId && user && (
        <CommentsSheet postId={commentPostId} user={user} onClose={() => setCommentPostId(null)} />
      )}

      {/* Create post sheet */}
      {showCreate && user && (
        <CreateSheet user={user} profile={profile} onClose={() => setShowCreate(false)} onPosted={handlePosted} />
      )}

      {/* Main phone container */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)',
        width: 393, height: 852, maxWidth: '100vw', maxHeight: '100vh',
        background: '#F0F4FF', borderRadius: 44, overflow: 'hidden',
        boxShadow: '0 40px 100px rgba(37,99,235,0.3), 0 0 0 10px rgba(255,255,255,0.7)',
        display: 'flex', flexDirection: 'column',
        fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif"
      }} className="buddy-phone">

        {/* Messages overlay */}
        {showMessages && (
          <MessagesScreen onClose={() => { setShowMessages(false); setActiveNav('home'); }} currentUser={user} />
        )}

        {/* Top bar */}
        <div style={{
          flexShrink: 0, background: 'white', padding: '14px 18px 10px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid #e8f0fe', zIndex: 10
        }}>
          <span style={{ fontSize: 21, color: '#64748b', cursor: 'pointer' }}
            onClick={() => showToast('🔍 Search coming soon!')}>🔍</span>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 18, fontWeight: 800, color: '#1E293B', justifyContent: 'center' }}>
              <div style={{
                width: 32, height: 32, background: 'linear-gradient(135deg,#60A5FA,#2563EB)',
                borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16
              }}>🤖</div>
              Buddy AI
            </div>
            <div style={{ fontSize: 9, color: '#9CA3AF', textAlign: 'center' }}>Your AI Social Community</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => showToast('🔔 3 new notifications!')}>
              <span style={{ fontSize: 21 }}>🔔</span>
              <div style={{
                position: 'absolute', top: -4, right: -4,
                background: '#EF4444', color: 'white', fontSize: 8,
                width: 14, height: 14, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700
              }}>3</div>
            </div>
            <div onClick={() => navigate('/profile')} style={{
              width: 30, height: 30, borderRadius: '50%',
              background: 'linear-gradient(135deg,#93C5FD,#1D4ED8)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', overflow: 'hidden'
            }}>
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                : getInitial(profile?.full_name || user?.email)}
            </div>
          </div>
        </div>

        {/* Scrollable feed */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch' }}
          className="hide-scrollbar">

          {/* Stories */}
          <div style={{ background: 'white', padding: '10px 0 12px', borderBottom: '1px solid #e8f0fe' }}>
            <div style={{ display: 'flex', gap: 12, overflowX: 'auto', padding: '0 14px', scrollbarWidth: 'none' }}>
              {stories.map((s, idx) => (
                <div key={s.id} onClick={() => setActiveStory(s)}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer', flexShrink: 0 }}>
                  <div style={{
                    width: 60, height: 60, borderRadius: '50%',
                    background: s.isYou ? '#e2e8f0' : (storyGradients[idx] || 'linear-gradient(135deg,#60A5FA,#7C3AED)'),
                    padding: 2.5, position: 'relative'
                  }}>
                    <div style={{
                      width: '100%', height: '100%', borderRadius: '50%',
                      background: 'white', padding: 2,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden'
                    }}>
                      <div style={{
                        width: '100%', height: '100%', borderRadius: '50%',
                        background: s.isYou ? 'linear-gradient(135deg,#93C5FD,#1D4ED8)' : (storyGradients[idx] || '#60A5FA'),
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24
                      }}>{s.emoji}</div>
                    </div>
                    {s.isYou && (
                      <div style={{
                        position: 'absolute', bottom: 0, right: 0,
                        width: 18, height: 18, background: '#2563EB',
                        borderRadius: '50%', border: '2px solid white',
                        color: 'white', fontSize: 13, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1
                      }}>+</div>
                    )}
                  </div>
                  <span style={{ fontSize: 10, color: '#1E293B', fontWeight: 500, maxWidth: 60, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div style={{ textAlign: 'center', padding: 40, color: '#9CA3AF', fontSize: 13 }}>
              <div style={{ fontSize: 40, marginBottom: 10, animation: 'floaty 1.5s infinite' }}>🤖</div>
              Loading posts...
            </div>
          )}

          {/* Reel placeholder (static) - always shown at top */}
          {!loading && (
            <div style={{ background: 'white', margin: '8px 10px', borderRadius: 18, overflow: 'hidden', boxShadow: '0 2px 10px rgba(37,99,235,0.07)' }}>
              <div style={{ display: 'flex', alignItems: 'center', padding: '11px 13px 7px', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#60A5FA,#2563EB)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🤖</div>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: '#1E293B' }}>Buddy <span style={{ color: '#2563EB', fontSize: 12 }}>✔️</span></div>
                    <div style={{ fontSize: 10, color: '#9CA3AF' }}>2h ago</div>
                  </div>
                </div>
                <div style={{ color: '#9CA3AF', fontSize: 18 }}>···</div>
              </div>
              <div style={{ padding: '3px 13px 9px', fontSize: 13, color: '#1E293B', lineHeight: 1.5 }}>
                Buddy here with a motivational video! 🚀 Let's make today amazing! 💙<br />
                <span style={{ color: '#2563EB', fontWeight: 600 }}>#Inspiration #Motivation #AI</span>
              </div>
              <div style={{ position: 'relative', width: '100%', height: 280, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(180deg,#e0f0ff,#b3d4ff 40%,#7eb8ff)' }}>
                <div style={{ position: 'absolute', top: 16, right: 16, background: 'white', borderRadius: '18px 18px 18px 4px', padding: '9px 14px', fontSize: 14, fontWeight: 700, color: '#2563EB', boxShadow: '0 4px 14px rgba(37,99,235,0.18)' }}>You can do it!</div>
                <div style={{ fontSize: 80, animation: 'floaty 3s ease-in-out infinite' }}>🤖</div>
                <div style={{ position: 'absolute', right: 11, bottom: 60, display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
                  {[['❤️','186.2K'],['💬','5.3K'],['🔗','Share'],['🔖','13.1K']].map(([ic,lb], i) => (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, cursor: 'pointer' }}
                      onClick={() => i === 0 ? showToast('❤️ Liked!') : i === 1 ? showToast('💬 Comments') : showToast('📤 Shared!')}>
                      <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19 }}>{ic}</div>
                      <span style={{ fontSize: 10, color: 'white', fontWeight: 600, textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>{lb}</span>
                    </div>
                  ))}
                </div>
                <div onClick={() => showToast('▶️ Playing...')} style={{ position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)', width: 48, height: 48, background: 'rgba(37,99,235,0.85)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: 'white', cursor: 'pointer' }}>▶</div>
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg,transparent,#60A5FA,#2563EB,transparent)' }} />
              </div>
              <div style={{ padding: '9px 13px 11px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: 14 }}>
                  <div onClick={() => showToast('❤️ Liked!')} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', color: '#9CA3AF', fontSize: 12.5 }}><span style={{ fontSize: 19 }}>🤍</span> 186.2K</div>
                  <div onClick={() => showToast('💬')} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', color: '#9CA3AF', fontSize: 12.5 }}><span style={{ fontSize: 19 }}>💬</span> 5.3K</div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <div onClick={() => showToast('📤 Shared!')} style={{ cursor: 'pointer', fontSize: 19, color: '#9CA3AF' }}>📤</div>
                  <div style={{ cursor: 'pointer', fontSize: 19, color: '#9CA3AF' }}>🔖</div>
                </div>
              </div>
            </div>
          )}

          {/* Follow Suggestions */}
          {!loading && <FollowSuggestions currentUserId={user?.id} following={following} onFollow={handleFollow} />}

          {/* Real posts from Supabase */}
          {!loading && posts.map((post, i) => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={user?.id}
              isLiked={!!likedPosts[post.id]}
              onLike={handleLike}
              onComment={setCommentPostId}
              onDelete={handleDelete}
              onShare={() => showToast('📤 Shared!')}
              isReel={i % 3 === 2}
            />
          ))}

          {/* Empty state */}
          {!loading && posts.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9CA3AF' }}>
              <div style={{ fontSize: 50, marginBottom: 12 }}>📝</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#1E293B', marginBottom: 6 }}>No posts yet!</div>
              <div style={{ fontSize: 13 }}>Be the first to share something amazing 🚀</div>
              <button onClick={() => setShowCreate(true)} style={{
                marginTop: 16, background: 'linear-gradient(135deg,#60A5FA,#2563EB)',
                color: 'white', border: 'none', borderRadius: 20, padding: '10px 24px',
                fontSize: 13, fontWeight: 600, cursor: 'pointer'
              }}>Create First Post</button>
            </div>
          )}

          <div style={{ height: 80 }} />
        </div>

        {/* Bottom Nav */}
        <div style={{
          flexShrink: 0, background: 'white', borderTop: '1px solid #e8f0fe',
          display: 'flex', justifyContent: 'space-around', alignItems: 'center',
          padding: '8px 0 14px', boxShadow: '0 -3px 16px rgba(37,99,235,0.08)', zIndex: 10
        }}>
          {navItems.slice(0, 2).map(nav => (
            <div key={nav.id} onClick={() => handleNavClick(nav.id)} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              cursor: 'pointer', color: activeNav === nav.id ? '#2563EB' : '#9CA3AF',
              fontSize: 9.5, padding: '3px 8px', borderRadius: 10, position: 'relative'
            }}>
              <span style={{ fontSize: 22 }}>{nav.icon}</span>
              {nav.label}
            </div>
          ))}

          {/* Center + button */}
          <div onClick={() => setShowCreate(true)} style={{
            width: 50, height: 50, borderRadius: '50%',
            background: 'linear-gradient(135deg,#60A5FA,#2563EB)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, color: 'white', cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(37,99,235,0.4)', marginBottom: 8
          }}>+</div>

          {navItems.slice(2).map(nav => (
            <div key={nav.id} onClick={() => handleNavClick(nav.id)} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              cursor: 'pointer', color: activeNav === nav.id ? '#2563EB' : '#9CA3AF',
              fontSize: 9.5, padding: '3px 8px', borderRadius: 10, position: 'relative'
            }}>
              <span style={{ fontSize: 22 }}>{nav.icon}</span>
              {nav.badge && (
                <div style={{
                  position: 'absolute', top: 1, right: 4,
                  background: '#EF4444', color: 'white', fontSize: 8,
                  width: 13, height: 13, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700
                }}>{nav.badge}</div>
              )}
              {nav.label}
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .buddy-phone { user-select: none; -webkit-user-select: none; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { scrollbar-width: none; }
        @media (max-width: 430px) {
          .buddy-phone {
            width: 100vw !important; height: 100dvh !important;
            border-radius: 0 !important; box-shadow: none !important;
            top: 0 !important; left: 0 !important; transform: none !important;
          }
        }
      `}</style>
    </>
  );
}
