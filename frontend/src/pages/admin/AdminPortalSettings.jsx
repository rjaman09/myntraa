import React, { useState, useEffect } from 'react';
import { Settings, Save, Upload, Image, RotateCcw, Trash2, Camera, ShieldCheck, ShieldAlert } from 'lucide-react';

const AdminPortalSettings = ({ adminToken, addToast }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingGlobalQr, setUploadingGlobalQr] = useState(false);

  // Settings states
  const [minRecharge, setMinRecharge] = useState('100');
  const [minWithdrawal, setMinWithdrawal] = useState('100');
  const [commissionRate, setCommissionRate] = useState('20');
  const [maxTasksPerDay, setMaxTasksPerDay] = useState('10');
  const [upiId, setUpiId] = useState('myntra@ybl');
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  // QR Codes Pool States
  const [qrCodesList, setQrCodesList] = useState([]);
  const [loadingQrPool, setLoadingQrPool] = useState(false);
  const [uploadingPoolQr, setUploadingPoolQr] = useState(false);
  const [newQrImage, setNewQrImage] = useState('');
  const [newQrUpi, setNewQrUpi] = useState('');

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

  // Fetch QR codes pool
  const fetchQrPool = async () => {
    setLoadingQrPool(true);
    try {
      const response = await fetch('/api/admin/qr-codes', {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      if (response.ok) {
        const data = await response.json();
        setQrCodesList(data || []);
      }
    } catch (e) {
      console.error('Failed to load QR codes pool:', e);
    } finally {
      setLoadingQrPool(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchQrPool();
  }, [adminToken]);

  // Handle Save settings
  const handleSaveSettings = async (e) => {
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

  // Upload QR Code (Global)
  const handleUploadGlobalQR = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingGlobalQr(true);
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
      setUploadingGlobalQr(false);
    }
  };

  // Upload QR Code to Pool (File or Camera)
  const handleUploadPoolQR = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingPoolQr(true);
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
        setNewQrImage(resData.url);
        addToast('QR Code uploaded successfully!');
      } else {
        const err = await response.json();
        addToast(err.error || 'Failed to upload QR Code', 'error');
      }
    } catch (err) {
      addToast('Connection error during upload', 'error');
    } finally {
      setUploadingPoolQr(false);
    }
  };

  // Add QR Code to Pool
  const handleAddQrToPool = async (e) => {
    e.preventDefault();
    if (!newQrImage) {
      addToast('Please upload an image first', 'error');
      return;
    }

    try {
      const response = await fetch('/api/admin/qr-codes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          imageUrl: newQrImage,
          upiId: newQrUpi
        })
      });

      if (response.ok) {
        addToast('QR Code added to active pool!');
        setNewQrImage('');
        setNewQrUpi('');
        fetchQrPool();
      } else {
        const err = await response.json();
        addToast(err.error || 'Failed to add QR Code', 'error');
      }
    } catch (err) {
      addToast('Connection error', 'error');
    }
  };

  // Toggle QR Code Active Status
  const handleToggleQrActive = async (id, currentVal) => {
    try {
      const response = await fetch(`/api/admin/qr-codes/${id}/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ isActive: !currentVal })
      });
      if (response.ok) {
        addToast('QR Code status toggled');
        fetchQrPool();
      }
    } catch (err) {
      addToast('Failed to toggle status', 'error');
    }
  };

  // Delete QR Code from Pool
  const handleDeleteQr = async (id) => {
    if (!window.confirm('Are you sure you want to delete this QR Code from the pool?')) return;
    try {
      const response = await fetch(`/api/admin/qr-codes/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });
      if (response.ok) {
        addToast('QR Code deleted successfully');
        fetchQrPool();
      }
    } catch (err) {
      addToast('Failed to delete QR Code', 'error');
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

      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: '24px',
        alignItems: 'start'
      }}>
        
        {/* Left Side: Inputs parameters */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <form onSubmit={handleSaveSettings} style={{
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
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#9ca3af' }}>DEFAULT RECEIVING UPI ID</label>
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

            {/* Form Save Button */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
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
          </form>

          {/* Multiple QR Codes Manager Pool panel */}
          <div style={{
            background: '#1f2937',
            border: '1px solid #374151',
            borderRadius: '12px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '13px', fontWeight: '700', color: 'white', margin: 0 }}>
                QR Codes Pool ({qrCodesList.length} items)
              </h3>
              <span style={{ fontSize: '10px', color: '#9ca3af' }}>User will get one random QR code from active pool</span>
            </div>

            {/* List Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: '16px'
            }}>
              {qrCodesList.length === 0 ? (
                <div style={{ colSpan: 'all', color: '#6b7280', fontSize: '12px', padding: '20px', textAlign: 'center', gridColumn: '1 / -1' }}>
                  No QR codes in the pool. Upload below to get started.
                </div>
              ) : (
                qrCodesList.map(qr => {
                  const isActiveBool = qr.isActive === true || qr.isActive === 1;
                  return (
                    <div key={qr.id} style={{
                      background: '#111827',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      position: 'relative'
                    }}>
                      <div style={{ width: '100%', height: '130px', background: 'white', borderRadius: '6px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img src={qr.imageUrl} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                      </div>
                      
                      <div style={{ fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ color: '#9ca3af', fontWeight: '600' }}>UPI ID:</span>
                        <span style={{ color: 'white', fontWeight: '700', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {qr.upiId || 'Store Default'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #374151', paddingTop: '8px' }}>
                        <button
                          type="button"
                          onClick={() => handleToggleQrActive(qr.id, isActiveBool)}
                          style={{
                            background: isActiveBool ? '#10b981' : '#374151',
                            border: 'none',
                            borderRadius: '10px',
                            width: '28px',
                            height: '16px',
                            position: 'relative',
                            cursor: 'pointer'
                          }}
                        >
                          <span style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            background: 'white',
                            position: 'absolute',
                            top: '3px',
                            left: isActiveBool ? '15px' : '3px',
                            transition: 'all 0.2s'
                          }} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteQr(qr.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Add New QR form */}
            <form onSubmit={handleAddQrToPool} style={{
              borderTop: '1px solid #374151',
              paddingTop: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}>
              <h4 style={{ fontSize: '12px', fontWeight: '700', color: 'white', margin: 0 }}>Add New QR Code to Pool</h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'end' }}>
                
                {/* Upload block */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#9ca3af' }}>UPLOAD QR (FILE OR CAMERA)</label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input 
                      type="file" 
                      id="pool-qr-file-selector" 
                      accept="image/*" 
                      onChange={handleUploadPoolQR} 
                      style={{ display: 'none' }}
                    />
                    <label 
                      htmlFor="pool-qr-file-selector" 
                      style={{
                        background: '#374151',
                        color: 'white',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        flex: 1,
                        justifyContent: 'center'
                      }}
                    >
                      <Upload size={14} />
                      <span>{uploadingPoolQr ? 'Uploading...' : 'Choose File'}</span>
                    </label>

                    {/* Camera capture input */}
                    <input 
                      type="file" 
                      id="pool-qr-camera-selector" 
                      accept="image/*" 
                      capture="environment"
                      onChange={handleUploadPoolQR} 
                      style={{ display: 'none' }}
                    />
                    <label 
                      htmlFor="pool-qr-camera-selector" 
                      style={{
                        background: '#374151',
                        color: 'white',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                      title="Use Camera"
                    >
                      <Camera size={14} />
                    </label>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#9ca3af' }}>ASSOCIATED UPI ID (OPTIONAL)</label>
                  <input 
                    type="text"
                    placeholder="Defaults to Default UPI"
                    value={newQrUpi}
                    onChange={e => setNewQrUpi(e.target.value)}
                    style={{
                      background: '#111827',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      color: 'white',
                      fontSize: '12px',
                      outline: 'none'
                    }}
                  />
                </div>

              </div>

              {newQrImage && (
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', background: '#111827', padding: '10px', borderRadius: '8px' }}>
                  <div style={{ width: '48px', height: '48px', background: 'white', borderRadius: '4px', overflow: 'hidden' }}>
                    <img src={newQrImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </div>
                  <span style={{ fontSize: '11px', color: '#10b981', fontWeight: '700' }}>QR Code loaded! Click "Add QR Code" to save.</span>
                </div>
              )}

              <button
                type="submit"
                disabled={!newQrImage}
                style={{
                  background: newQrImage ? '#ff3f6c' : '#374151',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: newQrImage ? 'pointer' : 'default',
                  textAlign: 'center'
                }}
              >
                Add QR Code to Pool
              </button>

            </form>

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
            <h4 style={{ fontSize: '12px', fontWeight: '700', color: 'white', margin: '0 0 4px 0', alignSelf: 'flex-start' }}>Default QR Code</h4>
            
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
              onChange={handleUploadGlobalQR} 
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
              <span>{uploadingGlobalQr ? 'Uploading...' : 'Upload QR Code'}</span>
            </label>
          </div>

        </div>

      </div>
    </div>
  );
};

export default AdminPortalSettings;
