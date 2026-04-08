import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import './App.css';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

// Particle Canvas Component
function ParticleCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let particles = [];
    let animationId;

    function resizeCanvas() {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * ratio;
      canvas.height = window.innerHeight * ratio;
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(ratio, ratio);
      buildParticles();
    }

    function buildParticles() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const count = Math.max(34, Math.min(90, Math.floor(w / 18)));
      particles = [];
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: Math.random() * 1.8 + 0.4,
          speed: Math.random() * 0.45 + 0.12,
          alpha: Math.random() * 0.65 + 0.15
        });
      }
    }

    function animate() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);
      
      particles.forEach(p => {
        p.y -= p.speed;
        if (p.y < -8) {
          p.y = h + 8;
          p.x = Math.random() * w;
        }
        ctx.beginPath();
        ctx.fillStyle = `rgba(255,255,255,${p.alpha})`;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });

      animationId = requestAnimationFrame(animate);
    }

    resizeCanvas();
    animate();
    window.addEventListener('resize', resizeCanvas);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return <canvas ref={canvasRef} className="particle-canvas" aria-hidden="true" />;
}

// Toast Component
function Toast({ message, show }) {
  return (
    <div className={`toast ${show ? 'show' : ''}`} role="status" aria-live="polite">
      {message}
    </div>
  );
}

