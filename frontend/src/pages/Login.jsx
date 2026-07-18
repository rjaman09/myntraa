import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../App';
import { Globe, User, Lock, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const Login = () => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, refreshUser } = useAuth();
  const navigate = useNavigate();

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!phone) {
      toast.error('Please enter your mobile registration number');
      return;
    }
    if (!password) {
      toast.error('Please enter your password');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ phone, password })
      });
      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Login failed');
      } else {
        localStorage.setItem('token', data.token);
        await refreshUser();
        toast.success('Welcome back to Myntra!');
        navigate('/');
      }
    } catch (err) {
      toast.error('Network error, please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-custom-page">
      
      {/* Globe Icon */}
      <div className="absolute top-6 right-6 text-white/95 hover:text-white cursor-pointer transition-transform hover:scale-105" style={{ zIndex: 10 }}>
        <Globe className="w-6 h-6" />
      </div>

      {/* Logo Card */}
      <div className="auth-custom-logo-card">
        <svg className="w-12 h-12" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M25 75L45 25L55 50L65 25L85 75" stroke="#ff3f6c" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M45 25L50 38" stroke="#ff6f61" strokeWidth="12" strokeLinecap="round" />
        </svg>
      </div>

      {/* Branding Title */}
      <h2 className="auth-custom-title">
        Myntra
      </h2>
      
      {/* Subtitle */}
      <h3 className="auth-custom-subtitle">
        Login
      </h3>
      
      {/* Input Prompts */}
      <p className="auth-custom-prompt">
        Please enter your registration number / Please enter your password
      </p>

      {/* Inputs Enclosure Box */}
      <form onSubmit={handleLoginSubmit} className="auth-custom-form">
        
        <div className="auth-custom-input-card">
          
          {/* Row 1: Registration Phone Number */}
          <div className="auth-custom-input-row">
            <User className="auth-custom-input-icon" />
            <input
              type="tel"
              placeholder="Please enter your registration number"
              className="auth-custom-input-field"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="username"
            />
          </div>

          {/* Row 2: Login Password */}
          <div className="auth-custom-input-row">
            <Lock className="auth-custom-input-icon" />
            <input
              type="password"
              placeholder="Please enter your password"
              className="auth-custom-input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

        </div>

        {/* Action buttons */}
        <button
          type="submit"
          disabled={loading}
          className="auth-custom-btn-blue"
        >
          {loading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Logging In...
            </>
          ) : (
            'Login'
          )}
        </button>

        <Link
          to="/register"
          className="auth-custom-btn-white"
        >
          Register
        </Link>

      </form>

    </div>
  );
};

export default Login;
