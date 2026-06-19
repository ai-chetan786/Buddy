import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';

/* ============================================================
   BUDDY AI — Feed.js  (Feed IS the home)
   Bottom nav: Feed | Friends(+Messages) | [+] | AI Chat | Profile
   - Home icon shows Social Feed
   - Friends icon shows Friends list + Messages inside
   - AI Chat icon shows GPT-style chat panel inside
   - Share button uses Web Share API
   - Comment count updates in real time
   ============================================================ */

const G = { blue:'#2563EB', lb:'#EFF6FF', sky:'#BFDBFE', bg:'#F0F4FF', white:'#fff', gray:'#9CA3AF', dark:'#1E293B', red:'#EF4444' };
const fmtN = n => n>=1e6?(n/1e6).toFixed(1)+'M':n>=1000?(n/1000).toFixed(1)+'K':String(n||0);
const ago  = ts => { const s=Math.floor((Date.now()-new Date(ts))/1000); if(s<60)return'just now'; if(s<3600)return Math.floor(s/60)+'m'; if(s<86400)return Math.floor(s/3600)+'h'; return Math.floor(s/86400)+'d'; };
const ini  = n => n?n.charAt(0).toUpperCase():'?';
const GRAD = ['linear-gradient(135deg,#60A5FA,#2563EB)','linear-gradient(135deg,#F9A8D4,#EC4899)','linear-gradient(135deg,#86EFAC,#22C55E)','linear-gradient(135deg,#FDE68A,#F59E0B)','linear-gradient(135deg,#C4B5FD,#7C3AED)','linear-gradient(135deg,#FCA5A5,#EF4444)','linear-gradient(135deg,#6EE7B7,#059669)'];

// ── TOAST ────────────────────────────────────
function Toast({msg}){ return msg?<div style={{position:'fixed',top:20,left:'50%',transform:'translateX(-50%)',background:'#1e293b',color:'white',padding:'9px 20px',borderRadius:22,fontSize:12.5,zIndex:9999,whiteSpace:'nowrap',boxShadow:'0 4px 16px rgba(0,0,0,.25)',animation:'fadein .2s ease',pointerEvents:'none'}}>{msg}</div>:null; }

// ── AVATAR ───────────────────────────────────
function Av({p,size=40,idx=0}){
  return <div style={{width:size,height:size,borderRadius:'50%',background:GRAD[idx%GRAD.length],display:'flex',alignItems:'center',justifyContent:'center',fontSize:size*.35,fontWeight:700,color:'white',overflow:'hidden',flexShrink:0}}>
    {p?.avatar_url?<img src={p.avatar_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'50%'}}/>:ini(p?.full_name||p?.username)}
  </div>;
}

