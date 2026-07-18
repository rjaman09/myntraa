import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../App';
import { Globe, CreditCard, ArrowUpRight, TrendingUp } from 'lucide-react';

const Home = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [tickerItems, setTickerItems] = useState([]);

  // Fetch updated user details on mount
  useEffect(() => {
    refreshUser();
    
    // Generate simulated live commission updates
    const generatedItems = [];
    const prefixes = ['6', '7', '8', '9'];
    const midMask = '******';
    
    for (let i = 0; i < 15; i++) {
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * 3));
      const dateStr = `${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
      
      const val = (Math.random() * 800000 + 5000).toFixed(2);
      const formattedVal = parseFloat(val).toLocaleString('en-IN', {
        maximumFractionDigits: 2,
        style: 'currency',
        currency: 'INR'
      });
      
      const phoneNum = `${prefixes[Math.floor(Math.random() * prefixes.length)]}${Math.floor(10 + Math.random() * 90)}${midMask}${Math.floor(100 + Math.random() * 900)}`;
      
      generatedItems.push({
        id: i,
        date: dateStr,
        amount: formattedVal,
        phone: phoneNum
      });
    }
    setTickerItems(generatedItems);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      {/* Top Header */}
      <div className="page-header" style={{ borderBottom: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Logo */}
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #ff3f6c 0%, #ff6f61 100%)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            fontWeight: '900',
            fontSize: '18px',
            color: 'white',
          }}>
            M
          </div>
          <span style={{ fontSize: '18px', fontWeight: '800', tracking: '0.5px' }}>Myntra</span>
        </div>
        <button style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
          <Globe size={22} />
        </button>
      </div>

      {/* Hero Banner */}
      <div style={{ padding: '0 16px 16px 16px' }}>
        <div style={{
          width: '100%',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
          border: '1px solid var(--border)'
        }}>
          <img 
            src="/images/banner.jpg" 
            alt="Offer Banner" 
            style={{ width: '100%', display: 'block', objectFit: 'cover' }}
            onError={(e) => {
              // fallback if copy hasn't finished yet or fails
              e.target.src = "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800";
            }}
          />
        </div>
      </div>

      {/* Quick Action Buttons (Recharge & Withdraw) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', padding: '0 16px 16px 16px' }}>
        <Link to="/chongzhi" style={{
          textDecoration: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          padding: '16px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)',
          color: 'white',
          fontWeight: '600',
          fontSize: '14px',
          boxShadow: '0 4px 12px rgba(30, 58, 138, 0.3)',
          border: '1px solid rgba(59, 130, 246, 0.2)'
        }}>
          <CreditCard size={18} />
          <span>Recharge now</span>
        </Link>
        <Link to="/my" style={{
          textDecoration: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          padding: '16px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, #c2410c 0%, #d97706 100%)',
          color: 'white',
          fontWeight: '600',
          fontSize: '14px',
          boxShadow: '0 4px 12px rgba(194, 65, 12, 0.3)',
          border: '1px solid rgba(249, 115, 22, 0.2)'
        }}>
          <ArrowUpRight size={18} />
          <span>Fast withdrawal</span>
        </Link>
      </div>

      {/* Account Details Card */}
      <div style={{ padding: '0 16px 16px 16px' }}>
        <div className="glass-card" style={{ padding: '20px' }}>
          {/* User info row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600' }}>
            <span>UID: {user?.uid || '------'}</span>
            <span>Mobile: {user?.phone || '----------'}</span>
          </div>
          
          {/* Balance Rows */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Account balance</div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)' }}>
                ₹ {user?.balance?.toFixed(2) || '0.00'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Frozen amount</div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)' }}>
                ₹ {user?.frozenAmount?.toFixed(2) || '0.00'}
              </div>
            </div>
          </div>

          {/* Sub Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', paddingTop: '16px' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '2px' }}>Today's earnings</div>
              <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--success)' }}>
                ₹ {user?.todayEarnings?.toFixed(2) || '0.00'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '2px' }}>Yesterday's earnings</div>
              <div style={{ fontSize: '15px', fontWeight: '700' }}>
                ₹ {user?.yesterdayEarnings?.toFixed(2) || '0.00'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '2px' }}>Get earnings</div>
              <div style={{ fontSize: '15px', fontWeight: '700' }}>
                ₹ {user?.getEarnings?.toFixed(2) || '0.00'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '2px' }}>Team income</div>
              <div style={{ fontSize: '15px', fontWeight: '700' }}>
                ₹ {user?.teamIncome?.toFixed(2) || '0.00'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Live Commission Income Ticker */}
      <div style={{ padding: '0 16px 16px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', borderLeft: '4px solid var(--primary)', paddingLeft: '8px' }}>
          <TrendingUp size={16} style={{ color: 'var(--primary)' }} />
          <h2 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>User commission income updates</h2>
        </div>

        <div className="glass-card" style={{ padding: '8px 16px' }}>
          <div className="live-ticker-container">
            <div className="live-ticker-inner">
              {/* Double items for seamless looping */}
              {[...tickerItems, ...tickerItems].map((item, idx) => (
                <div key={`${item.id}-${idx}`} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 0',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                  fontSize: '13px'
                }}>
                  <div style={{ color: 'var(--text-muted)', fontWeight: '500' }}>
                    {item.date}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: 'var(--text-primary)', fontWeight: '600' }}>
                      Commission income: <span style={{ color: '#f59e0b', fontWeight: '700' }}>{item.amount}</span>
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '2px' }}>
                      {item.phone}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Partners Grid */}
      <div style={{ padding: '0 16px 24px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', borderLeft: '4px solid var(--accent-blue)', paddingLeft: '8px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>Partners</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
          {[
            { name: 'Shopee', bg: '#fe5722' },
            { name: 'Orami', bg: '#f26522' },
            { name: 'Lazada', bg: '#0f143d' },
            { name: 'Bukalapak', bg: '#d7144a' },
            { name: 'Amazon', bg: '#ff9900', color: '#000000' },
            { name: 'Tokopedia', bg: '#42b549' }
          ].map((partner) => (
            <div key={partner.name} style={{
              background: partner.bg,
              color: partner.color || 'white',
              height: '42px',
              borderRadius: '8px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              fontWeight: '700',
              fontSize: '13px',
              boxShadow: '0 4px 8px rgba(0, 0, 0, 0.15)',
              letterSpacing: '0.3px',
              fontFamily: "'Outfit', sans-serif"
            }}>
              {partner.name}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Home;