// Auth Components
function AuthForm({ onSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ email: '', password: '', name: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const response = await axios.post(`${API_URL}${endpoint}`, formData);
      
      localStorage.setItem('token', response.data.access_token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      onSuccess(response.data.user);
    } catch (err) {
      setError(err.response?.data?.detail || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <h2 className="auth-title">{isLogin ? 'Login' : 'Register'}</h2>
      
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleSubmit}>
        {!isLogin && (
          <div className="form-group">
            <label className="form-label">Name</label>
            <input
              type="text"
              className="form-input"
              placeholder="Your name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
        )}
        
        <div className="form-group">
          <label className="form-label">Email</label>
          <input
            type="email"
            className="form-input"
            placeholder="you@example.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />
        </div>
        
        <div className="form-group">
          <label className="form-label">Password</label>
          <input
            type="password"
            className="form-input"
            placeholder="••••••••"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required
          />
        </div>
        
        <button type="submit" className="submit-btn" disabled={loading}>
          {loading ? 'Processing...' : (isLogin ? 'Login' : 'Create Account')}
        </button>
      </form>
      
      <div className="auth-switch">
        {isLogin ? "Don't have an account? " : "Already have an account? "}
        <span className="auth-link" onClick={() => setIsLogin(!isLogin)}>
          {isLogin ? 'Register' : 'Login'}
        </span>
      </div>
    </div>
  );
}

// Casino Card Component
function CasinoCard({ casino, userLink, onSaveLink, onDeleteLink, onTrackClick, showToast }) {
  const [isEditing, setIsEditing] = useState(false);
  const [url, setUrl] = useState(userLink?.url || '');
  const [note, setNote] = useState(userLink?.note || '');

  const formatName = (name) => {
    return name.split(' ').map(w => 
      w.length <= 3 && !w.includes('.') ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)
    ).join(' ');
  };

  const categoryLabel = (cat) => {
    if (cat === 'sweepstakes') return 'Sweepstakes';
    if (cat === 'crypto') return 'Crypto';
    return 'Other';
  };

  const logoUrl = (domain) => {
    return `https://www.google.com/s2/favicons?sz=128&domain=${encodeURIComponent(domain || 'rroll.my')}`;
  };

  const handleSave = async () => {
    if (!url.trim()) return;
    
    await onSaveLink(casino.name, url, note);
    setIsEditing(false);
    showToast(userLink ? 'Link Updated ✅' : 'Link Added 🎰');
  };

  const handleVisit = () => {
    if (userLink) {
      onTrackClick(userLink.link_id);
      window.open(userLink.url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast('Copied ✅');
    } catch (err) {
      const temp = document.createElement('textarea');
      temp.value = text;
      document.body.appendChild(temp);
      temp.select();
      document.execCommand('copy');
      document.body.removeChild(temp);
      showToast('Copied ✅');
    }
  };

  const status = userLink ? 'done' : 'missing';
  const badgeClass = status === 'done' ? 'badge done' : 'badge missing';
  const badgeText = status === 'done' ? 'Completed' : 'Missing';

  const subText = isEditing 
    ? 'paste the referral link below, then save it'
    : status === 'done'
      ? casino.desc || userLink.note || 'referral link saved'
      : casino.desc || 'tap add link to paste your referral URL';

  return (
    <article className="card" data-status={status} data-testid={`casino-card-${casino.name}`}>
      <div className="card-top">
        <div className="left-meta">
          <div className="casino-row">
            <img 
              className="casino-logo" 
              src={logoUrl(casino.logoDomain)} 
              alt={`${formatName(casino.name)} logo`} 
              loading="lazy" 
              referrerPolicy="no-referrer" 
            />
            <div>
              <h3 className="casino-name">{formatName(casino.name)}</h3>
              <div className="casino-sub">{subText}</div>
            </div>
          </div>
          
          <div className="meta-row">
            <span className="mini-tag">{categoryLabel(casino.category)}</span>
            {casino.logoDomain && (
              <span className="mini-tag">{casino.logoDomain.replace(/^www\./, '')}</span>
            )}
            {userLink && userLink.total_clicks > 0 && (
              <span className="mini-tag">👆 {userLink.total_clicks} clicks</span>
            )}
          </div>

          {casino.chips && casino.chips.length > 0 && (
            <div className="chips-row">
              {casino.chips.map((chip, i) => (
                <span key={i} className="chip">{chip}</span>
              ))}
            </div>
          )}

          {!isEditing && casino.bonus && (
            <div className="bonus-box">
              <span className="bonus-icon">🎁</span>
              <span className="bonus-text">{casino.bonus}</span>
            </div>
          )}
        </div>
        
        <div className={badgeClass}>{badgeText}</div>
      </div>

      {isEditing ? (
        <div className="link-editor">
          <input
            type="text"
            className="link-input"
            placeholder="Paste referral link here..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            autoFocus
          />
          <input
            type="text"
            className="link-input"
            placeholder="Add a note (optional)..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="editor-actions">
            <button className="save-btn" onClick={handleSave} data-testid="save-link-btn">
              Save Link
            </button>
            <button className="cancel-btn" onClick={() => setIsEditing(false)} data-testid="cancel-btn">
              Cancel
            </button>
          </div>
        </div>
      ) : status === 'done' ? (
        <div className="actions">
          <button className="visit-btn" onClick={handleVisit} data-testid="visit-link-btn">
            Open Link
          </button>
          <button className="edit-btn" onClick={() => setIsEditing(true)} data-testid="edit-link-btn">
            Edit Link
          </button>
          <button className="copy-btn" onClick={() => handleCopy(userLink.url)} data-testid="copy-link-btn">
            Copy
          </button>
        </div>
      ) : (
        <div className="actions">
          <button className="add-btn" onClick={() => setIsEditing(true)} data-testid="add-link-btn">
            Add Link
          </button>
          <div style={{ border: '1px solid var(--border)', borderRadius: '14px', padding: '12px', textAlign: 'center', color: 'var(--muted)', fontSize: '0.85rem' }}>
            No Link Yet
          </div>
          <button className="copy-btn" onClick={() => handleCopy(casino.name)} data-testid="copy-name-btn">
            Copy Name
          </button>
        </div>
      )}
    </article>
  );
}

// Main Dashboard Component
function Dashboard({ user, onLogout }) {
  const [casinos, setCasinos] = useState([]);
  const [userLinks, setUserLinks] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [analytics, setAnalytics] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  const token = localStorage.getItem('token');
  const axiosConfig = {
    headers: { Authorization: `Bearer ${token}` }
  };

  useEffect(() => {
    fetchCasinos();
    fetchUserLinks();
    if (activeTab === 'analytics') {
      fetchAnalytics();
    }
    if (activeTab === 'leaderboard') {
      fetchLeaderboard();
    }
  }, [activeTab]);

  const fetchCasinos = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/casinos`);
      setCasinos(response.data.casinos);
    } catch (err) {
      console.error('Error fetching casinos:', err);
    }
  };

  const fetchUserLinks = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/user-links`, axiosConfig);
      setUserLinks(response.data.links);
    } catch (err) {
      console.error('Error fetching user links:', err);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/analytics/me`, axiosConfig);
      setAnalytics(response.data);
    } catch (err) {
      console.error('Error fetching analytics:', err);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/analytics/leaderboard`);
      setLeaderboard(response.data.leaderboard);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    }
  };

  const displayToast = (message) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2200);
  };

  const handleSaveLink = async (casinoName, url, note) => {
    try {
      const existingLink = userLinks.find(l => l.casino_name === casinoName);
      
      if (existingLink) {
        await axios.put(
          `${API_URL}/api/user-links/${existingLink.link_id}`,
          { url, note },
          axiosConfig
        );
      } else {
        await axios.post(
          `${API_URL}/api/user-links`,
          { casino_name: casinoName, url, note },
          axiosConfig
        );
      }
      
      fetchUserLinks();
    } catch (err) {
      console.error('Error saving link:', err);
      displayToast('Error saving link ❌');
    }
  };

  const handleDeleteLink = async (linkId) => {
    try {
      await axios.delete(`${API_URL}/api/user-links/${linkId}`, axiosConfig);
      fetchUserLinks();
      displayToast('Link deleted ✅');
    } catch (err) {
      console.error('Error deleting link:', err);
    }
  };

  const handleTrackClick = async (linkId) => {
    try {
      await axios.post(`${API_URL}/api/track-click`, { link_id: linkId });
    } catch (err) {
      console.error('Error tracking click:', err);
    }
  };

  const handleCopyCompleted = async () => {
    const completedLinks = casinos
      .filter(c => userLinks.find(l => l.casino_name === c.name))
      .map(c => {
        const link = userLinks.find(l => l.casino_name === c.name);
        const name = c.name.split(' ').map(w => 
          w.length <= 3 && !w.includes('.') ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)
        ).join(' ');
        return `${name} - ${link.url}${link.note ? ` (${link.note})` : ''}`;
      })
      .join('\n');
    
    try {
      await navigator.clipboard.writeText(completedLinks);
      displayToast('Copied All Completed Links ✅');
    } catch (err) {
      displayToast('Error copying ❌');
    }
  };

  // Filter and search logic
  const filteredCasinos = useMemo(() => {
    return casinos.filter(casino => {
      const matchesSearch = casino.name.toLowerCase().includes(searchTerm.toLowerCase().trim());
      
      let matchesFilter = true;
      if (activeFilter === 'done') {
        matchesFilter = userLinks.some(l => l.casino_name === casino.name);
      } else if (activeFilter === 'missing') {
        matchesFilter = !userLinks.some(l => l.casino_name === casino.name);
      } else if (activeFilter !== 'all') {
        matchesFilter = casino.category === activeFilter;
      }
      
      return matchesSearch && matchesFilter;
    });
  }, [casinos, userLinks, searchTerm, activeFilter]);

  const completedCasinos = useMemo(() => {
    return filteredCasinos.filter(c => userLinks.some(l => l.casino_name === c.name))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredCasinos, userLinks]);

  const missingCasinos = useMemo(() => {
    return filteredCasinos.filter(c => !userLinks.some(l => l.casino_name === c.name))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredCasinos, userLinks]);

  const totalLinks = userLinks.length;
  const totalCasinos = casinos.length;
  const missingLinks = totalCasinos - totalLinks;

  return (
    <>
      <div className="wrap">
        <div className="topbar">
          <div className="brand-mini" onClick={() => setActiveTab('dashboard')}>RROLL</div>
          <div className="user-menu">
            <span className="user-email">{user.email}</span>
            <button className="logout-btn" onClick={onLogout} data-testid="logout-btn">
              Logout
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="tab-nav">
          <button 
            className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
            data-testid="dashboard-tab"
          >
            Dashboard
          </button>
          <button 
            className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
            data-testid="analytics-tab"
          >
            Analytics
          </button>
          <button 
            className={`tab-btn ${activeTab === 'leaderboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('leaderboard')}
            data-testid="leaderboard-tab"
          >
            Leaderboard
          </button>
          {user.role === 'admin' && (
            <button 
              className={`tab-btn ${activeTab === 'admin' ? 'active' : ''}`}
              onClick={() => setActiveTab('admin')}
              data-testid="admin-tab"
            >
              Admin
            </button>
          )}
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <>
            <section className="hero">
              <div className="hero-label">
                <span className="dot"></span> Organized referral tracker
              </div>
              <div className="hero-top">
                <div className="title-wrap">
                  <h1 className="title">
                    RR<span className="dice-o"></span>LL
                  </h1>
                  <p className="subtext">
                    Advanced dark referral hub with cloud sync, analytics, click tracking, and earnings dashboard. 
                    Never lose track of your casino links again.
                  </p>
                </div>
                <div className="hero-right">
                  <div className="count-box">
                    <strong data-testid="hero-done-count">{totalLinks}</strong>
                    <span>Done</span>
                  </div>
                </div>
              </div>
              <div className="hero-actions">
                <a href="#completedSection" className="solid-btn" data-testid="scroll-completed-btn">
                  Completed Links
                </a>
                <a href="#missingSection" className="ghost-btn" data-testid="scroll-missing-btn">
                  Missing Links
                </a>
                <button className="ghost-btn" onClick={handleCopyCompleted} data-testid="copy-completed-btn">
                  Copy Completed
                </button>
              </div>
            </section>

            <section className="toolbar">
              <div className="search-box">
                <input
                  type="text"
                  placeholder="Search casino name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  autoComplete="off"
                  data-testid="search-input"
                />
              </div>
              <div className="filter-box">
                <button 
                  className={`filter-btn ${activeFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setActiveFilter('all')}
                  data-testid="filter-all"
                >
                  All
                </button>
                <button 
                  className={`filter-btn ${activeFilter === 'sweepstakes' ? 'active' : ''}`}
                  onClick={() => setActiveFilter('sweepstakes')}
                  data-testid="filter-sweepstakes"
                >
                  Sweepstakes
                </button>
                <button 
                  className={`filter-btn ${activeFilter === 'crypto' ? 'active' : ''}`}
                  onClick={() => setActiveFilter('crypto')}
                  data-testid="filter-crypto"
                >
                  Crypto
                </button>
                <button 
                  className={`filter-btn ${activeFilter === 'other' ? 'active' : ''}`}
                  onClick={() => setActiveFilter('other')}
                  data-testid="filter-other"
                >
                  Other
                </button>
                <button 
                  className={`filter-btn ${activeFilter === 'done' ? 'active' : ''}`}
                  onClick={() => setActiveFilter('done')}
                  data-testid="filter-done"
                >
                  Done
                </button>
                <button 
                  className={`filter-btn ${activeFilter === 'missing' ? 'active' : ''}`}
                  onClick={() => setActiveFilter('missing')}
                  data-testid="filter-missing"
                >
                  Missing
                </button>
              </div>
            </section>

            <section className="stats">
              <div className="stat-card">
                <span className="kicker">Total</span>
                <strong data-testid="total-count">{totalCasinos}</strong>
              </div>
              <div className="stat-card">
                <span className="kicker">Completed</span>
                <strong data-testid="done-count">{totalLinks}</strong>
              </div>
              <div className="stat-card">
                <span className="kicker">Missing</span>
                <strong data-testid="missing-count">{missingLinks}</strong>
              </div>
              <div className="stat-card">
                <span className="kicker">Category</span>
                <strong data-testid="active-category">
                  {activeFilter === 'all' ? 'All' : activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1)}
                </strong>
              </div>
            </section>

            <section className="section" id="completedSection">
              <div className="section-head">
                <h2>Completed</h2>
                <div className="count" data-testid="completed-visible-count">{completedCasinos.length} visible</div>
              </div>
              <div className="grid" data-testid="completed-grid">
                {completedCasinos.map(casino => (
                  <CasinoCard
                    key={casino.name}
                    casino={casino}
                    userLink={userLinks.find(l => l.casino_name === casino.name)}
                    onSaveLink={handleSaveLink}
                    onDeleteLink={handleDeleteLink}
                    onTrackClick={handleTrackClick}
                    showToast={displayToast}
                  />
                ))}
              </div>
              {completedCasinos.length === 0 && (
                <div className="empty-state">No completed links yet. Add your first referral link!</div>
              )}
            </section>

            <section className="section" id="missingSection">
              <div className="section-head">
                <h2>Missing</h2>
                <div className="count" data-testid="missing-visible-count">{missingCasinos.length} visible</div>
              </div>
              <div className="grid" data-testid="missing-grid">
                {missingCasinos.map(casino => (
                  <CasinoCard
                    key={casino.name}
                    casino={casino}
                    userLink={null}
                    onSaveLink={handleSaveLink}
                    onDeleteLink={handleDeleteLink}
                    onTrackClick={handleTrackClick}
                    showToast={displayToast}
                  />
                ))}
              </div>
              {missingCasinos.length === 0 && (
                <div className="empty-state">All casinos have links! 🎉</div>
              )}
            </section>
          </>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="analytics-grid">
            <div className="analytics-card">
              <h3>Total Links</h3>
              <div className="analytics-value" data-testid="analytics-total-links">
                {analytics?.total_links || 0}
              </div>
              <div className="analytics-label">Referral links saved</div>
            </div>
            
            <div className="analytics-card">
              <h3>Total Clicks</h3>
              <div className="analytics-value" data-testid="analytics-total-clicks">
                {analytics?.total_clicks || 0}
              </div>
              <div className="analytics-label">Tracked clicks</div>
            </div>
            
            <div className="analytics-card">
              <h3>Estimated Earnings</h3>
              <div className="analytics-value" data-testid="analytics-earnings">
                ${(analytics?.estimated_earnings || 0).toFixed(2)}
              </div>
              <div className="analytics-label">Based on $0.50 per click</div>
            </div>

            <div className="analytics-card">
              <h3>Top Performing Links</h3>
              {analytics?.top_links && analytics.top_links.length > 0 ? (
                <div style={{ marginTop: '14px' }}>
                  {analytics.top_links.slice(0, 5).map((link, idx) => (
                    <div key={idx} style={{ 
                      padding: '8px 0', 
                      borderBottom: idx < 4 ? '1px solid var(--border)' : 'none',
                      display: 'flex',
                      justifyContent: 'space-between'
                    }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                        {link.casino_name}
                      </span>
                      <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--gold)' }}>
                        {link.total_clicks} clicks
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ marginTop: '14px', color: 'var(--muted-2)', fontSize: '0.85rem' }}>
                  No clicks yet. Share your links to start tracking!
                </div>
              )}
            </div>
          </div>
        )}

        {/* Leaderboard Tab */}
        {activeTab === 'leaderboard' && (
          <div className="section">
            <div className="section-head">
              <h2>🏆 Top Users by Clicks</h2>
            </div>
            <div className="leaderboard-list" data-testid="leaderboard-list">
              {leaderboard.map((user, idx) => (
                <div key={user.user_id} className="leaderboard-item" data-testid={`leaderboard-item-${idx}`}>
                  <div className="leaderboard-rank">#{idx + 1}</div>
                  <div className="leaderboard-name">{user.name}</div>
                  <div className="leaderboard-stat">{user.total_clicks} clicks</div>
                </div>
              ))}
              {leaderboard.length === 0 && (
                <div className="empty-state">No users on the leaderboard yet.</div>
              )}
            </div>
          </div>
        )}

        {/* Admin Tab */}
        {activeTab === 'admin' && user.role === 'admin' && (
          <div className="section">
            <div className="section-head">
              <h2>👑 Admin Dashboard</h2>
            </div>
            <div className="analytics-grid">
              <div className="analytics-card">
                <h3>Platform Stats</h3>
                <div style={{ marginTop: '14px', fontSize: '0.9rem', lineHeight: '1.8' }}>
                  <div>Total Users: <strong>{user.total_clicks || 0}</strong></div>
                  <div>Total Casinos: <strong>{casinos.length}</strong></div>
                  <div>Total Links: <strong>{totalLinks}</strong></div>
                </div>
              </div>
              
              <div className="analytics-card">
                <h3>Admin Actions</h3>
                <div style={{ marginTop: '14px' }}>
                  <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
                    Admin panel for managing casinos and users coming soon!
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <Toast message={toastMessage} show={showToast} />
    </>
  );
}

// Main App Component
export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
    }
    
    setLoading(false);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const handleAuthSuccess = (userData) => {
    setUser(userData);
  };

  if (loading) {
    return (
      <>
        <div className="noise" aria-hidden="true"></div>
        <div className="scanlines" aria-hidden="true"></div>
        <ParticleCanvas />
        <div className="wrap" style={{ textAlign: 'center', paddingTop: '100px' }}>
          <h1 className="title">Loading...</h1>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="noise" aria-hidden="true"></div>
      <div className="scanlines" aria-hidden="true"></div>
      <ParticleCanvas />
      
      {user ? (
        <Dashboard user={user} onLogout={handleLogout} />
      ) : (
        <div className="wrap">
          <div className="topbar">
            <div className="brand-mini">RROLL</div>
            <div className="status-pill">Referral Hub / v2.0</div>
          </div>
          <AuthForm onSuccess={handleAuthSuccess} />
        </div>
      )}
    </>
  );
}
