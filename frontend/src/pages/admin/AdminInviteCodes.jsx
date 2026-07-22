import React, { useState } from 'react';
import { Copy, Trash2, RotateCcw, Plus, Check } from 'lucide-react';

const AdminInviteCodes = ({ inviteCodes = [], fetchAllData, adminToken, addToast }) => {
  const [note, setNote] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);

  // Filters State
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [creatorFilter, setCreatorFilter] = useState('all');

  // Math
  const totalCodes = inviteCodes.length;
  const usedCodes = inviteCodes.filter(c => c.status === 'used').length;
  const unusedCodes = inviteCodes.filter(c => c.status === 'unused').length;

  // Handle Generate
  const handleGenerate = async (e) => {
    e.preventDefault();
    if (quantity < 1 || quantity > 50) {
      addToast('Quantity must be between 1 and 50', 'error');
      return;
    }
    setGenerating(true);
    try {
      const response = await fetch('/api/admin/invite-codes/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ note, quantity })
      });
      if (response.ok) {
        addToast(`${quantity} invite code(s) generated successfully!`);
        setNote('');
        setQuantity(1);
        fetchAllData();
      } else {
        const err = await response.json();
        addToast(err.error || 'Failed to generate invite codes', 'error');
      }
    } catch (error) {
      addToast('Connection error', 'error');
    } finally {
      setGenerating(false);
    }
  };

  // Handle Delete
  const handleDelete = async (code) => {
    if (!window.confirm(`Are you sure you want to remove invite code: ${code}?`)) return;
    try {
      const response = await fetch(`/api/admin/invite-codes/${code}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });
      if (response.ok) {
        addToast('Invite code removed');
        fetchAllData();
      } else {
        addToast('Failed to remove invite code', 'error');
      }
    } catch (error) {
      addToast('Connection error', 'error');
    }
  };

  // Handle Copy Link
  const handleCopy = (code) => {
    const inviteLink = `${window.location.origin}/register?code=${code}`;
    navigator.clipboard.writeText(inviteLink);
    setCopiedCode(code);
    addToast('Registration link copied to clipboard!');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Filter list
  const filteredCodes = inviteCodes.filter(item => {
    const codeMatch = item.code.toLowerCase().includes(search.toLowerCase()) || 
                      item.note.toLowerCase().includes(search.toLowerCase()) || 
                      (item.usedBy && item.usedBy.toLowerCase().includes(search.toLowerCase()));
    const statusMatch = statusFilter === 'all' || item.status === statusFilter;
    const creatorMatch = creatorFilter === 'all' || item.createdBy === creatorFilter;
    return codeMatch && statusMatch && creatorMatch;
  });

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Title */}
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: '800', margin: 0, color: 'white' }}>Invite Codes</h2>
        <p style={{ fontSize: '12px', color: '#9ca3af', margin: '4px 0 0 0' }}>
          The Customer Portal is invite-only - generate codes here to hand out to new customers.
        </p>
      </div>

      {/* Main Grid: Form left, Summary Stats right */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: '20px',
        alignItems: 'start'
      }}>
        {/* Form Generation */}
        <form onSubmit={handleGenerate} style={{
          background: '#1f2937',
          border: '1px solid #374151',
          borderRadius: '12px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <h3 style={{ fontSize: '13px', fontWeight: '700', color: 'white', margin: 0 }}>Generate codes</h3>
          
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ flex: 3, display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#9ca3af' }}>NOTE (OPTIONAL)</label>
              <input 
                type="text"
                placeholder="e.g. this batch is for special promotion..."
                value={note}
                onChange={e => setNote(e.target.value)}
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
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#9ca3af' }}>QUANTITY</label>
              <input 
                type="number"
                min="1"
                max="50"
                value={quantity}
                onChange={e => setQuantity(parseInt(e.target.value) || 1)}
                style={{
                  background: '#111827',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  color: 'white',
                  fontSize: '13px',
                  outline: 'none',
                  textAlign: 'center'
                }}
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={generating}
            style={{
              background: '#ff3f6c',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 16px',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              alignSelf: 'flex-end',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Plus size={16} />
            <span>{generating ? 'Generating...' : 'Generate'}</span>
          </button>
        </form>

        {/* Summary Metrics */}
        <div style={{
          display: 'grid',
          gridTemplateRows: 'repeat(3, 1fr)',
          gap: '12px'
        }}>
          {[
            { label: 'TOTAL CODES', val: totalCodes, color: 'white' },
            { label: 'USED', val: usedCodes, color: '#9ca3af' },
            { label: 'UNUSED', val: unusedCodes, color: '#10b981' }
          ].map((item, idx) => (
            <div key={idx} style={{
              background: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '12px',
              padding: '14px 20px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: '4px'
            }}>
              <span style={{ fontSize: '9px', fontWeight: '700', color: '#6b7280', letterSpacing: '0.5px' }}>{item.label}</span>
              <span style={{ fontSize: '20px', fontWeight: '800', color: item.color }}>{item.val}</span>
            </div>
          ))}
        </div>
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
            placeholder="Search by code, note or user id..."
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
            <option value="unused">Unused</option>
            <option value="used">Used</option>
          </select>

          <select 
            value={creatorFilter}
            onChange={e => setCreatorFilter(e.target.value)}
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
            <option value="all">All creators</option>
            <option value="admin">Admin</option>
          </select>

          <button 
            type="button"
            onClick={() => { setSearch(''); setStatusFilter('all'); setCreatorFilter('all'); }}
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

      {/* Table Data list */}
      <div style={{
        background: '#1f2937',
        border: '1px solid #374151',
        borderRadius: '12px',
        overflow: 'hidden'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', color: '#e5e7eb' }}>
            <thead>
              <tr style={{ background: '#111827', borderBottom: '1px solid #374151', color: '#9ca3af', textAlign: 'left' }}>
                <th style={{ padding: '14px 16px' }}>INVITATION LINK</th>
                <th style={{ padding: '14px 16px' }}>NOTE / REG. CUSTOMER</th>
                <th style={{ padding: '14px 16px' }}>STATUS</th>
                <th style={{ padding: '14px 16px' }}>CREATED BY</th>
                <th style={{ padding: '14px 16px' }}>CREATED AT</th>
                <th style={{ padding: '14px 16px', textAlign: 'center' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {filteredCodes.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                    No invite codes found matching the filters.
                  </td>
                </tr>
              ) : (
                filteredCodes.map(item => (
                  <tr key={item.code} style={{ borderBottom: '1px solid #374151', background: '#1f2937' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: '11px', fontWeight: '700', color: '#60a5fa', background: '#111827', padding: '4px 8px', borderRadius: '6px' }}>
                          {`${window.location.origin}/register?code=${item.code}`}
                        </span>
                        <button 
                          onClick={() => handleCopy(item.code)}
                          style={{
                            background: '#374151',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '6px',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: copiedCode === item.code ? '#10b981' : '#e5e7eb',
                            transition: 'all 0.2s'
                          }}
                          title="Copy registration link"
                        >
                          {copiedCode === item.code ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {item.status === 'used' ? (
                        <div>
                          <div style={{ color: '#ff3f6c', fontWeight: '600' }}>Used Account</div>
                          {item.usedBy && <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px' }}>UID: {item.usedBy}</div>}
                        </div>
                      ) : (
                        <span style={{ color: '#9ca3af' }}>{item.note || '—'}</span>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: '700',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: item.status === 'unused' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(107, 114, 128, 0.1)',
                        color: item.status === 'unused' ? '#10b981' : '#9ca3af'
                      }}>
                        {item.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', color: '#9ca3af' }}>{item.createdBy}</td>
                    <td style={{ padding: '14px 16px', color: '#9ca3af' }}>
                      {new Date(item.createdAt).toLocaleString()}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <button 
                        onClick={() => handleDelete(item.code)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          padding: '6px',
                          borderRadius: '6px',
                          transition: 'all 0.2s'
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
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

export default AdminInviteCodes;
