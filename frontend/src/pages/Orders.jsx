import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { Bell, ClipboardList, AlertCircle, ArrowLeft, ChevronRight, ShoppingBag } from 'lucide-react';

const Orders = () => {
  const { user, refreshUser, addToast } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('Pending');
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Checkout State
  const [checkoutTask, setCheckoutTask] = useState(null);
  const [submittingCheckout, setSubmittingCheckout] = useState(false);

  const tabs = ['Pending', 'Frozen', 'Completed', 'Rejected', 'Expired'];

  const fetchTasksHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/grab/my-tasks', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setTasks(data);
      }
    } catch (error) {
      console.error('Error fetching user tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
    fetchTasksHistory();
    
    // Periodically sync task status updates
    const interval = setInterval(() => {
      fetchTasksHistory();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Filter based on tabs
  const getFilteredTasks = () => {
    switch (activeTab) {
      case 'Pending':
        return tasks.filter(t => t.status === 'assigned');
      case 'Frozen':
        return tasks.filter(t => t.status === 'submitted');
      case 'Completed':
        return tasks.filter(t => t.status === 'completed');
      case 'Rejected':
        return tasks.filter(t => t.status === 'rejected');
      case 'Expired':
        return tasks.filter(t => t.status === 'expired');
      default:
        return tasks;
    }
  };

  // Checkout Submission Handler
  const handlePlaceOrder = async () => {
    if (!checkoutTask) return;
    if (user.balance < checkoutTask.amount) {
      addToast('Insufficient wallet balance to place this order!', 'error');
      return;
    }

    setSubmittingCheckout(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/grab/my-tasks/${checkoutTask.id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        addToast('Order placed successfully! Awaiting Admin approval.');
        setCheckoutTask(null);
        refreshUser();
        fetchTasksHistory();
        setActiveTab('Frozen');
      } else {
        const err = await response.json();
        addToast(err.error || 'Failed to place order', 'error');
      }
    } catch (e) {
      addToast('Connection error', 'error');
    } finally {
      setSubmittingCheckout(false);
    }
  };

  const filteredItems = getFilteredTasks();

  // RENDER CHECKOUT VIEW
  if (checkoutTask) {
    const isBalanceLow = user.balance < checkoutTask.amount;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', minHeight: '100vh', background: 'var(--bg-main)' }}>
        
        {/* Checkout Header */}
        <div className="page-header" style={{ borderBottom: '1px solid var(--border)' }}>
          <button 
            onClick={() => setCheckoutTask(null)}
            style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <ArrowLeft size={20} />
          </button>
          <span style={{ fontSize: '16px', fontWeight: '800', flex: 1, textAlign: 'center', marginRight: '20px' }}>Checkout</span>
        </div>

        {/* Checkout Content Container */}
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
          
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '0.5px' }}>
            PRODUCT ADDED TO CART. COMPLETE CHECKOUT TO SUBMIT YOUR TASK.
          </div>

          {/* Checkout Card */}
          <div className="glass-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '8px', overflow: 'hidden', background: '#eee', flexShrink: 0 }}>
                <img src={checkoutTask.productImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h4 style={{ fontSize: '14px', fontWeight: '800', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {checkoutTask.productName}
                </h4>
                <div style={{ fontSize: '11px', color: 'var(--success)', fontWeight: '700', marginTop: '4px' }}>
                  Reward: +₹{(checkoutTask.amount + checkoutTask.bonus).toFixed(2)} (Price + Bonus)
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Pay now:</span>
                <span style={{ fontWeight: '700', color: 'white' }}>₹{checkoutTask.amount.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Earn Bonus:</span>
                <span style={{ fontWeight: '700', color: 'var(--success)' }}>+₹{checkoutTask.bonus.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '8px', fontSize: '13px', fontWeight: '800' }}>
                <span style={{ color: 'white' }}>Total Payout:</span>
                <span style={{ color: 'var(--success)' }}>₹{(checkoutTask.amount + checkoutTask.bonus).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Wallet Balance Card */}
          <div className="glass-card" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block' }}>Wallet Balance</span>
              <span style={{ fontSize: '16px', fontWeight: '800', color: 'white', marginTop: '2px', display: 'block' }}>
                ₹{user?.balance?.toFixed(2)}
              </span>
            </div>
            {isBalanceLow && (
              <span style={{
                fontSize: '10px',
                fontWeight: '700',
                padding: '3px 8px',
                borderRadius: '6px',
                background: 'rgba(239, 68, 68, 0.1)',
                color: 'var(--danger)'
              }}>
                Low Balance
              </span>
            )}
          </div>

          {/* Low Balance Warning Alert */}
          {isBalanceLow && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.05)',
              border: '1px solid rgba(239, 68, 68, 0.1)',
              borderRadius: '12px',
              padding: '14px 16px',
              display: 'flex',
              gap: '10px',
              alignItems: 'flex-start'
            }}>
              <AlertCircle size={18} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                Your wallet balance is too low for this order. Please add money to continue checkout.
              </div>
            </div>
          )}

          {/* Action Buttons: Rendered directly below balance/alerts */}
          <div style={{ marginTop: '8px' }}>
            {isBalanceLow ? (
              <button
                onClick={() => navigate('/chongzhi')}
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, #ff3f6c 0%, #ff6f61 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '14px',
                  color: 'white',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(255, 63, 108, 0.3)',
                  textAlign: 'center'
                }}
              >
                Add money
              </button>
            ) : (
              <button
                onClick={handlePlaceOrder}
                disabled={submittingCheckout}
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '14px',
                  color: 'white',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                  textAlign: 'center'
                }}
              >
                {submittingCheckout ? 'Submitting...' : 'Place order & submit task'}
              </button>
            )}
          </div>

        </div>

      </div>
    );
  }

  // STANDARD ORDERS LIST VIEW
  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      {/* Header */}
      <div className="page-header">
        <span style={{ fontSize: '18px', fontWeight: '800' }}>Task Orders</span>
        <button style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
          <Bell size={20} />
        </button>
      </div>

      {/* Tabs Menu */}
      <div style={{
        display: 'flex',
        background: 'rgba(21, 28, 44, 0.5)',
        borderBottom: '1px solid var(--border)',
        width: '100%',
        overflowX: 'auto',
        whiteSpace: 'nowrap'
      }}>
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              padding: '14px 16px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeTab === tab ? 'var(--primary)' : 'var(--text-secondary)',
              fontWeight: activeTab === tab ? '700' : '500',
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              outline: 'none'
            }}
          >
            {tab === 'Frozen' ? 'Frozen (Submitted)' : tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
        {loading && tasks.length === 0 ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0', color: 'var(--text-secondary)' }}>
            Loading allocated tasks...
          </div>
        ) : filteredItems.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '80px 24px',
            textAlign: 'center'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '20px',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              color: 'var(--text-muted)',
              marginBottom: '20px'
            }}>
              <ClipboardList size={36} strokeWidth={1.5} />
            </div>
            <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '4px' }}>No tasks</h3>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>There are no allocated tasks in this category</p>
          </div>
        ) : (
          /* Tasks List */
          filteredItems.map(item => (
            <div key={item.id} className="glass-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              {/* Product header row */}
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '8px', overflow: 'hidden', background: '#eaeaea', flexShrink: 0 }}>
                  <img src={item.productImage} alt={item.productName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4 style={{ fontSize: '13px', fontWeight: '700', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.productName}
                  </h4>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2.5px' }}>
                    Task ID: {item.id.slice(0, 8).toUpperCase()}...
                  </div>
                </div>
                <div>
                  <span style={{
                    fontSize: '9px',
                    fontWeight: '700',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: item.status === 'completed' ? 'rgba(16, 185, 129, 0.1)' : 
                                item.status === 'rejected' ? 'rgba(239, 68, 68, 0.1)' : 
                                item.status === 'submitted' ? 'rgba(251, 191, 36, 0.1)' : 'rgba(96, 165, 250, 0.1)',
                    color: item.status === 'completed' ? 'var(--success)' : 
                           item.status === 'rejected' ? 'var(--danger)' : 
                           item.status === 'submitted' ? 'var(--warning)' : '#60a5fa'
                  }}>
                    {item.status === 'submitted' ? 'PENDING APPROVAL' : item.status.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Financial values row */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
                borderTop: '1px solid rgba(255, 255, 255, 0.04)',
                paddingTop: '12px',
                fontSize: '12px'
              }}>
                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>Purchase Price: </span>
                  <span style={{ fontWeight: '700', color: 'white' }}>₹{item.amount.toFixed(2)}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Bonus reward: </span>
                  <span style={{ fontWeight: '700', color: 'var(--success)' }}>+₹{item.bonus.toFixed(2)}</span>
                </div>
              </div>

              {/* Timestamps / Actions */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '10px',
                color: 'var(--text-muted)',
                borderTop: '1px solid rgba(255, 255, 255, 0.02)',
                paddingTop: '8px'
              }}>
                <span>Created: {new Date(item.createdAt).toLocaleDateString()}</span>
                {item.status === 'assigned' ? (
                  <button
                    onClick={() => setCheckoutTask(item)}
                    style={{
                      background: 'linear-gradient(135deg, #ff3f6c 0%, #ff6f61 100%)',
                      border: 'none',
                      borderRadius: '6px',
                      color: 'white',
                      padding: '5px 12px',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    Start task
                  </button>
                ) : item.status === 'submitted' ? (
                  <span style={{ color: 'var(--warning)', fontWeight: '600' }}>
                    Awaiting Admin Approval
                  </span>
                ) : (
                  <span>Processed</span>
                )}
              </div>

            </div>
          ))
        )}
      </div>

    </div>
  );
};

export default Orders;
