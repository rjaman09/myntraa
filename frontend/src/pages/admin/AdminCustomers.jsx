import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Search, 
  RotateCcw, 
  User, 
  Building2, 
  Plus, 
  RefreshCw, 
  Trash2,
  TrendingUp, 
  CheckCircle, 
  XCircle, 
  Clock,
  ArrowRightLeft
} from 'lucide-react';

const AdminCustomers = ({ usersList = [], fetchAllData, adminToken, addToast }) => {
  const [view, setView] = useState('list'); // 'list' | 'detail'
  const [selectedUser, setSelectedUser] = useState(null);
  const [search, setSearch] = useState('');

  // Modals
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);

  // Form inputs
  const [transferAmt, setTransferAmt] = useState('');
  const [adjustType, setAdjustType] = useState('add');
  const [adjustAmt, setAdjustAmt] = useState('');

  // Find detailed stats for the selected user
  const [userTasks, setUserTasks] = useState([]);
  const [userBank, setUserBank] = useState(null);

  const fetchUserExtraData = async (user) => {
    try {
      // 1. Fetch assigned tasks
      const tRes = await fetch('/api/admin/tasks', {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      if (tRes.ok) {
        const data = await tRes.json();
        setUserTasks(data.filter(t => t.userId === user.id));
      }

      // 2. Fetch bank details
      const bRes = await fetch(`/api/admin/users/${user.id}/bank`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      if (bRes.ok) {
        const data = await bRes.json();
        setUserBank(data);
      } else {
        setUserBank(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (selectedUser) {
      fetchUserExtraData(selectedUser);
    }
  }, [selectedUser, usersList]);

  // Handle Transfer to Wallet (Frozen release)
  const handleTransferToWallet = async (e) => {
    e.preventDefault();
    if (!transferAmt || parseFloat(transferAmt) <= 0) {
      addToast('Please enter a valid transfer amount', 'error');
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}/release-frozen`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ amount: parseFloat(transferAmt) })
      });

      if (response.ok) {
        addToast(`Successfully released ₹${transferAmt} to active balance!`);
        setShowTransferModal(false);
        setTransferAmt('');
        // Update local selected user from usersList refresh
        fetchAllData();
        const updated = usersList.find(u => u.id === selectedUser.id);
        if (updated) setSelectedUser(updated);
      } else {
        const err = await response.json();
        addToast(err.error || 'Failed to release frozen amount', 'error');
      }
    } catch (e) {
      addToast('Connection error', 'error');
    }
  };

  // Handle Adjust Balance (Add / Deduct)
  const handleAdjustBalance = async (e) => {
    e.preventDefault();
    if (!adjustAmt || parseFloat(adjustAmt) <= 0) {
      addToast('Please enter a valid amount', 'error');
      return;
    }

    try {
      const response = await fetch('/api/admin/users/balance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          userId: selectedUser.id,
          type: adjustType,
          amount: parseFloat(adjustAmt)
        })
      });

      if (response.ok) {
        addToast(`Balance ${adjustType === 'add' ? 'added' : 'deducted'} successfully!`);
        setShowAdjustModal(false);
        setAdjustAmt('');
        fetchAllData();
        const updated = usersList.find(u => u.id === selectedUser.id);
        if (updated) setSelectedUser(updated);
      } else {
        const err = await response.json();
        addToast(err.error || 'Failed to adjust balance', 'error');
      }
    } catch (e) {
      addToast('Connection error', 'error');
    }
  };

  // Math metrics for user detail view
  const totalAssigned = userTasks.length;
  const completedCount = userTasks.filter(t => t.status === 'completed').length;
  const rejectedCount = userTasks.filter(t => t.status === 'rejected').length;
  const expiredCount = userTasks.filter(t => t.status === 'expired').length;
  const completionRate = totalAssigned > 0 ? Math.round((completedCount / totalAssigned) * 100) : 0;

  const totalBonusEarned = userTasks
    .filter(t => t.status === 'completed')
    .reduce((sum, t) => sum + parseFloat(t.bonus || 0), 0);

  const totalRewardsValue = userTasks
    .filter(t => t.status === 'completed')
    .reduce((sum, t) => sum + parseFloat(t.amount || 0) + parseFloat(t.bonus || 0), 0);

  // Filters
  const filteredUsers = usersList.filter(item => {
    const searchLower = search.toLowerCase();
    return item.phone?.toLowerCase().includes(searchLower) || 
           item.uid?.toLowerCase().includes(searchLower);
  });

  const totalCustomers = usersList.length;
  const customersWithBalance = usersList.filter(u => parseFloat(u.balance) > 0).length;

  // VIEW 1: CUSTOMERS LIST VIEW
  if (view === 'list') {
    return (
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Title */}
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '800', margin: 0, color: 'white' }}>Customers</h2>
          <p style={{ fontSize: '12px', color: '#9ca3af', margin: '4px 0 0 0' }}>The people and businesses you sell to — identify, contact, and check balances.</p>
        </div>

        {/* Metrics Summary */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px'
        }}>
          {[
            { label: 'ALL CUSTOMERS', val: totalCustomers, color: 'white' },
            { label: 'WITH WALLET BALANCE', val: customersWithBalance, color: '#10b981' }
          ].map((item, idx) => (
            <div key={idx} style={{
              background: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '12px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <span style={{ fontSize: '10px', fontWeight: '700', color: '#9ca3af', letterSpacing: '0.5px' }}>{item.label}</span>
              <span style={{ fontSize: '22px', fontWeight: '800', color: item.color }}>{item.val}</span>
            </div>
          ))}
        </div>

        {/* Filter bar */}
        <div style={{
          background: '#1f2937',
          border: '1px solid #374151',
          borderRadius: '12px',
          padding: '16px 20px',
          display: 'flex',
          gap: '16px',
          alignItems: 'center'
        }}>
          <div style={{ flex: 1 }}>
            <input 
              type="text"
              placeholder="Search customers by phone number or UID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%',
                background: '#111827',
                border: '1px solid #374151',
                borderRadius: '8px',
                padding: '8px 12px',
                color: 'white',
                fontSize: '13px',
                outline: 'none'
              }}
            />
          </div>
          <button 
            type="button"
            onClick={() => setSearch('')}
            style={{
              background: 'none',
              border: '1px solid #374151',
              borderRadius: '8px',
              padding: '8px 12px',
              color: '#9ca3af',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <RotateCcw size={14} />
            <span>Reset</span>
          </button>
        </div>

        {/* Customers Table List */}
        <div style={{
          background: '#1f2937',
          border: '1px solid #374151',
          borderRadius: '12px',
          overflow: 'hidden'
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', color: '#e5e7eb', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#111827', borderBottom: '1px solid #374151', color: '#9ca3af' }}>
                  <th style={{ padding: '14px 16px' }}>CODE</th>
                  <th style={{ padding: '14px 16px' }}>NAME / PHONE</th>
                  <th style={{ padding: '14px 16px' }}>WALLET BALANCE</th>
                  <th style={{ padding: '14px 16px' }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                      No customers registered in databases.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map(item => (
                    <tr 
                      key={item.id}
                      onClick={() => { setSelectedUser(item); setView('detail'); }}
                      style={{ borderBottom: '1px solid #374151', cursor: 'pointer', transition: 'all 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#374151'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '14px 16px', fontFamily: 'monospace', color: '#9ca3af' }}>
                        {item.uid}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: '700', color: 'white' }}>{item.phone}</div>
                        <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>Code: {item.inviteCode}</div>
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: '800', color: '#10b981' }}>
                        ₹ {parseFloat(item.balance).toFixed(2)}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          fontSize: '10px',
                          fontWeight: '700',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: 'rgba(16, 185, 129, 0.1)',
                          color: '#10b981'
                        }}>
                          ACTIVE
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    );
  }

  // VIEW 2: DETAILED CUSTOMER PROFILE
  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Detail Header & Action row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            onClick={() => { setSelectedUser(null); setView('list'); }}
            style={{
              background: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '8px',
              padding: '8px',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: 'white' }}>{selectedUser.phone}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
              <span style={{ fontSize: '11px', color: '#9ca3af' }}>UID: {selectedUser.uid} • inviteCode: {selectedUser.inviteCode}</span>
              <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#6b7280' }} />
              <span style={{ fontSize: '10px', color: '#10b981', fontWeight: '700' }}>Active</span>
            </div>
          </div>
        </div>

        {/* Action triggers */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={() => setShowAdjustModal(true)}
            style={{
              background: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '8px',
              padding: '10px 14px',
              color: 'white',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Plus size={14} style={{ color: '#10b981' }} />
            <span>Add wallet funds</span>
          </button>
          
          <button 
            onClick={() => setShowTransferModal(true)}
            style={{
              background: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '8px',
              padding: '10px 14px',
              color: 'white',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <ArrowRightLeft size={14} style={{ color: '#fbbf24' }} />
            <span>Transfer to wallet</span>
          </button>
        </div>
      </div>

      {/* Main Profile Grid: Cards left, Identity details right */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1.2fr',
        gap: '24px',
        alignItems: 'start'
      }}>
        {/* Left Side: Summary Metrics & Task History list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Wallet summary active & frozen */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '20px'
          }}>
            <div style={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '12px', padding: '20px' }}>
              <span style={{ fontSize: '10px', fontWeight: '700', color: '#9ca3af', letterSpacing: '0.5px' }}>AVAILABLE BALANCE</span>
              <div style={{ fontSize: '24px', fontWeight: '800', color: '#10b981', marginTop: '10px' }}>
                ₹ {parseFloat(selectedUser.balance).toFixed(2)}
              </div>
            </div>
            <div style={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '12px', padding: '20px' }}>
              <span style={{ fontSize: '10px', fontWeight: '700', color: '#9ca3af', letterSpacing: '0.5px' }}>FROZEN BALANCE</span>
              <div style={{ fontSize: '24px', fontWeight: '800', color: '#fbbf24', marginTop: '10px' }}>
                ₹ {parseFloat(selectedUser.frozenAmount || 0).toFixed(2)}
              </div>
            </div>
          </div>

          {/* Task history stats */}
          <div style={{
            background: '#1f2937',
            border: '1px solid #374151',
            borderRadius: '12px',
            padding: '20px'
          }}>
            <h4 style={{ fontSize: '13px', fontWeight: '700', color: 'white', margin: '0 0 16px 0' }}>Task history</h4>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '12px',
              marginBottom: '20px'
            }}>
              {[
                { label: 'TOTAL ASSIGNED', val: totalAssigned, color: 'white', icon: User },
                { label: 'COMPLETED', val: completedCount, color: '#10b981', icon: CheckCircle },
                { label: 'REJECTED', val: rejectedCount, color: '#ef4444', icon: XCircle },
                { label: 'EXPIRED', val: expiredCount, color: '#6b7280', icon: Clock },
                { label: 'COMPLETION RATE', val: `${completionRate}%`, color: '#60a5fa', icon: TrendingUp }
              ].map((stat, sIdx) => {
                const Icon = stat.icon;
                return (
                  <div key={sIdx} style={{ background: '#111827', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '9px', fontWeight: '700', color: '#6b7280' }}>{stat.label}</span>
                      <Icon size={12} style={{ color: '#4b5563' }} />
                    </div>
                    <span style={{ fontSize: '16px', fontWeight: '800', color: stat.color }}>{stat.val}</span>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ background: '#111827', borderRadius: '8px', padding: '14px' }}>
                <span style={{ fontSize: '9px', fontWeight: '700', color: '#6b7280' }}>TOTAL BONUS EARNED</span>
                <div style={{ fontSize: '18px', fontWeight: '800', color: '#10b981', marginTop: '6px' }}>
                  ₹ {totalBonusEarned.toFixed(2)}
                </div>
              </div>
              <div style={{ background: '#111827', borderRadius: '8px', padding: '14px' }}>
                <span style={{ fontSize: '9px', fontWeight: '700', color: '#6b7280' }}>TOTAL REWARDS (PRICE + BONUS)</span>
                <div style={{ fontSize: '18px', fontWeight: '800', color: 'white', marginTop: '6px' }}>
                  ₹ {totalRewardsValue.toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          {/* User's individual task history table */}
          <div style={{
            background: '#1f2937',
            border: '1px solid #374151',
            borderRadius: '12px',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #374151', fontWeight: '700', color: 'white', fontSize: '13px' }}>
              Allocated Task Log
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', color: '#e5e7eb', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#111827', borderBottom: '1px solid #374151', color: '#9ca3af' }}>
                    <th style={{ padding: '10px 16px' }}>PRODUCT</th>
                    <th style={{ padding: '10px 16px' }}>STATUS</th>
                    <th style={{ padding: '10px 16px' }}>PRICE</th>
                    <th style={{ padding: '10px 16px' }}>BONUS</th>
                    <th style={{ padding: '10px 16px' }}>DATE</th>
                  </tr>
                </thead>
                <tbody>
                  {userTasks.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>
                        No tasks allocated to this customer yet.
                      </td>
                    </tr>
                  ) : (
                    userTasks.map(task => (
                      <tr key={task.id} style={{ borderBottom: '1px solid #374151' }}>
                        <td style={{ padding: '12px 16px', fontWeight: '700', color: 'white' }}>{task.productName}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            fontSize: '9px',
                            fontWeight: '700',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: task.status === 'completed' ? 'rgba(16, 185, 129, 0.1)' : 
                                        task.status === 'submitted' ? 'rgba(251, 191, 36, 0.1)' :
                                        task.status === 'assigned' ? 'rgba(96, 165, 250, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            color: task.status === 'completed' ? '#10b981' : 
                                   task.status === 'submitted' ? '#fbbf24' :
                                   task.status === 'assigned' ? '#60a5fa' : '#ef4444'
                          }}>
                            {task.status.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: '700' }}>₹ {task.amount.toFixed(2)}</td>
                        <td style={{ padding: '12px 16px', fontWeight: '700', color: '#10b981' }}>₹ {task.bonus.toFixed(2)}</td>
                        <td style={{ padding: '12px 16px', color: '#9ca3af' }}>{new Date(task.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Right Side: Identity Details & Bank Account Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Identity details */}
          <div style={{
            background: '#1f2937',
            border: '1px solid #374151',
            borderRadius: '12px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}>
            <h4 style={{ fontSize: '12px', fontWeight: '700', color: 'white', margin: 0 }}>Identity and contact details</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
              <div>
                <span style={{ color: '#6b7280', display: 'block', fontSize: '10px', fontWeight: '700' }}>PHONE</span>
                <span style={{ color: 'white', fontSize: '13px', fontWeight: '600' }}>{selectedUser.phone}</span>
              </div>
              <div>
                <span style={{ color: '#6b7280', display: 'block', fontSize: '10px', fontWeight: '700' }}>UID CODE</span>
                <span style={{ color: 'white', fontSize: '13px', fontWeight: '600' }}>{selectedUser.uid}</span>
              </div>
            </div>
          </div>

          {/* Bank details card */}
          <div style={{
            background: '#1f2937',
            border: '1px solid #374151',
            borderRadius: '12px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}>
            <h4 style={{ fontSize: '12px', fontWeight: '700', color: 'white', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Building2 size={16} style={{ color: '#9ca3af' }} />
              <span>Bank details</span>
            </h4>
            
            {userBank ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
                <div>
                  <span style={{ color: '#6b7280', display: 'block', fontSize: '10px', fontWeight: '700' }}>ACCOUNT HOLDER</span>
                  <span style={{ color: 'white', fontSize: '13px', fontWeight: '600' }}>{userBank.holderName || '—'}</span>
                </div>
                <div>
                  <span style={{ color: '#6b7280', display: 'block', fontSize: '10px', fontWeight: '700' }}>ACCOUNT NUMBER</span>
                  <span style={{ color: 'white', fontSize: '13px', fontWeight: '600', fontFamily: 'monospace' }}>{userBank.accountNumber || '—'}</span>
                </div>
                <div>
                  <span style={{ color: '#6b7280', display: 'block', fontSize: '10px', fontWeight: '700' }}>BANK NAME</span>
                  <span style={{ color: 'white', fontSize: '13px', fontWeight: '600' }}>{userBank.bankName || '—'}</span>
                </div>
                <div>
                  <span style={{ color: '#6b7280', display: 'block', fontSize: '10px', fontWeight: '700' }}>IFSC CODE</span>
                  <span style={{ color: 'white', fontSize: '13px', fontWeight: '600', fontFamily: 'monospace' }}>{userBank.ifsc || '—'}</span>
                </div>
                <div>
                  <span style={{ color: '#6b7280', display: 'block', fontSize: '10px', fontWeight: '700' }}>UPI ID</span>
                  <span style={{ color: 'white', fontSize: '13px', fontWeight: '600', fontFamily: 'monospace' }}>{userBank.upiId || '—'}</span>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '12px', color: '#6b7280', padding: '10px 0', textAlign: 'center' }}>
                Bank details have not been submitted by the customer.
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Modal 1: Transfer Frozen balance to wallet */}
      {showTransferModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <form onSubmit={handleTransferToWallet} style={{
            background: '#1f2937',
            border: '1px solid #374151',
            borderRadius: '12px',
            padding: '24px',
            width: '92%',
            maxWidth: '380px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <h3 style={{ fontSize: '14px', fontWeight: '800', color: 'white', margin: 0, textAlign: 'center' }}>
              Transfer to wallet
            </h3>
            
            <div style={{ background: '#111827', borderRadius: '8px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: '#6b7280' }}>Current frozen balance</span>
              <span style={{ fontSize: '14px', fontWeight: '800', color: '#fbbf24' }}>
                ₹ {parseFloat(selectedUser.frozenAmount || 0).toFixed(2)}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#9ca3af' }}>AMOUNT</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type="number"
                  placeholder="Enter release amount..."
                  value={transferAmt}
                  onChange={e => setTransferAmt(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#111827',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    padding: '10px 80px 10px 12px',
                    color: 'white',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setTransferAmt(selectedUser.frozenAmount)}
                  style={{
                    position: 'absolute',
                    right: '6px',
                    top: '6px',
                    background: '#ff3f6c',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Transfer all
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button
                type="button"
                onClick={() => { setShowTransferModal(false); setTransferAmt(''); }}
                style={{
                  flex: 1,
                  background: 'none',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#9ca3af',
                  padding: '10px',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Discard
              </button>
              <button
                type="submit"
                style={{
                  flex: 1.5,
                  background: '#ff3f6c',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Transfer
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal 2: Add wallet funds (Adjust balance) */}
      {showAdjustModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <form onSubmit={handleAdjustBalance} style={{
            background: '#1f2937',
            border: '1px solid #374151',
            borderRadius: '12px',
            padding: '24px',
            width: '92%',
            maxWidth: '380px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <h3 style={{ fontSize: '14px', fontWeight: '800', color: 'white', margin: 0, textAlign: 'center' }}>
              Adjust wallet balance
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#9ca3af' }}>ADJUST TYPE</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setAdjustType('add')}
                  style={{
                    flex: 1,
                    background: adjustType === 'add' ? 'rgba(16, 185, 129, 0.15)' : 'none',
                    border: adjustType === 'add' ? '2px solid #10b981' : '1px solid #374151',
                    borderRadius: '8px',
                    color: adjustType === 'add' ? '#10b981' : '#9ca3af',
                    padding: '8px',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Add Funds
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustType('deduct')}
                  style={{
                    flex: 1,
                    background: adjustType === 'deduct' ? 'rgba(239, 68, 68, 0.15)' : 'none',
                    border: adjustType === 'deduct' ? '2px solid #ef4444' : '1px solid #374151',
                    borderRadius: '8px',
                    color: adjustType === 'deduct' ? '#ef4444' : '#9ca3af',
                    padding: '8px',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Deduct Funds
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#9ca3af' }}>AMOUNT (₹)</label>
              <input 
                type="number"
                placeholder="0.00"
                value={adjustAmt}
                onChange={e => setAdjustAmt(e.target.value)}
                style={{
                  background: '#111827',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  color: 'white',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button
                type="button"
                onClick={() => { setShowAdjustModal(false); setAdjustAmt(''); }}
                style={{
                  flex: 1,
                  background: 'none',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#9ca3af',
                  padding: '10px',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Discard
              </button>
              <button
                type="submit"
                style={{
                  flex: 1.5,
                  background: '#ff3f6c',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Submit
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};

export default AdminCustomers;
