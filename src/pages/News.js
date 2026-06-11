import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import './News.css';

const TAVILY_KEY = process.env.REACT_APP_TAVILY_KEY;

const CATEGORIES = [
  { label: '🔥 Trending', query: 'latest trending news today India' },
  { label: '💻 Tech', query: 'latest technology news AI 2025' },
  { label: '🏏 Sports', query: 'latest sports news cricket IPL 2025' },
  { label: '💰 Business', query: 'latest business finance news India 2025' },
  { label: '🎬 Entertainment', query: 'latest Bollywood entertainment news 2025' },
  { label: '🌍 World', query: 'latest world news international 2025' },
];

export default function News() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [bookmarks, setBookmarks] = useState([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { navigate('/login'); return; }
      setUser(session.user);
    });
    // Load saved bookmarks
    const saved = localStorage.getItem('buddy_bookmarks');
    if (saved) setBookmarks(JSON.parse(saved));
  }, [navigate]);

  useEffect(() => {
    fetchNews(activeCategory.query);
  }, [activeCategory]);

  const fetchNews = async (query) => {
    setLoading(true);
    setError('');
    setArticles([]);

    try {
      const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: TAVILY_KEY,
          query: query,
          search_depth: 'basic',
          include_answer: true,
          include_images: true,
          max_results: 10,
          topic: 'news'
        })
      });

      const data = await response.json();

      if (data.error) throw new Error(data.error);

      const results = data.results || [];
      setArticles(results);

    } catch (err) {
      console.error(err);
      setError('❌ Could not load news. Check your Tavily API key!');
    }

    setLoading(false);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    fetchNews(searchQuery);
  };

  const toggleBookmark = (article) => {
    const isBookmarked = bookmarks.find(b => b.url === article.url);
    let newBookmarks;
    if (isBookmarked) {
      newBookmarks = bookmarks.filter(b => b.url !== article.url);
    } else {
      newBookmarks = [...bookmarks, article];
    }
    setBookmarks(newBookmarks);
    localStorage.setItem('buddy_bookmarks', JSON.stringify(newBookmarks));
  };

  const isBookmarked = (url) => bookmarks.some(b => b.url === url);

  const timeAgo = (dateStr) => {
    if (!dateStr) return '';
    try {
      const seconds = Math.floor((new Date() - new Date(dateStr)) / 1000);
      if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
      if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
      return `${Math.floor(seconds / 86400)}d ago`;
    } catch { return ''; }
  };

  const getDomain = (url) => {
    try { return new URL(url).hostname.replace('www.', ''); }
    catch { return ''; }
  };

  return (
    <div className="news-container">
      {/* Header */}
      <div className="news-header">
        <button className="back-btn" onClick={() => navigate('/home')}>←</button>
        <div className="news-header-info">
          <h1 className="news-title">📰 Buddy News</h1>
          <p className="news-subtitle">Latest news powered by Tavily</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="news-search-wrap">
        <form onSubmit={handleSearch} className="news-search-form">
          <div className="news-search-box">
            <span className="search-icon">🔍</span>
            <input
              className="news-search-input"
              placeholder="Search any news topic..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="clear-search"
                onClick={() => {
                  setSearchQuery('');
                  fetchNews(activeCategory.query);
                }}
              >✕</button>
            )}
          </div>
          <button type="submit" className="btn-search">Search</button>
        </form>
      </div>

      {/* Categories */}
      <div className="categories-scroll">
        {CATEGORIES.map((cat, i) => (
          <button
            key={i}
            className={`cat-btn ${activeCategory.label === cat.label ? 'active' : ''}`}
            onClick={() => {
              setActiveCategory(cat);
              setSearchQuery('');
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* News Content */}
      <div className="news-content">
        {loading ? (
          <div className="news-loading">
            <div className="news-loading-dots">
              <span></span><span></span><span></span>
            </div>
            <p>Fetching latest news...</p>
          </div>
        ) : error ? (
          <div className="news-error">
            <div className="error-icon">📡</div>
            <p>{error}</p>
            <button className="btn-retry" onClick={() => fetchNews(activeCategory.query)}>
              🔄 Try Again
            </button>
          </div>
        ) : articles.length === 0 ? (
          <div className="news-empty">
            <div>📰</div>
            <p>No news found. Try a different topic!</p>
          </div>
        ) : (
          <>
            {/* Featured Article */}
            {articles[0] && (
              <div
                className="featured-article"
                onClick={() => window.open(articles[0].url, '_blank')}
              >
                {articles[0].image && (
                  <div className="featured-image-wrap">
                    <img
                      src={articles[0].image}
                      alt="news"
                      className="featured-image"
                      onError={e => e.target.style.display = 'none'}
                    />
                  </div>
                )}
                <div className="featured-content">
                  <div className="article-meta">
                    <span className="article-source">{getDomain(articles[0].url)}</span>
                    <span className="article-time">{timeAgo(articles[0].published_date)}</span>
                  </div>
                  <h2 className="featured-title">{articles[0].title}</h2>
                  <p className="featured-snippet">
                    {articles[0].content?.substring(0, 150)}...
                  </p>
                  <div className="article-actions">
                    <span className="read-more">Read full story →</span>
                    <button
                      className={`bookmark-btn ${isBookmarked(articles[0].url) ? 'bookmarked' : ''}`}
                      onClick={e => { e.stopPropagation(); toggleBookmark(articles[0]); }}
                    >
                      {isBookmarked(articles[0].url) ? '🔖' : '📌'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Rest Articles */}
            <div className="articles-list">
              {articles.slice(1).map((article, i) => (
                <div
                  key={i}
                  className="article-card"
                  onClick={() => window.open(article.url, '_blank')}
                >
                  <div className="article-body">
                    <div className="article-meta">
                      <span className="article-source">{getDomain(article.url)}</span>
                      <span className="article-time">{timeAgo(article.published_date)}</span>
                    </div>
                    <h3 className="article-title">{article.title}</h3>
                    <p className="article-snippet">
                      {article.content?.substring(0, 100)}...
                    </p>
                  </div>
                  {article.image && (
                    <div className="article-thumbnail">
                      <img
                        src={article.image}
                        alt="news"
                        className="thumbnail-img"
                        onError={e => e.target.parentElement.style.display = 'none'}
                      />
                    </div>
                  )}
                  <button
                    className={`article-bookmark ${isBookmarked(article.url) ? 'bookmarked' : ''}`}
                    onClick={e => { e.stopPropagation(); toggleBookmark(article); }}
                  >
                    {isBookmarked(article.url) ? '🔖' : '📌'}
                  </button>
                </div>
              ))}
            </div>

            {/* Bookmarks Section */}
            {bookmarks.length > 0 && (
              <div className="bookmarks-section">
                <h3 className="bookmarks-title">🔖 Your Saved Articles ({bookmarks.length})</h3>
                {bookmarks.map((article, i) => (
                  <div
                    key={i}
                    className="article-card"
                    onClick={() => window.open(article.url, '_blank')}
                  >
                    <div className="article-body">
                      <span className="article-source">{getDomain(article.url)}</span>
                      <h3 className="article-title">{article.title}</h3>
                    </div>
                    <button
                      className="article-bookmark bookmarked"
                      onClick={e => { e.stopPropagation(); toggleBookmark(article); }}
                    >🔖</button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
