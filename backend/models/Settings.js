const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, default: 'system_settings' },
  minRecharge: { type: Number, default: 100 },
  minWithdrawal: { type: Number, default: 100 },
  commissionRate: { type: Number, default: 0.20 },
  maxTasksPerDay: { type: Number, default: 10 },
  upiId: { type: String, default: 'myntra@ybl' },
  qrCodeUrl: { type: String, default: '' },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Settings', SettingsSchema);
