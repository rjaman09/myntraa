const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const db = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// 1. Submit Recharge Request
router.post('/recharge', authenticateToken, async (req, res) => {
  try {
    const { amount, channel, referenceNo } = req.body;

    if (!amount || isNaN(amount) || amount < 100 || amount > 50000) {
      return res.status(400).json({ error: 'Amount must be between ₹100 and ₹50,000' });
    }
    if (!referenceNo || referenceNo.length !== 12 || isNaN(referenceNo)) {
      return res.status(400).json({ error: 'Reference UTR number must be exactly 12 digits.' });
    }

    const newRecharge = {
      id: uuidv4(),
      userId: req.user.id,
      amount: parseFloat(amount),
      channel: channel || 'UPI',
      referenceNo,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    await db.createRecharge(newRecharge);
    res.json({ success: true, recharge: newRecharge });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Get User's Recharges
router.get('/recharges', authenticateToken, async (req, res) => {
  try {
    const recharges = await db.getRecharges(req.user.id);
    res.json(recharges.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Submit Withdrawal Request
router.post('/withdraw', authenticateToken, async (req, res) => {
  try {
    const { amount, bankAccount, bankName, holderName, ifsc, withdrawalPassword } = req.body;
    const user = await db.getUserById(req.user.id);

    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!withdrawalPassword) {
      return res.status(400).json({ error: 'Withdrawal password is required' });
    }

    if (user.withdrawalPassword && user.withdrawalPassword !== hashPassword(withdrawalPassword)) {
      return res.status(400).json({ error: 'Incorrect withdrawal password' });
    }

    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Invalid withdrawal amount' });
    }

    if (user.balance < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    if (!bankAccount || !bankName || !holderName || !ifsc) {
      return res.status(400).json({ error: 'All bank details are required' });
    }

    // Freeze withdrawal funds
    await db.updateUser(user.id, {
      balance: parseFloat((user.balance - amount).toFixed(2)),
      frozenAmount: parseFloat((user.frozenAmount + amount).toFixed(2))
    });

    const newWithdrawal = {
      id: uuidv4(),
      userId: req.user.id,
      amount: parseFloat(amount),
      bankAccount,
      bankName,
      holderName,
      ifsc,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    await db.createWithdrawal(newWithdrawal);
    res.json({ success: true, withdrawal: newWithdrawal });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Get User's Withdrawals
router.get('/withdrawals', authenticateToken, async (req, res) => {
  try {
    const withdrawals = await db.getWithdrawals(req.user.id);
    res.json(withdrawals.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
