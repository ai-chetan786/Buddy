import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';

/* ============================================================
   BUDDY AI — Feed.js
   Fixes in this version:
   1. Messages saved to Supabase (persist after refresh)
   2. Stories only show if user manually added one
   3. Add story button opens a real story creator
   ============================================================ */

const G = {
  blue:'#2563EB', lightBlue:'#EFF6FF', sky:'#BFDBFE',
  bg:'#F0F4FF', white:'#fff', gray:'#9CA3AF', dark:'#1E293B', red:'#EF4444'
};
const fmtN = n => n>=1e6?(n/1e6).toFixed(1)+'M':n>=1000?(n/1000).toFixed(1)+'K':String(n||0);
const ago  = ts => { const s=Math.floor((Date.now()-new Date(ts))/1000); if(s<60)return'just now'; if(s<3600)return Math.floor(s/60)+'m ago'; if(s<86400)return Math.floor(s/3600)+'h ago'; return Math.floor(s/86400)+'d ago'; };
const ini  = n => n?n.charAt(0).toUpperCase():'?';
const GRAD = [
  'linear-gradient(135deg,#60A5FA,#2563EB)',
  'linear-gradient(135deg,#F9A8D4,#EC4899)',
  'linear-gradient(135deg,#86EFAC,#22C55E)',
  'linear-gradient(135deg,#FDE68A,#F59E0B)',
  'linear-gradient(135deg,#C4B5FD,#7C3AED)',
  'linear-gradient(135deg,#FCA5A5,#EF4444)',
  'linear-gradient(135deg,#6EE7B7,#059669)',
];

// ── TOAST ─────────────────────────────────────
function Toast({msg}){
  if(!msg)return null;
  return(
    <div style={{position:'fixed',top:20,left:'50%',transform:'translateX(-50%)',
      background:'#1e293b',color:'white',padding:'9px 20px',borderRadius:22,
      fontSize:12.5,zIndex:9999,whiteSpace:'nowrap',pointerEvents:'none',
      boxShadow:'0 4px 16px rgba(0,0,0,.25)',animation:'fadein .2s ease'}}>
      {msg}
    </div>
  );
}

// ── AVATAR ────────────────────────────────────
function Avatar({profile,size=40,idx=0}){
  return(
    <div style={{width:size,height:size,borderRadius:'50%',background:GRAD[idx%GRAD.length],
      display:'flex',alignItems:'center',justifyContent:'center',
      fontSize:size*0.35,fontWeight:700,color:'white',overflow:'hidden',flexShrink:0}}>
      {profile?.avatar_url
        ?<img src={profile.avatar_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'50%'}}/>
        :ini(profile?.full_name||profile?.username)}
    </div>
  );
}

// ── ADD STORY SHEET ───────────────────────────
// Opens when user taps "+ Your Story"
function AddStorySheet({user,onClose,onAdded,showToast}){
  const[caption,setCaption]=useState('');
  const[image,setImage]=useState(null);
  const[preview,setPreview]=useState(null);
  const[saving,setSaving]=useState(false);
  const fileRef=useRef(null);

  const pickImg=e=>{
    const f=e.target.files[0]; if(!f)return;
    setImage(f); setPreview(URL.createObjectURL(f));
  };

  const submit=async()=>{
    if(!caption.trim()&&!image){showToast('Please add a caption or photo');return;}
    setSaving(true);
    let imageUrl='';
    if(image){
      const ext=image.name.split('.').pop();
      const path=`stories/${user.id}_${Date.now()}.${ext}`;
      const{error:upErr}=await supabase.storage.from('posts').upload(path,image);
      if(!upErr){
        const{data:{publicUrl}}=supabase.storage.from('posts').getPublicUrl(path);
        imageUrl=publicUrl;
      }
    }
    const{data,error}=await supabase.from('stories').insert({
      user_id:user.id, caption:caption.trim(), image_url:imageUrl
    }).select('*,profiles(full_name,username,avatar_url)').single();
    if(!error&&data){
      onAdded(data);
      showToast('✨ Story added! Visible for 24 hours');
    } else {
      showToast('❌ Could not add story');
    }
    setSaving(false); onClose();
  };

  return(
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{
      position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:400,
      display:'flex',alignItems:'flex-end',justifyContent:'center'}}>
      <div style={{background:'white',borderRadius:'22px 22px 0 0',width:'100%',maxWidth:480,
        padding:20,animation:'slideup .28s ease'}}>
        <div style={{width:38,height:4,background:'#e2e8f0',borderRadius:2,margin:'0 auto 16px'}}/>
        <div style={{fontSize:16,fontWeight:700,color:G.dark,marginBottom:14}}>📸 Add Your Story</div>
        <p style={{fontSize:12,color:G.gray,marginBottom:14}}>
          Your story will be visible to everyone for <strong>24 hours</strong>, then disappear automatically.
        </p>

        {/* Caption input */}
        <textarea value={caption} onChange={e=>setCaption(e.target.value)}
          placeholder="What's your story? Write something... ✨"
          style={{width:'100%',minHeight:80,border:'1.5px solid #BFDBFE',borderRadius:14,
            padding:'10px 14px',fontSize:13,outline:'none',resize:'none',
            fontFamily:'inherit',color:G.dark,marginBottom:12}}/>

        {/* Image preview */}
        {preview&&(
          <div style={{position:'relative',marginBottom:12}}>
            <img src={preview} alt="" style={{width:'100%',maxHeight:200,objectFit:'cover',borderRadius:12}}/>
            <button onClick={()=>{setImage(null);setPreview(null);}} style={{
              position:'absolute',top:6,right:6,background:'rgba(0,0,0,.5)',color:'white',
              border:'none',borderRadius:'50%',width:26,height:26,cursor:'pointer',fontSize:12}}>✕</button>
          </div>
        )}

        {/* Add photo button */}
        <button onClick={()=>fileRef.current.click()} style={{
          width:'100%',padding:'11px',background:'#EFF6FF',
          border:'1.5px dashed #BFDBFE',borderRadius:12,
          color:G.blue,fontSize:13,fontWeight:600,cursor:'pointer',
          fontFamily:'inherit',marginBottom:12}}>
          📷 {image?'Change Photo':'Add Photo (optional)'}
        </button>
        <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={pickImg}/>

        {/* Post button */}
        <button onClick={submit} disabled={saving||(!caption.trim()&&!image)} style={{
          width:'100%',padding:'13px',
          background:caption.trim()||image?'linear-gradient(135deg,#60A5FA,#2563EB)':'#e2e8f0',
          color:caption.trim()||image?'white':'#9CA3AF',
          border:'none',borderRadius:14,fontSize:14,fontWeight:700,
          cursor:caption.trim()||image?'pointer':'default',fontFamily:'inherit'}}>
          {saving?'⏳ Posting...':'✨ Share Story'}
        </button>
      </div>
    </div>
  );
}

