import React, { useState } from 'react';
import { Check, X, RotateCcw, Building2 } from 'lucide-react';

const AdminWalletWithdrawals = ({ withdrawalsList = [], fetchAllData, adminToken, addToast }) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Math metrics
  const totalRequests = withdrawalsList.length;
  const approvedTotalAmt = withdrawalsList
    .filter(w => w.status === 'approved')
    .reduce((sum, w) => sum + parseFloat(w.amount || 0), 0);
  const pendingWithdrawalsCount = withdrawalsList.filter(w => w.status === 'pending').length;

  // Process Withdrawal Action
  const handleProcessWithdrawal = async (id, status) => {
    try {
      const response = await fetch(`/api/admin/withdrawals/${id}/${status}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });
      if (response.ok) {
        addToast(`Withdrawal payout ${status === 'approve' ? 'approved' : 'rejected'} successfully!`);
        fetchAllData();
      } else {
        const err = await response.json();
        addToast(err.error || 'Failed to process withdrawal payout', 'error');
      }
    } catch (error) {
      addToast('Connection error', 'error');
    }
  };

  // Filters
  const filteredWithdrawals = withdrawalsList.filter(item => {
    const searchLower = search.toLowerCase();
    const customerMatch = item.userPhone?.toLowerCase().includes(searchLower) || 
                          item.userUID?.toLowerCase().includes(searchLower) || 
                          item.bankName?.toLowerCase().includes(searchLower) || 
                          item.bankAccount?.toLowerCase().includes(searchLower) || 
                          item.ifsc?.toLowerCase().includes(searchLower) ||
                          item.holderName?.toLowerCase().includes(searchLower);
    const statusMatch = statusFilter === 'all' || item.status === statusFilter;
    return customerMatch && statusMatch;
  });

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Title */}
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: '800', margin: 0, color: 'white' }}>Wallet Withdrawals</h2>
        <p style={{ fontSize: '12px', color: '#9ca3af', margin: '4px 0 0 0' }}>Review and approve customer wallet withdrawal requests.</p>
      </div>

      {/* Metrics Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px'
      }}>
        {[
          { label: 'REQUESTS', val: totalRequests, color: 'white' },
          { label: 'TOTAL AMOUNT', val: `₹ ${approvedTotalAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: '#ef4444' },
          { label: 'PENDING', val: pendingWithdrawalsCount, color: pendingWithdrawalsCount > 0 ? '#fbbf24' : 'white' }
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

      {/* Filter Section */}
      <div style={{
        background: '#1f2937',
        border: '1px solid #374151',
        borderRadius: '12px',
        padding: '16px 20px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '16px',
        alignItems: 'center'
      }}>
        <div style={{ flex: 2, minWidth: '200px' }}>
          <input 
            type="text"
            placeholder="Search by customer phone, UID, bank account or holder name..."
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

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <select 
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{
              background: '#111827',
              border: '1px solid #374151',
              borderRadius: '8px',
              padding: '8px 12px',
              color: 'white',
              fontSize: '13px',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>

          <button 
            type="button"
            onClick={() => { setSearch(''); setStatusFilter('all'); }}
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
            <span>Reset Filters</span>
          </button>
        </div>
      </div>

      {/* Withdrawals Table List */}
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
                <th style={{ padding: '14px 16px' }}>SR</th>
                <th style={{ padding: '14px 16px' }}>CUSTOMER</th>
                <th style={{ padding: '14px 16px' }}>AMOUNT</th>
                <th style={{ padding: '14px 16px' }}>BANK DETAILS</th>
                <th style={{ padding: '14px 16px' }}>UPI CODE / PHONE</th>
                <th style={{ padding: '14px 16px' }}>SUBMITTED</th>
                <th style={{ padding: '14px 16px' }}>STATUS</th>
                <th style={{ padding: '14px 16px', textAlign: 'center' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredWithdrawals.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                    No withdrawals found.
                  </td>
                </tr>
              ) : (
                filteredWithdrawals.map((item, index) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #374151' }}>
                    <td style={{ padding: '14px 16px', color: '#9ca3af' }}>{index + 1}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: '700', color: 'white' }}>{item.userPhone || '—'}</div>
                      <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>UID: {item.userUID || '—'}</div>
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: '800', color: 'white' }}>
                      ₹ {parseFloat(item.amount).toFixed(2)}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: '700', color: 'white', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Building2 size={12} style={{ color: '#9ca3af' }} />
                        {item.bankName}
                      </div>
                      <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '3px' }}>
                        Acc: {item.bankAccount}
                      </div>
                      <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px' }}>
                        Name: {item.holderName} • IFSC: {item.ifsc}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', fontFamily: 'monospace', color: '#9ca3af' }}>
                      {item.upiId || '—'}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#9ca3af' }}>
                      {new Date(item.createdAt).toLocaleString()}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: '700',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: item.status === 'approved' ? 'rgba(16, 185, 129, 0.1)' : 
                                    item.status === 'rejected' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(251, 191, 36, 0.1)',
                        color: item.status === 'approved' ? '#10b981' : 
                               item.status === 'rejected' ? '#ef4444' : '#fbbf24'
                      }}>
                        {item.status === 'approved' ? 'COMPLETED' : item.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {item.status === 'pending' ? (
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <button
                            onClick={() => handleProcessWithdrawal(item.id, 'approve')}
                            style={{
                              background: '#10b981',
                              border: 'none',
                              color: 'white',
                              padding: '5px 10px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '11px',
                              fontWeight: '600'
                            }}
                          >
                            <Check size={12} /> Approve
                          </button>
                          <button
                            onClick={() => handleProcessWithdrawal(item.id, 'reject')}
                            style={{
                              background: '#ef4444',
                              border: 'none',
                              color: 'white',
                              padding: '5px 10px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '11px',
                              fontWeight: '600'
                            }}
                          >
                            <X size={12} /> Reject
                          </button>
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', color: '#6b7280', fontSize: '11px' }}>Processed</div>
                      )}
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
};

export default AdminWalletWithdrawals;
