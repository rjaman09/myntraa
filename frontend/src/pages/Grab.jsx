import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { Shield, Sparkles, AlertCircle, ShoppingCart } from 'lucide-react';

const Grab = () => {
  const { user, refreshUser, addToast } = useAuth();
  const [grabbing, setGrabbing] = useState(false);
  const [grabbedOrder, setGrabbedOrder] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [stats, setStats] = useState({
    completedToday: 0,
    unfinishedToday: 0,
    commissionToday: 0,
  });

  // Fetch grabs history on mount to calculate stats
  const fetchGrabStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/grabs', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const grabs = await response.json();
        
        // Filter for today
        const today = new Date().toDateString();
        const todayGrabs = grabs.filter(g => new Date(g.createdAt).toDateString() === today);
        
        const completed = todayGrabs.filter(g => g.status === 'settled').length;
        const pending = todayGrabs.filter(g => g.status === 'pending').length;
        const commission = todayGrabs
          .filter(g => g.status === 'settled')
          .reduce((sum, g) => sum + g.commission, 0);

        setStats({
          completedToday: completed,
          unfinishedToday: pending,
          commissionToday: commission
        });
      }
    } catch (error) {
      console.error('Error fetching grab history:', error);
    }
  };

  useEffect(() => {
    refreshUser();
    fetchGrabStats();
    
    // Auto-poll stats and user balance every 4 seconds to catch background auto-settlements
    const interval = setInterval(() => {
      refreshUser();
      fetchGrabStats();
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const handleAutoGrab = async () => {
    if (grabbing) return;
    
    if (!user || user.balance < 10) {
      addToast('Minimum balance of ₹10 is required to grab orders!', 'error');
      return;
    }

    setGrabbing(true);
    setGrabbedOrder(null);

    // Simulate match matching process with UI delay
    try {
      const token = localStorage.getItem('token');
      
      // Match order on server
      const response = await fetch('/api/grab/match', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        }
      });
      
      const data = await response.json();

      if (!response.ok) {
        // Wait a bit to look like it searched
        setTimeout(() => {
          setGrabbing(false);
          addToast(data.error || 'No tasks matching, please try again later.', 'error');
        }, 2000);
        return;
      }

      // Slot machine spinner delay (2.5 seconds)
      setTimeout(() => {
        setGrabbing(false);
        setGrabbedOrder(data.order);
        setShowConfirmModal(true);
      }, 2500);

    } catch (err) {
      setGrabbing(false);
      addToast('Network error, please try again.', 'error');
    }
  };

  const handleSubmitOrder = async () => {
    if (!grabbedOrder) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/grab/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ orderId: grabbedOrder.id })
      });

      const data = await response.json();
      if (!response.ok) {
        addToast(data.error || 'Order submission failed', 'error');
      } else {
        addToast('Order purchased! Funds frozen. Settling in 30 seconds.');
        setShowConfirmModal(false);
        setGrabbedOrder(null);
        refreshUser();
        fetchGrabStats();
      }
    } catch (error) {
      addToast('Error submitting order', 'error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', padding: '16px' }}>
      
      {/* Header Info */}
      <div className="glass-card" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Available balance</div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: 'var(--primary)', marginTop: '4px' }}>
            ₹ {user?.balance?.toFixed(2) || '0.00'}
          </div>
        </div>
        <div style={{
          background: 'rgba(255, 63, 108, 0.1)',
          border: '1px solid var(--border)',
          borderRadius: '50%',
          width: '40px',
          height: '40px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          color: 'var(--primary)'
        }}>
          <ShoppingCart size={20} />
        </div>
      </div>

      {/* Commission Rules Info card */}
      <div style={{
        background: 'linear-gradient(135deg, #1e3a8a 0%, #0284c7 100%)',
        border: '1px solid rgba(59, 130, 246, 0.2)',
        borderRadius: '16px',
        padding: '16px',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px', color: '#bae6fd', fontWeight: '500' }}>
          <span>Minimum balance: ₹ 10.00</span>
          <span>Commission Rate: 20.0%</span>
        </div>
        <p style={{ fontSize: '11px', color: '#e0f2fe', margin: 0, opacity: 0.9, lineHeight: '1.4' }}>
          Grabbing matched orders deducts funds from your available balance and freezes it. Commission + Principal is returned automatically in 30 seconds.
        </p>
      </div>

      {/* Performance Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
        <div className="glass-card" style={{ padding: '12px 16px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Commission (Today)</div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--success)', marginTop: '4px' }}>
            ₹ {stats.commissionToday.toFixed(2)}
          </div>
        </div>
        <div className="glass-card" style={{ padding: '12px 16px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Frozen Amount</div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: '#f59e0b', marginTop: '4px' }}>
            ₹ {user?.frozenAmount?.toFixed(2) || '0.00'}
          </div>
        </div>
        <div className="glass-card" style={{ padding: '12px 16px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Completed Orders</div>
          <div style={{ fontSize: '18px', fontWeight: '700', marginTop: '4px' }}>
            {stats.completedToday}
          </div>
        </div>
        <div className="glass-card" style={{ padding: '12px 16px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Unfinished Grabs</div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: stats.unfinishedToday > 0 ? '#f59e0b' : 'white', marginTop: '4px' }}>
            {stats.unfinishedToday}
          </div>
        </div>
      </div>

      {/* Auto Grab Activation Button Area */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: '28px' }}>
        <button 
          onClick={handleAutoGrab}
          disabled={grabbing}
          className={`pulse-btn`}
          style={{
            width: '140px',
            height: '140px',
            borderRadius: '50%',
            border: '8px solid rgba(255, 63, 108, 0.2)',
            background: 'linear-gradient(135deg, #ff3f6c 0%, #ff6f61 100%)',
            color: 'white',
            fontWeight: '800',
            fontSize: '18px',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 12px 28px rgba(255, 63, 108, 0.4)',
            transition: 'all 0.3s ease',
            outline: 'none'
          }}
        >
          {grabbing ? (
            <>
              {/* Spinner */}
              <div style={{
                width: '32px',
                height: '32px',
                border: '3px solid rgba(255, 255, 255, 0.3)',
                borderTop: '3px solid white',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
                marginBottom: '4px'
              }} />
              <span style={{ fontSize: '13px' }}>Matching...</span>
            </>
          ) : (
            <>
              <Sparkles size={28} />
              <span>Auto Grab</span>
            </>
          )}
        </button>
        
        {grabbing && (
          <div style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '16px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary)', animation: 'ping 1s infinite' }} />
            Searching secure e-commerce orders...
          </div>
        )}
      </div>

      {/* Rules list */}
      <div className="glass-card" style={{ padding: '20px', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
          <Shield size={16} style={{ color: 'var(--success)' }} />
          Store Rules & Instructions
        </h3>
        
        <ol style={{ fontSize: '12px', color: 'var(--text-secondary)', paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '8px', lineHeight: '1.5' }}>
          <li>Each task order in our store is randomly distributed based on admin allocations.</li>
          <li>Users must maintain at least a minimum balance of ₹10.00 to match task orders.</li>
          <li>Once matched, the order purchase amount is frozen while processing the task.</li>
          <li>Settlement takes 30 seconds to simulate next-day payout. Your principal + 20% commission is deposited directly to your available balance.</li>
          <li>Refer other users using your invitation code to earn a 10% commission on all their successful payouts.</li>
        </ol>
      </div>

      {/* Confirm matched order Modal */}
      {showConfirmModal && grabbedOrder && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '92%', maxWidth: '360px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '800', textAlign: 'center', marginBottom: '16px', color: 'var(--text-primary)' }}>
              Order Grabbing Matched!
            </h3>

            {/* Product Card */}
            <div style={{ background: 'var(--bg-card-light)', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)', marginBottom: '16px' }}>
              <div style={{ height: '140px', background: '#e2e8f0', display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
                <img 
                  src={grabbedOrder.productImage} 
                  alt={grabbedOrder.productName} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <span style={{ position: 'absolute', top: '10px', right: '10px', background: 'var(--primary)', color: 'white', fontSize: '10px', fontWeight: '700', padding: '4px 8px', borderRadius: '20px' }}>
                  20% Commission
                </span>
              </div>
              <div style={{ padding: '12px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'white', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {grabbedOrder.productName}
                </h4>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Matched via secure channel</p>
              </div>
            </div>

            {/* Financial Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Order Amount</div>
                <div style={{ fontSize: '16px', fontWeight: '800', color: 'white', marginTop: '2px' }}>
                  ₹ {grabbedOrder.amount.toFixed(2)}
                </div>
              </div>
              <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: 'var(--success)' }}>Expected Commission</div>
                <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--success)', marginTop: '2px' }}>
                  ₹ {grabbedOrder.commission.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Submit / Cancel Buttons */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => {
                  setShowConfirmModal(false);
                  setGrabbedOrder(null);
                }} 
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '10px',
                  background: 'none',
                  border: '1px solid var(--border)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '14px'
                }}
              >
                Cancel
              </button>
              <button 
                onClick={handleSubmitOrder}
                style={{
                  flex: 2,
                  padding: '12px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: '700',
                  fontSize: '14px',
                  boxShadow: '0 4px 12px rgba(255, 63, 108, 0.3)'
                }}
              >
                Submit Order
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Inline styles for spinner rotation animation */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

    </div>
  );
};

export default Grab;
