import React, { useState, useEffect } from 'react';
import './News.css';
export default function News() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setTimeout(() => { setLoading(false); }, 1000);
  }, []);
  return (
    <div style={{ minHeight:'100vh', background:'#F0F4FF', fontFamily:'Segoe UI,sans-serif', padding:20 }}>
      <h2 style={{ color:'#1E293B' }}>📰 News Feed</h2>
      {loading ? <p style={{ color:'#9CA3AF' }}>Loading news...</p> :
        <p style={{ color:'#9CA3AF' }}>Add your Tavily API key to enable AI-powered news.</p>}
    </div>
  );
}
