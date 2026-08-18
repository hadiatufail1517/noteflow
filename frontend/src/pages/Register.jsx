import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const nameVal = (name || document.getElementById('name')?.value || '').trim();
    const emailVal = (email || document.getElementById('email')?.value || '').trim().toLowerCase();
    const passwordVal = password || document.getElementById('password')?.value || '';

    if (!nameVal || !emailVal || !passwordVal) {
      setError('Please fill in all fields');
      return;
    }
    if (passwordVal.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await register(nameVal, emailVal, passwordVal);
      navigate('/dashboard');
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
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

        <div className="auth-title">Create account ✨</div>
        <div className="auth-sub">Join NoteHub and start organizing your thoughts</div>

        {error && <div className="auth-error">⚠️ {error}</div>}

        <div className="auth-form">
          <div className="form-group">
            <label className="form-label" htmlFor="name">Full Name</label>
            <input
              id="name"
              className="form-input"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="email">Email</label>
            <input
              id="email"
              className="form-input"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              id="password"
              className="form-input"
              type="password"
              placeholder="Min 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
          </div>

          <button className="auth-btn" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account →'}
          </button>
        </div>

        <div className="auth-switch">
          Already have an account?{' '}
          <Link to="/login" className="auth-switch-link">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Register;
