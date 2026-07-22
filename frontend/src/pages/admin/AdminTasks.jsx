import React, { useState, useEffect } from 'react';
import { Plus, Check, X, RotateCcw, Clock, Grid, List } from 'lucide-react';

const CountdownTimer = ({ expiresAt }) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const calculateTime = () => {
      const diff = new Date(expiresAt) - new Date();
      if (diff <= 0) {
        setTimeLeft('Expired');
        return;
      }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${mins}:${secs.toString().padStart(2, '0')}`);
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return (
    <span style={{ 
      display: 'inline-flex', 
      alignItems: 'center', 
      gap: '4px',
      fontFamily: 'monospace',
      fontSize: '12px',
      color: timeLeft === 'Expired' ? '#ef4444' : '#fbbf24',
      fontWeight: '700'
    }}>
      <Clock size={12} />
      {timeLeft}
    </span>
  );
};

const AdminTasks = ({ tasksList = [], usersList = [], fetchAllData, adminToken, addToast }) => {
  const [products, setProducts] = useState([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [customPrice, setCustomPrice] = useState('');
  const [customBonus, setCustomBonus] = useState('');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Load Products on mount
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch('/api/admin/products', {
          headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        if (response.ok) {
          const data = await response.json();
          setProducts(data.filter(p => p.isActive));
        }
      } catch (e) {
        console.error(e);
      }
    };
    if (showAssignModal) {
      fetchProducts();
    }
  }, [showAssignModal, adminToken]);

  // Math metrics
  const pendingCount = tasksList.filter(t => t.status === 'assigned').length;
  const frozenCount = tasksList.filter(t => t.status === 'submitted').length;
  const completedToday = tasksList.filter(t => {
    const isCompleted = t.status === 'completed';
    const isToday = new Date(t.createdAt).toDateString() === new Date().toDateString();
    return isCompleted && isToday;
  }).length;

  // Assign Task Handler
  const handleAssignTask = async (e) => {
    e.preventDefault();
    if (!selectedUser || !selectedProduct) {
      addToast('Please select a customer and a product', 'error');
      return;
    }

    try {
      const response = await fetch('/api/admin/tasks/assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          userId: selectedUser.id,
          productId: selectedProduct.id,
          amount: parseFloat(customPrice) || selectedProduct.price,
          bonus: parseFloat(customBonus) || selectedProduct.bonus
        })
      });

      if (response.ok) {
        addToast('Task assigned successfully!');
        setShowAssignModal(false);
        setSelectedUser(null);
        setSelectedProduct(null);
        setCustomPrice('');
        setCustomBonus('');
        fetchAllData();
      } else {
        const err = await response.json();
        addToast(err.error || 'Failed to assign task', 'error');
      }
    } catch (e) {
      addToast('Connection error', 'error');
    }
  };

  // Process Task Approve / Reject
  const handleProcessTask = async (id, action) => {
    try {
      const response = await fetch(`/api/admin/tasks/${id}/${action}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      if (response.ok) {
        addToast(`Task ${action === 'approve' ? 'approved' : 'rejected'} successfully!`);
        fetchAllData();
      } else {
        const err = await response.json();
        addToast(err.error || 'Failed to process task', 'error');
      }
    } catch (e) {
      addToast('Connection error', 'error');
    }
  };

  // Filters
  const filteredTasks = tasksList.filter(item => {
    const searchLower = search.toLowerCase();
    const matchesSearch = item.userPhone?.toLowerCase().includes(searchLower) || 
                          item.userUID?.toLowerCase().includes(searchLower) ||
                          item.productName?.toLowerCase().includes(searchLower);
    const matchesStatus = statusFilter === 'all' || 
                          (statusFilter === 'pending' && item.status === 'assigned') ||
                          (statusFilter === 'frozen' && item.status === 'submitted') ||
                          (statusFilter === 'completed' && item.status === 'completed') ||
                          (statusFilter === 'expired' && item.status === 'expired') ||
                          (statusFilter === 'rejected' && item.status === 'rejected');
    return matchesSearch && matchesStatus;
  });

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '800', margin: 0, color: 'white' }}>Tasks</h2>
          <p style={{ fontSize: '12px', color: '#9ca3af', margin: '4px 0 0 0' }}>Assign time-limited purchase tasks and review frozen payments.</p>
        </div>
        <button
          onClick={() => setShowAssignModal(true)}
          style={{
            background: '#ff3f6c',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 16px',
            fontSize: '13px',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Plus size={16} />
          <span>Assign task</span>
        </button>
      </div>

      {/* Metrics Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px'
      }}>
        {[
          { label: 'PENDING', val: pendingCount, color: 'white' },
          { label: 'FROZEN', val: frozenCount, color: '#fbbf24' },
          { label: 'COMPLETED TODAY', val: completedToday, color: '#10b981' }
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

      {/* Filter Options */}
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
            placeholder="Search by customer phone, UID or product..."
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
            <option value="pending">Pending (Assigned)</option>
            <option value="frozen">Frozen (Submitted)</option>
            <option value="completed">Completed</option>
            <option value="expired">Expired</option>
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
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Assigned Tasks Table list */}
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
                <th style={{ padding: '14px 16px' }}>CUSTOMER</th>
                <th style={{ padding: '14px 16px' }}>PRODUCT</th>
                <th style={{ padding: '14px 16px' }}>STATUS</th>
                <th style={{ padding: '14px 16px' }}>TIMER</th>
                <th style={{ padding: '14px 16px' }}>PRICE</th>
                <th style={{ padding: '14px 16px' }}>BONUS</th>
                <th style={{ padding: '14px 16px' }}>ASSIGNED</th>
                <th style={{ padding: '14px 16px', textAlign: 'center' }}>CONTROL</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                    No assigned tasks found.
                  </td>
                </tr>
              ) : (
                filteredTasks.map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #374151', background: '#1f2937' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: '700', color: 'white' }}>{item.userPhone || '—'}</div>
                      <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>UID: {item.userUID || '—'}</div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '6px', overflow: 'hidden', background: '#374151', flexShrink: 0 }}>
                          <img src={item.productImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <div style={{ fontWeight: '600', color: 'white' }}>{item.productName}</div>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: '700',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: item.status === 'completed' ? 'rgba(16, 185, 129, 0.1)' : 
                                    item.status === 'submitted' ? 'rgba(251, 191, 36, 0.1)' :
                                    item.status === 'assigned' ? 'rgba(96, 165, 250, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        color: item.status === 'completed' ? '#10b981' : 
                               item.status === 'submitted' ? '#fbbf24' :
                               item.status === 'assigned' ? '#60a5fa' : '#ef4444'
                      }}>
                        {item.status === 'submitted' ? 'AWAITING APPROVAL' : item.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {item.status === 'assigned' ? (
                        <CountdownTimer expiresAt={item.expiresAt} />
                      ) : (
                        <span style={{ color: '#6b7280' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: '700', color: 'white' }}>
                      ₹ {parseFloat(item.amount).toFixed(2)}
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: '700', color: '#10b981' }}>
                      ₹ {parseFloat(item.bonus).toFixed(2)}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#9ca3af' }}>
                      {new Date(item.createdAt).toLocaleString()}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      {item.status === 'submitted' ? (
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <button
                            onClick={() => handleProcessTask(item.id, 'approve')}
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
                            onClick={() => handleProcessTask(item.id, 'reject')}
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
                        <span style={{ fontSize: '11px', color: '#6b7280' }}>Settled</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assign Task Full-Screen/Overlay Modal */}
      {showAssignModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: '#1f2937',
            border: '1px solid #374151',
            borderRadius: '16px',
            width: '92%',
            maxWidth: '860px',
            height: '80vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '16px 24px',
              borderBottom: '1px solid #374151',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              color: 'white'
            }}>
              <span style={{ fontWeight: '800', fontSize: '16px' }}>Assign task</span>
              <button 
                onClick={() => setShowAssignModal(false)}
                style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Workspace Grid */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
              
              {/* Product Selection List (Left Side) */}
              <div style={{ flex: 2, padding: '20px', overflowY: 'auto', borderRight: '1px solid #374151' }}>
                
                {/* Step 1: Customer Dropdown */}
                <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#9ca3af' }}>CUSTOMER</label>
                  <select
                    onChange={(e) => {
                      const user = usersList.find(u => u.id === e.target.value);
                      setSelectedUser(user || null);
                    }}
                    style={{
                      background: '#111827',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      padding: '10px',
                      color: 'white',
                      fontSize: '13px',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="">Select customer...</option>
                    {usersList.map(u => (
                      <option key={u.id} value={u.id}>{u.phone} (UID: {u.uid})</option>
                    ))}
                  </select>
                </div>

                {/* Step 2: Product Grid */}
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#9ca3af', display: 'block', marginBottom: '8px' }}>
                    SELECT PRODUCT
                  </label>
                  {products.length === 0 ? (
                    <div style={{ color: '#6b7280', fontSize: '12px', padding: '20px 0' }}>No active products. Create some first.</div>
                  ) : (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                      gap: '12px'
                    }}>
                      {products.map(p => {
                        const isSelected = selectedProduct?.id === p.id;
                        return (
                          <div 
                            key={p.id}
                            onClick={() => setSelectedProduct(p)}
                            style={{
                              border: isSelected ? '2px solid #ff3f6c' : '1px solid #374151',
                              borderRadius: '8px',
                              padding: '10px',
                              background: '#111827',
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '8px',
                              alignItems: 'center',
                              textAlign: 'center'
                            }}
                          >
                            <div style={{ width: '60px', height: '60px', borderRadius: '4px', overflow: 'hidden', background: '#374151' }}>
                              <img src={p.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                            <div>
                              <div style={{ fontSize: '11px', fontWeight: '700', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '110px' }}>
                                {p.name}
                              </div>
                              <div style={{ fontSize: '11px', color: '#10b981', fontWeight: '600', marginTop: '2px' }}>
                                ₹ {p.price.toFixed(2)}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Assignment Overview & Override inputs (Right Side) */}
              <div style={{ flex: 1.2, padding: '20px', background: '#111827', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', overflowY: 'auto' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: '800', color: 'white', margin: 0 }}>Selected Details</h4>
                  
                  {/* Customer stats summary */}
                  {selectedUser && (
                    <div style={{ background: '#1f2937', padding: '12px', borderRadius: '8px', border: '1px solid #374151' }}>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: 'white' }}>{selectedUser.phone}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#9ca3af', marginTop: '6px' }}>
                        <span>Available Balance:</span>
                        <span style={{ color: '#10b981', fontWeight: '700' }}>₹ {parseFloat(selectedUser.balance).toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                        <span>Frozen Balance:</span>
                        <span style={{ color: '#fbbf24', fontWeight: '700' }}>₹ {parseFloat(selectedUser.frozenAmount || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  )}

                  {/* Product Details override */}
                  {selectedProduct ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '6px', overflow: 'hidden', background: '#374151' }}>
                          <img src={selectedProduct.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: '700', color: 'white' }}>{selectedProduct.name}</div>
                          <div style={{ fontSize: '11px', color: '#9ca3af' }}>Catalog default price: ₹ {selectedProduct.price.toFixed(2)}</div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '10px', fontWeight: '700', color: '#9ca3af' }}>PRICE OVERRIDE (₹)</label>
                        <input 
                          type="number"
                          placeholder={selectedProduct.price}
                          value={customPrice}
                          onChange={e => setCustomPrice(e.target.value)}
                          style={{
                            background: '#1f2937',
                            border: '1px solid #374151',
                            borderRadius: '6px',
                            padding: '8px 10px',
                            color: 'white',
                            fontSize: '12px',
                            outline: 'none'
                          }}
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '10px', fontWeight: '700', color: '#9ca3af' }}>BONUS OVERRIDE (₹)</label>
                        <input 
                          type="number"
                          placeholder={selectedProduct.bonus}
                          value={customBonus}
                          onChange={e => setCustomBonus(e.target.value)}
                          style={{
                            background: '#1f2937',
                            border: '1px solid #374151',
                            borderRadius: '6px',
                            padding: '8px 10px',
                            color: 'white',
                            fontSize: '12px',
                            outline: 'none'
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: '12px', color: '#6b7280', textAlign: 'center', padding: '20px 0' }}>
                      Select a product to view options.
                    </div>
                  )}
                </div>

                <div style={{ borderTop: '1px solid #374151', paddingTop: '16px', display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => setShowAssignModal(false)}
                    style={{
                      flex: 1,
                      background: 'none',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#9ca3af',
                      padding: '10px',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAssignTask}
                    disabled={!selectedUser || !selectedProduct}
                    style={{
                      flex: 1.5,
                      background: selectedUser && selectedProduct ? '#ff3f6c' : '#374151',
                      color: selectedUser && selectedProduct ? 'white' : '#6b7280',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '10px',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: selectedUser && selectedProduct ? 'pointer' : 'not-allowed'
                    }}
                  >
                    Assign task
                  </button>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default AdminTasks;
