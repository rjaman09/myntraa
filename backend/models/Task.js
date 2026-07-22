const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  productId: { type: String, required: true },
  amount: { type: Number, required: true },
  bonus: { type: Number, required: true },
  status: { type: String, default: 'assigned' }, // 'assigned', 'submitted', 'completed', 'rejected', 'expired'
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date },
  submittedAt: { type: Date }
});

module.exports = mongoose.model('Task', TaskSchema);
