import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const emailVal = (email || document.getElementById('email')?.value || '').trim().toLowerCase();
    const passwordVal = password || document.getElementById('password')?.value || '';

    if (!emailVal || !passwordVal) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await login(emailVal, passwordVal);
      navigate('/dashboard');
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = () => {
    setEmail('demo@noteflow.app');
    setPassword('demo123');
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">N</div>
          <div className="auth-logo-text">
            Note<span>Hub</span>
          </div>
        </div>

        <div className="auth-title">Welcome back 👋</div>
        <div className="auth-sub">Sign in to access your notes and ideas</div>

       

        {error && <div className="auth-error">⚠️ {error}</div>}

        <div className="auth-form">
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email</label>
            <input
              id="email"
              className="form-input"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              id="password"
              className="form-input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
          </div>

          <button className="auth-btn" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In →'}
          </button>
        </div>

        <div className="auth-switch">
          Don't have an account?{' '}
          <Link to="/register" className="auth-switch-link">
            Create one
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Login;
