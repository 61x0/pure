import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import './App.css';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

// Constants
const MIN_PARTICLES = 34;
const MAX_PARTICLES = 90;
const PARTICLE_DENSITY = 18;

// ==================== Particle Canvas Component ====================
function ParticleCanvas() {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const animationIdRef = useRef(null);

  const buildParticles = useCallback((width, height) => {
    const count = Math.max(MIN_PARTICLES, Math.min(MAX_PARTICLES, Math.floor(width / PARTICLE_DENSITY)));
    const newParticles = [];
    for (let i = 0; i < count; i++) {
      newParticles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 1.8 + 0.4,
        speed: Math.random() * 0.45 + 0.12,
        alpha: Math.random() * 0.65 + 0.15
      });
    }
    particlesRef.current = newParticles;
  }, []);

  const animate = useCallback((ctx, width, height) => {
    ctx.clearRect(0, 0, width, height);
    
    particlesRef.current.forEach(p => {
      p.y -= p.speed;
      if (p.y < -8) {
        p.y = height + 8;
        p.x = Math.random() * width;
      }
      ctx.beginPath();
      ctx.fillStyle = `rgba(255,255,255,${p.alpha})`;
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });

    animationIdRef.current = requestAnimationFrame(() => animate(ctx, width, height));
  }, []);

  const resizeCanvas = useCallback((canvas, ctx) => {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = window.innerWidth * ratio;
    canvas.height = window.innerHeight * ratio;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(ratio, ratio);
    buildParticles(window.innerWidth, window.innerHeight);
  }, [buildParticles]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    
    const handleResize = () => {
      resizeCanvas(canvas, ctx);
    };

    resizeCanvas(canvas, ctx);
    animate(ctx, window.innerWidth, window.innerHeight);
    
    window.addEventListener('resize', handleResize);

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [resizeCanvas, animate]);

  return <canvas ref={canvasRef} className="particle-canvas" aria-hidden="true" />;
}

// ==================== Toast Component ====================
function Toast({ message, show }) {
  return (
    <div className={`toast ${show ? 'show' : ''}`} role="status" aria-live="polite">
      {message}
    </div>
  );
}

// ==================== Welcome Screen Component ====================
function WelcomeScreen({ onContinueAsGuest, onShowAuth }) {
  return (
    <div className="wrap">
      <div className="topbar">
        <div className="brand-mini">RROLL</div>
      </div>
      
      <div className="welcome-hero">
        <div className="hero-label">
          <span className="dot"></span> Smart Gambling Insights
        </div>
        <h1 className="title">
          RR<span className="dice-o"></span>LL
        </h1>
        <p className="welcome-tagline">
          Master the odds. Maximize the edge.
        </p>
        
        <div className="welcome-features">
          <div className="feature-item">
            <span className="feature-icon">📊</span>
            <h3>Strategy Guides</h3>
            <p>Learn proven techniques for RTP optimization, VIP leveling, and bonus hunting</p>
          </div>
          <div className="feature-item">
            <span className="feature-icon">🎰</span>
            <h3>Casino Rankings</h3>
            <p>Discover top-rated platforms with honest reviews and expert ratings</p>
          </div>
          <div className="feature-item">
            <span className="feature-icon">🧮</span>
            <h3>Profit Tools</h3>
            <p>Calculate RTP, variance, and potential returns with our advanced tools</p>
          </div>
        </div>

        <div className="welcome-actions">
          <button className="solid-btn" onClick={onContinueAsGuest} data-testid="continue-guest">
            Continue as Guest
          </button>
          <button className="ghost-btn" onClick={onShowAuth} data-testid="show-login">
            Sign In
          </button>
        </div>

        <p className="welcome-note">
          No signup required • Browse freely • Save favorites by creating an account
        </p>
      </div>
    </div>
  );
}

// ==================== Auth Modal Component ====================
function AuthModal({ onClose, onSuccess }) {
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
      
      sessionStorage.setItem('token', response.data.access_token);
      sessionStorage.setItem('user', JSON.stringify(response.data.user));
      
      onSuccess(response.data.user);
    } catch (err) {
      setError(err.response?.data?.detail || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} data-testid="close-modal">×</button>
        
        <h2 className="auth-title">{isLogin ? 'Welcome Back' : 'Join RROLL'}</h2>
        
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
                data-testid="auth-name"
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
              data-testid="auth-email"
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
              data-testid="auth-password"
            />
          </div>
          
          <button type="submit" className="submit-btn" disabled={loading} data-testid="auth-submit">
            {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>
        
        <div className="auth-switch">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <span className="auth-link" onClick={() => setIsLogin(!isLogin)} data-testid="toggle-auth">
            {isLogin ? 'Sign Up' : 'Sign In'}
          </span>
        </div>
      </div>
    </div>
  );
}

