const mongoose = require('mongoose');

const UserGrabSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  orderId: { type: String, required: true },
  amount: { type: Number, required: true },
  productName: { type: String, required: true },
  productImage: { type: String, required: true },
  commission: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'settled'], default: 'pending' },
  settleAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('UserGrab', UserGrabSchema);
