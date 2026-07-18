const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  amount: { type: Number, required: true },
  productName: { type: String, required: true },
  productImage: { type: String, required: true },
  commissionRate: { type: Number, required: true },
  targetUser: { type: String, default: 'all' },
  grabbedBy: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', OrderSchema);
