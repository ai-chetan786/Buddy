import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import './Profile.css';

// ── helpers ───────────────────────────────────
const ini = n => n ? n.charAt(0).toUpperCase() : '?';
const GRAD = [
  'linear-gradient(135deg,#60A5FA,#2563EB)',
  'linear-gradient(135deg,#F9A8D4,#EC4899)',
  'linear-gradient(135deg,#86EFAC,#22C55E)',
  'linear-gradient(135deg,#FDE68A,#F59E0B)',
  'linear-gradient(135deg,#C4B5FD,#7C3AED)',
];

// ── small Avatar component ────────────────────
function Avatar({ profile, size = 40, idx = 0 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: GRAD[idx % GRAD.length],
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 700, color: 'white',
      overflow: 'hidden', flexShrink: 0
    }}>
      {profile?.avatar_url
        ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : ini(profile?.full_name || profile?.username)}
    </div>
  );
}

// ── Following List Modal ──────────────────────
// Shows all users you follow with an Unfollow button
function FollowingModal({ userId, onClose }) {
  const [list, setList]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [unfollowing, setUnfollowing] = useState({});

  useEffect(() => {
    const load = async () => {
      // Get all follow rows for this user, join with profiles
      const { data } = await supabase
        .from('follows')
        .select('following_id, profiles!follows_following_id_fkey(id, full_name, username, avatar_url)')
        .eq('follower_id', userId);
      setList(data || []);
      setLoading(false);
    };
    load();
  }, [userId]);

  const handleUnfollow = async (followingId) => {
    setUnfollowing(u => ({ ...u, [followingId]: true }));
    await supabase.from('follows')
      .delete()
      .eq('follower_id', userId)
      .eq('following_id', followingId);
    // Remove from list
    setList(l => l.filter(f => f.following_id !== followingId));
    setUnfollowing(u => ({ ...u, [followingId]: false }));
  };

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)',
      zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center'
    }}>
      <div style={{
        background: 'white', borderRadius: '22px 22px 0 0',
        width: '100%', maxWidth: 480, padding: 20,
        maxHeight: '70vh', overflowY: 'auto',
        animation: 'slideup .28s ease'
      }}>
        <div style={{ width: 38, height: 4, background: '#e2e8f0', borderRadius: 2, margin: '0 auto 14px' }} />
        <div style={{ fontSize: 16, fontWeight: 600, color: '#1E293B', marginBottom: 16 }}>
          Following
        </div>

        {loading && (
          <div style={{ textAlign: 'center', color: '#9CA3AF', padding: 30 }}>Loading...</div>
        )}

        {!loading && list.length === 0 && (
          <div style={{ textAlign: 'center', color: '#9CA3AF', padding: 30 }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>👥</div>
            You are not following anyone yet.<br />
            <span style={{ fontSize: 12 }}>Go to Feed → Follow people!</span>
          </div>
        )}

        {list.map((f, i) => {
          const p = f.profiles;
          return (
            <div key={f.following_id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 0', borderBottom: '1px solid #f1f5f9'
            }}>
              <Avatar profile={p} size={46} idx={i} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1E293B' }}>
                  {p?.full_name || 'User'}
                </div>
                <div style={{ fontSize: 12, color: '#9CA3AF' }}>
                  {p?.username ? '@' + p.username : ''}
                </div>
              </div>
              <button
                onClick={() => handleUnfollow(f.following_id)}
                disabled={unfollowing[f.following_id]}
                style={{
                  background: unfollowing[f.following_id] ? '#f1f5f9' : '#FEE2E2',
                  color: '#EF4444',
                  border: '1.5px solid #FECACA',
                  borderRadius: 20, padding: '6px 16px',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'inherit', transition: 'all .2s'
                }}>
                {unfollowing[f.following_id] ? '...' : 'Unfollow'}
              </button>
            </div>
          );
        })}

        <button onClick={onClose} style={{
          width: '100%', marginTop: 16, padding: '12px',
          background: '#F1F5FF', border: 'none', borderRadius: 14,
          fontSize: 14, fontWeight: 600, color: '#2563EB',
          cursor: 'pointer', fontFamily: 'inherit'
        }}>Close</button>
      </div>
    </div>
  );
}

