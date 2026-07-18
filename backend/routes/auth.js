const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const { otpLimiter, authLimiter } = require('../middleware/rateLimiter');

const JWT_SECRET = process.env.JWT_SECRET || 'myntra-secret-key-12345';
const OTP_EXPIRY_SECONDS = parseInt(process.env.OTP_EXPIRY_SECONDS) || 300;

// Hash password helper
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Generate unique 6-digit UID
async function generateUID() {
  let uid = '';
  const users = await db.getUsers();
  do {
    uid = Math.floor(100000 + Math.random() * 900000).toString();
  } while (users.some(u => u.uid === uid));
  return uid;
}

// Generate unique 6-character uppercase Invite Code
async function generateInviteCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  const users = await db.getUsers();
  do {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  } while (users.some(u => u.inviteCode === code));
  return code;
}

// Validate Indian mobile numbers
function isValidIndianNumber(phone) {
  const regex = /^(?:\+91|91)?[6-9]\d{9}$/;
  return regex.test(phone);
}

// Format number to 10-digit standard
function formatPhoneNumber(phone) {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return cleaned.substring(2);
  }
  return cleaned;
}

// 1. Send OTP Endpoint
router.post('/send-otp', otpLimiter, async (req, res) => {
  const { phone, flow } = req.body; // flow: 'login' | 'register'

  if (!phone) {
    return res.status(400).json({ error: 'Phone number is required' });
  }

  if (!isValidIndianNumber(phone)) {
    return res.status(400).json({ error: 'Please enter a valid 10-digit Indian phone number (+91)' });
  }

  const formattedPhone = formatPhoneNumber(phone);
  const user = await db.getUserByPhone(formattedPhone);

  if (flow === 'register' && user) {
    return res.status(400).json({ error: 'This phone number is already registered. Please login.' });
  }

  if (flow === 'login' && !user) {
    return res.status(400).json({ error: 'Phone number not registered. Please sign up first.' });
  }

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Store in cache
  const cacheKey = `otp:${formattedPhone}`;
  await db.setCache(cacheKey, otp, OTP_EXPIRY_SECONDS);

  const renflairKey = process.env.RENFLAIR_API_KEY;

  if (!renflairKey || renflairKey === '6D992798AXXXX') {
    return res.status(400).json({ error: 'SMS Gateway is not configured. Please add your RENFLAIR_API_KEY in the .env file.' });
  }

  try {
    const response = await axios.get(`https://sms.renflair.in/V1.php?API=${renflairKey}&PHONE=${formattedPhone}&OTP=${otp}`);
    console.log(`[RENFLAIR SMS API] Sent status response:`, response.data);

    if (response.data && response.data.status === 'FAILED') {
      return res.status(400).json({ error: `SMS Gateway failed: ${response.data.message || 'Incorrect API Key or insufficient credits.'}` });
    }
  } catch (err) {
    console.error(`[RENFLAIR SMS API] Connection error:`, err.message);
    return res.status(400).json({ error: 'SMS Gateway connection failed. Please try again later.' });
  }

  // Big bold log in server terminal
  console.log('\n=========================================');
  console.log(`[SMS SENDER] Code: ${otp} to phone: +91${formattedPhone}`);
  console.log(`Sent via Renflair API: SUCCESS`);
  console.log(`Expires in ${OTP_EXPIRY_SECONDS / 60} minutes.`);
  console.log('=========================================\n');

  res.json({
    success: true,
    message: 'Verification code sent to your mobile.'
  });
});