// ── STORY VIEWER ──────────────────────────────
function StoryViewer({story,onClose}){
  const[prog,setProg]=useState(0);
  useEffect(()=>{
    setProg(0);
    const t=setTimeout(onClose,5000);
    const iv=setInterval(()=>setProg(p=>Math.min(p+2,100)),100);
    return()=>{clearTimeout(t);clearInterval(iv);};
  },[story]);
  if(!story)return null;
  const name=story.profiles?.full_name||story.profiles?.username||'User';
  return(
    <div style={{position:'fixed',inset:0,background:'black',zIndex:500,display:'flex',flexDirection:'column'}}>
      <div style={{display:'flex',gap:4,padding:'48px 14px 6px'}}>
        <div style={{flex:1,height:2.5,background:'rgba(255,255,255,.3)',borderRadius:2,overflow:'hidden'}}>
          <div style={{height:'100%',background:'white',width:prog+'%',transition:'width .1s linear'}}/>
        </div>
      </div>
      <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',
        background:story.image_url?'black':'linear-gradient(180deg,#1e3a8a,#2563eb,#60a5fa)',
        position:'relative',overflow:'hidden'}}>
        {story.image_url&&(
          <img src={story.image_url} alt="" style={{position:'absolute',inset:0,
            width:'100%',height:'100%',objectFit:'cover',opacity:.85}}/>
        )}
        {/* User info */}
        <div style={{position:'absolute',top:12,left:14,display:'flex',alignItems:'center',gap:9,zIndex:2}}>
          <Avatar profile={story.profiles} size={38} idx={0}/>
          <div>
            <div style={{color:'white',fontWeight:700,fontSize:13}}>{name}</div>
            <div style={{color:'rgba(255,255,255,.7)',fontSize:10}}>{ago(story.created_at)}</div>
          </div>
        </div>
        {/* Close */}
        <div onClick={onClose} style={{position:'absolute',top:12,right:14,color:'white',
          fontSize:24,cursor:'pointer',zIndex:2}}>✕</div>
        {/* Caption */}
        {story.caption&&(
          <div style={{position:'absolute',bottom:90,left:'50%',transform:'translateX(-50%)',
            color:'white',fontSize:16,fontWeight:700,textAlign:'center',
            width:'85%',textShadow:'0 2px 8px rgba(0,0,0,.6)',zIndex:2,
            background:'rgba(0,0,0,.3)',borderRadius:12,padding:'10px 14px'}}>
            {story.caption}
          </div>
        )}
        {!story.image_url&&(
          <div style={{fontSize:70,animation:'floaty 3s ease-in-out infinite',zIndex:2}}>✨</div>
        )}
      </div>
      {/* Reply bar */}
      <div style={{padding:'10px 14px 30px',display:'flex',gap:9,background:'rgba(0,0,0,.8)'}}>
        <input placeholder={`Reply to ${name}...`}
          style={{flex:1,background:'rgba(255,255,255,.1)',border:'1px solid rgba(255,255,255,.3)',
            color:'white',borderRadius:22,padding:'9px 14px',fontSize:12.5,outline:'none'}}/>
        <span style={{color:'white',fontSize:22,cursor:'pointer',alignSelf:'center'}}>➤</span>
      </div>
    </div>
  );
}

