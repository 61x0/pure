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

// ==================== Login Form Component ====================
function LoginForm({ onSuccess, onSwitchToRegister, error, loading }) {
  const [formData, setFormData] = useState({ email: '', password: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    onSuccess(formData, false);
  };

  return (
    <>
      <h2 className="auth-title">Login</h2>
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Email</label>
          <input
            type="email"
            className="form-input"
            placeholder="you@example.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
            data-testid="login-email"
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
            data-testid="login-password"
          />
        </div>
        
        <button type="submit" className="submit-btn" disabled={loading} data-testid="login-submit">
          {loading ? 'Processing...' : 'Login'}
        </button>
      </form>
      
      <div className="auth-switch">
        Don't have an account?{' '}
        <span className="auth-link" onClick={onSwitchToRegister} data-testid="switch-to-register">
          Register
        </span>
      </div>
    </>
  );
}

// ==================== Register Form Component ====================
function RegisterForm({ onSuccess, onSwitchToLogin, error, loading }) {
  const [formData, setFormData] = useState({ 
    email: '', 
    password: '', 
    name: '', 
    referred_by: '' 
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    onSuccess(formData, true);
  };

  return (
    <>
      <h2 className="auth-title">Join RROLL</h2>
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Name</label>
          <input
            type="text"
            className="form-input"
            placeholder="Your name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            data-testid="register-name"
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
            data-testid="register-referral"
          />
        </div>
        
        <div className="form-group">
          <label className="form-label">Email</label>
          <input
            type="email"
            className="form-input"
            placeholder="you@example.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
            data-testid="register-email"
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
            data-testid="register-password"
          />
        </div>
        
        <button type="submit" className="submit-btn" disabled={loading} data-testid="register-submit">
          {loading ? 'Processing...' : 'Create Account'}
        </button>
      </form>
      
      <div className="auth-switch">
        Already have an account?{' '}
        <span className="auth-link" onClick={onSwitchToLogin} data-testid="switch-to-login">
          Login
        </span>
      </div>
    </>
  );
}

// ==================== Auth Container Component ====================
function AuthForm({ onSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuthSubmit = async (formData, isRegister) => {
    setError('');
    setLoading(true);

    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
      const response = await axios.post(`${API_URL}${endpoint}`, formData);
      
      // Store in sessionStorage instead of localStorage for better security
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
    <div className="auth-container">
      {isLogin ? (
        <LoginForm
          onSuccess={handleAuthSubmit}
          onSwitchToRegister={() => setIsLogin(false)}
          error={error}
          loading={loading}
        />
      ) : (
        <RegisterForm
          onSuccess={handleAuthSubmit}
          onSwitchToLogin={() => setIsLogin(true)}
          error={error}
          loading={loading}
        />
      )}
    </div>
  );
}

// ==================== Loading Screen Component ====================
function LoadingScreen() {
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

// ==================== Dashboard Component ====================
function Dashboard({ user, onLogout }) {
  return (
    <div className="wrap">
      <div className="topbar">
        <div className="brand-mini">RROLL</div>
        <div className="user-menu">
          <span className="user-email">{user.email}</span>
          <button className="logout-btn" onClick={onLogout} data-testid="logout-btn">
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
  );
}

// ==================== Unauthenticated View Component ====================
function UnauthenticatedView({ onAuthSuccess }) {
  return (
    <div className="wrap">
      <div className="topbar">
        <div className="brand-mini">RROLL</div>
        <div className="status-pill">Gambling Strategy Hub</div>
      </div>
      <AuthForm onSuccess={onAuthSuccess} />
    </div>
  );
}

// ==================== Main App Component ====================
export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = () => {
      const token = sessionStorage.getItem('token');
      const savedUser = sessionStorage.getItem('user');
      
      if (token && savedUser) {
        try {
          setUser(JSON.parse(savedUser));
        } catch (error) {
          console.error('Failed to parse user data:', error);
          sessionStorage.removeItem('token');
          sessionStorage.removeItem('user');
        }
      }
      
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const handleLogout = useCallback(() => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    setUser(null);
  }, []);

  const handleAuthSuccess = useCallback((userData) => {
    setUser(userData);
  }, []);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <>
      <div className="noise" aria-hidden="true"></div>
      <div className="scanlines" aria-hidden="true"></div>
      <ParticleCanvas />
      
      {user ? (
        <Dashboard user={user} onLogout={handleLogout} />
      ) : (
        <UnauthenticatedView onAuthSuccess={handleAuthSuccess} />
      )}
    </>
  );
}
