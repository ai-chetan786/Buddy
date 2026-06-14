import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';

/* ============================================================
   BUDDY AI — Feed.js
   Mobile-first, full-screen Android style
   Matches screenshot exactly:
   - Top bar: 🔍  Buddy AI logo  🔔 C
   - Stories row (horizontal scroll)
   - Reel card with floating robot + side actions
   - People You May Know (follow suggestions)
   - Real posts from Supabase
   - Bottom nav: Home | Friends | [+] | Messages | Profile
   - Messages chat slides in as overlay (no separate page)
   ============================================================ */

// ─── HELPERS ─────────────────────────────────────────────────
const fmtN = n => n >= 1e6 ? (n/1e6).toFixed(1)+'M' : n >= 1000 ? (n/1000).toFixed(1)+'K' : String(n);
const ago  = ts => { const s=Math.floor((Date.now()-new Date(ts))/1000); if(s<60)return'just now'; if(s<3600)return Math.floor(s/60)+'m ago'; if(s<86400)return Math.floor(s/3600)+'h ago'; return Math.floor(s/86400)+'d ago'; };
const ini  = name => name ? name.charAt(0).toUpperCase() : '?';

// ─── GLOBAL STYLES ────────────────────────────────────────────
const G = {
  blue:'#2563EB', lightBlue:'#EFF6FF', sky:'#BFDBFE',
  bg:'#F0F4FF', white:'#ffffff', gray:'#9CA3AF',
  dark:'#1E293B', red:'#EF4444'
};

// ─── TOAST ───────────────────────────────────────────────────
function Toast({msg}){
  if(!msg) return null;
  return(
    <div style={{
      position:'fixed',top:20,left:'50%',transform:'translateX(-50%)',
      background:'#1e293b',color:'white',padding:'9px 20px',
      borderRadius:22,fontSize:12.5,zIndex:9999,whiteSpace:'nowrap',
      boxShadow:'0 4px 16px rgba(0,0,0,0.25)',animation:'fadein .2s ease',
      pointerEvents:'none'
    }}>{msg}</div>
  );
}

// ─── STORY VIEWER ─────────────────────────────────────────────
function StoryViewer({story, onClose}){
  const [prog,setProg]=useState(0);
  useEffect(()=>{
    setProg(0);
    const t=setTimeout(onClose,5000);
    const iv=setInterval(()=>setProg(p=>Math.min(p+2,100)),100);
    return()=>{clearTimeout(t);clearInterval(iv);};
  },[story]);
  if(!story)return null;
  return(
    <div style={{position:'fixed',inset:0,background:'black',zIndex:500,display:'flex',flexDirection:'column'}}>
      <div style={{display:'flex',gap:4,padding:'48px 14px 6px'}}>
        <div style={{flex:1,height:2.5,background:'rgba(255,255,255,0.3)',borderRadius:2,overflow:'hidden'}}>
          <div style={{height:'100%',background:'white',width:prog+'%',transition:'width .1s linear'}}/>
        </div>
      </div>
      <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',
        background:'linear-gradient(180deg,#1e3a8a,#2563eb,#60a5fa)',position:'relative'}}>
        <div style={{position:'absolute',top:10,left:14,display:'flex',alignItems:'center',gap:9}}>
          <div style={{width:36,height:36,borderRadius:'50%',background:'rgba(255,255,255,.2)',
            display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>{story.emoji}</div>
          <div>
            <div style={{color:'white',fontWeight:700,fontSize:13}}>{story.name}</div>
            <div style={{color:'rgba(255,255,255,.65)',fontSize:10}}>Just now</div>
          </div>
        </div>
        <div style={{fontSize:80,animation:'floaty 3s ease-in-out infinite'}}>{story.emoji}</div>
        <div onClick={onClose} style={{position:'absolute',top:10,right:14,color:'white',fontSize:24,cursor:'pointer'}}>✕</div>
        <div style={{position:'absolute',bottom:90,left:'50%',transform:'translateX(-50%)',
          color:'white',fontSize:15,fontWeight:700,textAlign:'center',width:'80%',
          textShadow:'0 2px 8px rgba(0,0,0,.5)'}}>{story.caption}</div>
      </div>
      <div style={{padding:'10px 14px 30px',display:'flex',gap:9,background:'black'}}>
        <input placeholder="Reply to story..." style={{flex:1,background:'rgba(255,255,255,.1)',
          border:'1px solid rgba(255,255,255,.3)',color:'white',borderRadius:22,
          padding:'9px 14px',fontSize:12.5,outline:'none'}}/>
        <span style={{color:'white',fontSize:22,cursor:'pointer',alignSelf:'center'}}>➤</span>
      </div>
    </div>
  );
}

