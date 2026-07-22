import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { ChevronLeft, Clipboard, CheckCircle2, History } from 'lucide-react';

const Recharge = () => {
  const { user, refreshUser, addToast } = useAuth();
  
  // States
  const [selectedChannel, setSelectedChannel] = useState('AAAPay');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [utrNumber, setUtrNumber] = useState('');
  const [showRecordsDrawer, setShowRecordsDrawer] = useState(false);
  const [rechargeRecords, setRechargeRecords] = useState([]);
  const [copied, setCopied] = useState(false);

  // Settings loaded from backend
  const [minRecharge, setMinRecharge] = useState(100);
  const [upiId, setUpiId] = useState('myntrapayments@axisbank');
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  // QR Codes Pool and Timer states
  const [qrPool, setQrPool] = useState([]);
  const [selectedQr, setSelectedQr] = useState(null);
  const [timeLeft, setTimeLeft] = useState(300);

  // Fetch settings & records
  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/auth/settings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        if (data) {
          setMinRecharge(data.minRecharge || 100);
          setUpiId(data.upiId || 'myntrapayments@axisbank');
          setQrCodeUrl(data.qrCodeUrl || '');
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchQrPool = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/auth/qr-codes', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setQrPool(data || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRecords = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/recharges', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const records = await response.json();
        setRechargeRecords(records);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    refreshUser();
    fetchSettings();
    fetchQrPool();
    fetchRecords();
  }, []);

  // 5 Minutes Countdown Timer
  useEffect(() => {
    let interval = null;
    if (showPaymentModal && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && showPaymentModal) {
      setShowPaymentModal(false);
      addToast('Payment session expired. Please start a new recharge request.', 'error');
    }
    return () => clearInterval(interval);
  }, [showPaymentModal, timeLeft]);

  // Select random QR code from active pool
  const selectRandomQr = (currentPool = qrPool) => {
    if (currentPool && currentPool.length > 0) {
      const randomIndex = Math.floor(Math.random() * currentPool.length);
      const chosen = currentPool[randomIndex];
      setSelectedQr({
        imageUrl: chosen.imageUrl,
        upiId: chosen.upiId || upiId
      });
    } else {
      setSelectedQr({
        imageUrl: qrCodeUrl,
        upiId: upiId
      });
    }
  };

  // User refreshes QR code manually
  const handleRefreshQr = () => {
    if (!qrPool || qrPool.length <= 1) {
      addToast('No other active QR codes available in the pool.');
      return;
    }
    let nextQr = selectedQr;
    let attempts = 0;
    while (attempts < 10) {
      const randomIndex = Math.floor(Math.random() * qrPool.length);
      const candidate = qrPool[randomIndex];
      if (candidate.imageUrl !== selectedQr?.imageUrl) {
        nextQr = {
          imageUrl: candidate.imageUrl,
          upiId: candidate.upiId || upiId
        };
        break;
      }
      attempts++;
    }
    setSelectedQr(nextQr);
    addToast('QR Code rotated successfully!');
  };

  const handleCopyUPI = () => {
    const activeUpi = selectedQr?.upiId || upiId;
    navigator.clipboard.writeText(activeUpi);
    setCopied(true);
    addToast('UPI Address copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRechargeSubmit = (e) => {
    e.preventDefault();
    const numAmt = parseFloat(amount);
    if (isNaN(numAmt) || numAmt < minRecharge || numAmt > 50000) {
      addToast(`Please enter an amount between ₹${minRecharge.toFixed(2)} and ₹50,000.00`, 'error');
      return;
    }
    setUtrNumber('');
    setTimeLeft(300); // reset 5 minutes
    
    // Choose QR
    selectRandomQr();
    setShowPaymentModal(true);
  };


  const handleConfirmPayment = async () => {
    if (!utrNumber || utrNumber.length !== 12 || isNaN(utrNumber)) {
      addToast('Please enter a valid 12-digit numeric UPI UTR number', 'error');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/recharge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: parseFloat(amount),
          channel: selectedChannel,
          referenceNo: utrNumber
        })
      });

      const data = await response.json();
      if (!response.ok) {
        addToast(data.error || 'Failed to submit request', 'error');
      } else {
        addToast('Recharge request submitted successfully. Awaiting Admin Approval.');
        setShowPaymentModal(false);
        setAmount('');
        fetchRecords();
      }
    } catch (err) {
      addToast('Network error, please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '18px', fontWeight: '800' }}>Recharge Wallet</span>
        </div>
        <button 
          onClick={() => {
            fetchRecords();
            setShowRecordsDrawer(true);
          }} 
          style={{ 
            background: 'rgba(255,255,255,0.06)', 
            border: 'none', 
            borderRadius: '8px', 
            padding: '6px 12px', 
            color: 'var(--text-primary)', 
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            fontWeight: '600'
          }}
        >
          <History size={16} />
          <span>Records</span>
        </button>
      </div>

      {/* Form Content */}
      <form onSubmit={handleRechargeSubmit} style={{ padding: '16px' }}>
        
        {/* Current Balance card */}
        <div className="glass-card" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Current Balance</div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: 'white', marginTop: '4px' }}>
              ₹ {user?.balance?.toFixed(2) || '0.00'}
            </div>
          </div>
        </div>

        {/* Channel Selection Grid */}
        <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px', color: 'var(--text-secondary)' }}>
          Select Gateway Channel
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
          {['AAAPay', 'KBPay', 'DKPay', 'UzPay', 'EalinPay', 'H88pay'].map(channel => (
            <label key={channel} style={{
              background: selectedChannel === channel ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-card)',
              border: selectedChannel === channel ? '1.5px solid var(--accent-blue)' : '1px solid var(--border)',
              borderRadius: '12px',
              padding: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}>
              <span style={{ fontSize: '14px', fontWeight: '600', color: selectedChannel === channel ? 'white' : 'var(--text-secondary)' }}>
                {channel}
              </span>
              <input
                type="radio"
                name="channel"
                value={channel}
                checked={selectedChannel === channel}
                onChange={() => setSelectedChannel(channel)}
                style={{ accentColor: 'var(--accent-blue)' }}
              />
            </label>
          ))}
        </div>

        {/* Selected Channel Indicator */}
        <div className="glass-card" style={{ padding: '12px 16px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Please select a payment channel</span>
          <span style={{
            background: 'var(--accent-blue)',
            color: 'white',
            fontSize: '12px',
            fontWeight: '800',
            padding: '4px 10px',
            borderRadius: '6px'
          }}>
            UPI
          </span>
        </div>

        {/* Enter Amount Area */}
        <div className="glass-card" style={{ padding: '20px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500' }}>Recharge amount</span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Limit: ₹100.00 ~ ₹50,000.00</span>
          </div>

          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <span style={{ position: 'absolute', left: '16px', fontSize: '22px', fontWeight: '700', color: 'white' }}>₹</span>
            <input
              type="number"
              className="form-input"
              style={{ paddingLeft: '36px', fontSize: '20px', fontWeight: '800' }}
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="100"
              max="50000"
              required
            />
          </div>

          {/* Quick amount shortcuts */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginTop: '16px' }}>
            {[100, 500, 1000, 5000].map(val => (
              <button
                key={val}
                type="button"
                onClick={() => setAmount(val.toString())}
                style={{
                  padding: '8px',
                  borderRadius: '8px',
                  background: amount === val.toString() ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255,255,255,0.03)',
                  border: amount === val.toString() ? '1px solid var(--accent-blue)' : '1px solid var(--border)',
                  color: amount === val.toString() ? 'white' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '12px'
                }}
              >
                ₹{val}
              </button>
            ))}
          </div>
        </div>

        <button 
          type="submit" 
          className="primary-button pulse-btn"
          style={{ background: 'linear-gradient(135deg, var(--accent-blue) 0%, var(--accent-blue-hover) 100%)', boxShadow: '0 8px 24px rgba(59, 130, 246, 0.3)' }}
        >
          Recharge
        </button>

      </form>

      {/* UPI Details Modal */}
      {showPaymentModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '92%', maxWidth: '360px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '800', textAlign: 'center', marginBottom: '8px' }}>
              Confirm Recharge: ₹ {parseFloat(amount).toFixed(2)}
            </h3>

            {/* 5-minute Countdown Timer */}
            <div style={{ fontSize: '12px', color: '#ef4444', textAlign: 'center', fontWeight: '800', marginBottom: '16px' }}>
              Time remaining: {Math.floor(timeLeft / 60).toString().padStart(2, '0')}:{ (timeLeft % 60).toString().padStart(2, '0') }
            </div>

            {/* UPI Address Box */}
            <div style={{
              background: 'var(--bg-card-light)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              padding: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px'
            }}>
              <div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '2px' }}>UPI ID (Copy this)</div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: 'white' }}>{selectedQr?.upiId || upiId}</div>
              </div>
              <button 
                type="button" 
                onClick={handleCopyUPI}
                style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer' }}
              >
                {copied ? <CheckCircle2 size={20} style={{ color: 'var(--success)' }} /> : <Clipboard size={20} />}
              </button>
            </div>

            {/* Dynamic QR Code */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
              <div style={{ background: 'white', padding: '12px', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {(selectedQr?.imageUrl || qrCodeUrl) ? (
                  <img src={selectedQr?.imageUrl || qrCodeUrl} alt="QR Code" style={{ width: '130px', height: '130px', objectFit: 'contain', display: 'block' }} />
                ) : (
                  <svg width="130" height="130" viewBox="0 0 29 29" style={{ display: 'block' }}>
                    <path fill="black" d="M0 0h7v7H0zm1 1v5h5V1zm2 2h1v1H3zm6-3v1h1V0zm1 1h1V0h-1zm1 1h1V1h-1zm1 1h1v1h-1zm-4 1h1V3H9zm2 1h1V4h-1zm2 1h1v1h-1zm2 1h1V6h-1zm-6 2h1V8H9zm2 1h1V9h-1zm1 1h1V10h-1zm2 1h2v1h-2zm-6 2h1v-1H9zm1 1h1v1h-1zm1 1h1v1h-1zm2 1h2v1h-2zm-7 2h1v-1H8zm1 1h1v1h-1zm1 1h1v1h-1zm2 1h2v1h-2zM0 9h7v7H0zm1 1v5h5v-5zm2 2h1v1H3zm15-12h7v7h-7zm1 1v5h5V1zm2 2h1v1H3z" />
                    <rect x="11" y="11" width="7" height="7" fill="var(--primary)" />
                    <path fill="black" d="M22 9h1v1h-1zm1 1h1v1h-1zm1 1h1v1h-1zm1 1h1v1h-1zm-4 1h1v1h-1zm-1 1h1v1h-1zm-1 1h1v1h-1zm2 1h1v1h-1zm1 1h1v1h-1zm1 1h1v1h-1zM9 22h1v1H9zm1 1h1v1h-1zm1 1h1v1h-1zm1 1h1v1h-1zm-4 1h1v1h-1zm-1 1h1v1h-1zm-1 1h1v1h-1zm2 1h1v1h-1zm1 1h1v1h-1zm1 1h1v1h-1z" />
                  </svg>
                )}
                <div style={{ color: '#0b0f19', fontSize: '10px', fontWeight: '800', marginTop: '6px', textAlign: 'center' }}>
                  SCAN TO PAY
                </div>
              </div>
            </div>

            {/* Refresh QR button */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <button
                type="button"
                onClick={handleRefreshQr}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border)',
                  color: 'white',
                  fontSize: '11px',
                  fontWeight: '700',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Can't pay? Refresh QR Code
              </button>
            </div>

            {/* Instruction Warning */}
            <div style={{
              background: 'rgba(245, 158, 11, 0.05)',
              border: '1px solid rgba(245, 158, 11, 0.2)',
              borderRadius: '8px',
              padding: '10px',
              fontSize: '11px',
              color: '#fbbf24',
              lineHeight: '1.4',
              marginBottom: '16px'
            }}>
              <strong>IMPORTANT:</strong> Open your banking/UPI app (GPay, PhonePe, Paytm, BHIM) and pay ₹{amount}. After successful payment, copy the 12-digit transaction UTR / Reference Number and paste it below.
            </div>

            {/* UTR Input Form */}
            <div className="form-input-group" style={{ marginBottom: '20px' }}>
              <label>12-Digit Transaction UTR Number</label>
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: '16px' }}
                placeholder="Enter 12-digit Ref No"
                value={utrNumber}
                onChange={(e) => setUtrNumber(e.target.value.replace(/\D/g, '').slice(0, 12))}
                maxLength="12"
              />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                type="button"
                onClick={() => setShowPaymentModal(false)}
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
                onClick={handleConfirmPayment}
                disabled={loading || utrNumber.length !== 12}
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
                {loading ? 'Submitting...' : 'Submit Details'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Recharge Records Drawer */}
      {showRecordsDrawer && (
        <div className="modal-overlay" style={{ alignItems: 'flex-end' }}>
          <div className="modal-content" style={{
            width: '100%',
            maxWidth: 'var(--mobile-width)',
            borderBottomLeftRadius: 0,
            borderBottomRightRadius: 0,
            maxHeight: '80vh',
            overflowY: 'auto',
            animation: 'slideUp 0.3s ease'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '800' }}>Recharge History</h3>
              <button 
                onClick={() => setShowRecordsDrawer(false)}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: '700' }}
              >
                Close
              </button>
            </div>

            {rechargeRecords.length === 0 ? (
              <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                No recharge history available.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {rechargeRecords.map(record => (
                  <div key={record.id} style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    padding: '14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: '700', color: 'white' }}>
                        ₹ {record.amount.toFixed(2)}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        UTR: {record.referenceNo}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {new Date(record.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        background: record.status === 'approved' ? 'rgba(16, 185, 129, 0.1)' : 
                                    record.status === 'rejected' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                        color: record.status === 'approved' ? 'var(--success)' : 
                               record.status === 'rejected' ? 'var(--danger)' : 'var(--warning)'
                      }}>
                        {record.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Record Slide Up keyframes */}
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>

    </div>
  );
};

export default Recharge;
