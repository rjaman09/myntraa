const mongoose = require('mongoose');

const InviteCodeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  note: { type: String, default: '' },
  status: { type: String, default: 'unused' }, // 'unused', 'used'
  createdBy: { type: String, default: 'admin' },
  usedBy: { type: String }, // references user ID
  createdAt: { type: Date, default: Date.now },
  usedAt: { type: Date }
});

module.exports = mongoose.model('InviteCode', InviteCodeSchema);
