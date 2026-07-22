const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

// 1. Get Grabbing Status
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const user = await db.getUserById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const allOrders = await db.getOrders();
    const eligibleOrders = allOrders.filter(order => {
      const matchesTarget = order.targetUser === 'all' || 
                            order.targetUser === user.phone || 
                            order.targetUser === user.uid;
      const notGrabbedYet = !order.grabbedBy.includes(user.id);
      return matchesTarget && notGrabbedYet;
    });

    res.json({
      availableCount: eligibleOrders.length,
      eligibleOrders: eligibleOrders.map(o => ({
        id: o.id,
        amount: o.amount,
        productName: o.productName,
        productImage: o.productImage,
        commissionRate: o.commissionRate
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Match Order (Auto Grab)
router.post('/match', authenticateToken, async (req, res) => {
  try {
    const user = await db.getUserById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.balance < 10.00) {
      return res.status(400).json({ error: 'Minimum balance of ₹10.00 is required to grab orders.' });
    }

    const allOrders = await db.getOrders();
    const eligibleOrders = allOrders.filter(order => {
      const matchesTarget = order.targetUser === 'all' || 
                            order.targetUser === user.phone || 
                            order.targetUser === user.uid;
      const notGrabbedYet = !order.grabbedBy.includes(user.id);
      const balanceSuffices = user.balance >= order.amount;
      return matchesTarget && notGrabbedYet && balanceSuffices;
    });

    if (eligibleOrders.length === 0) {
      return res.status(404).json({ error: 'No matching orders found. Please add funds or contact Admin.' });
    }

    const selectedOrder = eligibleOrders[Math.floor(Math.random() * eligibleOrders.length)];

    res.json({
      success: true,
      order: {
        id: selectedOrder.id,
        amount: selectedOrder.amount,
        productName: selectedOrder.productName,
        productImage: selectedOrder.productImage,
        commissionRate: selectedOrder.commissionRate,
        commission: parseFloat((selectedOrder.amount * selectedOrder.commissionRate).toFixed(2))
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Submit Grabbed Order
router.post('/submit', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.body;
    const user = await db.getUserById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const order = await db.getOrderById(orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const matchesTarget = order.targetUser === 'all' || 
                          order.targetUser === user.phone || 
                          order.targetUser === user.uid;
    const notGrabbedYet = !order.grabbedBy.includes(user.id);

    if (!matchesTarget || !notGrabbedYet) {
      return res.status(400).json({ error: 'Order is no longer available to grab' });
    }

    if (user.balance < order.amount) {
      return res.status(400).json({ error: 'Insufficient balance to purchase this order' });
    }

    const commission = parseFloat((order.amount * order.commissionRate).toFixed(2));

    // Deduct active balance, add to frozen amount
    await db.updateUser(user.id, {
      balance: parseFloat((user.balance - order.amount).toFixed(2)),
      frozenAmount: parseFloat((user.frozenAmount + order.amount).toFixed(2))
    });

    const settleDurationSeconds = 30; // Auto-settle after 30 seconds
    const settleAt = new Date(Date.now() + settleDurationSeconds * 1000).toISOString();

    const newGrab = {
      id: uuidv4(),
      userId: user.id,
      orderId: order.id,
      amount: order.amount,
      productName: order.productName,
      productImage: order.productImage,
      commission,
      status: 'pending',
      createdAt: new Date().toISOString(),
      settleAt
    };

    await db.createUserGrab(newGrab);

    // Update order's grabbed list
    const updatedGrabbedBy = [...order.grabbedBy, user.id];
    await db.updateOrder(order.id, { grabbedBy: updatedGrabbedBy });

    res.json({
      success: true,
      grab: newGrab,
      userBalance: parseFloat((user.balance - order.amount).toFixed(2)),
      userFrozen: parseFloat((user.frozenAmount + order.amount).toFixed(2))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Get Grab History
router.get('/', authenticateToken, async (req, res) => {
  try {
    const grabs = await db.getUserGrabs(req.user.id);
    res.json(grabs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// NEW USER TASK WORKFLOW API ENDPOINTS
// ==========================================

// 5. Get My Assigned Tasks List
router.get('/my-tasks', authenticateToken, async (req, res) => {
  try {
    const userTasks = await db.getTasks(req.user.id);
    const enriched = [];
    for (const t of userTasks) {
      const product = await db.getProductById(t.productId);
      enriched.push({
        ...t,
        productName: product ? product.name : 'Unknown Product',
        productImage: product ? product.image : '',
        productDescription: product ? product.description : ''
      });
    }
    res.json(enriched.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 6. Checkout and Submit Task (Freeze funds)
router.post('/my-tasks/:id/submit', authenticateToken, async (req, res) => {
  try {
    const task = await db.getTaskById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (task.userId !== req.user.id) return res.status(403).json({ error: 'Access denied' });
    if (task.status !== 'assigned') return res.status(400).json({ error: 'Task is already started or completed' });

    const user = await db.getUserById(req.user.id);
    if (user.balance < task.amount) {
      return res.status(400).json({ error: 'Your wallet balance is too low for this task.' });
    }

    const newBalance = parseFloat((user.balance - task.amount).toFixed(2));
    const totalFrozenAdded = task.amount + task.bonus;
    const newFrozen = parseFloat((user.frozenAmount + totalFrozenAdded).toFixed(2));

    await db.updateUser(user.id, { balance: newBalance, frozenAmount: newFrozen });

    await db.updateTask(task.id, {
      status: 'submitted',
      submittedAt: new Date().toISOString()
    });

    res.json({ success: true, balance: newBalance, frozenAmount: newFrozen });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