// ── Followers List Modal ──────────────────────
function FollowersModal({ userId, onClose }) {
  const [list, setList]       = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('follows')
        .select('follower_id, profiles!follows_follower_id_fkey(id, full_name, username, avatar_url)')
        .eq('following_id', userId);
      setList(data || []);
      setLoading(false);
    };
    load();
  }, [userId]);

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)',
      zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center'
    }}>
      <div style={{
        background: 'white', borderRadius: '22px 22px 0 0',
        width: '100%', maxWidth: 480, padding: 20,
        maxHeight: '70vh', overflowY: 'auto',
        animation: 'slideup .28s ease'
      }}>
        <div style={{ width: 38, height: 4, background: '#e2e8f0', borderRadius: 2, margin: '0 auto 14px' }} />
        <div style={{ fontSize: 16, fontWeight: 600, color: '#1E293B', marginBottom: 16 }}>
          Followers
        </div>
        {loading && <div style={{ textAlign: 'center', color: '#9CA3AF', padding: 30 }}>Loading...</div>}
        {!loading && list.length === 0 && (
          <div style={{ textAlign: 'center', color: '#9CA3AF', padding: 30 }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>👥</div>
            No followers yet. Share your profile!
          </div>
        )}
        {list.map((f, i) => {
          const p = f.profiles;
          return (
            <div key={f.follower_id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 0', borderBottom: '1px solid #f1f5f9'
            }}>
              <Avatar profile={p} size={46} idx={i} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1E293B' }}>
                  {p?.full_name || 'User'}
                </div>
                <div style={{ fontSize: 12, color: '#9CA3AF' }}>
                  {p?.username ? '@' + p.username : ''}
                </div>
              </div>
            </div>
          );
        })}
        <button onClick={onClose} style={{
          width: '100%', marginTop: 16, padding: '12px',
          background: '#F1F5FF', border: 'none', borderRadius: 14,
          fontSize: 14, fontWeight: 600, color: '#2563EB',
          cursor: 'pointer', fontFamily: 'inherit'
        }}>Close</button>
      </div>
    </div>
  );
}

