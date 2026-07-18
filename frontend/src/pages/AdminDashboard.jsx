import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { Shield, LogOut, Users, PlusCircle, Check, X, CreditCard, Landmark, ClipboardList, Trash } from 'lucide-react';

const AdminDashboard = () => {
  const { adminToken, logoutAdmin, addToast } = useAuth();
  const navigate = useNavigate();

  // Tab state
  const [activeTab, setActiveTab] = useState('Users');

  // Lists
  const [usersList, setUsersList] = useState([]);
  const [rechargesList, setRechargesList] = useState([]);
  const [withdrawalsList, setWithdrawalsList] = useState([]);
  const [ordersList, setOrdersList] = useState([]);

  // Create Order Form State
  const [orderAmount, setOrderAmount] = useState('');
  const [productName, setProductName] = useState('');
  const [productImage, setProductImage] = useState('');
  const [targetUser, setTargetUser] = useState('all');
  const [commissionRate, setCommissionRate] = useState('20');

  // Adjust Balance Modal State
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [adjustType, setAdjustType] = useState('add'); // 'add' | 'deduct'
  const [adjustAmount, setAdjustAmount] = useState('');

  // Fetch all data
  const fetchAllData = async () => {
    try {
      const headers = { 'Authorization': `Bearer ${adminToken}` };
      
      // Users
      const resUsers = await fetch('/api/admin/users', { headers });
      if (resUsers.ok) setUsersList(await resUsers.json());

      // Recharges
      const resRecharges = await fetch('/api/admin/recharges', { headers });
      if (resRecharges.ok) setRechargesList(await resRecharges.json());

      // Withdrawals
      const resWithdrawals = await fetch('/api/admin/withdrawals', { headers });
      if (resWithdrawals.ok) setWithdrawalsList(await resWithdrawals.json());

      // Orders
      const resOrders = await fetch('/api/admin/orders', { headers });
      if (resOrders.ok) setOrdersList(await resOrders.json());
      
    } catch (e) {
      console.error(e);
      addToast('Error fetching dashboard data', 'error');
    }
  };

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 10000); // auto-refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    if (!orderAmount || isNaN(orderAmount) || parseFloat(orderAmount) <= 0) {
      addToast('Please enter a valid order amount', 'error');
      return;
    }

    // Unsplash apparel/electronics images for Myntra aesthetics
    const fallbackProducts = [
      { name: 'Myntra Premium Designer Shirt', img: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400' },
      { name: 'Roadster Mens Casual Shoes', img: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400' },
      { name: 'HRX Sports Smart Watch', img: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400' },
      { name: 'Womens Elegant Evening Gown', img: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400' },
      { name: 'Myntra Active Travel Backpack', img: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400' }
    ];

    const randomProduct = fallbackProducts[Math.floor(Math.random() * fallbackProducts.length)];

    try {
      const headers = { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}` 
      };

      const response = await fetch('/api/admin/orders', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          amount: parseFloat(orderAmount),
          productName: productName.trim() || randomProduct.name,
          productImage: productImage.trim() || randomProduct.img,
          targetUser: targetUser.trim(),
          commissionRate: parseFloat(commissionRate)
        })
      });

      if (response.ok) {
        addToast('Task order created successfully!');
        setOrderAmount('');
        setProductName('');
        setProductImage('');
        setTargetUser('all');
        fetchAllData();
      } else {
        const d = await response.json();
        addToast(d.error || 'Failed to create order', 'error');
      }
    } catch (e) {
      addToast('Network error', 'error');
    }
  };

  const handleDeleteOrder = async (id) => {
    try {
      const headers = { 'Authorization': `Bearer ${adminToken}` };
      const response = await fetch(`/api/admin/orders/${id}`, {
        method: 'DELETE',
        headers
      });
      if (response.ok) {
        addToast('Order deleted successfully');
        fetchAllData();
      }
    } catch (e) {
      addToast('Error deleting order', 'error');
    }
  };

  // Adjust Wallet Balance
  const handleAdjustBalance = async () => {
    if (!selectedUser || !adjustAmount || isNaN(adjustAmount) || parseFloat(adjustAmount) <= 0) {
      addToast('Enter a valid adjustment amount', 'error');
      return;
    }

    try {
      const headers = { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}` 
      };

      const response = await fetch('/api/admin/users/balance', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          userId: selectedUser.id,
          type: adjustType,
          amount: parseFloat(adjustAmount)
        })
      });

      if (response.ok) {
        addToast(`Balance ${adjustType === 'add' ? 'credited' : 'debited'} successfully!`);
        setShowAdjustModal(false);
        setAdjustAmount('');
        setSelectedUser(null);
        fetchAllData();
      } else {
        const d = await response.json();
        addToast(d.error || 'Failed to adjust balance', 'error');
      }
    } catch (e) {
      addToast('Error updating balance', 'error');
    }
  };

  // Process Recharge Approvals
  const handleProcessRecharge = async (id, status) => {
    try {
      const headers = { 'Authorization': `Bearer ${adminToken}` };
      const response = await fetch(`/api/admin/recharges/${id}/${status}`, {
        method: 'POST',
        headers
      });

      if (response.ok) {
        addToast(`Recharge request ${status === 'approve' ? 'approved' : 'rejected'}`);
        fetchAllData();
      } else {
        const d = await response.json();
        addToast(d.error || 'Failed to process recharge', 'error');
      }
    } catch (e) {
      addToast('Network error', 'error');
    }
  };

  // Process Withdrawal Approvals
  const handleProcessWithdrawal = async (id, status) => {
    try {
      const headers = { 'Authorization': `Bearer ${adminToken}` };
      const response = await fetch(`/api/admin/withdrawals/${id}/${status}`, {
        method: 'POST',
        headers
      });

      if (response.ok) {
        addToast(`Withdrawal payout ${status === 'approve' ? 'approved' : 'rejected'}`);
        fetchAllData();
      } else {
        const d = await response.json();
        addToast(d.error || 'Failed to process withdrawal', 'error');
      }
    } catch (e) {
      addToast('Network error', 'error');
    }
  };

  // Logout admin
  const handleLogout = () => {
    logoutAdmin();
    navigate('/admin-login');
  };

  // Quick stats calculations
  const totalRechargeAmt = rechargesList.filter(r => r.status === 'approved').reduce((sum, r) => sum + r.amount, 0);
  const totalWithdrawAmt = withdrawalsList.filter(w => w.status === 'approved').reduce((sum, w) => sum + w.amount, 0);
  const pendingRecharges = rechargesList.filter(r => r.status === 'pending').length;
  const pendingWithdrawals = withdrawalsList.filter(w => w.status === 'pending').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', minHeight: '100vh', background: '#0b0f19', color: 'white', paddingBottom: '40px' }}>
      
      {/* Admin Panel Header */}
      <div style={{
        background: '#151c2c',
        borderBottom: '1px solid var(--border)',
        padding: '16px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Shield size={24} style={{ color: 'var(--accent-blue)' }} />
          <h1 style={{ fontSize: '18px', fontWeight: '800' }}>Myntra Task Admin Control Panel</h1>
        </div>
        <button 
          onClick={handleLogout}
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '8px',
            padding: '8px 16px',
            color: 'var(--danger)',
            cursor: 'pointer',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px'
          }}
        >
          <LogOut size={16} />
          <span>Exit Panel</span>
        </button>
      </div>

      {/* Main Container Layout */}
      <div style={{ maxWidth: '1200px', width: '100%', margin: '0 auto', padding: '24px' }}>
        
        {/* Core Stats Row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <div style={{ background: '#151c2c', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '12px' }}>
              <span>TOTAL MEMBERS</span>
              <Users size={16} style={{ color: 'var(--accent-blue)' }} />
            </div>
            <div style={{ fontSize: '26px', fontWeight: '800', marginTop: '10px' }}>{usersList.length}</div>
          </div>

          <div style={{ background: '#151c2c', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '12px' }}>
              <span>APPROVED RECHARGES</span>
              <CreditCard size={16} style={{ color: 'var(--success)' }} />
            </div>
            <div style={{ fontSize: '26px', fontWeight: '800', marginTop: '10px', color: 'var(--success)' }}>
              ₹ {totalRechargeAmt.toFixed(2)}
            </div>
            {pendingRecharges > 0 && (
              <span style={{ fontSize: '11px', color: 'var(--warning)', marginTop: '4px', display: 'inline-block' }}>
                ({pendingRecharges} pending approvals)
              </span>
            )}
          </div>

          <div style={{ background: '#151c2c', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '12px' }}>
              <span>APPROVED WITHDRAWALS</span>
              <Landmark size={16} style={{ color: 'var(--danger)' }} />
            </div>
            <div style={{ fontSize: '26px', fontWeight: '800', marginTop: '10px', color: 'var(--danger)' }}>
              ₹ {totalWithdrawAmt.toFixed(2)}
            </div>
            {pendingWithdrawals > 0 && (
              <span style={{ fontSize: '11px', color: 'var(--warning)', marginTop: '4px', display: 'inline-block' }}>
                ({pendingWithdrawals} pending payouts)
              </span>
            )}
          </div>

          <div style={{ background: '#151c2c', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '12px' }}>
              <span>TOTAL CREATED TASKS</span>
              <ClipboardList size={16} style={{ color: '#fbbf24' }} />
            </div>
            <div style={{ fontSize: '26px', fontWeight: '800', marginTop: '10px' }}>{ordersList.length}</div>
          </div>
        </div>

        {/* Tab Controls */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '24px', gap: '8px', overflowX: 'auto', width: '100%', paddingBottom: '4px', whiteSpace: 'nowrap' }}>
          {['Users', 'Recharges', 'Withdrawals', 'Create Task'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '12px 20px',
                background: activeTab === tab ? 'var(--bg-card-light)' : 'none',
                border: 'none',
                borderBottom: activeTab === tab ? '3px solid var(--accent-blue)' : '3px solid transparent',
                color: activeTab === tab ? 'white' : 'var(--text-secondary)',
                fontWeight: '700',
                cursor: 'pointer',
                fontSize: '14px',
                borderRadius: '8px 8px 0 0',
                transition: 'all 0.2s ease',
                outline: 'none'
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* ==========================================
            TAB CONTENT: USERS
            ========================================== */}
        {activeTab === 'Users' && (
          <div style={{ background: '#151c2c', borderRadius: '16px', border: '1px solid var(--border)', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '16px' }}>Phone Number</th>
                  <th style={{ padding: '16px' }}>UID</th>
                  <th style={{ padding: '16px' }}>Invite Code</th>
                  <th style={{ padding: '16px' }}>Referred By</th>
                  <th style={{ padding: '16px' }}>Wallet Balance</th>
                  <th style={{ padding: '16px' }}>Frozen Amount</th>
                  <th style={{ padding: '16px' }}>Today's Commission</th>
                  <th style={{ padding: '16px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {usersList.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No registered users found.
                    </td>
                  </tr>
                ) : (
                  usersList.map(userItem => (
                    <tr key={userItem.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td style={{ padding: '16px', fontWeight: '700' }}>{userItem.phone}</td>
                      <td style={{ padding: '16px' }}>{userItem.uid}</td>
                      <td style={{ padding: '16px', color: 'var(--accent-blue)', fontWeight: '600' }}>{userItem.inviteCode}</td>
                      <td style={{ padding: '16px', color: 'var(--text-muted)' }}>{userItem.referrerPhone || 'Direct'}</td>
                      <td style={{ padding: '16px', color: 'white', fontWeight: '700' }}>₹ {userItem.balance.toFixed(2)}</td>
                      <td style={{ padding: '16px', color: '#fbbf24', fontWeight: '700' }}>₹ {userItem.frozenAmount.toFixed(2)}</td>
                      <td style={{ padding: '16px', color: 'var(--success)' }}>₹ {userItem.todayEarnings.toFixed(2)}</td>
                      <td style={{ padding: '16px', textAlign: 'center' }}>
                        <button
                          onClick={() => {
                            setSelectedUser(userItem);
                            setAdjustType('add');
                            setShowAdjustModal(true);
                          }}
                          style={{
                            background: 'var(--accent-blue)',
                            border: 'none',
                            color: 'white',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: '600',
                            fontSize: '12px'
                          }}
                        >
                          Modify Wallet
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ==========================================
            TAB CONTENT: RECHARGES
            ========================================== */}
        {activeTab === 'Recharges' && (
          <div style={{ background: '#151c2c', borderRadius: '16px', border: '1px solid var(--border)', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '16px' }}>Member Details</th>
                  <th style={{ padding: '16px' }}>Amount</th>
                  <th style={{ padding: '16px' }}>Payment Channel</th>
                  <th style={{ padding: '16px' }}>UPI Ref / UTR No</th>
                  <th style={{ padding: '16px' }}>Timestamp</th>
                  <th style={{ padding: '16px' }}>Status</th>
                  <th style={{ padding: '16px', textAlign: 'center' }}>Approval Control</th>
                </tr>
              </thead>
              <tbody>
                {rechargesList.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No recharge requests.
                    </td>
                  </tr>
                ) : (
                  rechargesList.map(rec => (
                    <tr key={rec.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td style={{ padding: '16px' }}>
                        <div style={{ fontWeight: '700' }}>{rec.userPhone}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>UID: {rec.userUID}</div>
                      </td>
                      <td style={{ padding: '16px', fontWeight: '800', color: 'var(--success)' }}>₹ {rec.amount.toFixed(2)}</td>
                      <td style={{ padding: '16px' }}>{rec.channel}</td>
                      <td style={{ padding: '16px', color: 'white', fontWeight: '600' }}>{rec.referenceNo}</td>
                      <td style={{ padding: '16px', fontSize: '12px' }}>{new Date(rec.createdAt).toLocaleString()}</td>
                      <td style={{ padding: '16px' }}>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: '700',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          background: rec.status === 'approved' ? 'rgba(16, 185, 129, 0.1)' : 
                                      rec.status === 'rejected' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                          color: rec.status === 'approved' ? 'var(--success)' : 
                                 rec.status === 'rejected' ? 'var(--danger)' : 'var(--warning)'
                        }}>
                          {rec.status.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center' }}>
                        {rec.status === 'pending' ? (
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button
                              onClick={() => handleProcessRecharge(rec.id, 'approve')}
                              style={{ background: 'var(--success)', border: 'none', color: 'white', padding: '6px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            >
                              <Check size={16} />
                            </button>
                            <button
                              onClick={() => handleProcessRecharge(rec.id, 'reject')}
                              style={{ background: 'var(--danger)', border: 'none', color: 'white', padding: '6px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Settled</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ==========================================
            TAB CONTENT: WITHDRAWALS
            ========================================== */}
        {activeTab === 'Withdrawals' && (
          <div style={{ background: '#151c2c', borderRadius: '16px', border: '1px solid var(--border)', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '16px' }}>Member Details</th>
                  <th style={{ padding: '16px' }}>Amount</th>
                  <th style={{ padding: '16px' }}>Bank Credentials</th>
                  <th style={{ padding: '16px' }}>Holder Name</th>
                  <th style={{ padding: '16px' }}>Timestamp</th>
                  <th style={{ padding: '16px' }}>Status</th>
                  <th style={{ padding: '16px', textAlign: 'center' }}>Approval Control</th>
                </tr>
              </thead>
              <tbody>
                {withdrawalsList.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No withdrawal payouts.
                    </td>
                  </tr>
                ) : (
                  withdrawalsList.map(wit => (
                    <tr key={wit.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td style={{ padding: '16px' }}>
                        <div style={{ fontWeight: '700' }}>{wit.userPhone}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>UID: {wit.userUID}</div>
                      </td>
                      <td style={{ padding: '16px', fontWeight: '800', color: 'var(--danger)' }}>₹ {wit.amount.toFixed(2)}</td>
                      <td style={{ padding: '16px' }}>
                        <div style={{ fontWeight: '600' }}>A/c: {wit.bankAccount}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>IFSC: {wit.ifsc} ({wit.bankName})</div>
                      </td>
                      <td style={{ padding: '16px', fontWeight: '600' }}>{wit.holderName}</td>
                      <td style={{ padding: '16px', fontSize: '12px' }}>{new Date(wit.createdAt).toLocaleString()}</td>
                      <td style={{ padding: '16px' }}>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: '700',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          background: wit.status === 'approved' ? 'rgba(16, 185, 129, 0.1)' : 
                                      wit.status === 'rejected' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                          color: wit.status === 'approved' ? 'var(--success)' : 
                                 wit.status === 'rejected' ? 'var(--danger)' : 'var(--warning)'
                        }}>
                          {wit.status.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center' }}>
                        {wit.status === 'pending' ? (
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button
                              onClick={() => handleProcessWithdrawal(wit.id, 'approve')}
                              style={{ background: 'var(--success)', border: 'none', color: 'white', padding: '6px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            >
                              <Check size={16} />
                            </button>
                            <button
                              onClick={() => handleProcessWithdrawal(wit.id, 'reject')}
                              style={{ background: 'var(--danger)', border: 'none', color: 'white', padding: '6px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Settled</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ==========================================
            TAB CONTENT: CREATE TASK
            ========================================== */}
        {activeTab === 'Create Task' && (
          <div className="responsive-admin-grid">
            
            {/* Create Form */}
            <form onSubmit={handleCreateOrder} style={{ background: '#151c2c', borderRadius: '16px', padding: '24px', border: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PlusCircle size={20} style={{ color: 'var(--accent-blue)' }} />
                <span>Create New Task Order</span>
              </h3>

              <div className="form-input-group">
                <label>Order Amount (₹)</label>
                <input
                  type="number"
                  className="form-input"
                  style={{ paddingLeft: '16px' }}
                  placeholder="e.g. 100, 500, 1000, 5000"
                  value={orderAmount}
                  onChange={(e) => setOrderAmount(e.target.value)}
                  required
                />
              </div>

              <div className="form-input-group">
                <label>Product Name (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '16px' }}
                  placeholder="Leave empty for auto random clothing name"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                />
              </div>

              <div className="form-input-group">
                <label>Product Image URL (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '16px' }}
                  placeholder="Leave empty for auto random image"
                  value={productImage}
                  onChange={(e) => setProductImage(e.target.value)}
                />
              </div>

              <div className="form-input-group">
                <label>Target User Phone / UID</label>
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '16px' }}
                  placeholder="Enter specific Phone/UID, or type 'all'"
                  value={targetUser}
                  onChange={(e) => setTargetUser(e.target.value)}
                  required
                />
              </div>

              <div className="form-input-group" style={{ marginBottom: '20px' }}>
                <label>Commission Rate (%)</label>
                <input
                  type="number"
                  className="form-input"
                  style={{ paddingLeft: '16px' }}
                  placeholder="Defaults to 20%"
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="primary-button" style={{ background: 'linear-gradient(135deg, var(--accent-blue) 0%, var(--accent-blue-hover) 100%)' }}>
                Allocate Task Order
              </button>
            </form>

            {/* Active Tasks List */}
            <div style={{ background: '#151c2c', borderRadius: '16px', padding: '24px', border: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '16px' }}>Active Allocated Tasks</h3>
              
              {ordersList.length === 0 ? (
                <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                  No active orders created. Create one on the left.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '520px', overflowY: 'auto' }}>
                  {ordersList.map(ord => (
                    <div key={ord.id} style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid var(--border)',
                      borderRadius: '12px',
                      padding: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '6px', overflow: 'hidden', background: '#eee' }}>
                          <img src={ord.productImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: '700' }}>₹ {ord.amount.toFixed(2)}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2.5px' }}>
                            Target: <span style={{ color: 'var(--accent-blue)', fontWeight: '600' }}>{ord.targetUser}</span>
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2.5px' }}>
                            Grabbed by {ord.grabbedBy.length} users
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteOrder(ord.id)}
                        style={{
                          background: 'rgba(239, 68, 68, 0.1)',
                          border: 'none',
                          color: 'var(--danger)',
                          padding: '6px',
                          borderRadius: '6px',
                          cursor: 'pointer'
                        }}
                      >
                        <Trash size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

      </div>

      {/* Adjust Balance Modal */}
      {showAdjustModal && selectedUser && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '92%', maxWidth: '360px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '800', textAlign: 'center', marginBottom: '16px' }}>
              Modify User Wallet: {selectedUser.phone}
            </h3>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              <button
                type="button"
                onClick={() => setAdjustType('add')}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  background: adjustType === 'add' ? 'var(--success)' : 'rgba(255,255,255,0.03)',
                  color: adjustType === 'add' ? 'white' : 'var(--text-secondary)',
                  border: '1px solid var(--border)',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Credit Funds
              </button>
              <button
                type="button"
                onClick={() => setAdjustType('deduct')}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  background: adjustType === 'deduct' ? 'var(--danger)' : 'rgba(255,255,255,0.03)',
                  color: adjustType === 'deduct' ? 'white' : 'var(--text-secondary)',
                  border: '1px solid var(--border)',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Debit Funds
              </button>
            </div>

            <div className="form-input-group" style={{ marginBottom: '20px' }}>
              <label>Amount (₹)</label>
              <input
                type="number"
                className="form-input"
                style={{ paddingLeft: '16px' }}
                placeholder="Enter amount to modify"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
                required
              />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={() => {
                  setShowAdjustModal(false);
                  setSelectedUser(null);
                  setAdjustAmount('');
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '10px',
                  background: 'none',
                  border: '1px solid var(--border)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAdjustBalance}
                style={{
                  flex: 2,
                  padding: '12px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, var(--accent-blue) 0%, var(--accent-blue-hover) 100%)',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: '700'
                }}
              >
                Confirm Adjust
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default AdminDashboard;
