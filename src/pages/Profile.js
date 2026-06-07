import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import './Profile.css';

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [editData, setEditData] = useState({
    full_name: '',
    username: '',
    bio: ''
  });
  const avatarRef = useRef(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { navigate('/login'); return; }
      setUser(session.user);
      loadProfile(session.user.id);
      loadMyPosts(session.user.id);
    });
  }, [navigate]);

  const loadProfile = async (userId) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (data) {
      setProfile(data);
      setEditData({
        full_name: data.full_name || '',
        username: data.username || '',
        bio: data.bio || ''
      });
    } else {
      // Create profile if not exists
      const newProfile = {
        id: userId,
        full_name: '',
        username: '',
        bio: '',
        avatar_url: '',
        followers_count: 0,
        following_count: 0,
        posts_count: 0
      };
      await supabase.from('profiles').insert(newProfile);
      setProfile(newProfile);
    }
    setLoading(false);
  };

  const loadMyPosts = async (userId) => {
    const { data } = await supabase
      .from('posts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    setPosts(data || []);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: editData.full_name,
        username: editData.username.toLowerCase().replace(/\s/g, ''),
        bio: editData.bio
      })
      .eq('id', user.id);

    if (!error) {
      setProfile(prev => ({ ...prev, ...editData }));
      setEditing(false);
    }
    setSaving(false);
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;
    if (file.size > 3 * 1024 * 1024) {
      alert('Photo must be less than 3MB!');
      return;
    }

    setUploadingAvatar(true);

    const fileName = `avatar-${user.id}-${Date.now()}.${file.name.split('.').pop()}`;
    const { error: uploadError } = await supabase.storage
      .from('posts')
      .upload(fileName, file, { upsert: true });

    if (!uploadError) {
      const { data: urlData } = supabase.storage
        .from('posts')
        .getPublicUrl(fileName);

      const avatarUrl = urlData.publicUrl;

      await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', user.id);

      setProfile(prev => ({ ...prev, avatar_url: avatarUrl }));
    }
    setUploadingAvatar(false);
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Delete this post?')) return;
    await supabase.from('posts').delete().eq('id', postId);
    setPosts(prev => prev.filter(p => p.id !== postId));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="profile-loading">
        <div className="loading-logo">🤖</div>
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="profile-container">
      {/* Header */}
      <div className="profile-header">
        <button className="back-btn" onClick={() => navigate('/home')}>←</button>
        <h1 className="profile-header-title">My Profile</h1>
        <button className="logout-icon-btn" onClick={handleLogout} title="Logout">🚪</button>
      </div>

      {/* Profile Card */}
      <div className="profile-card">
        {/* Avatar */}
        <div className="avatar-section">
          <div className="avatar-wrapper" onClick={() => avatarRef.current?.click()}>
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="avatar" className="profile-avatar-img" />
            ) : (
              <div className="profile-avatar-letter">
                {(profile?.full_name || user?.email || '?')[0]?.toUpperCase()}
              </div>
            )}
            <div className="avatar-overlay">
              {uploadingAvatar ? '⏳' : '📷'}
            </div>
          </div>
          <input
            ref={avatarRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarUpload}
            style={{ display: 'none' }}
          />
          <p className="avatar-hint">Tap photo to change</p>
        </div>

        {/* Profile Info */}
        {!editing ? (
          <div className="profile-info">
            <h2 className="profile-name">
              {profile?.full_name || 'Your Name'}
            </h2>
            <p className="profile-username">
              @{profile?.username || 'username'}
            </p>
            <p className="profile-email">{user?.email}</p>
            {profile?.bio && (
              <p className="profile-bio">{profile.bio}</p>
            )}
            <button className="btn-edit-profile" onClick={() => setEditing(true)}>
              ✏️ Edit Profile
            </button>
          </div>
        ) : (
          <div className="edit-form">
            <div className="edit-field">
              <label>Full Name</label>
              <input
                className="edit-input"
                placeholder="Your full name"
                value={editData.full_name}
                onChange={e => setEditData(prev => ({ ...prev, full_name: e.target.value }))}
              />
            </div>
            <div className="edit-field">
              <label>Username</label>
              <div className="username-input-wrap">
                <span className="at-sign">@</span>
                <input
                  className="edit-input username-input"
                  placeholder="yourname"
                  value={editData.username}
                  onChange={e => setEditData(prev => ({
                    ...prev,
                    username: e.target.value.toLowerCase().replace(/\s/g, '')
                  }))}
                />
              </div>
            </div>
            <div className="edit-field">
              <label>Bio</label>
              <textarea
                className="edit-input bio-input"
                placeholder="Write something about yourself..."
                value={editData.bio}
                onChange={e => setEditData(prev => ({ ...prev, bio: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="edit-actions">
              <button className="btn-cancel" onClick={() => setEditing(false)}>
                Cancel
              </button>
              <button className="btn-save" onClick={handleSaveProfile} disabled={saving}>
                {saving ? '⏳ Saving...' : '✅ Save'}
              </button>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="profile-stats">
          <div className="stat-item">
            <span className="stat-number">{posts.length}</span>
            <span className="stat-label">Posts</span>
          </div>
          <div className="stat-divider"></div>
          <div className="stat-item">
            <span className="stat-number">{profile?.followers_count || 0}</span>
            <span className="stat-label">Followers</span>
          </div>
          <div className="stat-divider"></div>
          <div className="stat-item">
            <span className="stat-number">{profile?.following_count || 0}</span>
            <span className="stat-label">Following</span>
          </div>
        </div>
      </div>

      {/* My Posts */}
      <div className="my-posts-section">
        <h3 className="my-posts-title">📸 My Posts</h3>

        {posts.length === 0 ? (
          <div className="no-posts">
            <div className="no-posts-icon">📝</div>
            <p>No posts yet!</p>
            <button className="btn-create-post" onClick={() => navigate('/feed')}>
              ✨ Create First Post
            </button>
          </div>
        ) : (
          <div className="posts-grid">
            {posts.map(post => (
              <div key={post.id} className="grid-post">
                {post.image_url ? (
                  <img src={post.image_url} alt="post" className="grid-post-image" />
                ) : (
                  <div className="grid-post-text">
                    <p>{post.content?.substring(0, 80)}{post.content?.length > 80 ? '...' : ''}</p>
                  </div>
                )}
                <div className="grid-post-overlay">
                  <span>❤️ {post.likes_count || 0}</span>
                  <span>💬 {post.comments_count || 0}</span>
                  <button
                    className="grid-delete-btn"
                    onClick={() => handleDeletePost(post.id)}
                  >🗑️</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