// ==================== Casino Card Component ====================
function CasinoCard({ casino, userNote, onSaveNote, onTrackClick, showToast, isAuthenticated }) {
  const [showNoteEditor, setShowNoteEditor] = useState(false);
  const [note, setNote] = useState(userNote?.notes || '');
  const [rating, setRating] = useState(userNote?.personal_rating || 0);
  const [isFavorite, setIsFavorite] = useState(userNote?.is_favorite || false);

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

  const handleVisitCasino = () => {
    onTrackClick(casino.name);
    window.open(casino.referral_url, '_blank', 'noopener,noreferrer');
    showToast('Opening casino... 🎰');
  };

  const handleSaveNote = async () => {
    if (!isAuthenticated) {
      showToast('Sign in to save notes');
      return;
    }
    await onSaveNote(casino.name, rating, note, isFavorite);
    setShowNoteEditor(false);
    showToast('Note saved ✅');
  };

  return (
    <article className="card" data-testid={`casino-card-${casino.name}`}>
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
              <div className="casino-sub">{casino.desc || 'Top-rated casino platform'}</div>
            </div>
          </div>
          
          <div className="meta-row">
            <span className="mini-tag">⭐ {casino.admin_rating || 'N/A'}</span>
            <span className="mini-tag">{categoryLabel(casino.category)}</span>
            {casino.rtp_info && <span className="mini-tag">RTP: {casino.rtp_info}</span>}
            {casino.withdrawal_speed && <span className="mini-tag">⚡ {casino.withdrawal_speed}</span>}
          </div>

          {casino.chips && casino.chips.length > 0 && (
            <div className="chips-row">
              {casino.chips.map((chip, i) => (
                <span key={i} className="chip">{chip}</span>
              ))}
            </div>
          )}

          {casino.bonus && (
            <div className="bonus-box">
              <span className="bonus-icon">🎁</span>
              <span className="bonus-text">{casino.bonus}</span>
            </div>
          )}

          {userNote && userNote.notes && (
            <div className="user-note-display">
              <strong>My Note:</strong> {userNote.notes}
              {userNote.personal_rating > 0 && <span> (⭐ {userNote.personal_rating})</span>}
            </div>
          )}
        </div>
        
        {isFavorite && <div className="badge favorite">❤️ Favorite</div>}
      </div>

      {showNoteEditor ? (
        <div className="note-editor">
          <div className="form-group">
            <label className="form-label">Your Rating (1-10)</label>
            <input
              type="number"
              className="form-input"
              min="0"
              max="10"
              step="0.5"
              value={rating}
              onChange={(e) => setRating(parseFloat(e.target.value))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Personal Notes</label>
            <textarea
              className="form-input"
              placeholder="Add your notes about this casino..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows="3"
            />
          </div>
          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={isFavorite}
                onChange={(e) => setIsFavorite(e.target.checked)}
              />
              <span>Mark as Favorite</span>
            </label>
          </div>
          <div className="editor-actions">
            <button className="save-btn" onClick={handleSaveNote}>Save Note</button>
            <button className="cancel-btn" onClick={() => setShowNoteEditor(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <div className="actions">
          <button className="visit-btn" onClick={handleVisitCasino} data-testid="visit-casino">
            Visit Casino →
          </button>
          {isAuthenticated && (
            <button className="edit-btn" onClick={() => setShowNoteEditor(true)} data-testid="add-note">
              {userNote ? 'Edit Note' : 'Add Note'}
            </button>
          )}
        </div>
      )}
    </article>
  );
}

// ==================== Main Dashboard Component ====================
function MainDashboard({ user, onLogout, onShowAuth }) {
  const [casinos, setCasinos] = useState([]);
  const [userNotes, setUserNotes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('casinos');
  const [strategies, setStrategies] = useState([]);
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToastState] = useState(false);

  const token = sessionStorage.getItem('token');
  const axiosConfig = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
  const isAuthenticated = !!user;

  useEffect(() => {
    fetchCasinos();
    fetchStrategies();
    if (isAuthenticated) {
      fetchUserNotes();
    }
  }, [isAuthenticated]);

  const fetchCasinos = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/casinos`);
      setCasinos(response.data.casinos);
    } catch (err) {
      console.error('Error fetching casinos:', err);
    }
  };

  const fetchUserNotes = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/my-notes`, axiosConfig);
      setUserNotes(response.data.notes);
    } catch (err) {
      console.error('Error fetching notes:', err);
    }
  };

  const fetchStrategies = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/strategies`);
      setStrategies(response.data.strategies);
    } catch (err) {
      console.error('Error fetching strategies:', err);
    }
  };

  const displayToast = (message) => {
    setToastMessage(message);
    setShowToastState(true);
    setTimeout(() => setShowToastState(false), 2200);
  };

  const handleSaveNote = async (casinoName, rating, notes, isFavorite) => {
    try {
      await axios.post(
        `${API_URL}/api/my-notes`,
        { 
          casino_name: casinoName, 
          personal_rating: rating,
          notes: notes,
          is_favorite: isFavorite
        },
        axiosConfig
      );
      fetchUserNotes();
    } catch (err) {
      console.error('Error saving note:', err);
      displayToast('Error saving note ❌');
    }
  };

  const handleTrackClick = async (casinoName) => {
    try {
      await axios.post(`${API_URL}/api/track-click`, { casino_name: casinoName });
    } catch (err) {
      console.error('Error tracking click:', err);
    }
  };

  const filteredCasinos = casinos.filter(casino => {
    const matchesSearch = casino.name.toLowerCase().includes(searchTerm.toLowerCase().trim());
    const matchesFilter = activeFilter === 'all' || casino.category === activeFilter;
    return matchesSearch && matchesFilter;
  }).sort((a, b) => (b.admin_rating || 0) - (a.admin_rating || 0));

  return (
    <>
      <div className="wrap">
        <div className="topbar">
          <div className="brand-mini">RROLL</div>
          <div className="user-menu">
            {isAuthenticated ? (
              <>
                <span className="user-email">{user.email}</span>
                <button className="logout-btn" onClick={onLogout} data-testid="logout-btn">
                  Logout
                </button>
              </>
            ) : (
              <button className="login-btn" onClick={onShowAuth} data-testid="show-auth-btn">
                Sign In
              </button>
            )}
          </div>
        </div>

        <section className="hero">
          <div className="hero-label">
            <span className="dot"></span> Smart Gambling Insights
          </div>
          <div className="hero-top">
            <div className="title-wrap">
              <h1 className="title">
                RR<span className="dice-o"></span>LL
              </h1>
              <p className="subtext">
                Master the odds. Maximize the edge.
              </p>
            </div>
          </div>
        </section>

        <div className="tab-nav">
          <button 
            className={`tab-btn ${activeTab === 'casinos' ? 'active' : ''}`}
            onClick={() => setActiveTab('casinos')}
            data-testid="casinos-tab"
          >
            Casino Rankings
          </button>
          <button 
            className={`tab-btn ${activeTab === 'strategies' ? 'active' : ''}`}
            onClick={() => setActiveTab('strategies')}
            data-testid="strategies-tab"
          >
            Strategy Guides
          </button>
          <button 
            className={`tab-btn ${activeTab === 'tools' ? 'active' : ''}`}
            onClick={() => setActiveTab('tools')}
            data-testid="tools-tab"
          >
            Profit Tools
          </button>
        </div>

        {activeTab === 'casinos' && (
          <>
            <section className="toolbar">
              <div className="search-box">
                <input
                  type="text"
                  placeholder="Search casinos..."
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
                >
                  All
                </button>
                <button 
                  className={`filter-btn ${activeFilter === 'sweepstakes' ? 'active' : ''}`}
                  onClick={() => setActiveFilter('sweepstakes')}
                >
                  Sweepstakes
                </button>
                <button 
                  className={`filter-btn ${activeFilter === 'crypto' ? 'active' : ''}`}
                  onClick={() => setActiveFilter('crypto')}
                >
                  Crypto
                </button>
                <button 
                  className={`filter-btn ${activeFilter === 'other' ? 'active' : ''}`}
                  onClick={() => setActiveFilter('other')}
                >
                  Other
                </button>
              </div>
            </section>

            <section className="stats">
              <div className="stat-card">
                <span className="kicker">Total Casinos</span>
                <strong data-testid="total-count">{casinos.length}</strong>
              </div>
              <div className="stat-card">
                <span className="kicker">Showing</span>
                <strong data-testid="filtered-count">{filteredCasinos.length}</strong>
              </div>
              <div className="stat-card">
                <span className="kicker">Category</span>
                <strong>{activeFilter === 'all' ? 'All' : activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1)}</strong>
              </div>
              {isAuthenticated && (
                <div className="stat-card">
                  <span className="kicker">My Notes</span>
                  <strong>{userNotes.length}</strong>
                </div>
              )}
            </section>

            <section className="section">
              <div className="section-head">
                <h2>Top Ranked Casinos</h2>
                <div className="count">{filteredCasinos.length} casinos</div>
              </div>
              <div className="grid">
                {filteredCasinos.map(casino => (
                  <CasinoCard
                    key={casino.name}
                    casino={casino}
                    userNote={userNotes.find(n => n.casino_name === casino.name)}
                    onSaveNote={handleSaveNote}
                    onTrackClick={handleTrackClick}
                    showToast={displayToast}
                    isAuthenticated={isAuthenticated}
                  />
                ))}
              </div>
              {filteredCasinos.length === 0 && (
                <div className="empty-state">No casinos found. Try adjusting your filters.</div>
              )}
            </section>
          </>
        )}

        {activeTab === 'strategies' && (
          <section className="section">
            <div className="section-head">
              <h2>Strategy Guides</h2>
              <div className="count">{strategies.length} guides</div>
            </div>
            <div className="strategies-grid">
              {strategies.map(strategy => (
                <div key={strategy.strategy_id} className="strategy-card">
                  <div className="strategy-category">{strategy.category}</div>
                  <h3 className="strategy-title">{strategy.title}</h3>
                  <p className="strategy-content">{strategy.content}</p>
                  <div className="strategy-meta">
                    <span className="chip">{strategy.difficulty}</span>
                    {strategy.estimated_profit && (
                      <span className="chip profit">💰 {strategy.estimated_profit}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'tools' && (
          <section className="section">
            <div className="section-head">
              <h2>Profit Tools</h2>
            </div>
            <div className="tools-grid">
              <div className="tool-card">
                <h3>🎲 RTP Calculator</h3>
                <p>Calculate expected returns based on game RTP percentages</p>
                <div className="tool-status">Coming Soon</div>
              </div>
              <div className="tool-card">
                <h3>📊 Variance Calculator</h3>
                <p>Analyze risk and volatility for different game types</p>
                <div className="tool-status">Coming Soon</div>
              </div>
              <div className="tool-card">
                <h3>💎 VIP Progress Tracker</h3>
                <p>Track wagering requirements and VIP tier advancement</p>
                <div className="tool-status">Coming Soon</div>
              </div>
              <div className="tool-card">
                <h3>🎁 Bonus Optimizer</h3>
                <p>Calculate optimal strategies for clearing bonus requirements</p>
                <div className="tool-status">Coming Soon</div>
              </div>
            </div>
          </section>
        )}

        <footer className="footer">
          <div className="footer-content">
            <p className="footer-text">
              RROLL © 2025 • Educational gambling strategies and casino insights
            </p>
            <p className="footer-disclaimer">
              Affiliate Disclosure: Some casino links on this site are affiliate links. 
              We may earn a commission when you sign up through these links, at no extra cost to you.
              This helps us maintain the platform and provide free educational content.
            </p>
            <p className="footer-responsible">
              Gamble Responsibly • 18+ Only • Know Your Limits
            </p>
          </div>
        </footer>
      </div>

      <Toast message={toastMessage} show={showToast} />
    </>
  );
}

// ==================== Main App Component ====================
export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    const initializeAuth = () => {
      const token = sessionStorage.getItem('token');
      const savedUser = sessionStorage.getItem('user');
      const hasSeenWelcome = sessionStorage.getItem('hasSeenWelcome');
      
      if (token && savedUser) {
        try {
          setUser(JSON.parse(savedUser));
          setShowWelcome(false);
        } catch (error) {
          console.error('Failed to parse user data:', error);
          sessionStorage.removeItem('token');
          sessionStorage.removeItem('user');
        }
      } else if (!hasSeenWelcome) {
        setShowWelcome(true);
      }
      
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const handleContinueAsGuest = useCallback(() => {
    sessionStorage.setItem('hasSeenWelcome', 'true');
    setShowWelcome(false);
  }, []);

  const handleShowAuth = useCallback(() => {
    setShowAuthModal(true);
    setShowWelcome(false);
  }, []);

  const handleAuthSuccess = useCallback((userData) => {
    setUser(userData);
    setShowAuthModal(false);
    setShowWelcome(false);
  }, []);

  const handleLogout = useCallback(() => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    setUser(null);
  }, []);

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
      
      {showWelcome ? (
        <WelcomeScreen 
          onContinueAsGuest={handleContinueAsGuest}
          onShowAuth={handleShowAuth}
        />
      ) : (
        <MainDashboard 
          user={user}
          onLogout={handleLogout}
          onShowAuth={() => setShowAuthModal(true)}
        />
      )}

      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onSuccess={handleAuthSuccess}
        />
      )}
    </>
  );
}
