import React, { useState, useEffect } from 'react';
import { Settings, Save, Upload, Image, RotateCcw } from 'lucide-react';

const AdminPortalSettings = ({ adminToken, addToast }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Settings states
  const [minRecharge, setMinRecharge] = useState('100');
  const [minWithdrawal, setMinWithdrawal] = useState('100');
  const [commissionRate, setCommissionRate] = useState('20');
  const [maxTasksPerDay, setMaxTasksPerDay] = useState('10');
  const [upiId, setUpiId] = useState('myntra@ybl');
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  // Fetch current settings
  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/settings', {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      if (response.ok) {
        const data = await response.json();
        if (data) {
          setMinRecharge(data.minRecharge.toString());
          setMinWithdrawal(data.minWithdrawal.toString());
          setCommissionRate((data.commissionRate * 100).toString()); // convert decimal to percent
          setMaxTasksPerDay(data.maxTasksPerDay.toString());
          setUpiId(data.upiId || 'myntra@ybl');
          setQrCodeUrl(data.qrCodeUrl || '');
        }
      }
    } catch (e) {
      addToast('Failed to load system settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [adminToken]);

  // Handle Save
  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          minRecharge: parseFloat(minRecharge),
          minWithdrawal: parseFloat(minWithdrawal),
          commissionRate: parseFloat(commissionRate) / 100, // convert percent to decimal
          maxTasksPerDay: parseInt(maxTasksPerDay),
          upiId,
          qrCodeUrl
        })
      });

      if (response.ok) {
        addToast('System settings saved successfully!');
        fetchSettings();
      } else {
        const err = await response.json();
        addToast(err.error || 'Failed to save settings', 'error');
      }
    } catch (e) {
      addToast('Connection error', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Upload QR Code
  const handleUploadQR = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`
        },
        body: formData
      });

      if (response.ok) {
        const resData = await response.json();
        setQrCodeUrl(resData.url);
        addToast('QR Code uploaded successfully!');
      } else {
        const err = await response.json();
        addToast(err.error || 'Failed to upload QR Code', 'error');
      }
    } catch (err) {
      addToast('Connection error during upload', 'error');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', color: '#6b7280', textAlign: 'center', fontSize: '14px' }}>
        Loading configuration settings...
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Title */}
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: '800', margin: 0, color: 'white' }}>Portal Settings</h2>
        <p style={{ fontSize: '12px', color: '#9ca3af', margin: '4px 0 0 0' }}>Configure limits, commission rates, and deposit UPI keys.</p>
      </div>

      <form onSubmit={handleSave} style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: '24px',
        alignItems: 'start'
      }}>
        
        {/* Left Side: Inputs parameters */}
        <div style={{
          background: '#1f2937',
          border: '1px solid #374151',
          borderRadius: '12px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          
          <h3 style={{ fontSize: '13px', fontWeight: '700', color: 'white', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Settings size={16} style={{ color: '#ff3f6c' }} />
            <span>Platform Controls</span>
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#9ca3af' }}>MINIMUM RECHARGE (₹)</label>
              <input 
                type="number"
                value={minRecharge}
                onChange={e => setMinRecharge(e.target.value)}
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#9ca3af' }}>MINIMUM WITHDRAWAL (₹)</label>
              <input 
                type="number"
                value={minWithdrawal}
                onChange={e => setMinWithdrawal(e.target.value)}
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
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#9ca3af' }}>SYSTEM COMMISSION RATE (%)</label>
              <input 
                type="number"
                value={commissionRate}
                onChange={e => setCommissionRate(e.target.value)}
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#9ca3af' }}>MAX GRABS PER USER DAILY</label>
              <input 
                type="number"
                value={maxTasksPerDay}
                onChange={e => setMaxTasksPerDay(e.target.value)}
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
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid #374151', paddingTop: '16px' }}>
            <label style={{ fontSize: '11px', fontWeight: '700', color: '#9ca3af' }}>RECEIVING UPI ID FOR DEPOSITS</label>
            <input 
              type="text"
              placeholder="e.g. store@upi"
              value={upiId}
              onChange={e => setUpiId(e.target.value)}
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
        </div>

        {/* Right Side: QR Code Upload & Save triggers */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* QR Code Upload Card */}
          <div style={{
            background: '#1f2937',
            border: '1px solid #374151',
            borderRadius: '12px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            alignItems: 'center',
            textAlign: 'center'
          }}>
            <h4 style={{ fontSize: '12px', fontWeight: '700', color: 'white', margin: '0 0 4px 0', alignSelf: 'flex-start' }}>Recharge QR Code</h4>
            
            <div style={{
              width: '150px',
              height: '150px',
              borderRadius: '8px',
              overflow: 'hidden',
              background: '#111827',
              border: '2px dashed #374151',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {qrCodeUrl ? (
                <img src={qrCodeUrl} alt="QR Code" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: '#6b7280' }}>
                  <Image size={24} />
                  <span style={{ fontSize: '10px' }}>No QR Uploaded</span>
                </div>
              )}
            </div>

            <input 
              type="file" 
              id="qr-code-file-selector" 
              accept="image/*" 
              onChange={handleUploadQR} 
              style={{ display: 'none' }}
            />
            
            <label 
              htmlFor="qr-code-file-selector" 
              style={{
                background: '#374151',
                border: 'none',
                color: 'white',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background 0.2s',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Upload size={12} />
              <span>{uploading ? 'Uploading...' : 'Upload QR Code'}</span>
            </label>
          </div>

          {/* Form Save Button */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={fetchSettings}
              style={{
                flex: 1,
                background: 'none',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#9ca3af',
                padding: '12px',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <RotateCcw size={14} />
              <span>Reset</span>
            </button>
            
            <button
              type="submit"
              disabled={saving}
              style={{
                flex: 2,
                background: '#ff3f6c',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <Save size={14} />
              <span>{saving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>

        </div>

      </form>
    </div>
  );
};

export default AdminPortalSettings;
