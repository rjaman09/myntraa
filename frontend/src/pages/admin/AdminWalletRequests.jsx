import React, { useState } from 'react';
import { Eye, Check, X, RotateCcw, Image } from 'lucide-react';

const AdminWalletRequests = ({ rechargesList = [], fetchAllData, adminToken, addToast }) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Proof Modal state
  const [activeProofUrl, setActiveProofUrl] = useState(null);

  // Math metrics
  const totalRequests = rechargesList.length;
  const approvedTotalAmt = rechargesList
    .filter(r => r.status === 'approved')
    .reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
  const pendingRequestsCount = rechargesList.filter(r => r.status === 'pending').length;

  // Process Payout Action
  const handleProcessRecharge = async (id, status) => {
    try {
      const response = await fetch(`/api/admin/recharges/${id}/${status}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });
      if (response.ok) {
        addToast(`Recharge request ${status === 'approve' ? 'approved' : 'rejected'} successfully!`);
        fetchAllData();
      } else {
        const err = await response.json();
        addToast(err.error || 'Failed to process recharge request', 'error');
      }
    } catch (error) {
      addToast('Connection error', 'error');
    }
  };

  // Filters
  const filteredRequests = rechargesList.filter(item => {
    const searchLower = search.toLowerCase();
    const customerMatch = item.userPhone?.toLowerCase().includes(searchLower) || 
                          item.userUID?.toLowerCase().includes(searchLower) || 
                          item.referenceNo?.toLowerCase().includes(searchLower);
    const statusMatch = statusFilter === 'all' || item.status === statusFilter;
    return customerMatch && statusMatch;
  });

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Title */}
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: '800', margin: 0, color: 'white' }}>Wallet Requests</h2>
        <p style={{ fontSize: '12px', color: '#9ca3af', margin: '4px 0 0 0' }}>Review and approve customer wallet recharge requests.</p>
      </div>

      {/* Metrics Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px'
      }}>
        {[
          { label: 'REQUESTS', val: totalRequests, color: 'white' },
          { label: 'TOTAL AMOUNT', val: `₹ ${approvedTotalAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: '#10b981' },
          { label: 'PENDING', val: pendingRequestsCount, color: pendingRequestsCount > 0 ? '#fbbf24' : 'white' }
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
            placeholder="Search by customer phone, UID or UTR number..."
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

      {/* Requests Table List */}
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
                <th style={{ padding: '14px 16px' }}>UTR</th>
                <th style={{ padding: '14px 16px' }}>METHOD</th>
                <th style={{ padding: '14px 16px' }}>SUBMITTED</th>
                <th style={{ padding: '14px 16px' }}>STATUS</th>
                <th style={{ padding: '14px 16px', textAlign: 'center' }}>PROOF</th>
                <th style={{ padding: '14px 16px', textAlign: 'center' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                    No wallet requests found.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((item, index) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #374151' }}>
                    <td style={{ padding: '14px 16px', color: '#9ca3af' }}>{index + 1}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: '700', color: 'white' }}>{item.userPhone || '—'}</div>
                      <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>UID: {item.userUID || '—'}</div>
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: '800', color: 'white' }}>
                      ₹ {parseFloat(item.amount).toFixed(2)}
                    </td>
                    <td style={{ padding: '14px 16px', fontFamily: 'monospace', color: '#fbbf24' }}>
                      {item.referenceNo}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#9ca3af' }}>{item.channel}</td>
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
                        {item.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      {item.proofUrl ? (
                        <button 
                          onClick={() => setActiveProofUrl(item.proofUrl)}
                          style={{
                            background: 'rgba(96, 165, 250, 0.1)',
                            border: 'none',
                            borderRadius: '6px',
                            color: '#60a5fa',
                            padding: '6px 10px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11px',
                            fontWeight: '600'
                          }}
                        >
                          <Eye size={12} /> View
                        </button>
                      ) : (
                        <span style={{ fontSize: '11px', color: '#6b7280' }}>No proof</span>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {item.status === 'pending' ? (
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <button
                            onClick={() => handleProcessRecharge(item.id, 'approve')}
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
                            onClick={() => handleProcessRecharge(item.id, 'reject')}
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

      {/* Proof Viewer Overlay Modal */}
      {activeProofUrl && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: '#1f2937',
            border: '1px solid #374151',
            borderRadius: '12px',
            padding: '20px',
            width: '92%',
            maxWidth: '440px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            position: 'relative'
          }}>
            <h3 style={{ fontSize: '14px', fontWeight: '800', color: 'white', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Image size={18} style={{ color: '#60a5fa' }} />
              Payment Verification Proof
            </h3>
            
            <div style={{
              width: '100%',
              maxHeight: '360px',
              borderRadius: '8px',
              overflow: 'hidden',
              background: '#111827',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <img 
                src={activeProofUrl} 
                alt="Proof of payment" 
                style={{ maxWidth: '100%', maxHeight: '360px', objectFit: 'contain' }} 
              />
            </div>
            
            <button 
              onClick={() => setActiveProofUrl(null)}
              style={{
                background: '#ff3f6c',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '10px',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                textAlign: 'center'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminWalletRequests;