// ══════════════════════════════════════════════
// AI CHAT PANEL — ChatGPT style with session storage
// Sessions saved to Supabase, persist after refresh
// ══════════════════════════════════════════════
function AIChatPanel({onClose, currentUser, showToast}) {
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [showSidebar, setShowSidebar] = useState(false);
  const msgsRef = useRef(null);

  useEffect(() => {
    setTimeout(() => {
      if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight;
    }, 60);
  }, [msgs]);

  useEffect(() => {
    if (currentUser) loadSessions();
  }, [currentUser]);

  const WELCOME = "Hey! I'm Buddy AI 🤖 Ask me anything — I'm here to help!";

  const loadSessions = async () => {
    setLoadingSessions(true);
    const { data } = await supabase
      .from('ai_chat_sessions')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('updated_at', { ascending: false });
    const list = data || [];
    setSessions(list);
    if (list.length > 0) {
      await loadSession(list[0].id);
    } else {
      setMsgs([{ role: 'assistant', content: WELCOME }]);
      setActiveSession(null);
    }
    setLoadingSessions(false);
  };

  const loadSession = async (sessionId) => {
    setActiveSession(sessionId);
    setShowSidebar(false);
    const { data } = await supabase
      .from('ai_chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
    if (data && data.length > 0) {
      setMsgs(data.map(m => ({ role: m.role, content: m.content })));
    } else {
      setMsgs([{ role: 'assistant', content: WELCOME }]);
    }
  };

  const startNewChat = async () => {
    const { data, error } = await supabase
      .from('ai_chat_sessions')
      .insert({ user_id: currentUser.id, title: 'New Chat' })
      .select()
      .single();
    if (!error && data) {
      setSessions(s => [data, ...s]);
      setActiveSession(data.id);
      const welcome = "New chat started! 🤖 What's on your mind?";
      setMsgs([{ role: 'assistant', content: welcome }]);
      await supabase.from('ai_chat_messages').insert({
        session_id: data.id,
        user_id: currentUser.id,
        role: 'assistant',
        content: welcome
      });
    }
    setShowSidebar(false);
  };

  const saveMsg = async (sessionId, role, content) => {
    if (!sessionId) return;
    await supabase.from('ai_chat_messages').insert({
      session_id: sessionId,
      user_id: currentUser.id,
      role,
      content
    });
    await supabase
      .from('ai_chat_sessions')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', sessionId);
  };

  const updateTitle = async (sessionId, firstMsg) => {
    const title = firstMsg.substring(0, 40) + (firstMsg.length > 40 ? '...' : '');
    await supabase.from('ai_chat_sessions').update({ title }).eq('id', sessionId);
    setSessions(s => s.map(x => x.id === sessionId ? { ...x, title } : x));
  };

  const deleteSession = async (sessionId, e) => {
    e.stopPropagation();
    await supabase.from('ai_chat_messages').delete().eq('session_id', sessionId);
    await supabase.from('ai_chat_sessions').delete().eq('id', sessionId);
    const remaining = sessions.filter(s => s.id !== sessionId);
    setSessions(remaining);
    if (activeSession === sessionId) {
      if (remaining.length > 0) await loadSession(remaining[0].id);
      else { setMsgs([{ role: 'assistant', content: WELCOME }]); setActiveSession(null); }
    }
  };

  const send = async () => {
    if (!input.trim() || loading) return;
    const userText = input.trim();
    setInput('');

    // Create session if none exists
    let sessionId = activeSession;
    if (!sessionId) {
      const { data, error } = await supabase
        .from('ai_chat_sessions')
        .insert({ user_id: currentUser.id, title: userText.substring(0, 40) })
        .select()
        .single();
      if (!error && data) {
        sessionId = data.id;
        setActiveSession(data.id);
        setSessions(s => [data, ...s]);
      }
    }

    const newMsgs = [...msgs, { role: 'user', content: userText }];
    setMsgs(newMsgs);
    setLoading(true);

    await saveMsg(sessionId, 'user', userText);

    const userMsgCount = msgs.filter(m => m.role === 'user').length;
    if (userMsgCount === 0 && sessionId) await updateTitle(sessionId, userText);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMsgs.map(m => ({ role: m.role, content: m.content }))
        })
      });
      const d = await res.json();
      const reply = d.reply || d.content || d.message || "I'm having trouble right now. Try again! 🤖";
      setMsgs(m => [...m, { role: 'assistant', content: reply }]);
      await saveMsg(sessionId, 'assistant', reply);
    } catch (e) {
      const err = "Sorry, couldn't connect. Please try again! 🤖";
      setMsgs(m => [...m, { role: 'assistant', content: err }]);
      await saveMsg(sessionId, 'assistant', err);
    }
    setLoading(false);
  };

  const quickPrompts = ["Tell me a joke 😄", "Give me motivation 💪", "Help me write a post", "Explain AI simply 🤖"];

  if (loadingSessions) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: '#F0F4FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, fontFamily: "'Segoe UI',-apple-system,sans-serif" }}>
        <div style={{ fontSize: 48, animation: 'floaty 1.5s infinite' }}>🤖</div>
        <p style={{ color: '#9CA3AF', fontSize: 14 }}>Loading your chats...</p>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: '#F0F4FF', display: 'flex', flexDirection: 'column', fontFamily: "'Segoe UI',-apple-system,sans-serif" }}>

      {/* Sidebar */}
      {showSidebar && (
        <div onClick={() => setShowSidebar(false)} style={{ position: 'absolute', inset: 0, zIndex: 10, background: 'rgba(0,0,0,.4)', display: 'flex' }}>
          <div onClick={e => e.stopPropagation()} style={{ width: 270, background: 'white', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '48px 14px 12px', background: 'linear-gradient(135deg,#2563EB,#1D4ED8)' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'white', marginBottom: 10 }}>🤖 Chat History</div>
              <button onClick={startNewChat} style={{ width: '100%', padding: '9px', background: 'rgba(255,255,255,.2)', border: '1px solid rgba(255,255,255,.4)', borderRadius: 10, color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                ✏️ New Chat
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
              {sessions.length === 0 && (
                <div style={{ textAlign: 'center', color: '#9CA3AF', padding: '20px 0', fontSize: 12 }}>
                  No chats yet.<br />Start a conversation!
                </div>
              )}
              {sessions.map(s => (
                <div key={s.id} onClick={() => loadSession(s.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '10px', borderRadius: 10, cursor: 'pointer', marginBottom: 4,
                  background: activeSession === s.id ? '#EFF6FF' : 'transparent',
                  border: activeSession === s.id ? '1.5px solid #BFDBFE' : '1.5px solid transparent'
                }}>
                  <span style={{ fontSize: 14 }}>💬</span>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.title || ('Chat ' + new Date(s.created_at).toLocaleDateString())}
                    </div>
                    <div style={{ fontSize: 10, color: '#9CA3AF' }}>
                      {new Date(s.updated_at || s.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <button onClick={(e) => deleteSession(s.id, e)} style={{ background: 'none', border: 'none', color: '#EF4444', fontSize: 14, cursor: 'pointer', padding: 2 }}>🗑️</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ flexShrink: 0, background: 'linear-gradient(135deg,#2563EB,#1D4ED8)', padding: '48px 16px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span onClick={onClose} style={{ fontSize: 22, cursor: 'pointer', color: 'white' }}>←</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 30, height: 30, background: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🤖</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'white' }}>Buddy AI Chat</div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,.7)' }}>Powered by Groq • History saved</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 14 }}>
          <span onClick={() => setShowSidebar(true)} style={{ fontSize: 20, cursor: 'pointer', color: 'white' }}>☰</span>
          <span onClick={startNewChat} style={{ fontSize: 20, cursor: 'pointer', color: 'white' }}>✏️</span>
        </div>
      </div>

      {/* Messages */}
      <div ref={msgsRef} style={{ flex: 1, overflowY: 'auto', padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 12, scrollbarWidth: 'none' }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-end', gap: 8, flexDirection: m.role === 'user' ? 'row-reverse' : 'row' }}>
            {m.role === 'assistant' && (
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#60A5FA,#2563EB)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>🤖</div>
            )}
            <div style={{
              maxWidth: '78%', padding: '10px 14px', borderRadius: 18, fontSize: 13, lineHeight: 1.6, wordBreak: 'break-word', whiteSpace: 'pre-wrap',
              ...(m.role === 'user'
                ? { background: 'linear-gradient(135deg,#3B82F6,#2563EB)', color: 'white', borderBottomRightRadius: 4, boxShadow: '0 2px 10px rgba(37,99,235,.3)' }
                : { background: 'white', color: '#1E293B', borderBottomLeftRadius: 4, boxShadow: '0 1px 8px rgba(37,99,235,.1)' })
            }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#60A5FA,#2563EB)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🤖</div>
            <div style={{ padding: '10px 16px', background: 'white', borderRadius: 18, borderBottomLeftRadius: 4, boxShadow: '0 1px 8px rgba(37,99,235,.1)', display: 'flex', gap: 4, alignItems: 'center' }}>
              {[0, .2, .4].map((d, i) => <div key={i} style={{ width: 7, height: 7, background: '#93c5fd', borderRadius: '50%', animation: `typebounce 1.2s ${d}s infinite` }} />)}
            </div>
          </div>
        )}
        {msgs.length <= 1 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
            {quickPrompts.map(q => (
              <button key={q} onClick={() => setInput(q)} style={{ background: 'white', border: '1.5px solid #BFDBFE', borderRadius: 20, padding: '7px 14px', fontSize: 12, color: '#2563EB', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>
                {q}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{ flexShrink: 0, background: 'white', padding: '10px 12px 20px', display: 'flex', alignItems: 'center', gap: 8, borderTop: '1px solid #e8f0fe' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: '#F1F5FF', borderRadius: 24, padding: '9px 14px', gap: 6, border: '1.5px solid #e8f0fe' }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder="Ask me anything..."
            style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 13, color: '#1E293B', outline: 'none', fontFamily: 'inherit' }}
          />
        </div>
        {input.trim()
          ? <button onClick={send} style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#60A5FA,#2563EB)', border: 'none', color: 'white', fontSize: 16, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 10px rgba(37,99,235,.35)' }}>➤</button>
          : <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#60A5FA,#2563EB)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, cursor: 'pointer', flexShrink: 0, boxShadow: '0 2px 10px rgba(37,99,235,.35)' }}>🎤</div>
        }
      </div>
    </div>
  );
}

function FriendsPanel({onClose,currentUser,allUsers,following,onFollow,showToast}){
  const[view,setView]=useState('friends'); // 'friends' | 'chat'
  const[chatUser,setChatUser]=useState(null);
  const[messages,setMessages]=useState([]);
  const[input,setInput]=useState('');
  const[loading,setLoading]=useState(false);
  const msgsRef=useRef(null);
  const subRef=useRef(null);

  useEffect(()=>{
    setTimeout(()=>{if(msgsRef.current)msgsRef.current.scrollTop=msgsRef.current.scrollHeight;},60);
  },[messages]);

  const openChat=async(user)=>{
    setChatUser(user); setView('chat'); setLoading(true);
    const{data}=await supabase.from('direct_messages')
      .select('*')
      .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${user.id}),and(sender_id.eq.${user.id},receiver_id.eq.${currentUser.id})`)
      .order('created_at',{ascending:true});
    setMessages(data||[]); setLoading(false);

    if(subRef.current){subRef.current.unsubscribe();}
    const ch=supabase.channel(`dm_${currentUser.id}_${user.id}`)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'direct_messages',filter:`receiver_id=eq.${currentUser.id}`},(payload)=>{
        if(payload.new.sender_id===user.id) setMessages(m=>[...m,payload.new]);
      }).subscribe();
    subRef.current=ch;
  };

  const sendMsg=async()=>{
    if(!input.trim()||!chatUser)return;
    const txt=input.trim(); setInput('');
    const{data,error}=await supabase.from('direct_messages')
      .insert({sender_id:currentUser.id,receiver_id:chatUser.id,content:txt})
      .select().single();
    if(!error&&data) setMessages(m=>[...m,data]);
    else showToast('❌ Could not send. Try again.');
  };

  useEffect(()=>()=>{if(subRef.current)subRef.current.unsubscribe();},[]);

  // ── FRIENDS LIST VIEW ──
  if(view==='friends'){
    const allUserslist=allUsers||[];
    return(
      <div style={{position:'fixed',inset:0,zIndex:200,background:G.bg,display:'flex',flexDirection:'column',fontFamily:"'Segoe UI',-apple-system,sans-serif"}}>
        <div style={{flexShrink:0,background:'linear-gradient(135deg,#2563EB,#1D4ED8)',padding:'48px 16px 12px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <span onClick={onClose} style={{fontSize:22,cursor:'pointer',color:'white'}}>←</span>
          <span style={{fontSize:17,fontWeight:800,color:'white'}}>👥 Friends & Messages</span>
          <div style={{width:28}}/>
        </div>

        <div style={{flex:1,overflowY:'auto',scrollbarWidth:'none'}}>
          {/* Section: Message someone */}
          <div style={{padding:'14px 14px 6px'}}>
            <div style={{fontSize:13,fontWeight:700,color:G.dark,marginBottom:10}}>💬 Message Someone</div>
            {allUserslist.length===0
              ?<div style={{textAlign:'center',color:G.gray,padding:'20px 0',fontSize:13}}>
                  <div style={{fontSize:36,marginBottom:8}}>👥</div>
                  No other users yet.<br/>Invite friends to join Buddy!
                </div>
              :allUserslist.map((u,i)=>(
                <div key={u.id} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderBottom:'1px solid #f1f5f9'}}>
                  <Av p={u} size={46} idx={i+1}/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:14,fontWeight:600,color:G.dark}}>{u.full_name||u.username||'User'}</div>
                    <div style={{fontSize:11,color:G.gray}}>{u.username?'@'+u.username:''}</div>
                  </div>
                  <div style={{display:'flex',gap:8}}>
                    <button onClick={()=>onFollow(u.id)} style={{background:following[u.id]?G.lb:G.blue,color:following[u.id]?G.blue:'white',border:following[u.id]?`1.5px solid ${G.sky}`:'none',borderRadius:20,padding:'6px 14px',fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
                      {following[u.id]?'Following':'Follow'}
                    </button>
                    <button onClick={()=>openChat(u)} style={{background:'#EFF6FF',border:'1.5px solid #BFDBFE',borderRadius:20,padding:'6px 14px',fontSize:11,fontWeight:600,color:G.blue,cursor:'pointer',fontFamily:'inherit'}}>
                      Chat
                    </button>
                  </div>
                </div>
              ))
            }
          </div>

          {/* Section: People You May Know */}
          <div style={{padding:'14px 14px 20px'}}>
            <div style={{fontSize:13,fontWeight:700,color:G.dark,marginBottom:10}}>🌟 People You May Know</div>
            {allUserslist.filter(u=>!following[u.id]).length===0
              ?<div style={{textAlign:'center',color:G.gray,fontSize:12,padding:'10px 0'}}>You're following everyone! 🎉</div>
              :<div style={{display:'flex',gap:10,overflowX:'auto',scrollbarWidth:'none',paddingBottom:4}}>
                {allUserslist.filter(u=>!following[u.id]).slice(0,8).map((u,i)=>(
                  <div key={u.id} style={{background:'white',borderRadius:16,padding:'14px 10px',minWidth:110,display:'flex',flexDirection:'column',alignItems:'center',gap:8,boxShadow:'0 2px 10px rgba(37,99,235,.08)',flexShrink:0}}>
                    <Av p={u} size={50} idx={i+1}/>
                    <div style={{fontSize:12,fontWeight:700,color:G.dark,textAlign:'center',maxWidth:100,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{u.full_name||u.username||'User'}</div>
                    <button onClick={()=>onFollow(u.id)} style={{background:G.blue,color:'white',border:'none',borderRadius:20,padding:'5px 0',fontSize:11,fontWeight:700,cursor:'pointer',width:'100%',fontFamily:'inherit'}}>Follow</button>
                  </div>
                ))}
              </div>
            }
          </div>
        </div>
      </div>
    );
  }

  // ── CHAT VIEW ──
  return(
    <div style={{position:'fixed',inset:0,zIndex:200,background:'#EFF6FF',display:'flex',flexDirection:'column',fontFamily:"'Segoe UI',-apple-system,sans-serif"}}>
      {/* Chat header */}
      <div style={{flexShrink:0,background:'linear-gradient(135deg,#2563EB,#1D4ED8)',padding:'48px 16px 12px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <span onClick={()=>setView('friends')} style={{fontSize:22,cursor:'pointer',color:'white'}}>←</span>
        <div style={{display:'flex',alignItems:'center',gap:9}}>
          <Av p={chatUser} size={34} idx={1}/>
          <div>
            <div style={{fontSize:14,fontWeight:700,color:'white'}}>{chatUser?.full_name||chatUser?.username||'User'}</div>
            <div style={{fontSize:10,color:'rgba(255,255,255,.7)'}}>Tap ← to go back</div>
          </div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <span onClick={()=>showToast('📞 Calling...')} style={{fontSize:20,cursor:'pointer',color:'white'}}>📞</span>
          <span onClick={()=>showToast('📹 Video...')} style={{fontSize:20,cursor:'pointer',color:'white'}}>📹</span>
        </div>
      </div>

      {/* Messages */}
      <div ref={msgsRef} style={{flex:1,overflowY:'auto',padding:'12px 10px',display:'flex',flexDirection:'column',gap:10,scrollbarWidth:'none'}}>
        {loading&&<div style={{textAlign:'center',color:G.gray,fontSize:12,padding:20}}>Loading messages...</div>}
        {!loading&&messages.length===0&&(
          <div style={{textAlign:'center',color:G.gray,padding:'30px 20px'}}>
            <div style={{fontSize:36,marginBottom:8}}>👋</div>
            Say hi to {chatUser?.full_name||'your friend'}!<br/>
            <span style={{fontSize:11}}>Messages are saved forever ✨</span>
          </div>
        )}
        {messages.map((m,i)=>{
          const mine=m.sender_id===currentUser.id;
          return(
            <div key={m.id||i} style={{display:'flex',alignItems:'flex-end',gap:7,flexDirection:mine?'row-reverse':'row'}}>
              {!mine&&<Av p={chatUser} size={28} idx={1}/>}
              <div style={{maxWidth:'72%',padding:'9px 13px',borderRadius:18,fontSize:12.5,lineHeight:1.5,wordBreak:'break-word',
                ...(mine?{background:'linear-gradient(135deg,#3B82F6,#2563EB)',color:'white',borderBottomRightRadius:4,boxShadow:'0 2px 10px rgba(37,99,235,.3)'}
                        :{background:'white',color:G.dark,borderBottomLeftRadius:4,boxShadow:'0 1px 6px rgba(37,99,235,.08)'})}}>
                {m.content}
                {mine&&<span style={{fontSize:10,opacity:.75,float:'right',marginLeft:6,marginTop:3}}>✓✓</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <div style={{flexShrink:0,background:'white',padding:'10px 12px 20px',display:'flex',alignItems:'center',gap:8,borderTop:'1px solid #e8f0fe'}}>
        <div style={{flex:1,display:'flex',alignItems:'center',background:'#F1F5FF',borderRadius:22,padding:'8px 12px',gap:6,border:'1.5px solid #e8f0fe'}}>
          <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendMsg()}
            placeholder="Type a message..." style={{flex:1,border:'none',background:'transparent',fontSize:12.5,color:G.dark,outline:'none',fontFamily:'inherit'}}/>
          <span onClick={()=>{const em=['😊','😂','❤️','🔥','👍','😍','🎉','🙏'];setInput(v=>v+em[Math.floor(Math.random()*em.length)]);}} style={{fontSize:17,cursor:'pointer'}}>🙂</span>
        </div>
        {input.trim()
          ?<button onClick={sendMsg} style={{width:36,height:36,borderRadius:'50%',background:'linear-gradient(135deg,#60A5FA,#2563EB)',border:'none',color:'white',fontSize:15,cursor:'pointer',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 2px 10px rgba(37,99,235,.35)'}}>➤</button>
          :<div style={{width:36,height:36,borderRadius:'50%',background:'linear-gradient(135deg,#60A5FA,#2563EB)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,cursor:'pointer',flexShrink:0,boxShadow:'0 2px 10px rgba(37,99,235,.35)'}}>🎤</div>
        }
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// ADD STORY SHEET
// ══════════════════════════════════════════════
function AddStorySheet({user,onClose,onAdded,showToast}){
  const[caption,setCaption]=useState('');
  const[image,setImage]=useState(null);
  const[preview,setPreview]=useState(null);
  const[saving,setSaving]=useState(false);
  const fileRef=useRef(null);
  const pickImg=e=>{const f=e.target.files[0];if(!f)return;setImage(f);setPreview(URL.createObjectURL(f));};
  const submit=async()=>{
    if(!caption.trim()&&!image){showToast('Add a caption or photo first');return;}
    setSaving(true);
    let imageUrl='';
    if(image){
      const ext=image.name.split('.').pop();
      const path=`stories/${user.id}_${Date.now()}.${ext}`;
      const{error:upErr}=await supabase.storage.from('posts').upload(path,image,{upsert:true});
      if(upErr){
        console.warn('Image upload failed:', upErr.message, '— continuing without image');
        // Don't block story creation if image fails
      } else {
        const{data:{publicUrl}}=supabase.storage.from('posts').getPublicUrl(path);
        imageUrl=publicUrl;
      }
    }
    // Try insert into stories table
    const{data,error}=await supabase.from('stories')
      .insert({user_id:user.id,caption:caption.trim(),image_url:imageUrl})
      .select('*').single();

    if(error){
      console.error('Story error:', error.message);
      showToast('❌ Error: '+error.message);
    } else if(data){
      // profiles join not needed here — Feed loads stories separately with profiles
      onAdded(data);
      showToast('✨ Story added! Visible for 24 hours');
    }
    setSaving(false);onClose();
  };
  return(
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:400,display:'flex',alignItems:'flex-end',justifyContent:'center'}}>
      <div style={{background:'white',borderRadius:'22px 22px 0 0',width:'100%',maxWidth:480,padding:20,animation:'slideup .28s ease'}}>
        <div style={{width:38,height:4,background:'#e2e8f0',borderRadius:2,margin:'0 auto 16px'}}/>
        <div style={{fontSize:16,fontWeight:700,color:G.dark,marginBottom:8}}>📸 Add Your Story</div>
        <p style={{fontSize:12,color:G.gray,marginBottom:14}}>Visible to everyone for <strong>24 hours</strong>, then disappears.</p>
        <textarea value={caption} onChange={e=>setCaption(e.target.value)} placeholder="Write something... ✨" style={{width:'100%',minHeight:80,border:'1.5px solid #BFDBFE',borderRadius:14,padding:'10px 14px',fontSize:13,outline:'none',resize:'none',fontFamily:'inherit',color:G.dark,marginBottom:12}}/>
        {preview&&<div style={{position:'relative',marginBottom:12}}><img src={preview} alt="" style={{width:'100%',maxHeight:200,objectFit:'cover',borderRadius:12}}/><button onClick={()=>{setImage(null);setPreview(null);}} style={{position:'absolute',top:6,right:6,background:'rgba(0,0,0,.5)',color:'white',border:'none',borderRadius:'50%',width:26,height:26,cursor:'pointer',fontSize:12}}>✕</button></div>}
        <button onClick={()=>fileRef.current.click()} style={{width:'100%',padding:'11px',background:'#EFF6FF',border:'1.5px dashed #BFDBFE',borderRadius:12,color:G.blue,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',marginBottom:12}}>📷 {image?'Change Photo':'Add Photo (optional)'}</button>
        <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={pickImg}/>
        <button onClick={submit} disabled={saving||(!caption.trim()&&!image)} style={{width:'100%',padding:'13px',background:caption.trim()||image?'linear-gradient(135deg,#60A5FA,#2563EB)':'#e2e8f0',color:caption.trim()||image?'white':'#9CA3AF',border:'none',borderRadius:14,fontSize:14,fontWeight:700,cursor:caption.trim()||image?'pointer':'default',fontFamily:'inherit'}}>
          {saving?'⏳ Posting...':'✨ Share Story'}
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// STORY VIEWER
// ══════════════════════════════════════════════
function StoryViewer({story,onClose,onNext}){
  const[prog,setProg]=useState(0);
  useEffect(()=>{
    setProg(0);
    const advance=onNext||onClose;
    const t=setTimeout(advance,5000);
    const iv=setInterval(()=>setProg(p=>Math.min(p+2,100)),100);
    // Track view
    const track=async()=>{
      try{
        const{data:{session}}=await supabase.auth.getSession();
        if(session&&story.id&&story.user_id!==session.user.id){
          await supabase.from('story_views').insert({story_id:story.id,viewer_id:session.user.id}).then(()=>{}).catch(()=>{});
        }
      }catch(e){}
    };
    if(story.id) track();
    return()=>{clearTimeout(t);clearInterval(iv);};
  },[story]);
  if(!story)return null;
  const name=story.profiles?.full_name||story.profiles?.username||'User';
  return(
    <div style={{position:'fixed',inset:0,background:'black',zIndex:500,display:'flex',flexDirection:'column'}}>
      <div style={{display:'flex',gap:4,padding:'48px 14px 6px'}}><div style={{flex:1,height:2.5,background:'rgba(255,255,255,.3)',borderRadius:2,overflow:'hidden'}}><div style={{height:'100%',background:'white',width:prog+'%',transition:'width .1s linear'}}/></div></div>
      <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',background:story.image_url?'black':'linear-gradient(180deg,#1e3a8a,#2563eb,#60a5fa)',position:'relative',overflow:'hidden'}}>
        {story.image_url&&<img src={story.image_url} alt="" style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',opacity:.85}}/>}
        <div style={{position:'absolute',top:12,left:14,display:'flex',alignItems:'center',gap:9,zIndex:2}}>
          <Av p={story.profiles} size={38} idx={0}/>
          <div><div style={{color:'white',fontWeight:700,fontSize:13}}>{name}</div><div style={{color:'rgba(255,255,255,.7)',fontSize:10}}>{ago(story.created_at)} ago</div></div>
        </div>
        <div onClick={onClose} style={{position:'absolute',top:12,right:14,color:'white',fontSize:24,cursor:'pointer',zIndex:2}}>✕</div>
        {story.caption&&<div style={{position:'absolute',bottom:90,left:'50%',transform:'translateX(-50%)',color:'white',fontSize:16,fontWeight:700,textAlign:'center',width:'85%',textShadow:'0 2px 8px rgba(0,0,0,.6)',zIndex:2,background:'rgba(0,0,0,.3)',borderRadius:12,padding:'10px 14px'}}>{story.caption}</div>}
        {!story.image_url&&<div style={{fontSize:70,animation:'floaty 3s ease-in-out infinite',zIndex:2}}>✨</div>}
      </div>
      <div style={{padding:'10px 14px 30px',display:'flex',gap:9,background:'rgba(0,0,0,.8)'}}>
        <input placeholder={`Reply to ${name}...`} style={{flex:1,background:'rgba(255,255,255,.1)',border:'1px solid rgba(255,255,255,.3)',color:'white',borderRadius:22,padding:'9px 14px',fontSize:12.5,outline:'none'}}/>
        <span style={{color:'white',fontSize:22,cursor:'pointer',alignSelf:'center'}}>➤</span>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// COMMENTS SHEET
// ══════════════════════════════════════════════
function CommentsSheet({postId,user,onClose,onCommentAdded}){
  const[comments,setComments]=useState([]);
  const[text,setText]=useState('');
  const[sending,setSending]=useState(false);
  useEffect(()=>{
    if(!postId)return;
    supabase.from('comments').select('*,profiles(full_name,username,avatar_url)')
      .eq('post_id',postId).order('created_at',{ascending:true})
      .then(({data})=>setComments(data||[]));
  },[postId]);
  const send=async()=>{
    if(!text.trim()||sending)return; setSending(true);
    const{data,error}=await supabase.from('comments')
      .insert({post_id:postId,user_id:user.id,content:text.trim()})
      .select('*,profiles(full_name,username,avatar_url)').single();
    if(!error&&data){
      setComments(c=>[...c,data]);
      // comments_count is now updated automatically by a database trigger
      onCommentAdded(postId); // tell parent to bump the local displayed count
    }
    setText(''); setSending(false);
  };
  return(
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.45)',zIndex:300,display:'flex',alignItems:'flex-end',justifyContent:'center'}}>
      <div style={{background:'white',borderRadius:'22px 22px 0 0',width:'100%',maxWidth:480,padding:18,maxHeight:'75vh',overflowY:'auto',animation:'slideup .28s ease'}}>
        <div style={{width:38,height:4,background:'#e2e8f0',borderRadius:2,margin:'0 auto 14px'}}/>
        <div style={{fontSize:15,fontWeight:700,color:G.dark,marginBottom:14}}>💬 Comments ({comments.length})</div>
        {comments.length===0&&<div style={{textAlign:'center',color:G.gray,padding:'20px 0',fontSize:13}}>No comments yet. Be the first! 👇</div>}
        {comments.map((c,i)=>(
          <div key={c.id||i} style={{display:'flex',gap:9,padding:'8px 0',borderBottom:'1px solid #f1f5f9'}}>
            <Av p={c.profiles} size={34} idx={i}/>
            <div style={{flex:1}}>
              <div style={{fontSize:11,fontWeight:700,color:G.dark}}>{c.profiles?.full_name||c.profiles?.username||'User'}</div>
              <div style={{fontSize:12.5,color:'#475569',marginTop:2}}>{c.content}</div>
            </div>
          </div>
        ))}
        <div style={{display:'flex',gap:8,alignItems:'center',marginTop:10}}>
          <input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder="Add a comment..." style={{flex:1,border:'1.5px solid #BFDBFE',borderRadius:18,padding:'9px 14px',fontSize:12.5,outline:'none',fontFamily:'inherit'}}/>
          <button onClick={send} disabled={sending} style={{width:36,height:36,background:G.blue,border:'none',borderRadius:'50%',color:'white',fontSize:15,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>➤</button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// NOTIFICATIONS PANEL — real, saved to Supabase
// ══════════════════════════════════════════════
function NotificationsPanel({onClose, currentUser, showToast}) {
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifs();
    const channel = supabase.channel(`notifs_${currentUser.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${currentUser.id}`
      }, () => { loadNotifs(); }).subscribe();
    return () => { channel.unsubscribe(); };
  }, [currentUser.id]);

  const loadNotifs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('notifications')
      .select('*, profiles!notifications_actor_id_fkey(full_name,username,avatar_url)')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false })
      .limit(50);
    setNotifs(data || []);
    setLoading(false);
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', currentUser.id).eq('is_read', false);
  };

  const iconFor = (type) => type === 'like' ? '❤️' : type === 'comment' ? '💬' : type === 'follow' ? '👥' : '🔔';

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: G.bg, display: 'flex', flexDirection: 'column', fontFamily: "'Segoe UI',-apple-system,sans-serif" }}>
      <div style={{ flexShrink: 0, background: 'linear-gradient(135deg,#2563EB,#1D4ED8)', padding: '48px 16px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span onClick={onClose} style={{ fontSize: 22, cursor: 'pointer', color: 'white' }}>←</span>
        <span style={{ fontSize: 17, fontWeight: 800, color: 'white' }}>🔔 Notifications</span>
        <div style={{ width: 28 }} />
      </div>
      <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none' }}>
        {loading && <div style={{ textAlign: 'center', color: G.gray, padding: 40 }}>Loading...</div>}
        {!loading && notifs.length === 0 && (
          <div style={{ textAlign: 'center', color: G.gray, padding: '50px 20px' }}>
            <div style={{ fontSize: 44, marginBottom: 10 }}>🔔</div>
            No notifications yet.<br />
            <span style={{ fontSize: 12 }}>Likes, comments, and follows will show up here!</span>
          </div>
        )}
        {!loading && notifs.map((n, i) => (
          <div key={n.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid #e8f0fe', background: 'white' }}>
            <div style={{ position: 'relative' }}>
              <Av p={n.profiles} size={44} idx={i} />
              <div style={{ position: 'absolute', bottom: -2, right: -2, width: 20, height: 20, borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, boxShadow: '0 1px 4px rgba(0,0,0,.15)' }}>{iconFor(n.type)}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: G.dark }}>
                <b style={{ fontWeight: 700 }}>{n.profiles?.full_name || n.profiles?.username || 'Someone'}</b> {n.message}
              </div>
              <div style={{ fontSize: 11, color: G.gray, marginTop: 2 }}>{ago(n.created_at)} ago</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// USER SEARCH PANEL — find people by name
// ══════════════════════════════════════════════
function SearchPanel({onClose, currentUser, following, onFollow, navigate}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [recentUsers, setRecentUsers] = useState([]);
  const debounceRef = useRef(null);

  useEffect(() => {
    supabase.from('profiles').select('id,full_name,username,avatar_url')
      .neq('id', currentUser.id).limit(10)
      .then(({ data }) => setRecentUsers(data || []));
  }, [currentUser.id]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const { data } = await supabase
        .from('profiles')
        .select('id,full_name,username,avatar_url')
        .neq('id', currentUser.id)
        .or(`full_name.ilike.%${query}%,username.ilike.%${query}%`)
        .limit(20);
      setResults(data || []);
      setSearching(false);
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, currentUser.id]);

  const list = query.trim() ? results : recentUsers;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: G.bg, display: 'flex', flexDirection: 'column', fontFamily: "'Segoe UI',-apple-system,sans-serif" }}>
      <div style={{ flexShrink: 0, background: 'linear-gradient(135deg,#2563EB,#1D4ED8)', padding: '48px 16px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span onClick={onClose} style={{ fontSize: 22, cursor: 'pointer', color: 'white' }}>←</span>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,.2)', borderRadius: 20, padding: '8px 14px', gap: 8 }}>
            <span style={{ fontSize: 16, color: 'white' }}>🔍</span>
            <input autoFocus value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Search by name or username..."
              style={{ flex: 1, border: 'none', background: 'transparent', color: 'white', fontSize: 14, outline: 'none', fontFamily: 'inherit' }} />
            {query && <span onClick={() => setQuery('')} style={{ color: 'white', cursor: 'pointer', fontSize: 14 }}>✕</span>}
          </div>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none', padding: '10px 0' }}>
        {!query.trim() && <div style={{ padding: '6px 16px', fontSize: 12, fontWeight: 700, color: G.gray }}>SUGGESTED</div>}
        {searching && <div style={{ textAlign: 'center', color: G.gray, padding: 30 }}>Searching...</div>}
        {!searching && query.trim() && list.length === 0 && (
          <div style={{ textAlign: 'center', color: G.gray, padding: '40px 20px' }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🔍</div>
            No users found for "{query}"
          </div>
        )}
        {list.map((u, i) => (
          <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', background: 'white', borderBottom: '1px solid #f1f5f9' }}>
            <div onClick={() => { onClose(); navigate('/profile'); }} style={{ cursor: 'pointer' }}>
              <Av p={u} size={46} idx={i} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: G.dark }}>{u.full_name || u.username || 'User'}</div>
              <div style={{ fontSize: 12, color: G.gray }}>{u.username ? '@' + u.username : ''}</div>
            </div>
            <button onClick={() => onFollow(u.id)} style={{
              background: following[u.id] ? G.lb : G.blue, color: following[u.id] ? G.blue : 'white',
              border: following[u.id] ? `1.5px solid ${G.sky}` : 'none', borderRadius: 20,
              padding: '6px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit'
            }}>
              {following[u.id] ? 'Following' : 'Follow'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// CREATE POST SHEET
// ══════════════════════════════════════════════
// ══════════════════════════════════════════════
// REELS PANEL — full-screen vertical video feed
// TikTok-style: swipe up/down, like, comment, share
// ══════════════════════════════════════════════
function ReelsPanel({onClose, currentUser, showToast}) {
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(0);
  const [liked, setLiked] = useState({});
  const [showUpload, setShowUpload] = useState(false);
  const [showComments, setShowComments] = useState(null);
  const containerRef = useRef(null);
  const videoRefs = useRef({});

  useEffect(() => { loadReels(); }, []);

  const loadReels = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('reels')
      .select('*, profiles(full_name,username,avatar_url)')
      .order('created_at', { ascending: false })
      .limit(30);
    setReels(data || []);
    if (currentUser) {
      const { data: lk } = await supabase.from('reel_likes').select('reel_id').eq('user_id', currentUser.id);
      if (lk) { const lm = {}; lk.forEach(l => { lm[l.reel_id] = true; }); setLiked(lm); }
    }
    setLoading(false);
  };

  // Play current video, pause all others — classic Reels behavior
  useEffect(() => {
    Object.entries(videoRefs.current).forEach(([idx, vid]) => {
      if (!vid) return;
      if (Number(idx) === current) { vid.currentTime = 0; vid.play().catch(() => {}); }
      else vid.pause();
    });
  }, [current, reels]);

  // Detect which reel is in view as user scrolls
  const handleScroll = () => {
    if (!containerRef.current) return;
    const idx = Math.round(containerRef.current.scrollTop / containerRef.current.clientHeight);
    if (idx !== current) setCurrent(idx);
  };

  const handleLike = async (reelId) => {
    const nowLiked = !liked[reelId];
    setLiked(l => ({ ...l, [reelId]: nowLiked }));
    setReels(r => r.map(x => x.id === reelId ? { ...x, likes_count: (x.likes_count || 0) + (nowLiked ? 1 : -1) } : x));
    if (nowLiked) await supabase.from('reel_likes').insert({ reel_id: reelId, user_id: currentUser.id });
    else await supabase.from('reel_likes').delete().eq('reel_id', reelId).eq('user_id', currentUser.id);
  };

  const handleShare = async (reel) => {
    const url = window.location.origin + '/feed';
    if (navigator.share) {
      try { await navigator.share({ title: 'Buddy AI Reel', text: reel.caption || 'Check this reel!', url }); }
      catch (e) { if (e.name !== 'AbortError') showToast('📤 Shared!'); }
    } else {
      try { await navigator.clipboard.writeText(url); showToast('🔗 Link copied!'); }
      catch { showToast('📤 ' + url); }
    }
  };

  const handleDeleteReel = async (reelId) => {
    if (!window.confirm('Delete this reel?')) return;
    setReels(r => r.filter(x => x.id !== reelId));
    await supabase.from('reel_likes').delete().eq('reel_id', reelId);
    await supabase.from('reel_comments').delete().eq('reel_id', reelId);
    await supabase.from('reels').delete().eq('id', reelId).eq('user_id', currentUser.id);
    showToast('🗑️ Reel deleted');
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'black', overflow: 'hidden' }}>
      {/* Top bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20, padding: '48px 16px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(180deg,rgba(0,0,0,.5),transparent)' }}>
        <span onClick={onClose} style={{ fontSize: 22, cursor: 'pointer', color: 'white' }}>←</span>
        <span style={{ fontSize: 16, fontWeight: 800, color: 'white' }}>🎬 Reels</span>
        <span onClick={() => setShowUpload(true)} style={{ fontSize: 22, cursor: 'pointer', color: 'white' }}>📹</span>
      </div>

      {loading && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 40, animation: 'floaty 1.5s infinite' }}>🎬</div>
          <p style={{ color: 'rgba(255,255,255,.7)', fontSize: 13 }}>Loading reels...</p>
        </div>
      )}

      {!loading && reels.length === 0 && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 14, padding: 30, textAlign: 'center' }}>
          <div style={{ fontSize: 50 }}>🎬</div>
          <p style={{ color: 'white', fontSize: 15, fontWeight: 600 }}>No reels yet!</p>
          <p style={{ color: 'rgba(255,255,255,.6)', fontSize: 13 }}>Be the first to share a short video</p>
          <button onClick={() => setShowUpload(true)} style={{ background: 'linear-gradient(135deg,#60A5FA,#2563EB)', color: 'white', border: 'none', borderRadius: 20, padding: '10px 24px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            📹 Upload First Reel
          </button>
        </div>
      )}

      {/* Vertical swipe feed */}
      {!loading && reels.length > 0 && (
        <div ref={containerRef} onScroll={handleScroll} style={{ height: '100%', overflowY: 'scroll', scrollSnapType: 'y mandatory', scrollbarWidth: 'none' }} className="ns">
          {reels.map((reel, i) => (
            <div key={reel.id} style={{ height: '100%', width: '100%', scrollSnapAlign: 'start', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
              <video
                ref={el => videoRefs.current[i] = el}
                src={reel.video_url}
                loop
                muted={false}
                playsInline
                onClick={e => { e.target.paused ? e.target.play() : e.target.pause(); }}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />

              {/* Bottom info */}
              <div style={{ position: 'absolute', bottom: 24, left: 14, right: 70, color: 'white', zIndex: 5 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Av p={reel.profiles} size={32} idx={i} />
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{reel.profiles?.full_name || reel.profiles?.username || 'User'}</span>
                </div>
                {reel.caption && <div style={{ fontSize: 13, lineHeight: 1.5, textShadow: '0 1px 4px rgba(0,0,0,.5)' }}>{reel.caption}</div>}
              </div>

              {/* Right side action buttons */}
              <div style={{ position: 'absolute', right: 12, bottom: 30, zIndex: 5, display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'center' }}>
                <div onClick={() => handleLike(reel.id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'pointer' }}>
                  <span style={{ fontSize: 28 }}>{liked[reel.id] ? '❤️' : '🤍'}</span>
                  <span style={{ color: 'white', fontSize: 11, fontWeight: 600, textShadow: '0 1px 3px rgba(0,0,0,.5)' }}>{fmtN(reel.likes_count || 0)}</span>
                </div>
                <div onClick={() => setShowComments(reel.id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'pointer' }}>
                  <span style={{ fontSize: 26 }}>💬</span>
                  <span style={{ color: 'white', fontSize: 11, fontWeight: 600, textShadow: '0 1px 3px rgba(0,0,0,.5)' }}>{fmtN(reel.comments_count || 0)}</span>
                </div>
                <div onClick={() => handleShare(reel)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'pointer' }}>
                  <span style={{ fontSize: 26 }}>📤</span>
                  <span style={{ color: 'white', fontSize: 11, fontWeight: 600, textShadow: '0 1px 3px rgba(0,0,0,.5)' }}>Share</span>
                </div>
                {reel.user_id === currentUser?.id && (
                  <div onClick={() => handleDeleteReel(reel.id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'pointer' }}>
                    <span style={{ fontSize: 24 }}>🗑️</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showUpload && currentUser && (
        <ReelUploadSheet user={currentUser} showToast={showToast} onClose={() => setShowUpload(false)} onUploaded={(r) => { setReels(prev => [r, ...prev]); }} />
      )}
      {showComments && currentUser && (
        <ReelCommentsSheet reelId={showComments} user={currentUser} onClose={() => setShowComments(null)}
          onCommentAdded={(reelId) => setReels(r => r.map(x => x.id === reelId ? { ...x, comments_count: (x.comments_count || 0) + 1 } : x))} />
      )}
    </div>
  );
}

// ── Reel Upload Sheet ──────────────────────────
function ReelUploadSheet({user, onClose, onUploaded, showToast}) {
  const [video, setVideo] = useState(null);
  const [preview, setPreview] = useState(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const pickVideo = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 50 * 1024 * 1024) { showToast('❌ Video must be under 50MB'); return; }
    setVideo(f);
    setPreview(URL.createObjectURL(f));
  };

  const submit = async () => {
    if (!video) { showToast('Please select a video first'); return; }
    setUploading(true);
    try {
      const ext = video.name.split('.').pop();
      const path = `${user.id}_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('reels').upload(path, video);
      if (upErr) { showToast('❌ Upload failed: ' + upErr.message); setUploading(false); return; }
      const { data: { publicUrl } } = supabase.storage.from('reels').getPublicUrl(path);
      const { data, error } = await supabase.from('reels')
        .insert({ user_id: user.id, video_url: publicUrl, caption: caption.trim() })
        .select('*, profiles(full_name,username,avatar_url)').single();
      if (!error && data) { onUploaded(data); showToast('🎬 Reel uploaded!'); }
      else showToast('❌ ' + (error?.message || 'Could not save reel'));
    } catch (e) {
      showToast('❌ Upload error: ' + e.message);
    }
    setUploading(false);
    onClose();
  };

  return (
    <div onClick={e => e.target === e.currentTarget && !uploading && onClose()} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div style={{ background: 'white', borderRadius: '22px 22px 0 0', width: '100%', maxWidth: 480, padding: 20, animation: 'slideup .28s ease' }}>
        <div style={{ width: 38, height: 4, background: '#e2e8f0', borderRadius: 2, margin: '0 auto 16px' }} />
        <div style={{ fontSize: 16, fontWeight: 700, color: G.dark, marginBottom: 8 }}>🎬 Upload Reel</div>
        <p style={{ fontSize: 12, color: G.gray, marginBottom: 14 }}>Short videos under 50MB work best. Vertical videos look great!</p>

        {preview ? (
          <div style={{ position: 'relative', marginBottom: 14, borderRadius: 14, overflow: 'hidden', background: '#000' }}>
            <video src={preview} controls style={{ width: '100%', maxHeight: 280, display: 'block' }} />
            <button onClick={() => { setVideo(null); setPreview(null); }} style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,.6)', color: 'white', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', fontSize: 13 }}>✕</button>
          </div>
        ) : (
          <button onClick={() => fileRef.current.click()} style={{ width: '100%', padding: '30px 14px', background: '#EFF6FF', border: '1.5px dashed #BFDBFE', borderRadius: 14, color: G.blue, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 32 }}>📹</span>
            Tap to select a video
          </button>
        )}
        <input ref={fileRef} type="file" accept="video/*" style={{ display: 'none' }} onChange={pickVideo} />

        <textarea value={caption} onChange={e => setCaption(e.target.value)} placeholder="Write a caption... ✨"
          style={{ width: '100%', minHeight: 60, border: '1.5px solid #BFDBFE', borderRadius: 14, padding: '10px 14px', fontSize: 13, outline: 'none', resize: 'none', fontFamily: 'inherit', color: G.dark, marginBottom: 14 }} />

        <button onClick={submit} disabled={!video || uploading} style={{
          width: '100%', padding: '13px',
          background: video ? 'linear-gradient(135deg,#60A5FA,#2563EB)' : '#e2e8f0',
          color: video ? 'white' : '#9CA3AF', border: 'none', borderRadius: 14,
          fontSize: 14, fontWeight: 700, cursor: video ? 'pointer' : 'default', fontFamily: 'inherit'
        }}>
          {uploading ? '⏳ Uploading...' : '🚀 Post Reel'}
        </button>
      </div>
    </div>
  );
}

// ── Reel Comments Sheet ────────────────────────
function ReelCommentsSheet({reelId, user, onClose, onCommentAdded}) {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    supabase.from('reel_comments').select('*, profiles(full_name,username,avatar_url)')
      .eq('reel_id', reelId).order('created_at', { ascending: true })
      .then(({ data }) => setComments(data || []));
  }, [reelId]);

  const send = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    const { data, error } = await supabase.from('reel_comments')
      .insert({ reel_id: reelId, user_id: user.id, content: text.trim() })
      .select('*, profiles(full_name,username,avatar_url)').single();
    if (!error && data) { setComments(c => [...c, data]); onCommentAdded(reelId); }
    setText(''); setSending(false);
  };

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 400, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div style={{ background: 'white', borderRadius: '22px 22px 0 0', width: '100%', maxWidth: 480, padding: 18, maxHeight: '70vh', overflowY: 'auto', animation: 'slideup .28s ease' }}>
        <div style={{ width: 38, height: 4, background: '#e2e8f0', borderRadius: 2, margin: '0 auto 14px' }} />
        <div style={{ fontSize: 15, fontWeight: 700, color: G.dark, marginBottom: 14 }}>💬 Comments ({comments.length})</div>
        {comments.length === 0 && <div style={{ textAlign: 'center', color: G.gray, padding: '20px 0', fontSize: 13 }}>No comments yet. Be the first! 👇</div>}
        {comments.map((c, i) => (
          <div key={c.id} style={{ display: 'flex', gap: 9, padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
            <Av p={c.profiles} size={34} idx={i} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: G.dark }}>{c.profiles?.full_name || 'User'}</div>
              <div style={{ fontSize: 12.5, color: '#475569', marginTop: 2 }}>{c.content}</div>
            </div>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 10 }}>
          <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="Add a comment..."
            style={{ flex: 1, border: '1.5px solid #BFDBFE', borderRadius: 18, padding: '9px 14px', fontSize: 12.5, outline: 'none', fontFamily: 'inherit' }} />
          <button onClick={send} disabled={sending} style={{ width: 36, height: 36, background: G.blue, border: 'none', borderRadius: '50%', color: 'white', fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>➤</button>
        </div>
      </div>
    </div>
  );
}



// ══════════════════════════════════════════════
// BUDDY CAMERA — live camera + real-time CSS filters
// Fully self-contained: no external file imports, reuses
// the G constant already defined above in this same file.
// ══════════════════════════════════════════════

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

const CAM_CATEGORIES = [
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

function BuddyCamera({ user, onClose, showToast, onPosted, onStoryAdded, onOpenReelUpload }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const particleContainerRef = useRef(null);
  const streamRef = useRef(null);
  const particleIntervalsRef = useRef([]);

  const [hasPermission, setHasPermission] = useState(null);
  const [facingMode, setFacingMode] = useState('user');
  const [activeCat, setActiveCat] = useState('beauty');
  const [activeFilterIdx, setActiveFilterIdx] = useState(0);
  const [flashOn, setFlashOn] = useState(false);
  const [showFlash, setShowFlash] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [enhancedImage, setEnhancedImage] = useState(null);

  const activeFilter = (CAM_FILTERS[activeCat] || [])[activeFilterIdx] || CAM_FILTERS.beauty[0];

  const startCamera = useCallback(async () => {
    try {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
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

  const selectCategory = (cat) => { setActiveCat(cat); setActiveFilterIdx(0); };

  const flipCamera = () => {
    setFacingMode(f => f === 'user' ? 'environment' : 'user');
    showToast(facingMode === 'user' ? '📷 Back camera' : '🤳 Front camera');
  };

  const capturePhoto = () => {
    if (capturedImage) { setCapturedImage(null); setEnhancedImage(null); return; }
    if (!videoRef.current) return;

    setShowFlash(true);
    setTimeout(() => setShowFlash(false), 200);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 720;
    canvas.height = video.videoHeight || 1280;
    const ctx = canvas.getContext('2d');

    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.filter = activeFilter.css || 'none';
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setCapturedImage(dataUrl);
    showToast('📸 Photo captured!');
  };

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

    await supabase.from('camera_photos').insert({
      user_id: user.id,
      image_url: publicUrl,
      filter_cat: activeCat,
      filter_name: activeFilter.name,
      is_ai_enhanced: !!enhancedImage
    });

    return publicUrl;
  };

  const resetCapture = () => { setCapturedImage(null); setEnhancedImage(null); };

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

  const handleCreateReel = () => {
    showToast('🎬 Now pick a video for your Reel');
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

        {showFlash && <div style={{ position: 'absolute', inset: 0, background: 'white', zIndex: 30, opacity: showFlash ? 1 : 0, transition: 'opacity .15s' }} />}

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

        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, padding: '12px 14px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(to bottom, rgba(0,0,0,.6), transparent)' }}>
          <div onClick={() => { resetCapture(); onClose(); }} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,.2)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 20, cursor: 'pointer' }}>✕</div>
          <div style={{ color: 'white', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>⚡ Buddy Camera</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div onClick={() => { setFlashOn(f => !f); showToast(flashOn ? '⚡ Flash OFF' : '⚡ Flash ON'); }} style={{ width: 36, height: 36, borderRadius: '50%', background: flashOn ? 'rgba(37,99,235,.7)' : 'rgba(255,255,255,.2)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, cursor: 'pointer', color: 'white' }}>⚡</div>
          </div>
        </div>

        {!capturedImage && (
          <>
            <div style={{ position: 'absolute', bottom: 168, left: 0, right: 0, zIndex: 10, padding: '0 8px' }}>
              <div className="ns" style={{ display: 'flex', gap: 7, overflowX: 'auto', padding: '2px 4px 4px' }}>
                {CAM_CATEGORIES.map(c => (
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

        {!capturedImage && hasPermission && (
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10, padding: '6px 24px 20px', background: 'linear-gradient(to top, rgba(0,0,0,.75) 60%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div onClick={() => showToast('🖼️ Opening Gallery...')} style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(255,255,255,.15)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, cursor: 'pointer', border: '1.5px solid rgba(255,255,255,.2)' }}>🖼️</div>
            <div onClick={capturePhoto} style={{ width: 72, height: 72, borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 0 0 5px rgba(255,255,255,.35), 0 6px 24px rgba(0,0,0,.5)' }}>
              <div style={{ width: 58, height: 58, borderRadius: '50%', background: 'linear-gradient(135deg,#60A5FA,#2563EB)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>📷</div>
            </div>
            <div onClick={flipCamera} style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,.15)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, cursor: 'pointer' }}>🔄</div>
          </div>
        )}

        {capturedImage && (
          <div onClick={capturePhoto} style={{ position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 10, background: 'rgba(255,255,255,.2)', backdropFilter: 'blur(6px)', color: 'white', borderRadius: 20, padding: '10px 22px', fontSize: 13, fontWeight: 700, cursor: 'pointer', border: '1.5px solid rgba(255,255,255,.3)' }}>
            🔄 Retake
          </div>
        )}
      </div>
    </div>
  );
}

function CreateSheet({user,onClose,onPosted,showToast}){
  const[text,setText]=useState('');
  const[image,setImage]=useState(null);
  const[preview,setPreview]=useState(null);
  const[posting,setPosting]=useState(false);
  const fileRef=useRef(null);
  const pickImg=e=>{const f=e.target.files[0];if(!f)return;setImage(f);setPreview(URL.createObjectURL(f));};
  const submit=async()=>{
    if(!text.trim()||posting)return; setPosting(true);
    let imageUrl='';
    if(image){
      const ext=image.name.split('.').pop();
      const path=`posts/${user.id}_${Date.now()}.${ext}`;
      const{error:upErr}=await supabase.storage.from('posts').upload(path,image);
      if(!upErr){const{data:{publicUrl}}=supabase.storage.from('posts').getPublicUrl(path);imageUrl=publicUrl;}
    }
    const{data,error}=await supabase.from('posts')
      .insert({user_id:user.id,content:text.trim(),image_url:imageUrl,likes_count:0,comments_count:0})
      .select('*,profiles(full_name,username,avatar_url)').single();
    if(!error&&data){onPosted(data);showToast('🚀 Post shared!');}
    setPosting(false);onClose();
  };
  return(
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.45)',zIndex:300,display:'flex',alignItems:'flex-end',justifyContent:'center'}}>
      <div style={{background:'white',borderRadius:'22px 22px 0 0',width:'100%',maxWidth:480,padding:18,animation:'slideup .28s ease'}}>
        <div style={{width:38,height:4,background:'#e2e8f0',borderRadius:2,margin:'0 auto 14px'}}/>
        <div style={{fontSize:15,fontWeight:700,color:G.dark,marginBottom:14}}>✨ Create Post</div>
        <textarea value={text} onChange={e=>setText(e.target.value)} placeholder="What's on your mind? 🌍" style={{width:'100%',minHeight:90,border:'1.5px solid #BFDBFE',borderRadius:14,padding:'10px 14px',fontSize:13,outline:'none',resize:'none',fontFamily:'inherit',color:G.dark}}/>
        {preview&&<div style={{position:'relative',marginTop:10}}><img src={preview} alt="" style={{width:'100%',maxHeight:200,objectFit:'cover',borderRadius:12}}/><button onClick={()=>{setImage(null);setPreview(null);}} style={{position:'absolute',top:6,right:6,background:'rgba(0,0,0,.5)',color:'white',border:'none',borderRadius:'50%',width:24,height:24,cursor:'pointer',fontSize:12}}>✕</button></div>}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginTop:14}}>
          {[['📸','Photo',()=>fileRef.current.click()],['🎵','Music',()=>showToast('🎵 Soon')],
            ['🤖','AI Art',()=>showToast('🤖 Soon')],['📰','News',()=>showToast('📰 Soon')]].map(([ic,lb,fn])=>(
            <div key={lb} onClick={fn} style={{background:'#EFF6FF',borderRadius:14,padding:'18px 10px',display:'flex',flexDirection:'column',alignItems:'center',gap:7,cursor:'pointer'}}>
              <div style={{fontSize:28}}>{ic}</div>
              <div style={{fontSize:12,fontWeight:600,color:G.dark}}>{lb}</div>
            </div>
          ))}
        </div>
        <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={pickImg}/>
        <button onClick={submit} disabled={!text.trim()||posting} style={{width:'100%',marginTop:14,padding:'13px',background:text.trim()?'linear-gradient(135deg,#60A5FA,#2563EB)':'#e2e8f0',color:text.trim()?'white':'#9CA3AF',border:'none',borderRadius:14,fontSize:14,fontWeight:700,cursor:text.trim()?'pointer':'default',fontFamily:'inherit'}}>
          {posting?'⏳ Posting...':'🚀 Share Post'}
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// POST CARD — with working Share + Comment count
// ══════════════════════════════════════════════
function PostCard({post,currentUserId,isLiked,commentCount,onLike,onComment,onDelete,onShare,idx}){
  const[liked,setLiked]=useState(isLiked);
  const[likeCount,setLikeCount]=useState(post.likes_count||0);
  const handleLike=()=>{const n=!liked;setLiked(n);setLikeCount(c=>n?c+1:c-1);onLike(post.id,n);};
  const isOwn=post.user_id===currentUserId;
  return(
    <div style={{background:'white',margin:'8px 10px',borderRadius:18,overflow:'hidden',boxShadow:'0 2px 10px rgba(37,99,235,.07)'}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',padding:'11px 13px 7px',justifyContent:'space-between'}}>
        <div style={{display:'flex',alignItems:'center',gap:9}}>
          <Av p={post.profiles} size={40} idx={idx}/>
          <div>
            <div style={{fontSize:13.5,fontWeight:700,color:G.dark}}>{post.profiles?.full_name||post.profiles?.username||'User'}</div>
            <div style={{fontSize:10,color:G.gray,marginTop:1}}>{ago(post.created_at)} ago</div>
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          {isOwn&&<button onClick={()=>onDelete(post.id)} style={{background:'none',border:'none',cursor:'pointer',color:G.red,fontSize:16,padding:4}}>🗑️</button>}
          <div style={{color:G.gray,fontSize:18}}>···</div>
        </div>
      </div>
      {/* Text */}
      {post.content&&<div style={{padding:'3px 13px 9px',fontSize:13,color:G.dark,lineHeight:1.5}}>
        {post.content.split(/(#\w+)/g).map((p,i)=>p.startsWith('#')?<span key={i} style={{color:G.blue,fontWeight:600}}>{p}</span>:p)}
      </div>}
      {/* Image */}
      {post.image_url&&<div style={{width:'100%',maxHeight:300,overflow:'hidden'}}><img src={post.image_url} alt="" style={{width:'100%',objectFit:'cover'}}/></div>}
      {/* Footer actions */}
      <div style={{padding:'9px 13px 11px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{display:'flex',alignItems:'center',gap:16}}>
          {/* ❤️ Like */}
          <div onClick={handleLike} style={{display:'flex',alignItems:'center',gap:4,cursor:'pointer',color:liked?G.red:G.gray,fontSize:12.5}}>
            <span style={{fontSize:20,transition:'transform .15s',display:'inline-block',transform:liked?'scale(1.2)':'scale(1)'}}>{liked?'❤️':'🤍'}</span>
            <span>{fmtN(likeCount)}</span>
          </div>
          {/* 💬 Comment — shows REAL live count */}
          <div onClick={()=>onComment(post.id)} style={{display:'flex',alignItems:'center',gap:4,cursor:'pointer',color:G.gray,fontSize:12.5}}>
            <span style={{fontSize:20}}>💬</span>
            <span>{commentCount ?? post.comments_count ?? 0}</span>
          </div>
          {/* 📤 Share — uses Web Share API */}
          <div onClick={()=>onShare(post)} style={{display:'flex',alignItems:'center',gap:4,cursor:'pointer',color:G.gray,fontSize:12.5}}>
            <span style={{fontSize:20}}>📤</span>
          </div>
        </div>
        <div onClick={()=>{}} style={{cursor:'pointer',fontSize:20,color:G.gray}}>🔖</div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// REEL CARD
// ══════════════════════════════════════════════
function ReelCard({showToast}){
  const[liked,setLiked]=useState(false);
  const[cnt,setCnt]=useState(186200);
  return(
    <div style={{background:'white',margin:'8px 10px',borderRadius:18,overflow:'hidden',boxShadow:'0 2px 10px rgba(37,99,235,.07)'}}>
      <div style={{display:'flex',alignItems:'center',padding:'11px 13px 7px',justifyContent:'space-between'}}>
        <div style={{display:'flex',alignItems:'center',gap:9}}>
          <div style={{width:40,height:40,borderRadius:'50%',background:'linear-gradient(135deg,#60A5FA,#2563EB)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>🤖</div>
          <div>
            <div style={{fontSize:13.5,fontWeight:700,color:G.dark}}>Buddy <span style={{color:G.blue,fontSize:12}}>✔️</span></div>
            <div style={{fontSize:10,color:G.gray}}>2h ago</div>
          </div>
        </div>
        <div style={{color:G.gray,fontSize:18}}>···</div>
      </div>
      <div style={{padding:'3px 13px 9px',fontSize:13,color:G.dark,lineHeight:1.5}}>
        Motivational video just for you! 🚀 Let's make today amazing! 💙<br/>
        <span style={{color:G.blue,fontWeight:600}}>#Inspiration #Motivation #AI</span>
      </div>
      <div style={{position:'relative',width:'100%',height:300,overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center',background:'linear-gradient(180deg,#e0f0ff,#b3d4ff 40%,#7eb8ff)'}}>
        <div style={{position:'absolute',top:16,right:16,zIndex:3,background:'white',borderRadius:'18px 18px 18px 4px',padding:'9px 14px',fontSize:15,fontWeight:700,color:G.blue,boxShadow:'0 4px 14px rgba(37,99,235,.18)'}}>You can do it!</div>
        <div style={{position:'relative',zIndex:2,fontSize:80,animation:'floaty 3s ease-in-out infinite'}}>🤖</div>
        <div style={{position:'absolute',right:11,bottom:65,zIndex:4,display:'flex',flexDirection:'column',gap:14,alignItems:'center'}}>
          {[[liked?'❤️':'🤍',fmtN(cnt),()=>{setLiked(l=>!l);setCnt(c=>liked?c-1:c+1);}],['💬','5.3K',()=>showToast('💬 Comments')],['🔗','Share',()=>{if(navigator.share)navigator.share({title:'Buddy AI',text:'Check this out!',url:window.location.href}).catch(()=>{});else showToast('🔗 Link copied!');}],['🔖','13.1K',()=>showToast('🔖 Saved!')]].map(([ic,lb,fn],i)=>(
            <div key={i} onClick={fn} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:2,cursor:'pointer'}}>
              <div style={{width:40,height:40,borderRadius:'50%',background:'rgba(255,255,255,.22)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:19}}>{ic}</div>
              <span style={{fontSize:10,color:'white',fontWeight:600,textShadow:'0 1px 3px rgba(0,0,0,.5)'}}>{lb}</span>
            </div>
          ))}
        </div>
        <div onClick={()=>showToast('▶️ Playing...')} style={{position:'absolute',bottom:18,left:'50%',transform:'translateX(-50%)',width:48,height:48,background:'rgba(37,99,235,.85)',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,color:'white',zIndex:4,cursor:'pointer',boxShadow:'0 4px 18px rgba(37,99,235,.5)'}}>▶</div>
        <div style={{position:'absolute',bottom:0,left:0,right:0,height:3,zIndex:4,background:'linear-gradient(90deg,transparent,#60A5FA,#2563EB,transparent)'}}/>
      </div>
      <div style={{padding:'9px 13px 11px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{display:'flex',gap:14}}>
          <div onClick={()=>{setLiked(l=>!l);setCnt(c=>liked?c-1:c+1);}} style={{display:'flex',alignItems:'center',gap:4,cursor:'pointer',color:liked?G.red:G.gray,fontSize:12.5}}><span style={{fontSize:19}}>{liked?'❤️':'🤍'}</span>{fmtN(cnt)}</div>
          <div onClick={()=>showToast('💬')} style={{display:'flex',alignItems:'center',gap:4,cursor:'pointer',color:G.gray,fontSize:12.5}}><span style={{fontSize:19}}>💬</span>5.3K</div>
        </div>
        <div style={{display:'flex',gap:10}}>
          <div onClick={()=>{if(navigator.share)navigator.share({title:'Buddy AI',url:window.location.href}).catch(()=>{});else showToast('📤 Link copied!');}} style={{cursor:'pointer',fontSize:19,color:G.gray}}>📤</div>
          <div onClick={()=>showToast('🔖 Saved!')} style={{cursor:'pointer',fontSize:19,color:G.gray}}>🔖</div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// MAIN FEED — IS THE HOME NOW
// ══════════════════════════════════════════════
export default function Feed(){
  const navigate=useNavigate();
  const[user,setUser]=useState(null);
  const[profile,setProfile]=useState(null);
  const[posts,setPosts]=useState([]);
  const[allUsers,setAllUsers]=useState([]);
  const[stories,setStories]=useState([]);
  const[commentCounts,setCommentCounts]=useState({}); // live comment counts
  const[loading,setLoading]=useState(true);
  const[likedPosts,setLikedPosts]=useState({});
  const[following,setFollowing]=useState({});

  // Panel states — which overlay is open
  const[panel,setPanel]=useState(null); // null | 'ai-chat' | 'friends' | 'create' | 'add-story' | 'notifications' | 'search'
  const[unreadCount,setUnreadCount]=useState(0);
  const[activeNav,setActiveNav]=useState('home');
  const[activeStory,setActiveStory]=useState(null);
  const[commentPostId,setCommentPostId]=useState(null);
  const[toast,setToast]=useState('');
  const feedRef=useRef(null);

  const showToast=useCallback(msg=>{setToast(msg);setTimeout(()=>setToast(''),2400);},[]);

  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{
      if(!session){navigate('/login');return;}
      setUser(session.user);
      loadAll(session.user.id);
    });
  },[navigate]);

  const loadAll=async uid=>{
    setLoading(true);
    const[{data:prof},{data:users},{data:postsData},{data:lk},{data:fol},{data:storiesData},{count:unread}]=await Promise.all([
      supabase.from('profiles').select('*').eq('id',uid).single(),
      supabase.from('profiles').select('id,full_name,username,avatar_url').neq('id',uid).limit(20),
      supabase.from('posts').select('*,profiles(full_name,username,avatar_url)').order('created_at',{ascending:false}).limit(50),
      supabase.from('likes').select('post_id').eq('user_id',uid),
      supabase.from('follows').select('following_id').eq('follower_id',uid),
      supabase.from('stories').select('*, profiles(id,full_name,username,avatar_url)').gt('expires_at',new Date().toISOString()).order('created_at',{ascending:false}),
      supabase.from('notifications').select('id',{count:'exact',head:true}).eq('user_id',uid).eq('is_read',false),
    ]);
    if(prof)setProfile(prof);
    if(users)setAllUsers(users);
    if(postsData){
      setPosts(postsData);
      // initialise comment counts from DB
      const cm={};
      postsData.forEach(p=>{cm[p.id]=p.comments_count||0;});
      setCommentCounts(cm);
    }
    if(lk){const lm={};lk.forEach(l=>{lm[l.post_id]=true;});setLikedPosts(lm);}
    if(fol){const fm={};fol.forEach(f=>{fm[f.following_id]=true;});setFollowing(fm);}
    if(storiesData)setStories(storiesData);
    setUnreadCount(unread||0);
    setLoading(false);
  };

  // Live notification badge — listens for new notifications even while browsing
  useEffect(()=>{
    if(!user)return;
    const ch=supabase.channel(`notif_badge_${user.id}`)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications',filter:`user_id=eq.${user.id}`},
        ()=>{ setUnreadCount(c=>c+1); }
      ).subscribe();
    return ()=>{ ch.unsubscribe(); };
  },[user]);

  const handleLike=async(postId,nowLiked)=>{
    setLikedPosts(l=>({...l,[postId]:nowLiked}));
    if(nowLiked) await supabase.from('likes').insert({post_id:postId,user_id:user.id});
    else await supabase.from('likes').delete().eq('post_id',postId).eq('user_id',user.id);
  };

  const handleDelete=async postId=>{
    if(!window.confirm('Delete this post?'))return;
    // Step 1: Remove from UI immediately
    setPosts(p=>p.filter(x=>x.id!==postId));
    showToast('🗑️ Deleting post...');
    try {
      // Step 2: Delete likes first (FK constraint)
      await supabase.from('likes').delete().eq('post_id',postId);
      // Step 3: Delete comments (FK constraint)
      await supabase.from('comments').delete().eq('post_id',postId);
      // Step 4: Delete the post itself — MUST match user_id so RLS allows it
      const { error, data } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId)
        .eq('user_id', user.id)
        .select();
      if(error){
        console.error('Post delete error:', error.message, error.code);
        showToast('❌ Delete failed: ' + error.message);
        // Restore post in UI if delete failed
        loadAll(user.id);
      } else {
        showToast('🗑️ Post deleted!');
        console.log('Deleted:', data);
      }
    } catch(e){
      console.error('Delete exception:', e);
      showToast('❌ Delete failed');
      loadAll(user.id);
    }
  };

  // ✅ FIX: Share uses Web Share API (native Android share sheet)
  const handleShare=async(post)=>{
    const shareData={
      title:'Buddy AI — '+( post.profiles?.full_name||'Someone')+'s post',
      text: post.content||'Check this out on Buddy AI! 🤖',
      url: window.location.origin+'/feed',
    };
    if(navigator.share){
      try{ await navigator.share(shareData); }
      catch(e){ if(e.name!=='AbortError') showToast('📤 Shared!'); }
    } else {
      // Fallback: copy to clipboard
      try{
        await navigator.clipboard.writeText(shareData.url);
        showToast('🔗 Link copied to clipboard!');
      }catch{
        showToast('📤 '+shareData.url);
      }
    }
  };

  // ✅ FIX: Comment count updates live in state
  const handleCommentAdded=useCallback(postId=>{
    setCommentCounts(c=>({...c,[postId]:(c[postId]||0)+1}));
  },[]);

  const handleFollow=async personId=>{
    const now=!following[personId];
    setFollowing(f=>({...f,[personId]:now}));
    if(now) await supabase.from('follows').insert({follower_id:user.id,following_id:personId});
    else await supabase.from('follows').delete().eq('follower_id',user.id).eq('following_id',personId);
    showToast(now?'✅ Following!':'Unfollowed');
  };

  // ✅ FIX: get ALL my active stories (unlimited), not just the first one
  const myStories = stories.filter(s=>s.user_id===user?.id).sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));
  const hasMyStory = myStories.length>0;
  const[storyQueue,setStoryQueue]=useState([]); // sequence of stories to view one after another
  const[storyQueueIdx,setStoryQueueIdx]=useState(0);

  const openStorySequence=(list,startIdx=0)=>{
    setStoryQueue(list);
    setStoryQueueIdx(startIdx);
    setActiveStory(list[startIdx]);
  };
  const nextStoryInQueue=()=>{
    const nextIdx=storyQueueIdx+1;
    if(nextIdx<storyQueue.length){
      setStoryQueueIdx(nextIdx);
      setActiveStory(storyQueue[nextIdx]);
    } else {
      setActiveStory(null); setStoryQueue([]); setStoryQueueIdx(0);
    }
  };

  // ── BOTTOM NAV ────────────────────────────
  // Home | Friends | [+] | Reels | AI Chat | Profile
  const navItems=[
    {id:'home',   icon:'🏠', label:'Home'},
    {id:'friends',icon:'👥', label:'Friends'},
    {id:'create', icon:'+',  isPlus:true},
    {id:'reels',  icon:'🎬', label:'Reels'},
    {id:'aichat', icon:'🤖', label:'AI'},
    {id:'profile',icon:'👤', label:'Profile'},
  ];

  const handleNav=id=>{
    if(id==='profile'){navigate('/profile');return;}
    if(id==='create'){setPanel('create-choice');return;}
    if(id==='reels'){setPanel('reels');setActiveNav('reels');return;}
    if(id==='aichat'){setPanel('ai-chat');setActiveNav('aichat');return;}
    if(id==='friends'){setPanel('friends');setActiveNav('friends');return;}
    if(id==='home'){
      setPanel(null);setActiveNav('home');
      if(feedRef.current)feedRef.current.scrollTop=0;
      return;
    }
    setActiveNav(id);
  };

  const closePanel=()=>{ setPanel(null); setActiveNav('home'); };

  return(
    <>
      <style>{`
        @keyframes floaty{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
        @keyframes fadein{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideup{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes typebounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-6px)}}
        *{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}
        body{margin:0;padding:0;background:#F0F4FF;}
        .ns::-webkit-scrollbar{display:none;}.ns{scrollbar-width:none;}
      `}</style>

      <Toast msg={toast}/>

      {/* ── OVERLAYS ── */}
      {activeStory&&<StoryViewer story={activeStory} onClose={()=>{setActiveStory(null);setStoryQueue([]);setStoryQueueIdx(0);}} onNext={nextStoryInQueue}/>}
      {commentPostId&&user&&<CommentsSheet postId={commentPostId} user={user} onClose={()=>setCommentPostId(null)} onCommentAdded={handleCommentAdded}/>}
      {panel==='create-choice'&&(
        <div onClick={e=>e.target===e.currentTarget&&closePanel()} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.45)',zIndex:300,display:'flex',alignItems:'flex-end',justifyContent:'center'}}>
          <div style={{background:'white',borderRadius:'22px 22px 0 0',width:'100%',maxWidth:480,padding:20,animation:'slideup .28s ease'}}>
            <div style={{width:38,height:4,background:'#e2e8f0',borderRadius:2,margin:'0 auto 16px'}}/>
            <div style={{fontSize:15,fontWeight:700,color:G.dark,marginBottom:14}}>✨ Create</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>
              <div onClick={()=>setPanel('camera')} style={{background:G.lb,borderRadius:16,padding:'18px 8px',display:'flex',flexDirection:'column',alignItems:'center',gap:7,cursor:'pointer'}}>
                <span style={{fontSize:30}}>⚡</span>
                <span style={{fontSize:12,fontWeight:700,color:G.dark}}>Camera</span>
                <span style={{fontSize:9,color:G.gray,textAlign:'center'}}>Live filters</span>
              </div>
              <div onClick={()=>setPanel('create')} style={{background:G.lb,borderRadius:16,padding:'18px 8px',display:'flex',flexDirection:'column',alignItems:'center',gap:7,cursor:'pointer'}}>
                <span style={{fontSize:30}}>📝</span>
                <span style={{fontSize:12,fontWeight:700,color:G.dark}}>Post</span>
                <span style={{fontSize:9,color:G.gray,textAlign:'center'}}>Photo + caption</span>
              </div>
              <div onClick={()=>setPanel('reel-upload')} style={{background:G.lb,borderRadius:16,padding:'18px 8px',display:'flex',flexDirection:'column',alignItems:'center',gap:7,cursor:'pointer'}}>
                <span style={{fontSize:30}}>🎬</span>
                <span style={{fontSize:12,fontWeight:700,color:G.dark}}>Reel</span>
                <span style={{fontSize:9,color:G.gray,textAlign:'center'}}>Short video</span>
              </div>
            </div>
          </div>
        </div>
      )}
      {panel==='camera'&&user&&(
        <BuddyCamera
          user={user}
          showToast={showToast}
          onClose={closePanel}
          onPosted={p=>{setPosts(prev=>[p,...prev]);setCommentCounts(c=>({...c,[p.id]:0}));}}
          onStoryAdded={s=>setStories(prev=>[s,...prev])}
          onOpenReelUpload={()=>setPanel('reel-upload')}
        />
      )}
      {panel==='create'&&user&&<CreateSheet user={user} showToast={showToast} onClose={closePanel} onPosted={p=>{setPosts(prev=>[p,...prev]);setCommentCounts(c=>({...c,[p.id]:0}));}}/>}
      {panel==='reel-upload'&&user&&<ReelUploadSheet user={user} showToast={showToast} onClose={closePanel} onUploaded={()=>showToast('🎬 Reel posted! Check the Reels tab')}/>}
      {panel==='reels'&&<ReelsPanel onClose={closePanel} currentUser={user} showToast={showToast}/>}
      {panel==='add-story'&&user&&<AddStorySheet user={user} showToast={showToast} onClose={closePanel} onAdded={s=>setStories(prev=>[s,...prev])}/>}
      {panel==='ai-chat'&&<AIChatPanel onClose={closePanel} currentUser={user} showToast={showToast}/>}
      {panel==='friends'&&<FriendsPanel onClose={closePanel} currentUser={user} allUsers={allUsers} following={following} onFollow={handleFollow} showToast={showToast}/>}
      {panel==='notifications'&&<NotificationsPanel onClose={()=>{setUnreadCount(0);closePanel();}} currentUser={user} showToast={showToast}/>}
      {panel==='search'&&<SearchPanel onClose={closePanel} currentUser={user} following={following} onFollow={handleFollow} navigate={navigate}/>}

      {/* ── MAIN APP ── */}
      <div style={{width:'100%',minHeight:'100dvh',background:G.bg,display:'flex',flexDirection:'column',fontFamily:"'Segoe UI',-apple-system,sans-serif",maxWidth:480,margin:'0 auto'}}>

        {/* TOP BAR */}
        <div style={{position:'sticky',top:0,zIndex:100,background:'white',padding:'14px 18px 10px',display:'flex',alignItems:'center',justifyContent:'space-between',borderBottom:'1px solid #e8f0fe',boxShadow:'0 1px 8px rgba(37,99,235,.06)'}}>
          <span onClick={()=>setPanel('search')} style={{fontSize:21,color:G.gray,cursor:'pointer'}}>🔍</span>
          <div style={{textAlign:'center'}}>
            <div style={{display:'flex',alignItems:'center',gap:7,fontSize:18,fontWeight:800,color:G.dark,justifyContent:'center'}}>
              <div style={{width:32,height:32,background:'linear-gradient(135deg,#60A5FA,#2563EB)',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16}}>🤖</div>
              Buddy AI
            </div>
            <div style={{fontSize:9,color:G.gray}}>Your AI Social Community</div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <div style={{position:'relative',cursor:'pointer'}} onClick={()=>setPanel('notifications')}>
              <span style={{fontSize:21}}>🔔</span>
              {unreadCount>0&&<div style={{position:'absolute',top:-4,right:-4,background:G.red,color:'white',fontSize:8,width:14,height:14,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700}}>{unreadCount>9?'9+':unreadCount}</div>}
            </div>
            <div onClick={()=>navigate('/profile')} style={{width:30,height:30,borderRadius:'50%',overflow:'hidden',cursor:'pointer',background:'linear-gradient(135deg,#93C5FD,#1D4ED8)',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:13,fontWeight:700}}>
              {profile?.avatar_url?<img src={profile.avatar_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:ini(profile?.full_name||user?.email||'C')}
            </div>
          </div>
        </div>

        {/* SCROLL AREA */}
        <div ref={feedRef} className="ns" style={{flex:1,overflowY:'auto',overflowX:'hidden',WebkitOverflowScrolling:'touch',paddingBottom:80}}>

          {/* STORIES */}
          <div style={{background:'white',padding:'10px 0 12px',borderBottom:'1px solid #e8f0fe'}}>
            <div className="ns" style={{display:'flex',gap:12,overflowX:'auto',padding:'0 14px'}}>
              {/* Your Story circle — supports unlimited stories like Instagram */}
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4,cursor:'pointer',flexShrink:0}}>
                <div style={{position:'relative'}}>
                  {/* Tapping the ring views your stories in sequence (if any exist) */}
                  <div onClick={()=>hasMyStory?openStorySequence(myStories,0):setPanel('add-story')}
                    style={{width:62,height:62,borderRadius:'50%',background:hasMyStory?'linear-gradient(135deg,#60A5FA,#2563EB)':'#e2e8f0',padding:2.5,position:'relative'}}>
                    <div style={{width:'100%',height:'100%',borderRadius:'50%',background:'white',padding:2,display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
                      {profile?.avatar_url
                        ?<img src={profile.avatar_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'50%'}}/>
                        :<div style={{width:'100%',height:'100%',borderRadius:'50%',background:'linear-gradient(135deg,#93C5FD,#1D4ED8)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,color:'white',fontWeight:700}}>{ini(profile?.full_name||user?.email||'Y')}</div>
                      }
                    </div>
                  </div>
                  {/* Small + button always lets you add ANOTHER story, even if you already have one */}
                  <div onClick={()=>setPanel('add-story')} style={{position:'absolute',bottom:0,right:0,width:20,height:20,background:G.blue,borderRadius:'50%',border:'2px solid white',color:'white',fontSize:14,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',lineHeight:1,cursor:'pointer',boxShadow:'0 1px 4px rgba(0,0,0,.2)'}}>+</div>
                  {/* Small badge showing how many active stories you have */}
                  {myStories.length>1&&(
                    <div style={{position:'absolute',top:-4,left:-4,background:'#22C55E',color:'white',fontSize:9,fontWeight:700,width:18,height:18,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',border:'2px solid white'}}>{myStories.length}</div>
                  )}
                </div>
                <span style={{fontSize:10,color:G.dark,fontWeight:500,maxWidth:62,textAlign:'center'}}>{hasMyStory?'Your Story':'Add Story'}</span>
              </div>
              {/* Other users' stories — grouped one circle per PERSON, not per story */}
              {Object.values(
                stories.filter(s=>s.user_id!==user?.id).reduce((acc,s)=>{
                  if(!acc[s.user_id]) acc[s.user_id]=[];
                  acc[s.user_id].push(s);
                  return acc;
                },{})
              ).map((userStories,i)=>{
                const s=userStories[0]; // first story used for the avatar preview
                const sortedStories=[...userStories].sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));
                return(
                  <div key={s.user_id} onClick={()=>openStorySequence(sortedStories,0)} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4,cursor:'pointer',flexShrink:0}}>
                    <div style={{width:62,height:62,borderRadius:'50%',background:GRAD[(i+1)%GRAD.length],padding:2.5,position:'relative'}}>
                      <div style={{width:'100%',height:'100%',borderRadius:'50%',background:'white',padding:2,display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
                        {s.profiles?.avatar_url
                          ?<img src={s.profiles.avatar_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'50%'}}/>
                          :<div style={{width:'100%',height:'100%',borderRadius:'50%',background:GRAD[(i+1)%GRAD.length],display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,color:'white',fontWeight:700}}>{ini(s.profiles?.full_name||s.profiles?.username)}</div>
                        }
                      </div>
                      {sortedStories.length>1&&(
                        <div style={{position:'absolute',top:-4,left:-4,background:'#22C55E',color:'white',fontSize:9,fontWeight:700,width:18,height:18,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',border:'2px solid white'}}>{sortedStories.length}</div>
                      )}
                    </div>
                    <span style={{fontSize:10,color:G.dark,fontWeight:500,maxWidth:62,textAlign:'center',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.profiles?.full_name||s.profiles?.username||'User'}</span>
                  </div>
                );
              })}
              {stories.filter(s=>s.user_id!==user?.id).length===0&&(
                <div style={{display:'flex',alignItems:'center',color:G.gray,fontSize:11,padding:'8px 4px',flexShrink:0,fontStyle:'italic'}}>No stories yet — be first! ✨</div>
              )}
            </div>
          </div>

          {/* REEL */}
          <ReelCard showToast={showToast}/>

          {/* FOLLOW SUGGESTIONS */}
          {allUsers.filter(u=>!following[u.id]).length>0&&(
            <div style={{padding:'10px 12px',background:G.bg}}>
              <div style={{fontSize:14,fontWeight:700,color:G.dark,marginBottom:10}}>People You May Know</div>
              <div className="ns" style={{display:'flex',gap:10,overflowX:'auto',paddingBottom:4}}>
                {allUsers.filter(u=>!following[u.id]).slice(0,6).map((u,i)=>(
                  <div key={u.id} style={{background:'white',borderRadius:16,padding:'14px 12px',minWidth:115,display:'flex',flexDirection:'column',alignItems:'center',gap:8,boxShadow:'0 2px 10px rgba(37,99,235,.08)',flexShrink:0}}>
                    <Av p={u} size={54} idx={i+1}/>
                    <div style={{fontSize:13,fontWeight:700,color:G.dark,textAlign:'center',maxWidth:100,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{u.full_name||u.username||'User'}</div>
                    <div style={{fontSize:11,color:G.gray}}>{u.username?'@'+u.username:''}</div>
                    <button onClick={()=>handleFollow(u.id)} style={{background:following[u.id]?G.lb:G.blue,color:following[u.id]?G.blue:'white',border:following[u.id]?`1.5px solid ${G.sky}`:'none',borderRadius:20,padding:'6px 0',fontSize:12,fontWeight:700,cursor:'pointer',width:'100%',fontFamily:'inherit'}}>{following[u.id]?'Following ✓':'Follow'}</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* POSTS */}
          {loading&&<div style={{textAlign:'center',padding:40,color:G.gray,fontSize:13}}><div style={{fontSize:40,marginBottom:10,animation:'floaty 1.5s infinite'}}>🤖</div>Loading posts...</div>}
          {!loading&&posts.map((post,i)=>(
            <PostCard key={post.id} post={post} idx={i}
              currentUserId={user?.id}
              isLiked={!!likedPosts[post.id]}
              commentCount={commentCounts[post.id]}
              onLike={handleLike}
              onComment={setCommentPostId}
              onDelete={handleDelete}
              onShare={handleShare}/>
          ))}
          {!loading&&posts.length===0&&(
            <div style={{textAlign:'center',padding:'40px 20px',color:G.gray}}>
              <div style={{fontSize:50,marginBottom:12}}>📝</div>
              <div style={{fontSize:15,fontWeight:600,color:G.dark,marginBottom:6}}>No posts yet!</div>
              <div style={{fontSize:13}}>Be the first to share something amazing 🚀</div>
              <button onClick={()=>setPanel('create')} style={{marginTop:16,background:'linear-gradient(135deg,#60A5FA,#2563EB)',color:'white',border:'none',borderRadius:20,padding:'10px 24px',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Create First Post</button>
            </div>
          )}
        </div>

        {/* BOTTOM NAV */}
        <div style={{position:'fixed',bottom:0,left:'50%',transform:'translateX(-50%)',width:'100%',maxWidth:480,background:'white',borderTop:'1px solid #e8f0fe',display:'flex',justifyContent:'space-around',alignItems:'center',padding:'8px 0 16px',zIndex:100,boxShadow:'0 -3px 16px rgba(37,99,235,.08)'}}>
          {navItems.map(nav=>(
            nav.isPlus
              ?<div key="plus" onClick={()=>handleNav('create')} style={{width:52,height:52,borderRadius:'50%',background:'linear-gradient(135deg,#60A5FA,#2563EB)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,color:'white',cursor:'pointer',marginBottom:6,boxShadow:'0 4px 14px rgba(37,99,235,.4)'}}>+</div>
              :<div key={nav.id} onClick={()=>handleNav(nav.id)} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:2,cursor:'pointer',color:activeNav===nav.id?G.blue:G.gray,fontSize:9.5,padding:'3px 10px',minWidth:50,position:'relative',transition:'color .2s'}}>
                <span style={{fontSize:22}}>{nav.icon}</span>
                <span style={{fontWeight:activeNav===nav.id?700:400}}>{nav.label}</span>
              </div>
          ))}
        </div>
      </div>
    </>
  );
}
