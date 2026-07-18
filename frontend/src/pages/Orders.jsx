import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { Bell, ClipboardList, AlertCircle } from 'lucide-react';

const Orders = () => {
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState('Pending');
  const [grabs, setGrabs] = useState([]);
  const [loading, setLoading] = useState(true);

  const tabs = ['Pending', 'Completed', 'Rejected', 'All'];

  const fetchGrabsHistory = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/grab', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setGrabs(data);
      }
    } catch (error) {
      console.error('Error fetching grab logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
    fetchGrabsHistory();
    
    // Refresh list occasionally to catch manual approval transitions
    const interval = setInterval(() => {
      fetchGrabsHistory();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Filter grabs based on tabs
  const getFilteredGrabs = () => {
    switch (activeTab) {
      case 'Pending':
        return grabs.filter(g => g.status === 'pending');
      case 'Completed':
        return grabs.filter(g => g.status === 'settled');
      case 'Rejected':
        return grabs.filter(g => g.status === 'rejected');
      case 'All':
        return grabs;
      default:
        return grabs;
    }
  };

  const filteredItems = getFilteredGrabs();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      {/* Header */}
      <div className="page-header">
        <span style={{ fontSize: '18px', fontWeight: '800' }}>Task History</span>
        <button style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
          <Bell size={20} />
        </button>
      </div>

      {/* Tabs Menu */}
      <div style={{
        display: 'flex',
        background: 'rgba(21, 28, 44, 0.5)',
        borderBottom: '1px solid var(--border)',
        width: '100%'
      }}>
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              padding: '14px 0',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeTab === tab ? 'var(--primary)' : 'var(--text-secondary)',
              fontWeight: activeTab === tab ? '700' : '500',
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              outline: 'none'
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
        {loading && grabs.length === 0 ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0', color: 'var(--text-secondary)' }}>
            Loading records...
          </div>
        ) : filteredItems.length === 0 ? (
          /* Premium Empty State Illustration matching screenshot */
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '80px 24px',
            textAlign: 'center'
          }}>
            {/* Notepad SVG Illustration */}
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
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '4px' }}>No orders</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>There are no logs found in this category</p>
          </div>
        ) : (
          /* Logs List */
          filteredItems.map(item => (
            <div key={item.id} className="glass-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              {/* Product header row */}
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '8px', overflow: 'hidden', background: '#eaeaea' }}>
                  <img src={item.productImage} alt={item.productName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4 style={{ fontSize: '13px', fontWeight: '700', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.productName}
                  </h4>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Grab UID: {item.id.slice(0, 8).toUpperCase()}...
                  </div>
                </div>
                <div>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: '700',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: item.status === 'settled' ? 'rgba(16, 185, 129, 0.1)' : 
                                item.status === 'rejected' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                    color: item.status === 'settled' ? 'var(--success)' : 
                           item.status === 'rejected' ? 'var(--danger)' : 'var(--warning)'
                  }}>
                    {item.status === 'settled' ? 'COMPLETED' : 
                     item.status === 'rejected' ? 'REJECTED' : 'PENDING'}
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
                  <span style={{ color: 'var(--text-secondary)' }}>Commission: </span>
                  <span style={{ fontWeight: '700', color: 'var(--success)' }}>+₹{item.commission.toFixed(2)}</span>
                </div>
              </div>

              {/* Timestamps */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '10px',
                color: 'var(--text-muted)'
              }}>
                <span>Created: {new Date(item.createdAt).toLocaleString()}</span>
                {item.status === 'pending' ? (
                  <span style={{ color: 'var(--warning)', fontWeight: '600' }}>
                    Awaiting Approval
                  </span>
                ) : item.status === 'rejected' ? (
                  <span style={{ color: 'var(--danger)', fontWeight: '600' }}>
                    Rejected
                  </span>
                ) : (
                  <span>Approved: {new Date(item.settleAt).toLocaleTimeString()}</span>
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
