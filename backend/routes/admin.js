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

// 13. Get All User Grabs
router.get('/grabs', authenticateAdmin, async (req, res) => {
  try {
    const grabs = await db.getUserGrabs();
    const users = await db.getUsers();

    const enrichedGrabs = grabs.map(g => {
      const user = users.find(u => u.id === g.userId);
      return {
        ...g,
        userPhone: user ? user.phone : 'Unknown',
        userUID: user ? user.uid : 'Unknown'
      };
    });

    res.json(enrichedGrabs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 14. Approve/Settle User Grab (Admin manual approval)
router.post('/grabs/:id/settle', authenticateAdmin, async (req, res) => {
  try {
    const grabs = await db.getUserGrabs();
    const grab = grabs.find(g => g.id === req.params.id);
    if (!grab) return res.status(404).json({ error: 'Grab record not found' });
    if (grab.status !== 'pending') return res.status(400).json({ error: 'Grab is already processed' });

    // Update grab status
    await db.updateUserGrab(grab.id, { status: 'settled' });

    // Update user balance
    const user = await db.getUserById(grab.userId);
    if (user) {
      const frozenAmount = Math.max(0, parseFloat((user.frozenAmount - grab.amount).toFixed(2)));
      const balance = parseFloat((user.balance + grab.amount + grab.commission).toFixed(2));
      const todayEarnings = parseFloat((user.todayEarnings + grab.commission).toFixed(2));
      const getEarnings = parseFloat((user.getEarnings + grab.commission).toFixed(2));

      await db.updateUser(user.id, { frozenAmount, balance, todayEarnings, getEarnings });

      // Direct referrer commission (10% of grab commission)
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

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 15. Reject User Grab (Admin manual rejection)
router.post('/grabs/:id/reject', authenticateAdmin, async (req, res) => {
  try {
    const grabs = await db.getUserGrabs();
    const grab = grabs.find(g => g.id === req.params.id);
    if (!grab) return res.status(404).json({ error: 'Grab record not found' });
    if (grab.status !== 'pending') return res.status(400).json({ error: 'Grab is already processed' });

    // Update grab status
    await db.updateUserGrab(grab.id, { status: 'rejected' });

    // Refund frozen amount back to active balance
    const user = await db.getUserById(grab.userId);
    if (user) {
      const frozenAmount = Math.max(0, parseFloat((user.frozenAmount - grab.amount).toFixed(2)));
      const balance = parseFloat((user.balance + grab.amount).toFixed(2));
      await db.updateUser(user.id, { frozenAmount, balance });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// NEW ADMIN DESKTOP PORTAL API ENDPOINTS
// ==========================================

// 16. List Invite Codes
router.get('/invite-codes', authenticateAdmin, async (req, res) => {
  try {
    const codes = await db.getInviteCodes();
    res.json(codes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 17. Generate Invite Codes
router.post('/invite-codes/generate', authenticateAdmin, async (req, res) => {
  try {
    const { note, quantity } = req.body;
    const qty = parseInt(quantity) || 1;
    const generated = [];

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    for (let i = 0; i < qty; i++) {
      let code = '';
      let isUnique = false;
      let limit = 0;
      while (!isUnique && limit < 50) {
        code = '';
        for (let j = 0; j < 8; j++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        const existing = await db.getInviteCodeByCode(code);
        if (!existing) isUnique = true;
        limit++;
      }

      const inviteObj = {
        code,
        note: note || '',
        status: 'unused',
        createdBy: 'admin',
        createdAt: new Date().toISOString()
      };

      await db.createInviteCode(inviteObj);
      generated.push(inviteObj);
    }

    res.json({ success: true, count: generated.length, codes: generated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 18. Delete Invite Code
router.delete('/invite-codes/:code', authenticateAdmin, async (req, res) => {
  try {
    const success = await db.deleteInviteCode(req.params.code);
    res.json({ success });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 19. List Products Catalog
router.get('/products', authenticateAdmin, async (req, res) => {
  try {
    const products = await db.getProducts();
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 20. Create Product
router.post('/products', authenticateAdmin, async (req, res) => {
  try {
    const { name, price, bonus, description, image } = req.body;
    const numericPrice = parseFloat(price);
    const numericBonus = parseFloat(bonus);

    if (!name || isNaN(numericPrice) || isNaN(numericBonus) || !image) {
      return res.status(400).json({ error: 'Name, price, bonus, and image are required' });
    }

    const productObj = {
      id: uuidv4(),
      name,
      price: numericPrice,
      bonus: numericBonus,
      description: description || '',
      image,
      isActive: true,
      createdAt: new Date().toISOString()
    };

    await db.createProduct(productObj);
    res.json(productObj);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 21. Update Product details
router.post('/products/:id', authenticateAdmin, async (req, res) => {
  try {
    const updates = {};
    const allowedFields = ['name', 'price', 'bonus', 'description', 'image', 'isActive'];
    
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'price' || field === 'bonus') {
          updates[field] = parseFloat(req.body[field]);
        } else if (field === 'isActive') {
          updates[field] = req.body[field] === true || req.body[field] === 'true' || req.body[field] === 1;
        } else {
          updates[field] = req.body[field];
        }
      }
    });

    const updated = await db.updateProduct(req.params.id, updates);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 22. List All Assigned Tasks
router.get('/tasks', authenticateAdmin, async (req, res) => {
  try {
    const tasks = await db.getTasks();
    const enrichedTasks = [];
    for (const t of tasks) {
      const user = await db.getUserById(t.userId);
      const product = await db.getProductById(t.productId);
      enrichedTasks.push({
        ...t,
        userPhone: user ? user.phone : 'Unknown',
        productName: product ? product.name : 'Unknown Product',
        productImage: product ? product.image : ''
      });
    }
    res.json(enrichedTasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 23. Assign Task to Customer
router.post('/tasks/assign', authenticateAdmin, async (req, res) => {
  try {
    const { userId, productId, amount, bonus } = req.body;
    const user = await db.getUserById(userId);
    if (!user) return res.status(404).json({ error: 'Customer not found' });

    const product = await db.getProductById(productId);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const finalPrice = parseFloat(amount) || product.price;
    const finalBonus = parseFloat(bonus) || product.bonus;

    const taskObj = {
      id: uuidv4(),
      userId: user.id,
      productId: product.id,
      amount: finalPrice,
      bonus: finalBonus,
      status: 'assigned',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString()
    };

    await db.createTask(taskObj);
    res.json({ success: true, task: taskObj });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 24. Approve Assigned Task (Timer stops, reward remains frozen)
router.post('/tasks/:id/approve', authenticateAdmin, async (req, res) => {
  try {
    const task = await db.getTaskById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (task.status !== 'submitted') return res.status(400).json({ error: 'Task is not submitted for approval' });

    await db.updateTask(task.id, { status: 'completed' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 25. Reject Assigned Task (Refund principal to available, clear frozen)
router.post('/tasks/:id/reject', authenticateAdmin, async (req, res) => {
  try {
    const task = await db.getTaskById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (task.status !== 'submitted') return res.status(400).json({ error: 'Task is not submitted' });

    const user = await db.getUserById(task.userId);
    if (user) {
      const refundAmount = task.amount;
      const newBalance = parseFloat((user.balance + refundAmount).toFixed(2));
      const totalFrozenAdded = task.amount + task.bonus;
      const newFrozen = Math.max(0, parseFloat((user.frozenAmount - totalFrozenAdded).toFixed(2)));
      await db.updateUser(user.id, { balance: newBalance, frozenAmount: newFrozen });
    }

    await db.updateTask(task.id, { status: 'rejected' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 26. Transfer to Wallet (Release Frozen funds to available)
router.post('/users/:id/release-frozen', authenticateAdmin, async (req, res) => {
  try {
    const { amount } = req.body;
    const user = await db.getUserById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const releaseAmount = parseFloat(amount);
    if (isNaN(releaseAmount) || releaseAmount <= 0) {
      return res.status(400).json({ error: 'Invalid release amount' });
    }

    if (user.frozenAmount < releaseAmount) {
      return res.status(400).json({ error: 'Release amount exceeds frozen balance' });
    }

    const newFrozen = parseFloat((user.frozenAmount - releaseAmount).toFixed(2));
    const newBalance = parseFloat((user.balance + releaseAmount).toFixed(2));
    const todayEarnings = parseFloat((user.todayEarnings + releaseAmount - (releaseAmount / 1.2)).toFixed(2));

    await db.updateUser(user.id, { balance: newBalance, frozenAmount: newFrozen, todayEarnings });
    res.json({ success: true, balance: newBalance, frozenAmount: newFrozen });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
