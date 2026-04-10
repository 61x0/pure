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
  const [formData, setFormData] = useState({ email: '', password: '', name: '', referred_by: '' });
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
      <h2 className="auth-title">{isLogin ? 'Login' : 'Join RROLL'}</h2>
      
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleSubmit}>
        {!isLogin && (
          <>
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
            <div className="form-group">
              <label className="form-label">Referral Code (Optional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="RROLL-XXXXX"
                value={formData.referred_by}
                onChange={(e) => setFormData({ ...formData, referred_by: e.target.value })}
              />
            </div>
          </>
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

// Continue in next file...
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
        <div className="wrap">
          <div className="topbar">
            <div className="brand-mini">RROLL</div>
            <div className="user-menu">
              <span className="user-email">{user.email}</span>
              <button className="logout-btn" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </div>
          
          <div className="hero">
            <div className="hero-label">
              <span className="dot"></span> Gambling Education & Strategy Platform
            </div>
            <div className="hero-top">
              <div className="title-wrap">
                <h1 className="title">
                  RR<span className="dice-o"></span>LL
                </h1>
                <p className="subtext">
                  Learn profitable gambling strategies, discover top-rated casinos, and maximize your winning potential. 
                  Expert guides on RTP optimization, VIP leveling, and bonus hunting.
                </p>
              </div>
            </div>
          </div>
          
          <div style={{ padding: '40px 0', textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '20px' }}>Platform Under Construction</h2>
            <p style={{ color: 'var(--muted)', marginBottom: '20px' }}>
              Full casino database, strategy guides, and profit tools coming soon!
            </p>
            <p style={{ color: 'var(--gold)', fontWeight: '700' }}>
              Your Referral Code: {user.referral_code}
            </p>
          </div>
        </div>
      ) : (
        <div className="wrap">
          <div className="topbar">
            <div className="brand-mini">RROLL</div>
            <div className="status-pill">Gambling Strategy Hub</div>
          </div>
          <AuthForm onSuccess={handleAuthSuccess} />
        </div>
      )}
    </>
  );
}
