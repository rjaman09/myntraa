import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { Home as HomeIcon, ClipboardList, Zap, PlusCircle, User, Bell, ChevronLeft, LogOut } from 'lucide-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

const queryClient = new QueryClient();

import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Grab from './pages/Grab';
import Recharge from './pages/Recharge';
import Orders from './pages/Orders';
import My from './pages/My';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';

// Auth Context
const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [adminToken, setAdminToken] = useState(localStorage.getItem('adminToken') || null);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  const fetchUserData = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        localStorage.removeItem('token');
        setUser(null);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  const login = async (phone, password) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Login failed');
    
    localStorage.setItem('token', data.token);
    setUser(data.user);
    addToast('Welcome back to Myntra!');
    return data.user;
  };

  const register = async (phone, password, inviteCode) => {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password, inviteCode })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Registration failed');

    localStorage.setItem('token', data.token);
    setUser(data.user);
    addToast('Registered successfully! Received ₹60 starting bonus.');
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    addToast('Logged out successfully.');
  };

  const loginAdmin = async (username, password) => {
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Admin login failed');

    localStorage.setItem('adminToken', data.token);
    setAdminToken(data.token);
    addToast('Admin panel logged in.');
    return data.token;
  };

  const logoutAdmin = () => {
    localStorage.removeItem('adminToken');
    setAdminToken(null);
    addToast('Admin logged out.');
  };

  const refreshUser = () => {
    fetchUserData();
  };

  const value = {
    user,
    adminToken,
    loading,
    toasts,
    login,
    register,
    logout,
    loginAdmin,
    logoutAdmin,
    refreshUser,
    addToast
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Protected Routes
const UserRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'white' }}>Loading Myntra...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

const AdminRoute = ({ children }) => {
  const { adminToken } = useAuth();
  if (!adminToken) return <Navigate to="/admin-login" replace />;
  return children;
};

// Bottom Navigation Layout Wrapper
const BottomNavLayout = ({ children }) => {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <div className="app-container">
      <div className="scrollable-content">
        {children}
      </div>
      <nav className="bottom-nav">
        <Link to="/" className={`bottom-nav-item ${currentPath === '/' ? 'active' : ''}`}>
          <HomeIcon />
          <span>Home</span>
        </Link>
        
        <Link to="/order" className={`bottom-nav-item ${currentPath === '/order' ? 'active' : ''}`}>
          <ClipboardList />
          <span>Orders</span>
        </Link>

        <Link to="/obj" className="bottom-nav-item">
          <div className="grab-nav-btn">
            <Zap size={28} fill="currentColor" />
          </div>
        </Link>

        <Link to="/chongzhi" className={`bottom-nav-item ${currentPath === '/chongzhi' ? 'active' : ''}`}>
          <PlusCircle />
          <span>Recharge</span>
        </Link>

        <Link to="/my" className={`bottom-nav-item ${currentPath === '/my' ? 'active' : ''}`}>
          <User />
          <span>My</span>
        </Link>
      </nav>
    </div>
  );
};

// Toast Notification List component
const ToastList = () => {
  const { toasts } = useAuth();
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type === 'success' ? 'toast-success' : 'toast-error'}`}>
          {t.message}
        </div>
      ))}
    </div>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Toaster position="top-center" reverseOrder={false} />
          <ToastList />
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/admin-login" element={<AdminLogin />} />

            {/* User Protected Routes with Bottom Nav */}
            <Route path="/" element={<UserRoute><BottomNavLayout><Home /></BottomNavLayout></UserRoute>} />
            <Route path="/order" element={<UserRoute><BottomNavLayout><Orders /></BottomNavLayout></UserRoute>} />
            <Route path="/obj" element={<UserRoute><BottomNavLayout><Grab /></BottomNavLayout></UserRoute>} />
            <Route path="/chongzhi" element={<UserRoute><BottomNavLayout><Recharge /></BottomNavLayout></UserRoute>} />
            <Route path="/my" element={<UserRoute><BottomNavLayout><My /></BottomNavLayout></UserRoute>} />

            {/* Admin Protected Routes */}
            <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />

            {/* Redirect all unmatched routes */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
