const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  phone: { type: String, required: true, unique: true },
  uid: { type: String, required: true, unique: true },
  inviteCode: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  withdrawalPassword: { type: String },
  referrerPhone: { type: String, default: '' },
  balance: { type: Number, default: 60.00 },
  frozenAmount: { type: Number, default: 0.00 },
  todayEarnings: { type: Number, default: 0.00 },
  yesterdayEarnings: { type: Number, default: 0.00 },
  getEarnings: { type: Number, default: 0.00 },
  teamIncome: { type: Number, default: 0.00 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