// ── Story Views Modal ─────────────────────────
function StoryViewsModal({ storyId, onClose }) {
  const [views, setViews]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('story_views')
        .select('*, profiles(full_name, username, avatar_url)')
        .eq('story_id', storyId)
        .order('viewed_at', { ascending: false });
      setViews(data || []);
      setLoading(false);
    };
    load();
  }, [storyId]);

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)',
      zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center'
    }}>
      <div style={{
        background: 'white', borderRadius: '22px 22px 0 0',
        width: '100%', maxWidth: 480, padding: 20,
        maxHeight: '60vh', overflowY: 'auto',
        animation: 'slideup .28s ease'
      }}>
        <div style={{ width: 38, height: 4, background: '#e2e8f0', borderRadius: 2, margin: '0 auto 14px' }} />
        <div style={{ fontSize: 16, fontWeight: 600, color: '#1E293B', marginBottom: 4 }}>
          👁️ Story Views
        </div>
        <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 16 }}>
          {views.length} {views.length === 1 ? 'person' : 'people'} viewed your story
        </div>
        {loading && <div style={{ textAlign: 'center', color: '#9CA3AF', padding: 20 }}>Loading...</div>}
        {!loading && views.length === 0 && (
          <div style={{ textAlign: 'center', color: '#9CA3AF', padding: 20 }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>👁️</div>
            No views yet. Share your profile link!
          </div>
        )}
        {views.map((v, i) => (
          <div key={v.id} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '8px 0', borderBottom: '1px solid #f1f5f9'
          }}>
            <Avatar profile={v.profiles} size={38} idx={i} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1E293B' }}>
                {v.profiles?.full_name || 'User'}
              </div>
              <div style={{ fontSize: 11, color: '#9CA3AF' }}>
                {new Date(v.viewed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        <button onClick={onClose} style={{
          width: '100%', marginTop: 16, padding: '12px',
          background: '#F1F5FF', border: 'none', borderRadius: 14,
          fontSize: 14, fontWeight: 600, color: '#2563EB',
          cursor: 'pointer', fontFamily: 'inherit'
        }}>Close</button>
      </div>
    </div>
  );
}

// ── MAIN PROFILE ──────────────────────────────
export default function Profile() {
  const navigate = useNavigate();
  const [user,    setUser]    = useState(null);
  const [profile, setProfile] = useState(null);
  const [posts,   setPosts]   = useState([]);
  const [myStory, setMyStory] = useState(null); // user's active story
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [editData, setEditData] = useState({ full_name: '', username: '', bio: '' });
  const avatarRef = useRef(null);

  // Modal states
  const [showFollowing,  setShowFollowing]  = useState(false);
  const [showFollowers,  setShowFollowers]  = useState(false);
  const [showStoryViews, setShowStoryViews] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { navigate('/login'); return; }
      setUser(session.user);
      loadAll(session.user.id);
    });
  }, [navigate]);

  const loadAll = async (uid) => {
    // Profile
    const { data: prof } = await supabase
      .from('profiles').select('*').eq('id', uid).single();
    if (prof) {
      setProfile(prof);
      setEditData({ full_name: prof.full_name || '', username: prof.username || '', bio: prof.bio || '' });
    } else {
      const np = { id: uid, full_name: '', username: '', bio: '', avatar_url: '', followers_count: 0, following_count: 0, posts_count: 0 };
      await supabase.from('profiles').insert(np);
      setProfile(np);
    }

    // Posts
    const { data: postsData } = await supabase
      .from('posts').select('*').eq('user_id', uid).order('created_at', { ascending: false });
    setPosts(postsData || []);

    // My active story (not expired)
    const { data: storyData } = await supabase
      .from('stories')
      .select('*')
      .eq('user_id', uid)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    if (storyData) setMyStory(storyData);

    setLoading(false);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('profiles').update({
      full_name: editData.full_name,
      username: editData.username.toLowerCase().replace(/\s/g, ''),
      bio: editData.bio
    }).eq('id', user.id);
    if (!error) { setProfile(prev => ({ ...prev, ...editData })); setEditing(false); }
    setSaving(false);
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;
    if (file.size > 3 * 1024 * 1024) { alert('Photo must be less than 3MB!'); return; }
    setUploadingAvatar(true);
    const fileName = `avatar-${user.id}-${Date.now()}.${file.name.split('.').pop()}`;
    const { error: upErr } = await supabase.storage.from('posts').upload(fileName, file, { upsert: true });
    if (!upErr) {
      const { data: { publicUrl } } = supabase.storage.from('posts').getPublicUrl(fileName);
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);
      setProfile(prev => ({ ...prev, avatar_url: publicUrl }));
    }
    setUploadingAvatar(false);
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Delete this post?')) return;
    await supabase.from('likes').delete().eq('post_id', postId);
    await supabase.from('comments').delete().eq('post_id', postId);
    await supabase.from('posts').delete().eq('id', postId).eq('user_id', user.id);
    setPosts(prev => prev.filter(p => p.id !== postId));
  };

  const handleDeleteStory = async () => {
    if (!myStory || !window.confirm('Delete your story?')) return;
    await supabase.from('stories').delete().eq('id', myStory.id);
    setMyStory(null);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F0F4FF', fontFamily: 'Segoe UI, sans-serif' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🤖</div>
        <p style={{ color: '#9CA3AF' }}>Loading profile...</p>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes slideup { from{transform:translateY(100%);opacity:0} to{transform:translateY(0);opacity:1} }
        * { box-sizing: border-box; }
        body { margin: 0; background: #F0F4FF; }
      `}</style>

      {/* Modals */}
      {showFollowing && user && (
        <FollowingModal userId={user.id} onClose={() => { setShowFollowing(false); loadAll(user.id); }} />
      )}
      {showFollowers && user && (
        <FollowersModal userId={user.id} onClose={() => setShowFollowers(false)} />
      )}
      {showStoryViews && myStory && (
        <StoryViewsModal storyId={myStory.id} onClose={() => setShowStoryViews(false)} />
      )}

      <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100dvh', background: '#F0F4FF', fontFamily: 'Segoe UI, -apple-system, sans-serif', paddingBottom: 80 }}>

        {/* HEADER */}
        <div style={{ background: 'linear-gradient(135deg,#2563EB,#1D4ED8)', padding: '48px 16px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={() => navigate('/feed')} style={{ background: 'rgba(255,255,255,.2)', border: 'none', borderRadius: '50%', width: 36, height: 36, color: 'white', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
          <h1 style={{ color: 'white', fontSize: 17, fontWeight: 700, margin: 0 }}>My Profile</h1>
          <button onClick={handleLogout} style={{ background: 'rgba(255,255,255,.2)', border: 'none', borderRadius: '50%', width: 36, height: 36, color: 'white', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Logout">🚪</button>
        </div>

        {/* PROFILE CARD */}
        <div style={{ background: 'white', margin: '0 10px', marginTop: -16, borderRadius: 20, padding: '24px 20px', boxShadow: '0 4px 20px rgba(37,99,235,.1)' }}>

          {/* Avatar */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 16 }}>
            <div onClick={() => avatarRef.current?.click()} style={{ position: 'relative', cursor: 'pointer', marginBottom: 8 }}>
              <div style={{ width: 90, height: 90, borderRadius: '50%', overflow: 'hidden', border: '3px solid #BFDBFE', background: 'linear-gradient(135deg,#93C5FD,#1D4ED8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, color: 'white', fontWeight: 700 }}>
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : ini(profile?.full_name || user?.email || '?')}
              </div>
              <div style={{ position: 'absolute', bottom: 2, right: 2, background: '#2563EB', borderRadius: '50%', width: 26, height: 26, border: '2px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>
                {uploadingAvatar ? '⏳' : '📷'}
              </div>
            </div>
            <input ref={avatarRef} type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: 'none' }} />
            <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>Tap photo to change</p>
          </div>

          {/* Info or Edit Form */}
          {!editing ? (
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1E293B', margin: '0 0 4px' }}>{profile?.full_name || 'Your Name'}</h2>
              <p style={{ fontSize: 13, color: '#2563EB', margin: '0 0 4px' }}>@{profile?.username || 'username'}</p>
              <p style={{ fontSize: 12, color: '#9CA3AF', margin: '0 0 8px' }}>{user?.email}</p>
              {profile?.bio && <p style={{ fontSize: 13, color: '#475569', margin: '0 0 12px', lineHeight: 1.5 }}>{profile.bio}</p>}
              <button onClick={() => setEditing(true)} style={{ background: '#EFF6FF', border: '1.5px solid #BFDBFE', borderRadius: 20, padding: '8px 24px', fontSize: 13, fontWeight: 600, color: '#2563EB', cursor: 'pointer', fontFamily: 'inherit' }}>✏️ Edit Profile</button>
            </div>
          ) : (
            <div>
              {[['Full Name', 'full_name', 'text', 'Your full name'],
                ['Username', 'username', 'text', 'yourname'],
                ['Bio', 'bio', 'textarea', 'Write about yourself...']].map(([label, key, type, ph]) => (
                <div key={key} style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: 4 }}>{label}</label>
                  {type === 'textarea'
                    ? <textarea value={editData[key]} onChange={e => setEditData(p => ({ ...p, [key]: e.target.value }))} placeholder={ph} rows={3} style={{ width: '100%', border: '1.5px solid #BFDBFE', borderRadius: 12, padding: '9px 12px', fontSize: 13, outline: 'none', resize: 'none', fontFamily: 'inherit', color: '#1E293B' }} />
                    : <input value={editData[key]} onChange={e => setEditData(p => ({ ...p, [key]: e.target.value }))} placeholder={ph} style={{ width: '100%', border: '1.5px solid #BFDBFE', borderRadius: 12, padding: '9px 12px', fontSize: 13, outline: 'none', fontFamily: 'inherit', color: '#1E293B' }} />
                  }
                </div>
              ))}
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setEditing(false)} style={{ flex: 1, padding: '11px', background: '#f1f5f9', border: 'none', borderRadius: 14, fontSize: 14, fontWeight: 600, color: '#64748b', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                <button onClick={handleSaveProfile} disabled={saving} style={{ flex: 1, padding: '11px', background: 'linear-gradient(135deg,#60A5FA,#2563EB)', border: 'none', borderRadius: 14, fontSize: 14, fontWeight: 600, color: 'white', cursor: 'pointer', fontFamily: 'inherit' }}>{saving ? '⏳ Saving...' : '✅ Save'}</button>
              </div>
            </div>
          )}

          {/* STATS — all 3 are clickable */}
          <div style={{ display: 'flex', background: '#F8FAFF', borderRadius: 16, padding: '16px 0', marginTop: 20 }}>
            <div style={{ flex: 1, textAlign: 'center', borderRight: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#1E293B' }}>{posts.length}</div>
              <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2, textTransform: 'uppercase', letterSpacing: '.04em' }}>Posts</div>
            </div>
            {/* FOLLOWERS — clickable */}
            <div onClick={() => setShowFollowers(true)} style={{ flex: 1, textAlign: 'center', borderRight: '1px solid #E2E8F0', cursor: 'pointer' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#1E293B' }}>{profile?.followers_count || 0}</div>
              <div style={{ fontSize: 11, color: '#2563EB', marginTop: 2, textTransform: 'uppercase', letterSpacing: '.04em', fontWeight: 600 }}>Followers</div>
            </div>
            {/* FOLLOWING — clickable — opens list with Unfollow buttons */}
            <div onClick={() => setShowFollowing(true)} style={{ flex: 1, textAlign: 'center', cursor: 'pointer' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#1E293B' }}>{profile?.following_count || 0}</div>
              <div style={{ fontSize: 11, color: '#2563EB', marginTop: 2, textTransform: 'uppercase', letterSpacing: '.04em', fontWeight: 600 }}>Following</div>
            </div>
          </div>
        </div>

        {/* MY ACTIVE STORY */}
        {myStory && (
          <div style={{ margin: '12px 10px 0', background: 'white', borderRadius: 16, padding: 14, boxShadow: '0 2px 10px rgba(37,99,235,.07)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1E293B', marginBottom: 10 }}>📖 My Active Story</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {/* Story preview */}
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg,#60A5FA,#2563EB)', padding: 2.5 }}>
                <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'white', padding: 2, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {myStory.image_url
                    ? <img src={myStory.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                    : <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'linear-gradient(135deg,#60A5FA,#2563EB)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>✨</div>
                  }
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: '#1E293B', fontWeight: 500 }}>{myStory.caption || 'No caption'}</div>
                <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
                  Expires: {new Date(myStory.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {/* View count button */}
                <button onClick={() => setShowStoryViews(true)} style={{ background: '#EFF6FF', border: '1.5px solid #BFDBFE', borderRadius: 20, padding: '5px 12px', fontSize: 11, fontWeight: 600, color: '#2563EB', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                  👁️ Views
                </button>
                {/* Delete story */}
                <button onClick={handleDeleteStory} style={{ background: '#FEE2E2', border: '1.5px solid #FECACA', borderRadius: 20, padding: '5px 12px', fontSize: 11, fontWeight: 600, color: '#EF4444', cursor: 'pointer', fontFamily: 'inherit' }}>
                  🗑️ Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MY POSTS */}
        <div style={{ margin: '12px 10px 0' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1E293B', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            📸 My Posts
            <span style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 400 }}>({posts.length})</span>
          </div>
          {posts.length === 0 ? (
            <div style={{ background: 'white', borderRadius: 16, padding: 30, textAlign: 'center', boxShadow: '0 2px 10px rgba(37,99,235,.07)' }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>📝</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#1E293B', marginBottom: 6 }}>No posts yet!</div>
              <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 14 }}>Be the first to share something amazing</div>
              <button onClick={() => navigate('/feed')} style={{ background: 'linear-gradient(135deg,#60A5FA,#2563EB)', color: 'white', border: 'none', borderRadius: 20, padding: '10px 24px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>✨ Create Post</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 3 }}>
              {posts.map(post => (
                <div key={post.id} style={{ position: 'relative', paddingBottom: '100%', background: '#F0F4FF', borderRadius: 8, overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', inset: 0 }}>
                    {post.image_url
                      ? <img src={post.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 8, background: 'white' }}>
                          <p style={{ fontSize: 10, color: '#64748b', textAlign: 'center', margin: 0, lineHeight: 1.3 }}>{post.content?.substring(0, 50)}</p>
                        </div>
                    }
                    {/* Overlay with stats + delete */}
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.35)', opacity: 0, transition: 'opacity .2s', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                      onMouseEnter={e => e.currentTarget.style.opacity = 1}
                      onMouseLeave={e => e.currentTarget.style.opacity = 0}>
                      <div style={{ color: 'white', fontSize: 11, fontWeight: 600 }}>❤️ {post.likes_count || 0}</div>
                      <div style={{ color: 'white', fontSize: 11, fontWeight: 600 }}>💬 {post.comments_count || 0}</div>
                      <button onClick={() => handleDeletePost(post.id)} style={{ marginTop: 4, background: 'rgba(239,68,68,.8)', border: 'none', borderRadius: 10, padding: '3px 8px', color: 'white', fontSize: 10, cursor: 'pointer' }}>🗑️</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM NAV — same as Feed so navigation works */}
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, background: 'white', borderTop: '1px solid #e8f0fe', display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '8px 0 16px', zIndex: 100, boxShadow: '0 -3px 16px rgba(37,99,235,.08)' }}>
        {[
          { icon: '🏠', label: 'Home',     fn: () => navigate('/feed') },
          { icon: '👥', label: 'Friends',  fn: () => navigate('/feed') },
          { icon: '+',  label: '',          isPlus: true, fn: () => navigate('/feed') },
          { icon: '💬', label: 'Messages', fn: () => navigate('/feed') },
          { icon: '👤', label: 'Profile',  fn: () => {}, active: true },
        ].map((nav, i) => (
          nav.isPlus
            ? <div key="plus" onClick={nav.fn} style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg,#60A5FA,#2563EB)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, color: 'white', cursor: 'pointer', marginBottom: 6, boxShadow: '0 4px 14px rgba(37,99,235,.4)' }}>+</div>
            : <div key={i} onClick={nav.fn} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, cursor: 'pointer', color: nav.active ? '#2563EB' : '#9CA3AF', fontSize: 9.5, padding: '3px 10px', minWidth: 50 }}>
                <span style={{ fontSize: 22 }}>{nav.icon}</span>
                <span style={{ fontWeight: nav.active ? 700 : 400 }}>{nav.label}</span>
              </div>
        ))}
      </div>
    </>
  );
}