// 2. Verify OTP & Authenticate
router.post('/verify-otp', authLimiter, async (req, res) => {
  const { phone, otp, flow, inviteCode, password, withdrawalPassword } = req.body;

  if (!phone || !otp) {
    return res.status(400).json({ error: 'Phone number and OTP are required' });
  }

  const formattedPhone = formatPhoneNumber(phone);
  const cacheKey = `otp:${formattedPhone}`;
  const storedOtp = await db.getCache(cacheKey);

  if (!storedOtp) {
    return res.status(400).json({ error: 'OTP has expired or was not requested. Please try again.' });
  }

  if (storedOtp !== otp) {
    return res.status(400).json({ error: 'Invalid OTP code. Please try again.' });
  }

  // Clear OTP from cache on success
  await db.delCache(cacheKey);

  let user = await db.getUserByPhone(formattedPhone);

  if (flow === 'register') {
    if (user) {
      return res.status(400).json({ error: 'User already exists' });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Login password must be at least 6 characters.' });
    }

    if (!withdrawalPassword || withdrawalPassword.length < 6) {
      return res.status(400).json({ error: 'Withdrawal password must be at least 6 characters.' });
    }

    // Handle Referral logic
    let referrerPhone = '';
    if (inviteCode) {
      const users = await db.getUsers();
      const referrer = users.find(u => u.inviteCode === inviteCode.toUpperCase());
      if (!referrer) {
        return res.status(400).json({ error: 'Invalid referral code.' });
      }
      referrerPhone = referrer.phone;
    }

    // Create User
    const newUser = {
      id: uuidv4(),
      phone: formattedPhone,
      uid: await generateUID(),
      inviteCode: await generateInviteCode(),
      password: hashPassword(password),
      withdrawalPassword: hashPassword(withdrawalPassword),
      referrerPhone,
      balance: 60.00, // standard gift balance
      frozenAmount: 0.00,
      todayEarnings: 0.00,
      yesterdayEarnings: 0.00,
      getEarnings: 0.00,
      teamIncome: 0.00,
      createdAt: new Date().toISOString()
    };

    user = await db.createUser(newUser);
  } else {
    // login flow
    if (!user) {
      return res.status(400).json({ error: 'User does not exist. Please register.' });
    }
  }

  const token = jwt.sign(
    { id: user.id, phone: user.phone, role: 'user' },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  const { password: _, ...userResponse } = user;
  res.json({
    success: true,
    token,
    user: userResponse
  });
});

// 3. Get User Profile (Me)
router.get('/me', authenticateToken, async (req, res) => {
  const user = await db.getUserById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const { password: _, ...userResponse } = user;
  res.json(userResponse);
});

// 4. Backward Compatibility Password Login
router.post('/login', authLimiter, async (req, res) => {
  const { phone, password } = req.body;

  if (!phone || !password) {
    return res.status(400).json({ error: 'Phone and password are required' });
  }

  const formattedPhone = formatPhoneNumber(phone);
  const user = await db.getUserByPhone(formattedPhone);

  if (!user || user.password !== hashPassword(password)) {
    return res.status(400).json({ error: 'Invalid phone or password' });
  }

  const token = jwt.sign(
    { id: user.id, phone: user.phone, role: 'user' },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  const { password: _, ...userResponse } = user;
  res.json({ token, user: userResponse });
});

// 5. Backward Compatibility Password Register
router.post('/register', authLimiter, async (req, res) => {
  const { phone, password, inviteCode } = req.body;

  if (!phone || !password) {
    return res.status(400).json({ error: 'Phone and password are required' });
  }

  const formattedPhone = formatPhoneNumber(phone);
  const existingUser = await db.getUserByPhone(formattedPhone);

  if (existingUser) {
    return res.status(400).json({ error: 'Phone number already registered' });
  }

  let referrerPhone = '';
  if (inviteCode) {
    const users = await db.getUsers();
    const referrer = users.find(u => u.inviteCode === inviteCode.toUpperCase());
    if (!referrer) {
      return res.status(400).json({ error: 'Invalid invite code' });
    }
    referrerPhone = referrer.phone;
  }

  const newUser = {
    id: uuidv4(),
    phone: formattedPhone,
    uid: await generateUID(),
    inviteCode: await generateInviteCode(),
    password: hashPassword(password),
    referrerPhone,
    balance: 60.00,
    frozenAmount: 0.00,
    todayEarnings: 0.00,
    yesterdayEarnings: 0.00,
    getEarnings: 0.00,
    teamIncome: 0.00,
    createdAt: new Date().toISOString()
  };

  await db.createUser(newUser);

  const token = jwt.sign(
    { id: newUser.id, phone: newUser.phone, role: 'user' },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  const { password: _, ...userResponse } = newUser;
  res.json({ token, user: userResponse });
});

module.exports = router;
