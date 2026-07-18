const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { authenticateAdmin } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

const JWT_SECRET = process.env.JWT_SECRET || 'myntra-secret-key-12345';

// 1. Admin Login
router.post('/login', authLimiter, (req, res) => {
  const { username, password } = req.body;
  
  if (username === 'admin' && password === 'admin123') {
    const token = jwt.sign({ id: 'admin-id', role: 'admin' }, JWT_SECRET, { expiresIn: '1d' });
    return res.json({ success: true, token });
  }

  res.status(400).json({ error: 'Invalid admin credentials' });
});

// 2. Get User List
router.get('/users', authenticateAdmin, async (req, res) => {
  try {
    const users = await db.getUsers();
    // Exclude password field
    const sanitizedUsers = users.map(({ password, ...u }) => u);
    res.json(sanitizedUsers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Adjust User Balance
router.post('/users/balance', authenticateAdmin, async (req, res) => {
  try {
    const { userId, type, amount } = req.body;

    const user = await db.getUserById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    let newBalance = user.balance;
    if (type === 'add') {
      newBalance += numericAmount;
    } else if (type === 'deduct') {
      newBalance = Math.max(0, newBalance - numericAmount);
    } else {
      return res.status(400).json({ error: 'Invalid operation type' });
    }

    const updated = await db.updateUser(user.id, { balance: parseFloat(newBalance.toFixed(2)) });
    res.json({ success: true, newBalance: updated.balance });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Get All Recharges
router.get('/recharges', authenticateAdmin, async (req, res) => {
  try {
    const recharges = await db.getRecharges();
    const users = await db.getUsers();

    const enrichedRecharges = recharges.map(r => {
      const user = users.find(u => u.id === r.userId);
      return {
        ...r,
        userPhone: user ? user.phone : 'Unknown',
        userUID: user ? user.uid : 'Unknown'
      };
    });

    res.json(enrichedRecharges.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Approve Recharge
router.post('/recharges/:id/approve', authenticateAdmin, async (req, res) => {
  try {
    const recharges = await db.getRecharges();
    const recharge = recharges.find(r => r.id === req.params.id);
    if (!recharge) return res.status(404).json({ error: 'Recharge request not found' });

    if (recharge.status !== 'pending') {
      return res.status(400).json({ error: 'Recharge is already processed' });
    }

    const user = await db.getUserById(recharge.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    await db.updateUser(user.id, { balance: parseFloat((user.balance + recharge.amount).toFixed(2)) });
    await db.updateRecharge(recharge.id, { status: 'approved' });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 6. Reject Recharge
router.post('/recharges/:id/reject', authenticateAdmin, async (req, res) => {
  try {
    const recharges = await db.getRecharges();
    const recharge = recharges.find(r => r.id === req.params.id);
    if (!recharge) return res.status(404).json({ error: 'Recharge request not found' });

    if (recharge.status !== 'pending') {
      return res.status(400).json({ error: 'Recharge is already processed' });
    }

    await db.updateRecharge(recharge.id, { status: 'rejected' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 7. Get All Withdrawals
router.get('/withdrawals', authenticateAdmin, async (req, res) => {
  try {
    const withdrawals = await db.getWithdrawals();
    const users = await db.getUsers();

    const enrichedWithdrawals = withdrawals.map(w => {
      const user = users.find(u => u.id === w.userId);
      return {
        ...w,
        userPhone: user ? user.phone : 'Unknown',
        userUID: user ? user.uid : 'Unknown'
      };
    });

    res.json(enrichedWithdrawals.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 8. Approve Withdrawal
router.post('/withdrawals/:id/approve', authenticateAdmin, async (req, res) => {
  try {
    const withdrawals = await db.getWithdrawals();
    const withdrawal = withdrawals.find(w => w.id === req.params.id);
    if (!withdrawal) return res.status(404).json({ error: 'Withdrawal request not found' });

    if (withdrawal.status !== 'pending') {
      return res.status(400).json({ error: 'Withdrawal is already processed' });
    }

    const user = await db.getUserById(withdrawal.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Deduct from user's frozen amount
    await db.updateUser(user.id, {
      frozenAmount: Math.max(0, parseFloat((user.frozenAmount - withdrawal.amount).toFixed(2)))
    });
    await db.updateWithdrawal(withdrawal.id, { status: 'approved' });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 9. Reject Withdrawal
router.post('/withdrawals/:id/reject', authenticateAdmin, async (req, res) => {
  try {
    const withdrawals = await db.getWithdrawals();
    const withdrawal = withdrawals.find(w => w.id === req.params.id);
    if (!withdrawal) return res.status(404).json({ error: 'Withdrawal request not found' });

    if (withdrawal.status !== 'pending') {
      return res.status(400).json({ error: 'Withdrawal is already processed' });
    }

    const user = await db.getUserById(withdrawal.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Refund frozen funds to active balance
    await db.updateUser(user.id, {
      balance: parseFloat((user.balance + withdrawal.amount).toFixed(2)),
      frozenAmount: Math.max(0, parseFloat((user.frozenAmount - withdrawal.amount).toFixed(2)))
    });
    await db.updateWithdrawal(withdrawal.id, { status: 'rejected' });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 10. Create Order (Task)
router.post('/orders', authenticateAdmin, async (req, res) => {
  try {
    const { amount, productName, productImage, targetUser, commissionRate } = req.body;

    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Invalid order amount' });
    }

    const rate = commissionRate ? parseFloat(commissionRate) / 100 : 0.20; // default 20%

    const newOrder = {
      id: uuidv4(),
      amount: parseFloat(amount),
      productName: productName || 'Luxury Myntra Fashion Item',
      productImage: productImage || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400',
      commissionRate: rate,
      targetUser: targetUser ? targetUser.trim() : 'all',
      grabbedBy: [],
      createdAt: new Date().toISOString()
    };

    await db.createOrder(newOrder);
    res.json({ success: true, order: newOrder });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 11. Get Created Orders
router.get('/orders', authenticateAdmin, async (req, res) => {
  try {
    const orders = await db.getOrders();
    res.json(orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 12. Delete Order
router.delete('/orders/:id', authenticateAdmin, async (req, res) => {
  try {
    if (db.isMongoActive) {
      const OrderModel = require('../models/Order');
      const result = await OrderModel.findOneAndDelete({ id: req.params.id });
      if (result) return res.json({ success: true });
    } else {
      const data = db.readJson();
      const index = data.orders.findIndex(o => o.id === req.params.id);
      if (index !== -1) {
        data.orders.splice(index, 1);
        db.writeJson(data);
        return res.json({ success: true });
      }
    }
    res.status(404).json({ error: 'Order not found' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 13. Settle Grab Manually (Admin Override)
router.post('/grabs/:id/settle', authenticateAdmin, async (req, res) => {
  try {
    let grab;
    let data;

    if (db.isMongoActive) {
      const UserGrabModel = require('../models/UserGrab');
      grab = await UserGrabModel.findOne({ id: req.params.id });
      if (!grab) return res.status(404).json({ error: 'Grab record not found' });
      if (grab.status !== 'pending') return res.status(400).json({ error: 'Grab is already settled' });

      grab.status = 'settled';
      await grab.save();

      const user = await db.getUserById(grab.userId);
      if (user) {
        const frozenAmount = Math.max(0, parseFloat((user.frozenAmount - grab.amount).toFixed(2)));
        const balance = parseFloat((user.balance + grab.amount + grab.commission).toFixed(2));
        const todayEarnings = parseFloat((user.todayEarnings + grab.commission).toFixed(2));
        const getEarnings = parseFloat((user.getEarnings + grab.commission).toFixed(2));

        await db.updateUser(user.id, { frozenAmount, balance, todayEarnings, getEarnings });

        if (user.referrerPhone) {
          const referrer = await db.getUserByPhone(user.referrerPhone);
          if (referrer) {
            const teamCommission = parseFloat((grab.commission * 0.1).toFixed(2));
            await db.updateUser(referrer.id, {
              balance: parseFloat((referrer.balance + teamCommission).toFixed(2)),
              teamIncome: parseFloat((referrer.teamIncome + teamCommission).toFixed(2)),
              todayEarnings: parseFloat((referrer.todayEarnings + teamCommission).toFixed(2))
            });
          }
        }
      }
    } else {
      data = db.readJson();
      const grabIndex = data.user_grabs.findIndex(g => g.id === req.params.id);
      if (grabIndex === -1) return res.status(404).json({ error: 'Grab record not found' });
      grab = data.user_grabs[grabIndex];
      if (grab.status !== 'pending') return res.status(400).json({ error: 'Grab is already settled' });

      grab.status = 'settled';

      const userIndex = data.users.findIndex(u => u.id === grab.userId);
      if (userIndex !== -1) {
        const user = data.users[userIndex];
        user.frozenAmount = Math.max(0, user.frozenAmount - grab.amount);
        user.balance += (grab.amount + grab.commission);
        user.todayEarnings += grab.commission;
        user.getEarnings += grab.commission;

        if (user.referrerPhone) {
          const referrerIndex = data.users.findIndex(u => u.phone === user.referrerPhone);
          if (referrerIndex !== -1) {
            const referrer = data.users[referrerIndex];
            const teamCommission = parseFloat((grab.commission * 0.1).toFixed(2));
            referrer.balance += teamCommission;
            referrer.teamIncome += teamCommission;
            referrer.todayEarnings += teamCommission;
          }
        }
      }
      db.writeJson(data);
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