// ─── COMMENTS SHEET ───────────────────────────────────────────
function CommentsSheet({postId,user,onClose}){
  const [comments,setComments]=useState([]);
  const [text,setText]=useState('');
  const [sending,setSending]=useState(false);
  useEffect(()=>{
    if(!postId)return;
    supabase.from('comments').select('*,profiles(full_name,avatar_url)')
      .eq('post_id',postId).order('created_at',{ascending:true})
      .then(({data})=>setComments(data||[]));
  },[postId]);
  const send=async()=>{
    if(!text.trim()||sending)return;
    setSending(true);
    const{data,error}=await supabase.from('comments')
      .insert({post_id:postId,user_id:user.id,content:text.trim()})
      .select('*,profiles(full_name,avatar_url)').single();
    if(!error&&data)setComments(c=>[...c,data]);
    setText('');setSending(false);
  };
  const staticC=[
    {id:'s1',emoji:'🤖',name:'Buddy AI',text:'This is amazing! 🚀'},
    {id:'s2',emoji:'👩',name:'Maya',text:'So inspiring!! 💙✨'},
    {id:'s3',emoji:'👦',name:'Akash',text:'Best content today! 🔥'},
  ];
  return(
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{
      position:'fixed',inset:0,background:'rgba(0,0,0,.45)',zIndex:300,
      display:'flex',alignItems:'flex-end',justifyContent:'center'}}>
      <div style={{background:'white',borderRadius:'22px 22px 0 0',width:'100%',maxWidth:480,
        padding:18,maxHeight:'75vh',overflowY:'auto',animation:'slideup .28s ease'}}>
        <div style={{width:38,height:4,background:'#e2e8f0',borderRadius:2,margin:'0 auto 14px'}}/>
        <div style={{fontSize:15,fontWeight:700,color:G.dark,marginBottom:14}}>💬 Comments</div>
        {staticC.map(c=>(
          <div key={c.id} style={{display:'flex',gap:9,padding:'8px 0',borderBottom:'1px solid #f1f5f9'}}>
            <div style={{width:34,height:34,borderRadius:'50%',background:'linear-gradient(135deg,#60A5FA,#2563EB)',
              display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,flexShrink:0}}>{c.emoji}</div>
            <div><div style={{fontSize:11,fontWeight:700,color:G.dark}}>{c.name}</div>
              <div style={{fontSize:12.5,color:'#475569',marginTop:2}}>{c.text}</div></div>
            <div style={{fontSize:17,cursor:'pointer',marginLeft:'auto',alignSelf:'center'}}>🤍</div>
          </div>
        ))}
        {comments.map(c=>(
          <div key={c.id} style={{display:'flex',gap:9,padding:'8px 0',borderBottom:'1px solid #f1f5f9'}}>
            <div style={{width:34,height:34,borderRadius:'50%',background:'linear-gradient(135deg,#93C5FD,#1D4ED8)',
              display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,
              color:'white',flexShrink:0,overflow:'hidden'}}>
              {c.profiles?.avatar_url
                ?<img src={c.profiles.avatar_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'50%'}}/>
                :ini(c.profiles?.full_name)}
            </div>
            <div><div style={{fontSize:11,fontWeight:700,color:G.dark}}>{c.profiles?.full_name||'User'}</div>
              <div style={{fontSize:12.5,color:'#475569',marginTop:2}}>{c.content}</div></div>
          </div>
        ))}
        <div style={{display:'flex',gap:8,alignItems:'center',marginTop:10}}>
          <input value={text} onChange={e=>setText(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&send()}
            placeholder="Add a comment..."
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

// ─── MESSAGES SCREEN (slides in as overlay) ───────────────────
function MessagesScreen({onClose,currentUser,showToast}){
  const contacts=[
    {id:'buddy',  name:'Buddy',  emoji:'🤖',status:'Online', verified:true, bg:'linear-gradient(135deg,#60A5FA,#2563EB)',
      msgs:[{me:false,txt:"Hello! 👋 How's it going?"},{me:true,txt:"Hi Buddy! I'm good. Just chilling at home. 👋"},
            {me:false,txt:"That sounds like fun! 🎉 Want me to find some funny memes?"},{me:true,txt:"Sure, let's see some memes!"},
            {me:false,txt:"I found a good one for you! 😄",meme:true}]},
    {id:'maya',   name:'Maya',   emoji:'👩',status:'Offline',verified:true, bg:'linear-gradient(135deg,#F9A8D4,#EC4899)',
      msgs:[{me:false,txt:"Hey! Check out my new AI artwork 🎨"},{me:true,txt:"Wow Maya! That looks amazing! 😍"},
            {me:false,txt:"Thanks! Been working on it all night 😅"}]},
    {id:'akash',  name:'Akash',  emoji:'👦',status:'Online', verified:false,bg:'linear-gradient(135deg,#86EFAC,#22C55E)',
      msgs:[{me:true,txt:"Bhai, code review kar sakta hai? 💻"},{me:false,txt:"Haan bhai! Send kar link 🔗"},
            {me:false,txt:"Bahut accha code hai! Just fix the null checks 🛠️"}]},
    {id:'priya',  name:'Priya',  emoji:'👧',status:'Away',   verified:true, bg:'linear-gradient(135deg,#FDE68A,#F59E0B)',
      msgs:[{me:false,txt:"New photos uploaded! 📸 Check my profile"},{me:true,txt:"Priya your photography is 🔥🔥"},
            {me:false,txt:"Hehe thank you! 😊 Golden hour hits different"}]},
    {id:'support',name:'Support',emoji:'🛡️',status:'Online', verified:false,bg:'linear-gradient(135deg,#60A5FA,#2563EB)',
      msgs:[{me:false,txt:"Hi! Welcome to Buddy AI Support 🤖 How can we help?"},
            {me:true,txt:"I need help with my account"},
            {me:false,txt:"Sure! Go to Profile → Settings. Let us know if you need more help 😊"}]},
  ];
  const[active,setActive]=useState('buddy');
  const[chatData,setChatData]=useState(()=>{ const d={}; contacts.forEach(c=>{d[c.id]=[...c.msgs];}); return d; });
  const[inputVal,setInputVal]=useState('');
  const[typing,setTyping]=useState(false);
  const msgsRef=useRef(null);
  const ac=contacts.find(c=>c.id===active);

  useEffect(()=>{
    setTimeout(()=>{ if(msgsRef.current) msgsRef.current.scrollTop=msgsRef.current.scrollHeight; },60);
  },[active,chatData]);

  const sendMsg=()=>{
    if(!inputVal.trim())return;
    const txt=inputVal.trim(); setInputVal('');
    setChatData(d=>({...d,[active]:[...d[active],{me:true,txt}]}));
    setTyping(true);
    const pool=active==='buddy'
      ?["That's great! 😊 How can I help?","Awesome! I'm always here 🤖💙","Interesting! Want me to search something? 🔍"]
      :["That's so cool! 😊","Interesting! Tell me more 🤔","Haha! 😂","Love that! ❤️","Great idea! 🚀"];
    setTimeout(()=>{
      const reply=pool[Math.floor(Math.random()*pool.length)];
      setChatData(d=>({...d,[active]:[...d[active],{me:false,txt:reply}]}));
      setTyping(false);
    },1000+Math.random()*800);
  };

  return(
    <div style={{position:'fixed',inset:0,zIndex:200,background:G.bg,display:'flex',flexDirection:'column',
      fontFamily:"'Segoe UI',-apple-system,BlinkMacSystemFont,sans-serif"}}>

      {/* TOP BAR — blue gradient matches screenshot */}
      <div style={{flexShrink:0,background:'linear-gradient(135deg,#2563EB,#1D4ED8)',
        padding:'48px 16px 12px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <span style={{fontSize:22,cursor:'pointer',color:'white'}} onClick={onClose}>←</span>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <div style={{width:30,height:30,background:'white',borderRadius:'50%',
            display:'flex',alignItems:'center',justifyContent:'center',fontSize:16}}>🤖</div>
          <span style={{fontSize:17,fontWeight:800,color:'white'}}>Buddy AI</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{position:'relative',cursor:'pointer'}}>
            <span style={{fontSize:20,color:'white'}}>🔔</span>
            <div style={{position:'absolute',top:-4,right:-4,background:G.red,color:'white',fontSize:8,
              width:14,height:14,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700}}>3</div>
          </div>
          <div style={{width:30,height:30,borderRadius:'50%',background:'linear-gradient(135deg,#93C5FD,#1D4ED8)',
            display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:13,fontWeight:700,
            border:'2px solid rgba(255,255,255,.5)'}}>
            {currentUser?.email?.charAt(0).toUpperCase()||'C'}
          </div>
        </div>
      </div>

      {/* BODY */}
      <div style={{flex:1,display:'flex',overflow:'hidden'}}>

        {/* LEFT SIDEBAR */}
        <div style={{width:110,flexShrink:0,background:'white',borderRight:'1px solid #e8f0fe',overflowY:'auto',scrollbarWidth:'none'}}>
          {contacts.map(c=>(
            <div key={c.id} onClick={()=>setActive(c.id)} style={{
              display:'flex',flexDirection:'column',alignItems:'center',gap:5,
              padding:'14px 6px',cursor:'pointer',borderBottom:'1px solid #f1f5f9',
              background:active===c.id?'#EFF6FF':'white',
              borderLeft:active===c.id?'3px solid #2563EB':'3px solid transparent',
              transition:'background .15s'}}>
              <div style={{width:50,height:50,borderRadius:'50%',background:c.bg,
                display:'flex',alignItems:'center',justifyContent:'center',
                fontSize:24,position:'relative',
                boxShadow:active===c.id?'0 2px 10px rgba(37,99,235,.3)':'none'}}>
                {c.emoji}
                {c.status==='Online'
                  ?<div style={{position:'absolute',bottom:1,right:1,width:13,height:13,
                      background:'#22C55E',borderRadius:'50%',border:'2px solid white'}}/>
                  :<div style={{position:'absolute',bottom:1,right:1,width:14,height:14,
                      background:G.blue,borderRadius:'50%',border:'2px solid white',
                      display:'flex',alignItems:'center',justifyContent:'center',
                      color:'white',fontSize:9,fontWeight:700}}>+</div>
                }
              </div>
              <div style={{fontSize:11,fontWeight:600,color:G.dark,textAlign:'center'}}>{c.name}</div>
              <div style={{fontSize:9,fontWeight:500,color:c.status==='Online'?'#22C55E':G.gray}}>{c.status}</div>
            </div>
          ))}
        </div>

        {/* RIGHT CHAT PANEL */}
        <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',background:'#EFF6FF'}}>

          {/* Chat header */}
          <div style={{flexShrink:0,background:'white',padding:'10px 14px',
            display:'flex',alignItems:'center',justifyContent:'space-between',
            borderBottom:'1px solid #e8f0fe'}}>
            <div style={{display:'flex',alignItems:'center',gap:9}}>
              <div style={{width:40,height:40,borderRadius:'50%',background:ac.bg,
                display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,position:'relative'}}>
                {ac.emoji}
                {ac.status==='Online'&&<div style={{position:'absolute',bottom:1,right:1,width:11,height:11,
                  background:'#22C55E',borderRadius:'50%',border:'2px solid white'}}/>}
              </div>
              <div>
                <div style={{fontSize:14,fontWeight:700,color:G.dark,display:'flex',alignItems:'center',gap:4}}>
                  {ac.name}{ac.verified&&<span style={{color:G.blue,fontSize:12}}>✔</span>}
                </div>
                <div style={{fontSize:10,color:ac.status==='Online'?'#22C55E':G.gray}}>{ac.status}</div>
              </div>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <div style={{width:32,height:32,borderRadius:'50%',
                background:'linear-gradient(135deg,#F9A8D4,#EC4899)',
                display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,cursor:'pointer'}}
                onClick={()=>showToast('📞 Calling...')}>📞</div>
              <div style={{width:32,height:32,borderRadius:'50%',
                background:'linear-gradient(135deg,#C4B5FD,#7C3AED)',
                display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,cursor:'pointer'}}
                onClick={()=>showToast('📹 Video call...')}>📹</div>
              <span style={{fontSize:18,color:G.gray,cursor:'pointer'}}>···</span>
            </div>
          </div>

          {/* Cmine button */}
          <div style={{background:'white',padding:'4px 14px 8px',display:'flex',
            justifyContent:'flex-end',borderBottom:'1px solid #e8f0fe',flexShrink:0}}>
            <button onClick={()=>showToast('⚙️ Cmine settings')} style={{background:'white',
              border:'1.5px solid #BFDBFE',color:G.blue,borderRadius:18,padding:'4px 16px',
              fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Cmine</button>
          </div>

          {/* MESSAGES */}
          <div ref={msgsRef} style={{flex:1,overflowY:'auto',padding:'12px 10px',
            display:'flex',flexDirection:'column',gap:10,scrollbarWidth:'none'}}>

            {(chatData[active]||[]).map((m,i)=>(
              <div key={i} style={{display:'flex',alignItems:'flex-end',gap:7,
                flexDirection:m.me?'row-reverse':'row'}}>
                {!m.me&&(
                  <div style={{width:28,height:28,borderRadius:'50%',background:ac.bg,
                    display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,flexShrink:0}}>
                    {ac.emoji}</div>
                )}
                {m.meme?(
                  <div style={{display:'flex',flexDirection:'column',gap:6,maxWidth:'72%'}}>
                    <div style={{background:'white',padding:'9px 13px',borderRadius:18,
                      borderBottomLeftRadius:4,fontSize:12.5,color:G.dark,
                      boxShadow:'0 1px 6px rgba(37,99,235,.08)'}}>{m.txt}</div>
                    <div style={{background:'linear-gradient(135deg,#dbeafe,#bfdbfe,#93c5fd)',
                      borderRadius:14,overflow:'hidden',maxWidth:210,
                      boxShadow:'0 3px 12px rgba(37,99,235,.2)'}}>
                      <div style={{padding:'10px 10px 6px',fontSize:11,color:'#1e40af',fontWeight:500,lineHeight:1.4}}>
                        When you finish a difficult task or nimole teng you walked into the room:</div>
                      <div style={{display:'flex',alignItems:'center',justifyContent:'center',
                        padding:'12px 8px',fontSize:52,
                        background:'linear-gradient(135deg,#bfdbfe,#93c5fd)',position:'relative'}}>
                        🤖
                        <div style={{position:'absolute',bottom:8,left:10,width:26,height:26,
                          background:'rgba(37,99,235,.85)',borderRadius:'50%',
                          display:'flex',alignItems:'center',justifyContent:'center',
                          color:'white',fontSize:11}}>▶</div>
                      </div>
                      <div style={{background:'rgba(30,58,138,.85)',color:'white',
                        padding:'7px 10px',fontSize:12,fontWeight:700,textAlign:'center'}}>
                        I'm doing my best</div>
                    </div>
                  </div>
                ):(
                  <div style={{maxWidth:'70%',padding:'9px 13px',borderRadius:18,fontSize:12.5,
                    lineHeight:1.5,wordBreak:'break-word',
                    ...(m.me
                      ?{background:'linear-gradient(135deg,#3B82F6,#2563EB)',color:'white',
                         borderBottomRightRadius:4,boxShadow:'0 2px 10px rgba(37,99,235,.3)'}
                      :{background:'white',color:G.dark,
                         borderBottomLeftRadius:4,boxShadow:'0 1px 6px rgba(37,99,235,.08)'})}}>
                    {m.txt}
                    {m.me&&<span style={{fontSize:10,opacity:.75,float:'right',marginLeft:6,marginTop:3}}>✓✓</span>}
                  </div>
                )}
              </div>
            ))}

            {typing&&(
              <div style={{display:'flex',alignItems:'flex-end',gap:7}}>
                <div style={{width:28,height:28,borderRadius:'50%',background:ac.bg,
                  display:'flex',alignItems:'center',justifyContent:'center',fontSize:14}}>{ac.emoji}</div>
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

            {/* Collab avatar */}
            <div style={{display:'flex',justifyContent:'flex-end',paddingRight:4}}>
              <div style={{width:34,height:34,borderRadius:'50%',
                background:'linear-gradient(135deg,#F9A8D4,#EC4899)',
                border:'2px solid white',display:'flex',alignItems:'center',
                justifyContent:'center',fontSize:16,
                boxShadow:'0 2px 8px rgba(0,0,0,.1)',position:'relative'}}>
                👧
                <div style={{position:'absolute',bottom:-2,right:-2,width:14,height:14,
                  background:G.blue,borderRadius:'50%',border:'2px solid white',
                  color:'white',fontSize:8,fontWeight:700,
                  display:'flex',alignItems:'center',justifyContent:'center'}}>+</div>
              </div>
            </div>
          </div>

          {/* INPUT BAR */}
          <div style={{flexShrink:0,background:'white',padding:'10px 12px 20px',
            display:'flex',alignItems:'center',gap:8,borderTop:'1px solid #e8f0fe'}}>
            {['📎','🖼️','⊞'].map((ic,i)=>(
              <div key={i} onClick={()=>showToast(ic+' coming soon')} style={{
                width:30,height:30,borderRadius:8,background:'#EFF6FF',
                display:'flex',alignItems:'center',justifyContent:'center',
                fontSize:14,cursor:'pointer'}}>{ic}</div>
            ))}
            <div style={{flex:1,display:'flex',alignItems:'center',
              background:'#F1F5FF',borderRadius:22,padding:'8px 12px',gap:6,
              border:'1.5px solid #e8f0fe'}}>
              <input value={inputVal} onChange={e=>setInputVal(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&sendMsg()}
                placeholder="Type a message..."
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

// ─── CREATE POST SHEET ─────────────────────────────────────────
function CreateSheet({user,profile,onClose,onPosted,showToast}){
  const[text,setText]=useState('');
  const[image,setImage]=useState(null);
  const[preview,setPreview]=useState(null);
  const[posting,setPosting]=useState(false);
  const fileRef=useRef(null);

  const pickImg=e=>{
    const f=e.target.files[0]; if(!f)return;
    setImage(f); setPreview(URL.createObjectURL(f));
  };
  const submit=async()=>{
    if(!text.trim()||posting)return;
    setPosting(true);
    let imageUrl='';
    if(image){
      const ext=image.name.split('.').pop();
      const path=`posts/${user.id}_${Date.now()}.${ext}`;
      const{error:upErr}=await supabase.storage.from('posts').upload(path,image);
      if(!upErr){
        const{data:{publicUrl}}=supabase.storage.from('posts').getPublicUrl(path);
        imageUrl=publicUrl;
      }
    }
    const{data,error}=await supabase.from('posts')
      .insert({user_id:user.id,content:text.trim(),image_url:imageUrl,likes_count:0,comments_count:0})
      .select('*,profiles(full_name,username,avatar_url)').single();
    if(!error&&data){onPosted(data); showToast('🚀 Post shared!');}
    setPosting(false); onClose();
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
            padding:'10px 14px',fontSize:13,outline:'none',resize:'none',
            fontFamily:'inherit',color:G.dark}}/>
        {preview&&(
          <div style={{position:'relative',marginTop:10}}>
            <img src={preview} alt="" style={{width:'100%',maxHeight:200,objectFit:'cover',borderRadius:12}}/>
            <button onClick={()=>{setImage(null);setPreview(null);}} style={{
              position:'absolute',top:6,right:6,background:'rgba(0,0,0,.5)',color:'white',
              border:'none',borderRadius:'50%',width:24,height:24,cursor:'pointer',fontSize:12}}>✕</button>
          </div>
        )}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginTop:14}}>
          {[['📸','Photo',()=>fileRef.current.click()],['🎵','Music',()=>showToast('🎵 Coming soon')],
            ['🤖','AI Art',()=>showToast('🤖 Coming soon')],['📰','News',()=>showToast('📰 Coming soon')]].map(([ic,lb,fn])=>(
            <div key={lb} onClick={fn} style={{background:'#EFF6FF',borderRadius:14,padding:'18px 10px',
              display:'flex',flexDirection:'column',alignItems:'center',gap:7,cursor:'pointer',
              border:'2px solid transparent',transition:'all .2s'}}>
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
          fontSize:14,fontWeight:700,cursor:text.trim()?'pointer':'default',transition:'all .2s',
          fontFamily:'inherit'}}>
          {posting?'⏳ Posting...':'🚀 Share Post'}
        </button>
      </div>
    </div>
  );
}

// ─── POST CARD ─────────────────────────────────────────────────
function PostCard({post,currentUserId,isLiked,onLike,onComment,onDelete,showToast}){
  const[liked,setLiked]=useState(isLiked);
  const[likeCount,setLikeCount]=useState(post.likes_count||0);
  const handleLike=()=>{ const n=!liked; setLiked(n); setLikeCount(c=>n?c+1:c-1); onLike(post.id,n); };
  const authorName=post.profiles?.full_name||'User';
  const isOwn=post.user_id===currentUserId;
  return(
    <div style={{background:'white',margin:'8px 10px',borderRadius:18,overflow:'hidden',
      boxShadow:'0 2px 10px rgba(37,99,235,.07)',animation:'fadein .3s ease'}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',padding:'11px 13px 7px',justifyContent:'space-between'}}>
        <div style={{display:'flex',alignItems:'center',gap:9}}>
          <div style={{width:40,height:40,borderRadius:'50%',
            background:'linear-gradient(135deg,#93C5FD,#1D4ED8)',
            display:'flex',alignItems:'center',justifyContent:'center',
            fontSize:13,fontWeight:700,color:'white',overflow:'hidden',flexShrink:0}}>
            {post.profiles?.avatar_url
              ?<img src={post.profiles.avatar_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
              :ini(authorName)}
          </div>
          <div>
            <div style={{fontSize:13.5,fontWeight:700,color:G.dark,display:'flex',alignItems:'center',gap:3}}>
              {authorName}
            </div>
            <div style={{fontSize:10,color:G.gray,marginTop:1}}>{ago(post.created_at)}</div>
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          {isOwn&&<button onClick={()=>onDelete(post.id)} style={{background:'none',border:'none',
            cursor:'pointer',color:G.red,fontSize:16,padding:4}}>🗑️</button>}
          <div style={{color:G.gray,fontSize:18,cursor:'pointer'}}>···</div>
        </div>
      </div>
      {/* Text */}
      {post.content&&(
        <div style={{padding:'3px 13px 9px',fontSize:13,color:G.dark,lineHeight:1.5}}>
          {post.content.split(/(#\w+)/g).map((p,i)=>
            p.startsWith('#')
              ?<span key={i} style={{color:G.blue,fontWeight:600}}>{p}</span>:p)}
        </div>
      )}
      {/* Image */}
      {post.image_url&&(
        <div style={{width:'100%',maxHeight:280,overflow:'hidden'}}>
          <img src={post.image_url} alt="" style={{width:'100%',objectFit:'cover'}}/>
        </div>
      )}
      {/* Footer */}
      <div style={{padding:'9px 13px 11px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{display:'flex',alignItems:'center',gap:14}}>
          <div onClick={handleLike} style={{display:'flex',alignItems:'center',gap:4,cursor:'pointer',
            color:liked?G.red:G.gray,fontSize:12.5}}>
            <span style={{fontSize:19}}>{liked?'❤️':'🤍'}</span>
            <span>{fmtN(likeCount)}</span>
          </div>
          <div onClick={()=>onComment(post.id)} style={{display:'flex',alignItems:'center',gap:4,
            cursor:'pointer',color:G.gray,fontSize:12.5}}>
            <span style={{fontSize:19}}>💬</span>
            <span>{post.comments_count||0}</span>
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

// ─── FOLLOW SUGGESTIONS ────────────────────────────────────────
function FollowSuggestions({following,onFollow}){
  const people=[
    {id:'maya', emoji:'👩',name:'Maya', role:'AI Artist',    bg:'linear-gradient(135deg,#F9A8D4,#EC4899)'},
    {id:'akash',emoji:'👦',name:'Akash',role:'Developer',    bg:'linear-gradient(135deg,#86EFAC,#22C55E)'},
    {id:'priya',emoji:'👧',name:'Priya',role:'Photographer', bg:'linear-gradient(135deg,#FDE68A,#F59E0B)'},
    {id:'rohan',emoji:'🧒',name:'Rohan',role:'Musician',     bg:'linear-gradient(135deg,#C4B5FD,#7C3AED)'},
  ];
  return(
    <div style={{padding:'10px 12px',background:G.bg}}>
      <div style={{fontSize:14,fontWeight:700,color:G.dark,marginBottom:10}}>People You May Know</div>
      <div style={{display:'flex',gap:10,overflowX:'auto',scrollbarWidth:'none',paddingBottom:4}}>
        {people.map(p=>(
          <div key={p.id} style={{background:'white',borderRadius:16,padding:'14px 12px',
            minWidth:115,display:'flex',flexDirection:'column',alignItems:'center',gap:8,
            boxShadow:'0 2px 10px rgba(37,99,235,.08)',flexShrink:0}}>
            <div style={{width:54,height:54,borderRadius:'50%',background:p.bg,
              display:'flex',alignItems:'center',justifyContent:'center',fontSize:26}}>
              {p.emoji}
            </div>
            <div style={{fontSize:13,fontWeight:700,color:G.dark}}>{p.name}</div>
            <div style={{fontSize:11,color:G.gray}}>{p.role}</div>
            <button onClick={()=>onFollow(p.id)} style={{
              background:following[p.id]?G.lightBlue:G.blue,
              color:following[p.id]?G.blue:'white',
              border:following[p.id]?`1.5px solid ${G.sky}`:'none',
              borderRadius:20,padding:'6px 20px',fontSize:12,fontWeight:700,
              cursor:'pointer',transition:'all .2s',width:'100%'}}>
              {following[p.id]?'Following ✓':'Follow'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── STATIC REEL CARD ─────────────────────────────────────────
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
              Buddy <span style={{color:G.blue,fontSize:12}}>✔️</span>
            </div>
            <div style={{fontSize:10,color:G.gray}}>2h ago</div>
          </div>
        </div>
        <div style={{color:G.gray,fontSize:18,cursor:'pointer'}}>···</div>
      </div>
      <div style={{padding:'3px 13px 9px',fontSize:13,color:G.dark,lineHeight:1.5}}>
        Here's a motivational video to start your day! 🚀 Let's make today amazing! 💙<br/>
        <span style={{color:G.blue,fontWeight:600}}>#Inspiration #Motivation #AI</span>
      </div>
      {/* Reel box — exactly like screenshot */}
      <div style={{position:'relative',width:'100%',height:300,overflow:'hidden',
        display:'flex',alignItems:'center',justifyContent:'center',
        background:'linear-gradient(180deg,#e0f0ff,#b3d4ff 40%,#7eb8ff)'}}>
        {/* Clouds */}
        <div style={{position:'absolute',background:'rgba(255,255,255,.45)',borderRadius:30,
          width:70,height:22,top:35,left:8,zIndex:1,opacity:.55}}/>
        <div style={{position:'absolute',background:'rgba(255,255,255,.45)',borderRadius:30,
          width:50,height:16,top:52,left:65,zIndex:1,opacity:.35}}/>
        {/* Speech bubble */}
        <div style={{position:'absolute',top:16,right:16,zIndex:3,background:'white',
          borderRadius:'18px 18px 18px 4px',padding:'9px 14px',
          fontSize:15,fontWeight:700,color:G.blue,
          boxShadow:'0 4px 14px rgba(37,99,235,.18)'}}>You can do it!</div>
        {/* Floating robot */}
        <div style={{position:'relative',zIndex:2,fontSize:80,
          animation:'floaty 3s ease-in-out infinite'}}>🤖</div>
        {/* Side actions */}
        <div style={{position:'absolute',right:11,bottom:65,zIndex:4,
          display:'flex',flexDirection:'column',gap:14,alignItems:'center'}}>
          {[
            [liked?'❤️':'🤍', fmtN(cnt), ()=>{setLiked(l=>!l);setCnt(c=>liked?c-1:c+1);}],
            ['💬','5.3K',()=>showToast('💬 Comments')],
            ['🔗','Share',()=>showToast('🔗 Link copied!')],
            ['🔖','13.1K',()=>showToast('🔖 Saved!')],
          ].map(([ic,lb,fn],i)=>(
            <div key={i} onClick={fn} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:2,cursor:'pointer'}}>
              <div style={{width:40,height:40,borderRadius:'50%',
                background:'rgba(255,255,255,.22)',backdropFilter:'blur(4px)',
                display:'flex',alignItems:'center',justifyContent:'center',fontSize:19,
                transition:'transform .15s'}}>{ic}</div>
              <span style={{fontSize:10,color:'white',fontWeight:600,textShadow:'0 1px 3px rgba(0,0,0,.5)'}}>{lb}</span>
            </div>
          ))}
        </div>
        {/* Collab avatar */}
        <div style={{position:'absolute',bottom:18,right:58,zIndex:4,width:34,height:34,
          borderRadius:'50%',border:'2px solid white',
          background:'linear-gradient(135deg,#F9A8D4,#EC4899)',
          display:'flex',alignItems:'center',justifyContent:'center',fontSize:15}}>
          👧
          <div style={{position:'absolute',bottom:-3,right:-3,width:14,height:14,
            background:G.blue,borderRadius:'50%',border:'2px solid white',
            color:'white',fontSize:8,fontWeight:700,
            display:'flex',alignItems:'center',justifyContent:'center'}}>+</div>
        </div>
        {/* Play button */}
        <div onClick={()=>showToast('▶️ Playing...')} style={{
          position:'absolute',bottom:18,left:'50%',transform:'translateX(-50%)',
          width:48,height:48,background:'rgba(37,99,235,.85)',borderRadius:'50%',
          display:'flex',alignItems:'center',justifyContent:'center',
          fontSize:20,color:'white',zIndex:4,cursor:'pointer',
          boxShadow:'0 4px 18px rgba(37,99,235,.5)'}}>▶</div>
        {/* Glow bar */}
        <div style={{position:'absolute',bottom:0,left:0,right:0,height:3,zIndex:4,
          background:'linear-gradient(90deg,transparent,#60A5FA,#2563EB,transparent)'}}/>
      </div>
      {/* Footer */}
      <div style={{padding:'9px 13px 11px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{display:'flex',gap:14}}>
          <div onClick={()=>{setLiked(l=>!l);setCnt(c=>liked?c-1:c+1);}}
            style={{display:'flex',alignItems:'center',gap:4,cursor:'pointer',
              color:liked?G.red:G.gray,fontSize:12.5}}>
            <span style={{fontSize:19}}>{liked?'❤️':'🤍'}</span> {fmtN(cnt)}
          </div>
          <div onClick={()=>showToast('💬 Comments')}
            style={{display:'flex',alignItems:'center',gap:4,cursor:'pointer',color:G.gray,fontSize:12.5}}>
            <span style={{fontSize:19}}>💬</span> 5.3K
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

// ═══════════════════════════════════════════════════════════════
// MAIN FEED COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function Feed(){
  const navigate=useNavigate();
  const[user,setUser]=useState(null);
  const[profile,setProfile]=useState(null);
  const[posts,setPosts]=useState([]);
  const[loading,setLoading]=useState(true);
  const[likedPosts,setLikedPosts]=useState({});
  const[following,setFollowing]=useState({});

  // UI
  const[activeNav,setActiveNav]=useState('home');
  const[showMessages,setShowMessages]=useState(false);
  const[showCreate,setShowCreate]=useState(false);
  const[activeStory,setActiveStory]=useState(null);
  const[commentPostId,setCommentPostId]=useState(null);
  const[toast,setToast]=useState('');

  const showToast=msg=>{ setToast(msg); setTimeout(()=>setToast(''),2200); };

  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{
      if(!session){navigate('/login');return;}
      setUser(session.user);
      loadProfile(session.user.id);
      loadPosts(session.user.id);
    });
  },[navigate]);

  const loadProfile=async uid=>{
    const{data}=await supabase.from('profiles').select('*').eq('id',uid).single();
    if(data)setProfile(data);
  };
  const loadPosts=async uid=>{
    setLoading(true);
    const{data}=await supabase.from('posts')
      .select('*,profiles(full_name,username,avatar_url)')
      .order('created_at',{ascending:false}).limit(50);
    if(data)setPosts(data);
    const{data:lk}=await supabase.from('likes').select('post_id').eq('user_id',uid);
    if(lk){const lm={}; lk.forEach(l=>{lm[l.post_id]=true;}); setLikedPosts(lm);}
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
  const handleFollow=id=>{
    setFollowing(f=>{
      const n=!f[id];
      showToast(n?'✅ Following!':'Unfollowed');
      return{...f,[id]:n};
    });
  };

  const stories=[
    {id:'you',  name:'Your Story',emoji:'🧑',caption:'Your story here!',isYou:true},
    {id:'buddy',name:'Buddy',     emoji:'🤖',caption:'AI is the future! 🚀'},
    {id:'maya', name:'Maya',      emoji:'👩',caption:'New AI artwork drop 🎨'},
    {id:'akash',name:'Akash',     emoji:'👦',caption:'Just deployed! 💻'},
    {id:'priya',name:'Priya',     emoji:'👧',caption:'Golden hour 🌅'},
    {id:'rohan',name:'Rohan',     emoji:'🧒',caption:'New beat out! 🎵'},
  ];
  const storyBg=['#e2e8f0','linear-gradient(135deg,#60A5FA,#2563EB)','linear-gradient(135deg,#F9A8D4,#EC4899)',
    'linear-gradient(135deg,#86EFAC,#22C55E)','linear-gradient(135deg,#FDE68A,#F59E0B)','linear-gradient(135deg,#C4B5FD,#7C3AED)'];

  // Bottom nav items — matches screenshot exactly
  const navItems=[
    {id:'home',    icon:'🏠', label:'Home'},
    {id:'friends', icon:'👥', label:'Friends'},
    {id:'create',  icon:'+',  label:'',    isPlus:true},
    {id:'messages',icon:'💬', label:'Messages', badge:5},
    {id:'profile', icon:'👤', label:'Profile'},
  ];

  const handleNav=id=>{
    if(id==='messages'){setShowMessages(true);setActiveNav('messages');return;}
    if(id==='profile'){navigate('/profile');return;}
    if(id==='create'){setShowCreate(true);return;}
    if(id==='friends'){showToast('👥 Friends coming soon!');return;}
    setActiveNav(id);
  };

  return(
    <>
      {/* ── GLOBAL KEYFRAMES ── */}
      <style>{`
        @keyframes floaty{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
        @keyframes fadein{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideup{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes typebounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-6px)}}
        *{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}
        body{margin:0;padding:0;background:${G.bg};}
      `}</style>

      <Toast msg={toast}/>

      {/* Overlays */}
      {activeStory&&<StoryViewer story={activeStory} onClose={()=>setActiveStory(null)}/>}
      {commentPostId&&user&&<CommentsSheet postId={commentPostId} user={user} onClose={()=>setCommentPostId(null)}/>}
      {showCreate&&user&&<CreateSheet user={user} profile={profile} showToast={showToast}
        onClose={()=>setShowCreate(false)} onPosted={p=>{setPosts(prev=>[p,...prev]);}}/>}
      {showMessages&&<MessagesScreen currentUser={user} showToast={showToast}
        onClose={()=>{setShowMessages(false);setActiveNav('home');}}/>}

      {/* ── MAIN APP SHELL ── */}
      <div style={{
        width:'100%',minHeight:'100dvh',
        background:G.bg,
        display:'flex',flexDirection:'column',
        fontFamily:"'Segoe UI',-apple-system,BlinkMacSystemFont,sans-serif",
        maxWidth:480,margin:'0 auto',
        position:'relative',
      }}>

        {/* TOP BAR */}
        <div style={{
          position:'sticky',top:0,zIndex:100,
          background:'white',padding:'14px 18px 10px',
          display:'flex',alignItems:'center',justifyContent:'space-between',
          borderBottom:'1px solid #e8f0fe',
          boxShadow:'0 1px 8px rgba(37,99,235,.06)'
        }}>
          <span style={{fontSize:21,color:G.gray,cursor:'pointer'}}
            onClick={()=>showToast('🔍 Search coming soon!')}>🔍</span>
          <div style={{textAlign:'center'}}>
            <div style={{display:'flex',alignItems:'center',gap:7,fontSize:18,fontWeight:800,color:G.dark,justifyContent:'center'}}>
              <div style={{width:32,height:32,background:'linear-gradient(135deg,#60A5FA,#2563EB)',
                borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16}}>🤖</div>
              Buddy AI
            </div>
            <div style={{fontSize:9,color:G.gray}}>Your AI Social Community</div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <div style={{position:'relative',cursor:'pointer'}} onClick={()=>showToast('🔔 3 new notifications!')}>
              <span style={{fontSize:21}}>🔔</span>
              <div style={{position:'absolute',top:-4,right:-4,background:G.red,color:'white',
                fontSize:8,width:14,height:14,borderRadius:'50%',
                display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700}}>3</div>
            </div>
            <div onClick={()=>navigate('/profile')} style={{
              width:30,height:30,borderRadius:'50%',
              background:'linear-gradient(135deg,#93C5FD,#1D4ED8)',
              display:'flex',alignItems:'center',justifyContent:'center',
              color:'white',fontSize:13,fontWeight:700,cursor:'pointer',overflow:'hidden'}}>
              {profile?.avatar_url
                ?<img src={profile.avatar_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'50%'}}/>
                :ini(profile?.full_name||user?.email||'C')}
            </div>
          </div>
        </div>

        {/* SCROLLABLE CONTENT */}
        <div style={{flex:1,overflowY:'auto',overflowX:'hidden',
          WebkitOverflowScrolling:'touch',paddingBottom:80}}
          className="no-scroll">

          {/* STORIES */}
          <div style={{background:'white',padding:'10px 0 12px',borderBottom:'1px solid #e8f0fe'}}>
            <div style={{display:'flex',gap:12,overflowX:'auto',padding:'0 14px',scrollbarWidth:'none'}}>
              {stories.map((s,i)=>(
                <div key={s.id} onClick={()=>setActiveStory(s)}
                  style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4,cursor:'pointer',flexShrink:0}}>
                  <div style={{width:60,height:60,borderRadius:'50%',
                    background:storyBg[i]||'linear-gradient(135deg,#60A5FA,#7C3AED)',
                    padding:2.5,position:'relative'}}>
                    <div style={{width:'100%',height:'100%',borderRadius:'50%',
                      background:'white',padding:2,display:'flex',alignItems:'center',
                      justifyContent:'center',overflow:'hidden'}}>
                      <div style={{width:'100%',height:'100%',borderRadius:'50%',
                        background:s.isYou?'linear-gradient(135deg,#93C5FD,#1D4ED8)':(storyBg[i]||'#60A5FA'),
                        display:'flex',alignItems:'center',justifyContent:'center',fontSize:24}}>
                        {s.emoji}
                      </div>
                    </div>
                    {s.isYou&&<div style={{position:'absolute',bottom:0,right:0,width:18,height:18,
                      background:G.blue,borderRadius:'50%',border:'2px solid white',
                      color:'white',fontSize:13,fontWeight:700,
                      display:'flex',alignItems:'center',justifyContent:'center',lineHeight:1}}>+</div>}
                  </div>
                  <span style={{fontSize:10,color:G.dark,fontWeight:500,maxWidth:60,
                    textAlign:'center',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                    {s.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* STATIC REEL CARD */}
          <ReelCard showToast={showToast}/>

          {/* FOLLOW SUGGESTIONS */}
          <FollowSuggestions following={following} onFollow={handleFollow}/>

          {/* REAL POSTS FROM SUPABASE */}
          {loading&&(
            <div style={{textAlign:'center',padding:40,color:G.gray,fontSize:13}}>
              <div style={{fontSize:40,marginBottom:10,animation:'floaty 1.5s infinite'}}>🤖</div>
              Loading posts...
            </div>
          )}
          {!loading&&posts.map(post=>(
            <PostCard key={post.id} post={post} currentUserId={user?.id}
              isLiked={!!likedPosts[post.id]} onLike={handleLike}
              onComment={setCommentPostId} onDelete={handleDelete} showToast={showToast}/>
          ))}
          {!loading&&posts.length===0&&(
            <div style={{textAlign:'center',padding:'40px 20px',color:G.gray,animation:'fadein .4s ease'}}>
              <div style={{fontSize:50,marginBottom:12}}>📝</div>
              <div style={{fontSize:15,fontWeight:600,color:G.dark,marginBottom:6}}>No posts yet!</div>
              <div style={{fontSize:13}}>Be the first to share something amazing 🚀</div>
              <button onClick={()=>setShowCreate(true)} style={{marginTop:16,
                background:'linear-gradient(135deg,#60A5FA,#2563EB)',color:'white',
                border:'none',borderRadius:20,padding:'10px 24px',
                fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
                Create First Post
              </button>
            </div>
          )}
        </div>

        {/* ── BOTTOM NAV — matches screenshot exactly ── */}
        <div style={{
          position:'fixed',bottom:0,left:'50%',transform:'translateX(-50%)',
          width:'100%',maxWidth:480,
          background:'white',borderTop:'1px solid #e8f0fe',
          display:'flex',justifyContent:'space-around',alignItems:'center',
          padding:'8px 0 16px',zIndex:100,
          boxShadow:'0 -3px 16px rgba(37,99,235,.08)'
        }}>
          {navItems.map(nav=>(
            nav.isPlus
              ? <div key={nav.id} onClick={()=>handleNav(nav.id)} style={{
                  width:52,height:52,borderRadius:'50%',
                  background:'linear-gradient(135deg,#60A5FA,#2563EB)',
                  display:'flex',alignItems:'center',justifyContent:'center',
                  fontSize:28,color:'white',cursor:'pointer',marginBottom:6,
                  boxShadow:'0 4px 14px rgba(37,99,235,.4)',
                  transition:'transform .2s'
                }}>+</div>
              : <div key={nav.id} onClick={()=>handleNav(nav.id)} style={{
                  display:'flex',flexDirection:'column',alignItems:'center',gap:2,
                  cursor:'pointer',color:activeNav===nav.id?G.blue:G.gray,
                  fontSize:9.5,padding:'3px 10px',borderRadius:10,
                  transition:'color .2s',position:'relative',minWidth:50
                }}>
                  <span style={{fontSize:22}}>{nav.icon}</span>
                  {nav.badge&&activeNav!=='messages'&&<div style={{position:'absolute',top:0,right:6,
                    background:G.red,color:'white',fontSize:8,width:14,height:14,borderRadius:'50%',
                    display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700}}>{nav.badge}</div>}
                  <span style={{fontWeight:activeNav===nav.id?700:400}}>{nav.label}</span>
                </div>
          ))}
        </div>
      </div>

      <style>{`
        .no-scroll::-webkit-scrollbar{display:none;}
        .no-scroll{scrollbar-width:none;-ms-overflow-style:none;}
      `}</style>
    </>
  );
}