// ── COMMENTS SHEET ────────────────────────────
function CommentsSheet({postId,user,onClose}){
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
    if(!text.trim()||sending)return;
    setSending(true);
    const{data,error}=await supabase.from('comments')
      .insert({post_id:postId,user_id:user.id,content:text.trim()})
      .select('*,profiles(full_name,username,avatar_url)').single();
    if(!error&&data)setComments(c=>[...c,data]);
    setText('');setSending(false);
  };
  return(
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{
      position:'fixed',inset:0,background:'rgba(0,0,0,.45)',zIndex:300,
      display:'flex',alignItems:'flex-end',justifyContent:'center'}}>
      <div style={{background:'white',borderRadius:'22px 22px 0 0',width:'100%',maxWidth:480,
        padding:18,maxHeight:'75vh',overflowY:'auto',animation:'slideup .28s ease'}}>
        <div style={{width:38,height:4,background:'#e2e8f0',borderRadius:2,margin:'0 auto 14px'}}/>
        <div style={{fontSize:15,fontWeight:700,color:G.dark,marginBottom:14}}>💬 Comments</div>
        {comments.length===0&&(
          <div style={{textAlign:'center',color:G.gray,padding:'20px 0',fontSize:13}}>
            No comments yet. Be the first! 👇
          </div>
        )}
        {comments.map((c,i)=>(
          <div key={c.id||i} style={{display:'flex',gap:9,padding:'8px 0',borderBottom:'1px solid #f1f5f9'}}>
            <Avatar profile={c.profiles} size={34} idx={i}/>
            <div style={{flex:1}}>
              <div style={{fontSize:11,fontWeight:700,color:G.dark}}>
                {c.profiles?.full_name||c.profiles?.username||'User'}</div>
              <div style={{fontSize:12.5,color:'#475569',marginTop:2}}>{c.content}</div>
            </div>
          </div>
        ))}
        <div style={{display:'flex',gap:8,alignItems:'center',marginTop:10}}>
          <input value={text} onChange={e=>setText(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&send()} placeholder="Add a comment..."
            style={{flex:1,border:'1.5px solid #BFDBFE',borderRadius:18,
              padding:'9px 14px',fontSize:12.5,outline:'none',fontFamily:'inherit'}}/>
          <button onClick={send} disabled={sending} style={{width:36,height:36,
            background:G.blue,border:'none',borderRadius:'50%',color:'white',
            fontSize:15,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>➤</button>
        </div>
      </div>
    </div>
  );
}

// ── MESSAGES SCREEN (persistent — saved to Supabase) ──────────
function MessagesScreen({onClose,currentUser,allUsers,showToast}){
  // Buddy AI is always first contact (bot — messages stored in state only, not DB)
  // Real users — messages saved to direct_messages table
  const buddyBot={id:'buddy',name:'Buddy AI',isBot:true,status:'Online',verified:true};

  const contacts=[buddyBot,...(allUsers||[])];
  const[active,setActive]=useState('buddy');
  const[messages,setMessages]=useState([]); // messages for current contact
  const[botMsgs,setBotMsgs]=useState([     // Buddy AI messages (state only)
    {id:'b1',sender_id:'buddy',content:"Hello! 👋 How's it going?",created_at:new Date(Date.now()-60000).toISOString()},
  ]);
  const[inputVal,setInputVal]=useState('');
  const[typing,setTyping]=useState(false);
  const[loading,setLoading]=useState(false);
  const msgsRef=useRef(null);
  const subRef=useRef(null);

  const ac=contacts.find(c=>c.id===active)||buddyBot;

  // Scroll to bottom whenever messages change
  const scrollBottom=useCallback(()=>{
    setTimeout(()=>{ if(msgsRef.current) msgsRef.current.scrollTop=msgsRef.current.scrollHeight; },60);
  },[]);

  useEffect(()=>{ scrollBottom(); },[messages,botMsgs,typing]);

  // Load messages from Supabase when switching to a real user
  useEffect(()=>{
    if(active==='buddy'){
      // Unsubscribe previous realtime
      if(subRef.current){ subRef.current.unsubscribe(); subRef.current=null; }
      return;
    }
    const loadMessages=async()=>{
      setLoading(true);
      // Load conversation history between me and this user
      const{data}=await supabase.from('direct_messages')
        .select('*')
        .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${active}),and(sender_id.eq.${active},receiver_id.eq.${currentUser.id})`)
        .order('created_at',{ascending:true});
      setMessages(data||[]);
      setLoading(false);
    };
    loadMessages();

    // Subscribe to new real-time messages for this conversation
    if(subRef.current){ subRef.current.unsubscribe(); }
    const channel=supabase.channel(`dm_${currentUser.id}_${active}`)
      .on('postgres_changes',{
        event:'INSERT',schema:'public',table:'direct_messages',
        filter:`receiver_id=eq.${currentUser.id}`
      },(payload)=>{
        // Only add if it's from current active contact
        if(payload.new.sender_id===active){
          setMessages(m=>[...m,payload.new]);
        }
      }).subscribe();
    subRef.current=channel;

    return()=>{ if(subRef.current){ subRef.current.unsubscribe(); subRef.current=null; } };
  },[active,currentUser.id]);

  const sendMsg=async()=>{
    if(!inputVal.trim())return;
    const txt=inputVal.trim();
    setInputVal('');

    if(active==='buddy'){
      // Bot — just store in state
      setBotMsgs(m=>[...m,{id:'u'+Date.now(),sender_id:currentUser.id,content:txt,created_at:new Date().toISOString()}]);
      setTyping(true);
      const pool=["That's great! 😊 How can I help?","Awesome! I'm always here 🤖💙",
        "Interesting! Want me to search? 🔍","Tell me more! 😊","Great idea! 🚀",
        "I'm here for you buddy! 💙","Let me think about that... 🤔"];
      setTimeout(()=>{
        setBotMsgs(m=>[...m,{id:'b'+Date.now(),sender_id:'buddy',
          content:pool[Math.floor(Math.random()*pool.length)],created_at:new Date().toISOString()}]);
        setTyping(false);
      },1000+Math.random()*800);
    } else {
      // Real user — save to Supabase direct_messages table
      const newMsg={sender_id:currentUser.id,receiver_id:active,content:txt};
      const{data,error}=await supabase.from('direct_messages').insert(newMsg).select().single();
      if(!error&&data){
        setMessages(m=>[...m,data]);
      } else {
        showToast('❌ Message not sent. Try again.');
      }
    }
  };

  // Decide which messages to show
  const displayMsgs=active==='buddy'?botMsgs:messages;
  const isMe=id=>id===currentUser.id;

  return(
    <div style={{position:'fixed',inset:0,zIndex:200,background:G.bg,display:'flex',
      flexDirection:'column',fontFamily:"'Segoe UI',-apple-system,sans-serif"}}>

      {/* Blue top bar */}
      <div style={{flexShrink:0,background:'linear-gradient(135deg,#2563EB,#1D4ED8)',
        padding:'48px 16px 12px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <span style={{fontSize:22,cursor:'pointer',color:'white'}} onClick={onClose}>←</span>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <div style={{width:30,height:30,background:'white',borderRadius:'50%',
            display:'flex',alignItems:'center',justifyContent:'center',fontSize:16}}>🤖</div>
          <span style={{fontSize:17,fontWeight:800,color:'white'}}>Messages</span>
        </div>
        <div style={{width:30}}/>
      </div>

      {/* Body */}
      <div style={{flex:1,display:'flex',overflow:'hidden'}}>

        {/* LEFT — contacts sidebar */}
        <div style={{width:108,flexShrink:0,background:'white',
          borderRight:'1px solid #e8f0fe',overflowY:'auto',scrollbarWidth:'none'}}>

          {/* Buddy AI */}
          <div onClick={()=>setActive('buddy')} style={{
            display:'flex',flexDirection:'column',alignItems:'center',gap:5,
            padding:'12px 6px',cursor:'pointer',borderBottom:'1px solid #f1f5f9',
            background:active==='buddy'?'#EFF6FF':'white',
            borderLeft:active==='buddy'?'3px solid #2563EB':'3px solid transparent'}}>
            <div style={{position:'relative'}}>
              <div style={{width:48,height:48,borderRadius:'50%',
                background:'linear-gradient(135deg,#60A5FA,#2563EB)',
                display:'flex',alignItems:'center',justifyContent:'center',fontSize:24}}>🤖</div>
              <div style={{position:'absolute',bottom:1,right:1,width:13,height:13,
                background:'#22C55E',borderRadius:'50%',border:'2px solid white'}}/>
            </div>
            <div style={{fontSize:10.5,fontWeight:600,color:G.dark}}>Buddy AI</div>
            <div style={{fontSize:9,color:'#22C55E'}}>Online</div>
          </div>

          {/* Real users */}
          {(allUsers||[]).map((u,i)=>(
            <div key={u.id} onClick={()=>setActive(u.id)} style={{
              display:'flex',flexDirection:'column',alignItems:'center',gap:5,
              padding:'12px 6px',cursor:'pointer',borderBottom:'1px solid #f1f5f9',
              background:active===u.id?'#EFF6FF':'white',
              borderLeft:active===u.id?'3px solid #2563EB':'3px solid transparent'}}>
              <div style={{position:'relative'}}>
                <Avatar profile={u} size={48} idx={i+1}/>
                <div style={{position:'absolute',bottom:1,right:1,width:13,height:13,
                  background:i%2===0?'#22C55E':'#9CA3AF',
                  borderRadius:'50%',border:'2px solid white'}}/>
              </div>
              <div style={{fontSize:10,fontWeight:600,color:G.dark,textAlign:'center',
                maxWidth:90,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                {u.full_name||u.username||'User'}</div>
            </div>
          ))}

          {(allUsers||[]).length===0&&(
            <div style={{padding:'14px 8px',textAlign:'center',fontSize:10,color:G.gray,lineHeight:1.6}}>
              No friends yet 😊<br/>Share your app!
            </div>
          )}
        </div>

        {/* RIGHT — chat panel */}
        <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',background:'#EFF6FF'}}>

          {/* Chat header */}
          <div style={{flexShrink:0,background:'white',padding:'10px 14px',
            display:'flex',alignItems:'center',justifyContent:'space-between',
            borderBottom:'1px solid #e8f0fe'}}>
            <div style={{display:'flex',alignItems:'center',gap:9}}>
              {active==='buddy'
                ?<div style={{position:'relative'}}>
                    <div style={{width:40,height:40,borderRadius:'50%',
                      background:'linear-gradient(135deg,#60A5FA,#2563EB)',
                      display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>🤖</div>
                    <div style={{position:'absolute',bottom:1,right:1,width:11,height:11,
                      background:'#22C55E',borderRadius:'50%',border:'2px solid white'}}/>
                  </div>
                :<div style={{position:'relative'}}>
                    <Avatar profile={allUsers.find(u=>u.id===active)} size={40}
                      idx={(allUsers.findIndex(u=>u.id===active)+1)}/>
                    <div style={{position:'absolute',bottom:1,right:1,width:11,height:11,
                      background:'#9CA3AF',borderRadius:'50%',border:'2px solid white'}}/>
                  </div>
              }
              <div>
                <div style={{fontSize:14,fontWeight:700,color:G.dark,display:'flex',alignItems:'center',gap:4}}>
                  {active==='buddy'?'Buddy AI':(allUsers.find(u=>u.id===active)?.full_name||'User')}
                  {active==='buddy'&&<span style={{color:G.blue,fontSize:12}}>✔</span>}
                </div>
                <div style={{fontSize:10,color:'#22C55E'}}>
                  {active==='buddy'?'AI Assistant — always here':'Online'}
                </div>
              </div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <div onClick={()=>showToast('📞 Calling...')} style={{width:32,height:32,borderRadius:'50%',
                background:'linear-gradient(135deg,#F9A8D4,#EC4899)',
                display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,cursor:'pointer'}}>📞</div>
              <div onClick={()=>showToast('📹 Video call...')} style={{width:32,height:32,borderRadius:'50%',
                background:'linear-gradient(135deg,#C4B5FD,#7C3AED)',
                display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,cursor:'pointer'}}>📹</div>
            </div>
          </div>

          {/* Messages area */}
          <div ref={msgsRef} style={{flex:1,overflowY:'auto',padding:'12px 10px',
            display:'flex',flexDirection:'column',gap:10,scrollbarWidth:'none'}}>

            {loading&&(
              <div style={{textAlign:'center',color:G.gray,fontSize:12,padding:20}}>
                Loading messages...
              </div>
            )}

            {!loading&&displayMsgs.length===0&&active!=='buddy'&&(
              <div style={{textAlign:'center',color:G.gray,fontSize:12,padding:'30px 20px'}}>
                <div style={{fontSize:36,marginBottom:8}}>👋</div>
                Say hi to {allUsers.find(u=>u.id===active)?.full_name||'your friend'}!
              </div>
            )}

            {displayMsgs.map((m,i)=>{
              const mine=isMe(m.sender_id);
              return(
                <div key={m.id||i} style={{display:'flex',alignItems:'flex-end',gap:7,
                  flexDirection:mine?'row-reverse':'row'}}>
                  {!mine&&(
                    active==='buddy'
                      ?<div style={{width:28,height:28,borderRadius:'50%',
                          background:'linear-gradient(135deg,#60A5FA,#2563EB)',
                          display:'flex',alignItems:'center',justifyContent:'center',
                          fontSize:14,flexShrink:0}}>🤖</div>
                      :<Avatar profile={allUsers.find(u=>u.id===active)} size={28}
                          idx={allUsers.findIndex(u=>u.id===active)+1}/>
                  )}
                  <div style={{maxWidth:'70%',padding:'9px 13px',borderRadius:18,
                    fontSize:12.5,lineHeight:1.5,wordBreak:'break-word',
                    ...(mine
                      ?{background:'linear-gradient(135deg,#3B82F6,#2563EB)',color:'white',
                         borderBottomRightRadius:4,boxShadow:'0 2px 10px rgba(37,99,235,.3)'}
                      :{background:'white',color:G.dark,
                         borderBottomLeftRadius:4,boxShadow:'0 1px 6px rgba(37,99,235,.08)'})}}>
                    {m.content}
                    {mine&&<span style={{fontSize:10,opacity:.75,float:'right',marginLeft:6,marginTop:3}}>✓✓</span>}
                  </div>
                </div>
              );
            })}

            {typing&&(
              <div style={{display:'flex',alignItems:'flex-end',gap:7}}>
                <div style={{width:28,height:28,borderRadius:'50%',
                  background:'linear-gradient(135deg,#60A5FA,#2563EB)',
                  display:'flex',alignItems:'center',justifyContent:'center',fontSize:14}}>🤖</div>
                <div style={{display:'flex',alignItems:'center',gap:4,padding:'8px 12px',
                  background:'white',borderRadius:18,borderBottomLeftRadius:4,
                  boxShadow:'0 1px 6px rgba(37,99,235,.08)'}}>
                  {[0,.2,.4].map((d,i)=>(
                    <div key={i} style={{width:6,height:6,background:'#93c5fd',borderRadius:'50%',
                      animation:`typebounce 1.2s ${d}s infinite`}}/>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Input bar */}
          <div style={{flexShrink:0,background:'white',padding:'10px 12px 20px',
            display:'flex',alignItems:'center',gap:8,borderTop:'1px solid #e8f0fe'}}>
            <div style={{flex:1,display:'flex',alignItems:'center',
              background:'#F1F5FF',borderRadius:22,padding:'8px 12px',gap:6,
              border:'1.5px solid #e8f0fe'}}>
              <input value={inputVal} onChange={e=>setInputVal(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&sendMsg()}
                placeholder={active==='buddy'?'Ask Buddy anything...':'Type a message...'}
                style={{flex:1,border:'none',background:'transparent',
                  fontSize:12.5,color:G.dark,outline:'none',fontFamily:'inherit'}}/>
              <span onClick={()=>{
                const em=['😊','😂','❤️','🔥','👍','😍','🎉','🙏','💯','😎'];
                setInputVal(v=>v+em[Math.floor(Math.random()*em.length)]);
              }} style={{fontSize:17,cursor:'pointer'}}>🙂</span>
            </div>
            {inputVal.trim()
              ?<button onClick={sendMsg} style={{width:36,height:36,borderRadius:'50%',
                  background:'linear-gradient(135deg,#60A5FA,#2563EB)',border:'none',
                  color:'white',fontSize:15,cursor:'pointer',flexShrink:0,
                  display:'flex',alignItems:'center',justifyContent:'center',
                  boxShadow:'0 2px 10px rgba(37,99,235,.35)'}}>➤</button>
              :<div style={{width:36,height:36,borderRadius:'50%',
                  background:'linear-gradient(135deg,#60A5FA,#2563EB)',
                  display:'flex',alignItems:'center',justifyContent:'center',
                  fontSize:16,cursor:'pointer',flexShrink:0,
                  boxShadow:'0 2px 10px rgba(37,99,235,.35)'}}>🎤</div>
            }
          </div>
        </div>
      </div>
    </div>
  );
}

// ── CREATE POST ────────────────────────────────
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
      if(!upErr){const{data:{publicUrl}}=supabase.storage.from('posts').getPublicUrl(path); imageUrl=publicUrl;}
    }
    const{data,error}=await supabase.from('posts')
      .insert({user_id:user.id,content:text.trim(),image_url:imageUrl,likes_count:0,comments_count:0})
      .select('*,profiles(full_name,username,avatar_url)').single();
    if(!error&&data){onPosted(data);showToast('🚀 Post shared!');}
    setPosting(false);onClose();
  };
  return(
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{
      position:'fixed',inset:0,background:'rgba(0,0,0,.45)',zIndex:300,
      display:'flex',alignItems:'flex-end',justifyContent:'center'}}>
      <div style={{background:'white',borderRadius:'22px 22px 0 0',width:'100%',maxWidth:480,
        padding:18,animation:'slideup .28s ease'}}>
        <div style={{width:38,height:4,background:'#e2e8f0',borderRadius:2,margin:'0 auto 14px'}}/>
        <div style={{fontSize:15,fontWeight:700,color:G.dark,marginBottom:14}}>✨ Create Post</div>
        <textarea value={text} onChange={e=>setText(e.target.value)}
          placeholder="What's on your mind? Share with the world! 🌍"
          style={{width:'100%',minHeight:90,border:'1.5px solid #BFDBFE',borderRadius:14,
            padding:'10px 14px',fontSize:13,outline:'none',resize:'none',fontFamily:'inherit',color:G.dark}}/>
        {preview&&(
          <div style={{position:'relative',marginTop:10}}>
            <img src={preview} alt="" style={{width:'100%',maxHeight:200,objectFit:'cover',borderRadius:12}}/>
            <button onClick={()=>{setImage(null);setPreview(null);}} style={{
              position:'absolute',top:6,right:6,background:'rgba(0,0,0,.5)',color:'white',
              border:'none',borderRadius:'50%',width:24,height:24,cursor:'pointer',fontSize:12}}>✕</button>
          </div>
        )}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginTop:14}}>
          {[['📸','Photo',()=>fileRef.current.click()],['🎵','Music',()=>showToast('🎵 Soon')],
            ['🤖','AI Art',()=>showToast('🤖 Soon')],['📰','News',()=>showToast('📰 Soon')]].map(([ic,lb,fn])=>(
            <div key={lb} onClick={fn} style={{background:'#EFF6FF',borderRadius:14,padding:'18px 10px',
              display:'flex',flexDirection:'column',alignItems:'center',gap:7,cursor:'pointer'}}>
              <div style={{fontSize:30}}>{ic}</div>
              <div style={{fontSize:12,fontWeight:600,color:G.dark}}>{lb}</div>
            </div>
          ))}
        </div>
        <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={pickImg}/>
        <button onClick={submit} disabled={!text.trim()||posting} style={{
          width:'100%',marginTop:14,padding:'13px',
          background:text.trim()?'linear-gradient(135deg,#60A5FA,#2563EB)':'#e2e8f0',
          color:text.trim()?'white':'#9CA3AF',border:'none',borderRadius:14,
          fontSize:14,fontWeight:700,cursor:text.trim()?'pointer':'default',fontFamily:'inherit'}}>
          {posting?'⏳ Posting...':'🚀 Share Post'}
        </button>
      </div>
    </div>
  );
}

// ── POST CARD ─────────────────────────────────
function PostCard({post,currentUserId,isLiked,onLike,onComment,onDelete,showToast,idx}){
  const[liked,setLiked]=useState(isLiked);
  const[likeCount,setLikeCount]=useState(post.likes_count||0);
  const handleLike=()=>{const n=!liked;setLiked(n);setLikeCount(c=>n?c+1:c-1);onLike(post.id,n);};
  const isOwn=post.user_id===currentUserId;
  return(
    <div style={{background:'white',margin:'8px 10px',borderRadius:18,overflow:'hidden',
      boxShadow:'0 2px 10px rgba(37,99,235,.07)'}}>
      <div style={{display:'flex',alignItems:'center',padding:'11px 13px 7px',justifyContent:'space-between'}}>
        <div style={{display:'flex',alignItems:'center',gap:9}}>
          <Avatar profile={post.profiles} size={40} idx={idx}/>
          <div>
            <div style={{fontSize:13.5,fontWeight:700,color:G.dark}}>
              {post.profiles?.full_name||post.profiles?.username||'User'}</div>
            <div style={{fontSize:10,color:G.gray,marginTop:1}}>{ago(post.created_at)}</div>
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          {isOwn&&<button onClick={()=>onDelete(post.id)} style={{background:'none',border:'none',
            cursor:'pointer',color:G.red,fontSize:16,padding:4}}>🗑️</button>}
          <div style={{color:G.gray,fontSize:18}}>···</div>
        </div>
      </div>
      {post.content&&(
        <div style={{padding:'3px 13px 9px',fontSize:13,color:G.dark,lineHeight:1.5}}>
          {post.content.split(/(#\w+)/g).map((p,i)=>
            p.startsWith('#')?<span key={i} style={{color:G.blue,fontWeight:600}}>{p}</span>:p)}
        </div>
      )}
      {post.image_url&&(
        <div style={{width:'100%',maxHeight:300,overflow:'hidden'}}>
          <img src={post.image_url} alt="" style={{width:'100%',objectFit:'cover'}}/>
        </div>
      )}
      <div style={{padding:'9px 13px 11px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{display:'flex',gap:14}}>
          <div onClick={handleLike} style={{display:'flex',alignItems:'center',gap:4,
            cursor:'pointer',color:liked?G.red:G.gray,fontSize:12.5}}>
            <span style={{fontSize:19}}>{liked?'❤️':'🤍'}</span><span>{fmtN(likeCount)}</span>
          </div>
          <div onClick={()=>onComment(post.id)} style={{display:'flex',alignItems:'center',gap:4,
            cursor:'pointer',color:G.gray,fontSize:12.5}}>
            <span style={{fontSize:19}}>💬</span><span>{post.comments_count||0}</span>
          </div>
        </div>
        <div style={{display:'flex',gap:10}}>
          <div onClick={()=>showToast('📤 Shared!')} style={{cursor:'pointer',fontSize:19,color:G.gray}}>📤</div>
          <div onClick={()=>showToast('🔖 Saved!')} style={{cursor:'pointer',fontSize:19,color:G.gray}}>🔖</div>
        </div>
      </div>
    </div>
  );
}

// ── FOLLOW SUGGESTIONS ────────────────────────
function FollowSuggestions({users,currentUserId,following,onFollow}){
  const suggestions=users.filter(u=>u.id!==currentUserId&&!following[u.id]);
  if(!suggestions.length)return null;
  return(
    <div style={{padding:'10px 12px',background:G.bg}}>
      <div style={{fontSize:14,fontWeight:700,color:G.dark,marginBottom:10}}>People You May Know</div>
      <div style={{display:'flex',gap:10,overflowX:'auto',scrollbarWidth:'none',paddingBottom:4}}>
        {suggestions.slice(0,6).map((u,i)=>(
          <div key={u.id} style={{background:'white',borderRadius:16,padding:'14px 12px',
            minWidth:115,display:'flex',flexDirection:'column',alignItems:'center',gap:8,
            boxShadow:'0 2px 10px rgba(37,99,235,.08)',flexShrink:0}}>
            <Avatar profile={u} size={54} idx={i+1}/>
            <div style={{fontSize:13,fontWeight:700,color:G.dark,textAlign:'center',
              maxWidth:100,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
              {u.full_name||u.username||'User'}</div>
            <div style={{fontSize:11,color:G.gray}}>{u.username?'@'+u.username:''}</div>
            <button onClick={()=>onFollow(u.id)} style={{
              background:following[u.id]?G.lightBlue:G.blue,
              color:following[u.id]?G.blue:'white',
              border:following[u.id]?`1.5px solid ${G.sky}`:'none',
              borderRadius:20,padding:'6px 0',fontSize:12,fontWeight:700,
              cursor:'pointer',width:'100%',fontFamily:'inherit'}}>
              {following[u.id]?'Following ✓':'Follow'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── REEL CARD ─────────────────────────────────
function ReelCard({showToast}){
  const[liked,setLiked]=useState(false);
  const[cnt,setCnt]=useState(186200);
  return(
    <div style={{background:'white',margin:'8px 10px',borderRadius:18,overflow:'hidden',
      boxShadow:'0 2px 10px rgba(37,99,235,.07)'}}>
      <div style={{display:'flex',alignItems:'center',padding:'11px 13px 7px',justifyContent:'space-between'}}>
        <div style={{display:'flex',alignItems:'center',gap:9}}>
          <div style={{width:40,height:40,borderRadius:'50%',
            background:'linear-gradient(135deg,#60A5FA,#2563EB)',
            display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>🤖</div>
          <div>
            <div style={{fontSize:13.5,fontWeight:700,color:G.dark}}>
              Buddy <span style={{color:G.blue,fontSize:12}}>✔️</span></div>
            <div style={{fontSize:10,color:G.gray}}>2h ago</div>
          </div>
        </div>
        <div style={{color:G.gray,fontSize:18}}>···</div>
      </div>
      <div style={{padding:'3px 13px 9px',fontSize:13,color:G.dark,lineHeight:1.5}}>
        Motivational video just for you! 🚀 Let's make today amazing! 💙<br/>
        <span style={{color:G.blue,fontWeight:600}}>#Inspiration #Motivation #AI</span>
      </div>
      <div style={{position:'relative',width:'100%',height:300,overflow:'hidden',
        display:'flex',alignItems:'center',justifyContent:'center',
        background:'linear-gradient(180deg,#e0f0ff,#b3d4ff 40%,#7eb8ff)'}}>
        <div style={{position:'absolute',top:16,right:16,zIndex:3,background:'white',
          borderRadius:'18px 18px 18px 4px',padding:'9px 14px',
          fontSize:15,fontWeight:700,color:G.blue,
          boxShadow:'0 4px 14px rgba(37,99,235,.18)'}}>You can do it!</div>
        <div style={{position:'relative',zIndex:2,fontSize:80,animation:'floaty 3s ease-in-out infinite'}}>🤖</div>
        <div style={{position:'absolute',right:11,bottom:65,zIndex:4,
          display:'flex',flexDirection:'column',gap:14,alignItems:'center'}}>
          {[[liked?'❤️':'🤍',fmtN(cnt),()=>{setLiked(l=>!l);setCnt(c=>liked?c-1:c+1);}],
            ['💬','5.3K',()=>showToast('💬 Comments')],
            ['🔗','Share',()=>showToast('🔗 Copied!')],
            ['🔖','13.1K',()=>showToast('🔖 Saved!')]].map(([ic,lb,fn],i)=>(
            <div key={i} onClick={fn} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:2,cursor:'pointer'}}>
              <div style={{width:40,height:40,borderRadius:'50%',
                background:'rgba(255,255,255,.22)',backdropFilter:'blur(4px)',
                display:'flex',alignItems:'center',justifyContent:'center',fontSize:19}}>{ic}</div>
              <span style={{fontSize:10,color:'white',fontWeight:600,textShadow:'0 1px 3px rgba(0,0,0,.5)'}}>{lb}</span>
            </div>
          ))}
        </div>
        <div onClick={()=>showToast('▶️ Playing...')} style={{
          position:'absolute',bottom:18,left:'50%',transform:'translateX(-50%)',
          width:48,height:48,background:'rgba(37,99,235,.85)',borderRadius:'50%',
          display:'flex',alignItems:'center',justifyContent:'center',
          fontSize:20,color:'white',zIndex:4,cursor:'pointer',
          boxShadow:'0 4px 18px rgba(37,99,235,.5)'}}>▶</div>
        <div style={{position:'absolute',bottom:0,left:0,right:0,height:3,zIndex:4,
          background:'linear-gradient(90deg,transparent,#60A5FA,#2563EB,transparent)'}}/>
      </div>
      <div style={{padding:'9px 13px 11px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{display:'flex',gap:14}}>
          <div onClick={()=>{setLiked(l=>!l);setCnt(c=>liked?c-1:c+1);}}
            style={{display:'flex',alignItems:'center',gap:4,cursor:'pointer',
              color:liked?G.red:G.gray,fontSize:12.5}}>
            <span style={{fontSize:19}}>{liked?'❤️':'🤍'}</span>{fmtN(cnt)}
          </div>
          <div onClick={()=>showToast('💬')}
            style={{display:'flex',alignItems:'center',gap:4,cursor:'pointer',color:G.gray,fontSize:12.5}}>
            <span style={{fontSize:19}}>💬</span>5.3K
          </div>
        </div>
        <div style={{display:'flex',gap:10}}>
          <div onClick={()=>showToast('📤 Shared!')} style={{cursor:'pointer',fontSize:19,color:G.gray}}>📤</div>
          <div onClick={()=>showToast('🔖 Saved!')} style={{cursor:'pointer',fontSize:19,color:G.gray}}>🔖</div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════
// MAIN FEED
// ════════════════════════════════════════════
export default function Feed(){
  const navigate=useNavigate();
  const[user,setUser]=useState(null);
  const[profile,setProfile]=useState(null);
  const[posts,setPosts]=useState([]);
  const[allUsers,setAllUsers]=useState([]);
  const[stories,setStories]=useState([]); // REAL stories from DB only
  const[loading,setLoading]=useState(true);
  const[likedPosts,setLikedPosts]=useState({});
  const[following,setFollowing]=useState({});

  // UI state
  const[activeNav,setActiveNav]=useState('home');
  const[showMessages,setShowMessages]=useState(false);
  const[showCreate,setShowCreate]=useState(false);
  const[showAddStory,setShowAddStory]=useState(false);
  const[activeStory,setActiveStory]=useState(null);
  const[commentPostId,setCommentPostId]=useState(null);
  const[toast,setToast]=useState('');

  const showToast=msg=>{setToast(msg);setTimeout(()=>setToast(''),2400);};

  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{
      if(!session){navigate('/login');return;}
      setUser(session.user);
      loadAll(session.user.id);
    });
  },[navigate]);

  const loadAll=async uid=>{
    setLoading(true);

    // My profile
    const{data:prof}=await supabase.from('profiles').select('*').eq('id',uid).single();
    if(prof)setProfile(prof);

    // Other real users
    const{data:users}=await supabase.from('profiles')
      .select('id,full_name,username,avatar_url').neq('id',uid).limit(20);
    if(users)setAllUsers(users);

    // Posts
    const{data:postsData}=await supabase.from('posts')
      .select('*,profiles(full_name,username,avatar_url)')
      .order('created_at',{ascending:false}).limit(50);
    if(postsData)setPosts(postsData);

    // My likes
    const{data:lk}=await supabase.from('likes').select('post_id').eq('user_id',uid);
    if(lk){const lm={};lk.forEach(l=>{lm[l.post_id]=true;});setLikedPosts(lm);}

    // Who I follow
    const{data:fol}=await supabase.from('follows').select('following_id').eq('follower_id',uid);
    if(fol){const fm={};fol.forEach(f=>{fm[f.following_id]=true;});setFollowing(fm);}

    // Load REAL stories only (not expired, posted in last 24 hours)
    const{data:storiesData}=await supabase.from('stories')
      .select('*,profiles(full_name,username,avatar_url)')
      .gt('expires_at',new Date().toISOString())  // only stories not yet expired
      .order('created_at',{ascending:false});
    if(storiesData)setStories(storiesData);

    setLoading(false);
  };

  const handleLike=async(postId,nowLiked)=>{
    setLikedPosts(l=>({...l,[postId]:nowLiked}));
    if(nowLiked) await supabase.from('likes').insert({post_id:postId,user_id:user.id});
    else await supabase.from('likes').delete().eq('post_id',postId).eq('user_id',user.id);
  };

  const handleDelete=async postId=>{
    if(!window.confirm('Delete this post?'))return;
    await supabase.from('likes').delete().eq('post_id',postId);
    await supabase.from('comments').delete().eq('post_id',postId);
    await supabase.from('posts').delete().eq('id',postId).eq('user_id',user.id);
    setPosts(p=>p.filter(x=>x.id!==postId));
    showToast('🗑️ Post deleted');
  };

  const handleFollow=async personId=>{
    const nowFollowing=!following[personId];
    setFollowing(f=>({...f,[personId]:nowFollowing}));
    if(nowFollowing){
      await supabase.from('follows').insert({follower_id:user.id,following_id:personId});
      showToast('✅ Following!');
    } else {
      await supabase.from('follows').delete().eq('follower_id',user.id).eq('following_id',personId);
      showToast('Unfollowed');
    }
  };

  const navItems=[
    {id:'home',    icon:'🏠', label:'Home'},
    {id:'friends', icon:'👥', label:'Friends'},
    {id:'create',  icon:'+',  isPlus:true},
    {id:'messages',icon:'💬', label:'Messages'},
    {id:'profile', icon:'👤', label:'Profile'},
  ];

  const handleNav=id=>{
    if(id==='messages'){setShowMessages(true);setActiveNav('messages');return;}
    if(id==='profile'){navigate('/profile');return;}
    if(id==='create'){setShowCreate(true);return;}
    if(id==='friends'){showToast('👥 Friends feature coming soon!');return;}
    setActiveNav(id);
  };

  // Check if current user already has an active story
  const myStory=stories.find(s=>s.user_id===user?.id);

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

      {/* Overlays */}
      {activeStory&&<StoryViewer story={activeStory} onClose={()=>setActiveStory(null)}/>}
      {commentPostId&&user&&<CommentsSheet postId={commentPostId} user={user} onClose={()=>setCommentPostId(null)}/>}
      {showCreate&&user&&<CreateSheet user={user} showToast={showToast}
        onClose={()=>setShowCreate(false)} onPosted={p=>setPosts(prev=>[p,...prev])}/>}
      {showAddStory&&user&&<AddStorySheet user={user} showToast={showToast}
        onClose={()=>setShowAddStory(false)}
        onAdded={s=>setStories(prev=>[s,...prev])}/>}
      {showMessages&&<MessagesScreen currentUser={user} allUsers={allUsers}
        showToast={showToast} onClose={()=>{setShowMessages(false);setActiveNav('home');}}/>}

      <div style={{width:'100%',minHeight:'100dvh',background:G.bg,display:'flex',
        flexDirection:'column',fontFamily:"'Segoe UI',-apple-system,sans-serif",
        maxWidth:480,margin:'0 auto',position:'relative'}}>

        {/* TOP BAR */}
        <div style={{position:'sticky',top:0,zIndex:100,background:'white',
          padding:'14px 18px 10px',display:'flex',alignItems:'center',
          justifyContent:'space-between',borderBottom:'1px solid #e8f0fe',
          boxShadow:'0 1px 8px rgba(37,99,235,.06)'}}>
          <span style={{fontSize:21,color:G.gray,cursor:'pointer'}}
            onClick={()=>showToast('🔍 Search coming soon!')}>🔍</span>
          <div style={{textAlign:'center'}}>
            <div style={{display:'flex',alignItems:'center',gap:7,fontSize:18,fontWeight:800,
              color:G.dark,justifyContent:'center'}}>
              <div style={{width:32,height:32,background:'linear-gradient(135deg,#60A5FA,#2563EB)',
                borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16}}>🤖</div>
              Buddy AI
            </div>
            <div style={{fontSize:9,color:G.gray}}>Your AI Social Community</div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <div style={{position:'relative',cursor:'pointer'}}
              onClick={()=>showToast('🔔 Notifications coming soon!')}>
              <span style={{fontSize:21}}>🔔</span>
              <div style={{position:'absolute',top:-4,right:-4,background:G.red,color:'white',
                fontSize:8,width:14,height:14,borderRadius:'50%',
                display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700}}>3</div>
            </div>
            <div onClick={()=>navigate('/profile')} style={{width:30,height:30,borderRadius:'50%',
              overflow:'hidden',cursor:'pointer',
              background:'linear-gradient(135deg,#93C5FD,#1D4ED8)',
              display:'flex',alignItems:'center',justifyContent:'center',
              color:'white',fontSize:13,fontWeight:700}}>
              {profile?.avatar_url
                ?<img src={profile.avatar_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                :ini(profile?.full_name||user?.email||'C')}
            </div>
          </div>
        </div>

        {/* SCROLL AREA */}
        <div className="ns" style={{flex:1,overflowY:'auto',overflowX:'hidden',
          WebkitOverflowScrolling:'touch',paddingBottom:80}}>

          {/* ── STORIES ROW ── */}
          <div style={{background:'white',padding:'10px 0 12px',borderBottom:'1px solid #e8f0fe'}}>
            <div className="ns" style={{display:'flex',gap:12,overflowX:'auto',
              padding:'0 14px',WebkitOverflowScrolling:'touch'}}>

              {/* Always show "Your Story" button */}
              <div onClick={()=>myStory?setActiveStory(myStory):setShowAddStory(true)}
                style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4,cursor:'pointer',flexShrink:0}}>
                <div style={{width:62,height:62,borderRadius:'50%',
                  background:'#e2e8f0',padding:2.5,position:'relative'}}>
                  <div style={{width:'100%',height:'100%',borderRadius:'50%',
                    background:'white',padding:2,display:'flex',
                    alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
                    {profile?.avatar_url
                      ?<img src={profile.avatar_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'50%'}}/>
                      :<div style={{width:'100%',height:'100%',borderRadius:'50%',
                          background:'linear-gradient(135deg,#93C5FD,#1D4ED8)',
                          display:'flex',alignItems:'center',justifyContent:'center',
                          fontSize:24,color:'white',fontWeight:700}}>
                          {ini(profile?.full_name||user?.email||'Y')}
                        </div>
                    }
                  </div>
                  {/* Show + if no story yet, or green dot if already has story */}
                  <div style={{position:'absolute',bottom:0,right:0,width:18,height:18,
                    background:myStory?'#22C55E':G.blue,
                    borderRadius:'50%',border:'2px solid white',
                    color:'white',fontSize:myStory?10:14,fontWeight:700,
                    display:'flex',alignItems:'center',justifyContent:'center',lineHeight:1}}>
                    {myStory?'✓':'+'}
                  </div>
                </div>
                <span style={{fontSize:10,color:G.dark,fontWeight:500,maxWidth:62,textAlign:'center'}}>
                  {myStory?'Your Story':'Add Story'}
                </span>
              </div>

              {/* Real stories from other users — only if they posted one */}
              {stories.filter(s=>s.user_id!==user?.id).map((s,i)=>(
                <div key={s.id} onClick={()=>setActiveStory(s)}
                  style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4,
                    cursor:'pointer',flexShrink:0}}>
                  <div style={{width:62,height:62,borderRadius:'50%',
                    background:GRAD[(i+1)%GRAD.length],padding:2.5,position:'relative'}}>
                    <div style={{width:'100%',height:'100%',borderRadius:'50%',
                      background:'white',padding:2,display:'flex',
                      alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
                      {s.profiles?.avatar_url
                        ?<img src={s.profiles.avatar_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'50%'}}/>
                        :<div style={{width:'100%',height:'100%',borderRadius:'50%',
                            background:GRAD[(i+1)%GRAD.length],
                            display:'flex',alignItems:'center',justifyContent:'center',
                            fontSize:24,color:'white',fontWeight:700}}>
                            {ini(s.profiles?.full_name||s.profiles?.username)}
                          </div>
                      }
                    </div>
                  </div>
                  <span style={{fontSize:10,color:G.dark,fontWeight:500,maxWidth:62,
                    textAlign:'center',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                    {s.profiles?.full_name||s.profiles?.username||'User'}
                  </span>
                </div>
              ))}

              {/* If no stories at all from others */}
              {stories.filter(s=>s.user_id!==user?.id).length===0&&(
                <div style={{display:'flex',alignItems:'center',color:G.gray,fontSize:11,
                  padding:'8px 4px',flexShrink:0,fontStyle:'italic'}}>
                  No stories yet — be first! ✨
                </div>
              )}
            </div>
          </div>

          {/* REEL */}
          <ReelCard showToast={showToast}/>

          {/* FOLLOW SUGGESTIONS */}
          <FollowSuggestions users={allUsers} currentUserId={user?.id}
            following={following} onFollow={handleFollow}/>

          {/* POSTS */}
          {loading&&(
            <div style={{textAlign:'center',padding:40,color:G.gray,fontSize:13}}>
              <div style={{fontSize:40,marginBottom:10,animation:'floaty 1.5s infinite'}}>🤖</div>
              Loading posts...
            </div>
          )}
          {!loading&&posts.map((post,i)=>(
            <PostCard key={post.id} post={post} idx={i}
              currentUserId={user?.id} isLiked={!!likedPosts[post.id]}
              onLike={handleLike} onComment={setCommentPostId}
              onDelete={handleDelete} showToast={showToast}/>
          ))}
          {!loading&&posts.length===0&&(
            <div style={{textAlign:'center',padding:'40px 20px',color:G.gray}}>
              <div style={{fontSize:50,marginBottom:12}}>📝</div>
              <div style={{fontSize:15,fontWeight:600,color:G.dark,marginBottom:6}}>No posts yet!</div>
              <div style={{fontSize:13}}>Be the first to share something! 🚀</div>
              <button onClick={()=>setShowCreate(true)} style={{marginTop:16,
                background:'linear-gradient(135deg,#60A5FA,#2563EB)',color:'white',
                border:'none',borderRadius:20,padding:'10px 24px',
                fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
                Create First Post</button>
            </div>
          )}
        </div>

        {/* BOTTOM NAV */}
        <div style={{position:'fixed',bottom:0,left:'50%',transform:'translateX(-50%)',
          width:'100%',maxWidth:480,background:'white',borderTop:'1px solid #e8f0fe',
          display:'flex',justifyContent:'space-around',alignItems:'center',
          padding:'8px 0 16px',zIndex:100,boxShadow:'0 -3px 16px rgba(37,99,235,.08)'}}>
          {navItems.map(nav=>(
            nav.isPlus
              ?<div key="plus" onClick={()=>handleNav('create')} style={{
                  width:52,height:52,borderRadius:'50%',
                  background:'linear-gradient(135deg,#60A5FA,#2563EB)',
                  display:'flex',alignItems:'center',justifyContent:'center',
                  fontSize:28,color:'white',cursor:'pointer',marginBottom:6,
                  boxShadow:'0 4px 14px rgba(37,99,235,.4)'}}>+</div>
              :<div key={nav.id} onClick={()=>handleNav(nav.id)} style={{
                  display:'flex',flexDirection:'column',alignItems:'center',gap:2,
                  cursor:'pointer',color:activeNav===nav.id?G.blue:G.gray,
                  fontSize:9.5,padding:'3px 10px',minWidth:50,position:'relative'}}>
                <span style={{fontSize:22}}>{nav.icon}</span>
                <span style={{fontWeight:activeNav===nav.id?700:400}}>{nav.label}</span>
              </div>
          ))}
        </div>
      </div>
    </>
  );
}
