import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../App';
import { Shield, Lock } from 'lucide-react';

const AdminLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { loginAdmin, addToast } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please enter username and password');
      return;
    }
    setError('');
    setLoading(true);

    try {
      await loginAdmin(username, password);
      navigate('/admin');
    } catch (err) {
      setError(err.message || 'Invalid admin credentials');
      addToast(err.message || 'Admin login failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', margin: 'auto 0' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px' }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          boxShadow: '0 8px 24px rgba(59, 130, 246, 0.3)',
          marginBottom: '16px',
          color: 'white'
        }}>
          <Shield size={36} />
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: '800', margin: '0 0 8px 0', color: 'white' }}>Admin Control</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Sign in to manage tasks and wallets</p>
      </div>

      <form onSubmit={handleSubmit} className="glass-card" style={{ padding: '24px' }}>
        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid var(--danger)',
            color: 'var(--danger)',
            padding: '12px',
            borderRadius: '8px',
            fontSize: '14px',
            marginBottom: '16px',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        <div className="form-input-group">
          <label>Admin Username</label>
          <div className="form-input-wrapper">
            <Shield size={18} style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-input"
              placeholder="Enter admin username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="form-input-group" style={{ marginBottom: '24px' }}>
          <label>Admin Password</label>
          <div className="form-input-wrapper">
            <Lock size={18} style={{ color: 'var(--text-muted)' }} />
            <input
              type="password"
              className="form-input"
              placeholder="Enter admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        </div>

        <button 
          type="submit" 
          className="primary-button" 
          disabled={loading}
          style={{ background: 'linear-gradient(135deg, var(--accent-blue) 0%, var(--accent-blue-hover) 100%)' }}
        >
          {loading ? 'Authenticating...' : 'Access Dashboard'}
        </button>
      </form>

      <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '14px' }}>
        <Link to="/login" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: '600' }}>
          Return to Member Login
        </Link>
      </div>
      </div>
    </div>
  );
};

export default AdminLogin;
