import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../App';
import { ChevronLeft, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const Register = () => {
  const [inviteCode, setInviteCode] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [withdrawalPassword, setWithdrawalPassword] = useState('');
  const [confirmWithdrawalPassword, setConfirmWithdrawalPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [timer, setTimer] = useState(60);
  const [timerActive, setTimerActive] = useState(false);

  const { refreshUser } = useAuth();
  const navigate = useNavigate();

  // Parse query parameters to auto-fill invite code
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const codeParam = searchParams.get('code');
    if (codeParam) {
      setInviteCode(codeParam);
    }
  }, []);

  // Countdown timer logic
  useEffect(() => {
    let interval = null;
    if (timerActive && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0) {
      setTimerActive(false);
    }
    return () => clearInterval(interval);
  }, [timerActive, timer]);

  const handleGetOtp = async () => {
    if (!phone) {
      toast.error('Please enter your mobile number first');
      return;
    }
    
    const regex = /^(?:\+91|91)?[6-9]\d{9}$/;
    if (!regex.test(phone)) {
      toast.error('Please enter a valid 10-digit Indian mobile number');
      return;
    }

    setOtpLoading(true);
    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ phone, flow: 'register' })
      });
      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to send OTP');
      } else {
        toast.success(data.message || 'OTP sent successfully!');
        
        setTimer(60);
        setTimerActive(true);
      }
    } catch (err) {
      toast.error('Error sending verification code');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    
    if (!inviteCode) return toast.error('Invitation code is required to register');
    if (!phone) return toast.error('Phone number is required');
    if (!otp) return toast.error('SMS verification code is required');
    if (!password) return toast.error('Login password is required');
    if (password !== confirmPassword) return toast.error('Login passwords do not match');
    if (!withdrawalPassword) return toast.error('Withdrawal password is required');
    if (withdrawalPassword !== confirmWithdrawalPassword) return toast.error('Withdrawal passwords do not match');

    setLoading(true);
    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phone,
          otp,
          flow: 'register',
          inviteCode,
          password,
          withdrawalPassword
        })
      });
      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Registration failed');
      } else {
        localStorage.setItem('token', data.token);
        await refreshUser();
        toast.success('Registration successful! ₹60 bonus credited.');
        navigate('/');
      }
    } catch (err) {
      toast.error('Network error during registration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-custom-page">
      
      {/* Top Bar Navigation */}
      <div className="auth-custom-header">
        <button 
          onClick={() => navigate('/login')}
          className="auth-custom-back-btn"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h2 className="auth-custom-title" style={{ fontSize: '15px' }}>
          Register
        </h2>
      </div>

      {/* Logo Card */}
      <div className="auth-custom-logo-card">
        <svg className="w-12 h-12" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M25 75L45 25L55 50L65 25L85 75" stroke="#ff3f6c" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M45 25L50 38" stroke="#ff6f61" strokeWidth="12" strokeLinecap="round" />
        </svg>
      </div>

      {/* Branding label */}
      <h3 className="auth-custom-subtitle" style={{ marginBottom: '24px' }}>
        Myntra
      </h3>

      {/* Inputs Box Enclosure Card */}
      <form onSubmit={handleRegisterSubmit} className="auth-custom-form">
        
        <div className="auth-custom-input-card">
          
          {/* Row 1: Invitation Code */}
          <div className="auth-custom-input-row">
            <label>Invitation code</label>
            <input
              type="text"
              placeholder="Invitation code"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
            />
          </div>

          {/* Row 2: Phone number(91) */}
          <div className="auth-custom-input-row">
            <label>Phone number(91)</label>
            <input
              type="tel"
              placeholder="Phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
              maxLength="15"
            />
          </div>

          {/* Row 3: SMS code */}
          <div className="auth-custom-input-row">
            <label>SMS code</label>
            <input
              type="text"
              placeholder="Please enter verification code"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              maxLength="6"
              style={{ marginRight: '8px' }}
            />
            <button
              type="button"
              onClick={handleGetOtp}
              disabled={otpLoading || timerActive}
              className="auth-custom-code-btn"
            >
              {timerActive ? `Resend (${timer}s)` : 'Get code'}
            </button>
          </div>

          {/* Row 4: Password */}
          <div className="auth-custom-input-row">
            <label>Password</label>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {/* Row 5: Confirm password */}
          <div className="auth-custom-input-row">
            <label>Confirm password</label>
            <input
              type="password"
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          {/* Row 6: Withdrawal password */}
          <div className="auth-custom-input-row">
            <label>Withdrawal password</label>
            <input
              type="password"
              placeholder="Withdrawal password"
              value={withdrawalPassword}
              onChange={(e) => setWithdrawalPassword(e.target.value)}
            />
          </div>

          {/* Row 7: Confirm withdrawal password */}
          <div className="auth-custom-input-row">
            <label>Confirm withdrawal password</label>
            <input
              type="password"
              placeholder="Confirm withdrawal password"
              value={confirmWithdrawalPassword}
              onChange={(e) => setConfirmWithdrawalPassword(e.target.value)}
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
              Registering...
            </>
          ) : (
            'Register'
          )}
        </button>

        <Link
          to="/login"
          className="auth-custom-btn-white"
        >
          Login
        </Link>

      </form>

    </div>
  );
};

export default Register;
