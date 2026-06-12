import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import './Feed.css';

export default function Feed() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [postText, setPostText] = useState('');
  const [postImage, setPostImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [likedPosts, setLikedPosts] = useState({});
  const [commentInputs, setCommentInputs] = useState({});
  const [showComments, setShowComments] = useState({});
  const [comments, setComments] = useState({});
  const [deletingPost, setDeletingPost] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { navigate('/login'); return; }
      setUser(session.user);
      loadProfile(session.user.id);
      loadPosts(session.user.id);
    });
  }, [navigate]);

  const loadProfile = async (userId) => {
    const { data } = await supabase
      .from('profiles').select('*').eq('id', userId).single();
    if (data) setProfile(data);
    else {
      const newProfile = { id: userId, full_name: '', username: '', avatar_url: '' };
      await supabase.from('profiles').insert(newProfile);
      setProfile(newProfile);
    }
  };

  const loadPosts = async (userId) => {
    setLoading(true);
    const { data: postsData } = await supabase
      .from('posts')
      .select(`*, profiles(full_name, username, avatar_url)`)
      .order('created_at', { ascending: false })
      .limit(50);

    if (postsData) {
      setPosts(postsData);
      const { data: likesData } = await supabase
        .from('likes').select('post_id').eq('user_id', userId);
      if (likesData) {
        const liked = {};
        likesData.forEach(l => { liked[l.post_id] = true; });
        setLikedPosts(liked);
      }
    }
    setLoading(false);
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('Image must be less than 5MB!'); return; }
    setPostImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handlePost = async () => {
    if (!postText.trim() && !postImage) return;
    setPosting(true);
    let imageUrl = null;

    if (postImage) {
      const fileName = `${user.id}-${Date.now()}.${postImage.name.split('.').pop()}`;
      const { error: uploadError } = await supabase.storage.from('posts').upload(fileName, postImage);
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('posts').getPublicUrl(fileName);
        imageUrl = urlData.publicUrl;
      }
    }

    const { error } = await supabase.from('posts').insert({
      user_id: user.id,
      content: postText.trim(),
      image_url: imageUrl,
      likes_count: 0,
      comments_count: 0
    });

    if (!error) {
      setPostText('');
      setPostImage(null);
      setImagePreview(null);
      setShowCreate(false);
      await loadPosts(user.id);
    }
    setPosting(false);
  };

  const handleLike = async (post) => {
    if (!user) return;
    const isLiked = likedPosts[post.id];
    setLikedPosts(prev => ({ ...prev, [post.id]: !isLiked }));
    setPosts(prev => prev.map(p =>
      p.id === post.id ? { ...p, likes_count: isLiked ? p.likes_count - 1 : p.likes_count + 1 } : p
    ));

    if (isLiked) {
      await supabase.from('likes').delete().eq('post_id', post.id).eq('user_id', user.id);
      await supabase.from('posts').update({ likes_count: Math.max(0, post.likes_count - 1) }).eq('id', post.id);
    } else {
      await supabase.from('likes').insert({ post_id: post.id, user_id: user.id });
      await supabase.from('posts').update({ likes_count: post.likes_count + 1 }).eq('id', post.id);
    }
  };

  const toggleComments = async (postId) => {
    const isOpen = showComments[postId];
    setShowComments(prev => ({ ...prev, [postId]: !isOpen }));
    if (!isOpen && !comments[postId]) {
      const { data } = await supabase
        .from('comments').select(`*, profiles(full_name, username)`)
        .eq('post_id', postId).order('created_at', { ascending: true });
      setComments(prev => ({ ...prev, [postId]: data || [] }));
    }
  };

  const handleComment = async (postId) => {
    const text = commentInputs[postId]?.trim();
    if (!text) return;
    const { data, error } = await supabase.from('comments').insert({
      post_id: postId, user_id: user.id, content: text
    }).select(`*, profiles(full_name, username)`).single();

    if (!error && data) {
      setComments(prev => ({ ...prev, [postId]: [...(prev[postId] || []), data] }));
      setCommentInputs(prev => ({ ...prev, [postId]: '' }));
      setPosts(prev => prev.map(p =>
        p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p
      ));
    }
  };

  // FIXED: Permanent delete with database confirmation
  const handleDeletePost = async (postId) => {
    if (!window.confirm('Delete this post permanently?')) return;
    setDeletingPost(postId);

    try {
      // First delete from likes table
      await supabase.from('likes').delete().eq('post_id', postId);
      // Then delete from comments table
      await supabase.from('comments').delete().eq('post_id', postId);
      // Finally delete the post itself
      const { error } = await supabase.from('posts').delete().eq('id', postId).eq('user_id', user.id);

      if (!error) {
        // Remove from local state immediately
        setPosts(prev => prev.filter(p => p.id !== postId));
      } else {
        alert('Failed to delete post. Please try again!');
        console.error('Delete error:', error);
      }
    } catch (e) {
      alert('Error deleting post!');
      console.error(e);
    }

    setDeletingPost(null);
  };

  const timeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const getAvatar = (p) => {
    if (p?.avatar_url) return <img src={p.avatar_url} alt="" className="post-avatar-img" />;
    const name = p?.full_name || p?.username || '?';
    return <div className="avatar-letter">{name[0]?.toUpperCase()}</div>;
  };

  return (
    <div className="feed-container">
      <div className="feed-header">
        <button className="feed-back-btn" onClick={() => navigate('/home')}>←</button>
        <h1 className="feed-title">🌍 Buddy Feed</h1>
        <button className="feed-create-btn" onClick={() => setShowCreate(true)}>✏️</button>
      </div>

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="create-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create Post ✨</h3>
              <button className="modal-close" onClick={() => setShowCreate(false)}>✕</button>
            </div>
            <div className="modal-user">
              {getAvatar(profile)}
              <span className="modal-username">{profile?.full_name || user?.email?.split('@')[0]}</span>
            </div>
            <textarea
              className="post-textarea"
              placeholder="What's on your mind? 💭"
              value={postText}
              onChange={e => setPostText(e.target.value)}
              rows={4}
              autoFocus
            />
            {imagePreview && (
              <div className="image-preview-box">
                <img src={imagePreview} alt="preview" className="image-preview" />
                <button className="remove-image" onClick={() => { setPostImage(null); setImagePreview(null); }}>✕</button>
              </div>
            )}
            <div className="modal-actions">
              <button className="btn-add-image" onClick={() => fileRef.current.click()}>📷 Add Photo</button>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleImageSelect} style={{ display: 'none' }} />
              <button className="btn-post" onClick={handlePost} disabled={(!postText.trim() && !postImage) || posting}>
                {posting ? '⏳ Posting...' : '🚀 Post'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="feed-list">
        {loading ? (
          <div className="feed-loading">
            <div className="loading-spinner">🤖</div>
            <p>Loading posts...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="feed-empty">
            <div className="empty-icon">📝</div>
            <h3>No posts yet!</h3>
            <p>Be the first to share something!</p>
            <button className="btn-first-post" onClick={() => setShowCreate(true)}>✨ Create First Post</button>
          </div>
        ) : (
          posts.map(post => (
            <div key={post.id} className={`post-card ${deletingPost === post.id ? 'deleting' : ''}`}>
              <div className="post-header">
                <div className="post-avatar">{getAvatar(post.profiles)}</div>
                <div className="post-user-info">
                  <span className="post-name">{post.profiles?.full_name || 'Buddy User'}</span>
                  <span className="post-time">{timeAgo(post.created_at)}</span>
                </div>
                {post.user_id === user?.id && (
                  <button
                    className="post-delete-btn"
                    onClick={() => handleDeletePost(post.id)}
                    disabled={deletingPost === post.id}
                  >
                    {deletingPost === post.id ? '⏳' : '🗑️'}
                  </button>
                )}
              </div>

              {post.content && <p className="post-content">{post.content}</p>}

              {post.image_url && (
                <div className="post-image-box">
                  <img src={post.image_url} alt="post" className="post-image" />
                </div>
              )}

              <div className="post-actions">
                <button
                  className={`action-btn like-btn ${likedPosts[post.id] ? 'liked' : ''}`}
                  onClick={() => handleLike(post)}
                >
                  {likedPosts[post.id] ? '❤️' : '🤍'} {post.likes_count || 0}
                </button>
                <button className="action-btn comment-btn" onClick={() => toggleComments(post.id)}>
                  💬 {post.comments_count || 0}
                </button>
                <button className="action-btn share-btn">📤 Share</button>
              </div>

              {showComments[post.id] && (
                <div className="comments-section">
                  {(comments[post.id] || []).map((c, i) => (
                    <div key={i} className="comment-item">
                      <span className="comment-name">{c.profiles?.full_name || 'User'}</span>
                      <span className="comment-text">{c.content}</span>
                    </div>
                  ))}
                  <div className="comment-input-row">
                    <input
                      className="comment-input"
                      placeholder="Write a comment..."
                      value={commentInputs[post.id] || ''}
                      onChange={e => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                      onKeyDown={e => { if (e.key === 'Enter') handleComment(post.id); }}
                    />
                    <button className="comment-send-btn" onClick={() => handleComment(post.id)}>→</button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <button className="fab-btn" onClick={() => setShowCreate(true)}>✏️</button>
    </div>
  );
}
