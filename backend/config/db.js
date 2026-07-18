const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const redis = require('redis');
const mysql = require('mysql2/promise');

// Import Mongoose Models for Mongo fallback
const User = require('../models/User');
const Order = require('../models/Order');
const UserGrab = require('../models/UserGrab');
const Recharge = require('../models/Recharge');
const Withdrawal = require('../models/Withdrawal');

const dbPath = path.join(__dirname, '..', 'db.json');

const defaultDb = {
  users: [],
  orders: [],
  user_grabs: [],
  recharges: [],
  withdrawals: []
};

class DatabaseAdapter {
  constructor() {
    this.isTidbActive = false;
    this.isMongoActive = false;
    this.isRedisActive = false;
    
    // In-memory cache for OTP and rate limits if Redis is not connected
    this.memoryCache = new Map();
    
    this.ensureJsonDbExists();
    this.connectTidb();
    this.connectMongo();
    this.connectRedis();
  }

  ensureJsonDbExists() {
    try {
      if (!fs.existsSync(dbPath)) {
        fs.writeFileSync(dbPath, JSON.stringify(defaultDb, null, 2), 'utf8');
      }
    } catch (error) {
      console.error('Error initializing JSON database fallback:', error);
    }
  }

  async connectTidb() {
    const host = process.env.TIDB_HOST;
    if (!host) {
      console.log('TiDB configurations not set in .env. Skipping TiDB connection.');
      return;
    }

    try {
      this.tidbPool = mysql.createPool({
        host: host,
        port: parseInt(process.env.TIDB_PORT) || 4000,
        user: process.env.TIDB_USER,
        password: process.env.TIDB_PASSWORD,
        database: process.env.TIDB_DATABASE || 'sys',
        ssl: {
          minVersion: 'TLSv1.2',
          rejectUnauthorized: true
        },
        decimalNumbers: true, // Auto parse DECIMAL columns to JS numbers
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
      });

      // Test connection
      const connection = await this.tidbPool.getConnection();
      connection.release();
      this.isTidbActive = true;
      console.log('Successfully connected to TiDB SQL Database.');

      // Initialize schemas
      await this.initTidbSchema();
    } catch (error) {
      console.error('TiDB database connection failed:', error.message);
      this.isTidbActive = false;
    }
  }

  async initTidbSchema() {
    try {
      // 1. Users Table
      await this.tidbPool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(50) PRIMARY KEY,
          phone VARCHAR(20) UNIQUE,
          uid VARCHAR(10) UNIQUE,
          inviteCode VARCHAR(10) UNIQUE,
          password VARCHAR(100) NOT NULL,
          withdrawalPassword VARCHAR(100),
          referrerPhone VARCHAR(20) DEFAULT '',
          balance DECIMAL(15, 2) DEFAULT 60.00,
          frozenAmount DECIMAL(15, 2) DEFAULT 0.00,
          todayEarnings DECIMAL(15, 2) DEFAULT 0.00,
          yesterdayEarnings DECIMAL(15, 2) DEFAULT 0.00,
          getEarnings DECIMAL(15, 2) DEFAULT 0.00,
          teamIncome DECIMAL(15, 2) DEFAULT 0.00,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 2. Orders Table
      await this.tidbPool.query(`
        CREATE TABLE IF NOT EXISTS orders (
          id VARCHAR(50) PRIMARY KEY,
          amount DECIMAL(15, 2) NOT NULL,
          productName VARCHAR(255) NOT NULL,
          productImage VARCHAR(500) NOT NULL,
          commissionRate DECIMAL(5, 4) DEFAULT 0.20,
          targetUser VARCHAR(50) DEFAULT 'all',
          grabbedBy TEXT, -- JSON array containing user UIDs/IDs
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 3. User Grabs Table
      await this.tidbPool.query(`
        CREATE TABLE IF NOT EXISTS user_grabs (
          id VARCHAR(50) PRIMARY KEY,
          userId VARCHAR(50) NOT NULL,
          orderId VARCHAR(50) NOT NULL,
          amount DECIMAL(15, 2) NOT NULL,
          productName VARCHAR(255) NOT NULL,
          productImage VARCHAR(500) NOT NULL,
          commission DECIMAL(15, 2) DEFAULT 0.00,
          status VARCHAR(20) DEFAULT 'pending',
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          settleAt DATETIME NOT NULL
        )
      `);

      // 4. Recharges Table
      await this.tidbPool.query(`
        CREATE TABLE IF NOT EXISTS recharges (
          id VARCHAR(50) PRIMARY KEY,
          userId VARCHAR(50) NOT NULL,
          amount DECIMAL(15, 2) NOT NULL,
          channel VARCHAR(50) DEFAULT 'UPI',
          referenceNo VARCHAR(50) NOT NULL,
          status VARCHAR(20) DEFAULT 'pending',
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 5. Withdrawals Table
      await this.tidbPool.query(`
        CREATE TABLE IF NOT EXISTS withdrawals (
          id VARCHAR(50) PRIMARY KEY,
          userId VARCHAR(50) NOT NULL,
          amount DECIMAL(15, 2) NOT NULL,
          bankAccount VARCHAR(100) NOT NULL,
          bankName VARCHAR(100) NOT NULL,
          holderName VARCHAR(100) NOT NULL,
          ifsc VARCHAR(20) NOT NULL,
          status VARCHAR(20) DEFAULT 'pending',
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      console.log('TiDB SQL Database schemas initialized successfully.');
    } catch (error) {
      console.error('Failed to initialize TiDB schemas:', error.message);
    }
  }

  async connectMongo() {
    // If TiDB is active, we can bypass Mongo or keep it as backup
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/myntra';
    try {
      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 2000
      });
      this.isMongoActive = true;
      console.log('Successfully connected to MongoDB.');
    } catch (error) {
      console.warn('MongoDB connection fallback bypassed or failed.');
      this.isMongoActive = false;
    }
  }

  async connectRedis() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    try {
      this.redisClient = redis.createClient({
        url: redisUrl,
        socket: { connectTimeout: 2000 }
      });
      
      this.redisClient.on('error', () => {
        this.isRedisActive = false;
      });

      await this.redisClient.connect();
      this.isRedisActive = true;
      console.log('Successfully connected to Redis.');
    } catch (error) {
      this.isRedisActive = false;
    }
  }

  // --- Fallback JSON Database Helpers ---
  readJson() {
    try {
      this.ensureJsonDbExists();
      const content = fs.readFileSync(dbPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.error('Error reading JSON database:', error);
      return defaultDb;
    }
  }

  writeJson(data) {
    try {
      fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
      return true;
    } catch (error) {
      console.error('Error writing JSON database:', error);
      return false;
    }
  }

  // --- Users Operations ---
  async getUsers() {
    if (this.isTidbActive) {
      const [rows] = await this.tidbPool.query('SELECT * FROM users');
      return rows;
    }
    if (this.isMongoActive) {
      return await User.find().lean();
    }
    return this.readJson().users;
  }

  async getUserById(id) {
    if (this.isTidbActive) {
      const [rows] = await this.tidbPool.query('SELECT * FROM users WHERE id = ?', [id]);
      return rows[0] || null;
    }
    if (this.isMongoActive) {
      return await User.findOne({ id }).lean();
    }
    return this.readJson().users.find(u => u.id === id);
  }

  async getUserByPhone(phone) {
    if (this.isTidbActive) {
      const [rows] = await this.tidbPool.query('SELECT * FROM users WHERE phone = ?', [phone]);
      return rows[0] || null;
    }
    if (this.isMongoActive) {
      return await User.findOne({ phone }).lean();
    }
    return this.readJson().users.find(u => u.phone === phone);
  }

  async createUser(user) {
    if (this.isTidbActive) {
      const { id, phone, uid, inviteCode, password, withdrawalPassword, referrerPhone, balance, frozenAmount, todayEarnings, yesterdayEarnings, getEarnings, teamIncome, createdAt } = user;
      await this.tidbPool.query(
        'INSERT INTO users (id, phone, uid, inviteCode, password, withdrawalPassword, referrerPhone, balance, frozenAmount, todayEarnings, yesterdayEarnings, getEarnings, teamIncome, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [id, phone, uid, inviteCode, password, withdrawalPassword, referrerPhone || '', balance || 60.00, frozenAmount || 0.00, todayEarnings || 0.00, yesterdayEarnings || 0.00, getEarnings || 0.00, teamIncome || 0.00, createdAt ? new Date(createdAt) : new Date()]
      );
      return user;
    }
    if (this.isMongoActive) {
      const newUser = new User(user);
      return await newUser.save();
    }
    const data = this.readJson();
    data.users.push(user);
    this.writeJson(data);
    return user;
  }

  async updateUser(id, updates) {
    if (this.isTidbActive) {
      const keys = Object.keys(updates);
      if (keys.length === 0) return this.getUserById(id);
      const sets = keys.map(k => `${k} = ?`).join(', ');
      const values = Object.values(updates);
      await this.tidbPool.query(`UPDATE users SET ${sets} WHERE id = ?`, [...values, id]);
      return this.getUserById(id);
    }
    if (this.isMongoActive) {
      return await User.findOneAndUpdate({ id }, { $set: updates }, { new: true }).lean();
    }
    const data = this.readJson();
    const index = data.users.findIndex(u => u.id === id);
    if (index !== -1) {
      data.users[index] = { ...data.users[index], ...updates };
      this.writeJson(data);
      return data.users[index];
    }
    return null;
  }

  // --- Orders Operations ---
  async getOrders() {
    if (this.isTidbActive) {
      const [rows] = await this.tidbPool.query('SELECT * FROM orders');
      return rows.map(r => ({
        ...r,
        grabbedBy: r.grabbedBy ? JSON.parse(r.grabbedBy) : []
      }));
    }
    if (this.isMongoActive) {
      return await Order.find().lean();
    }
    return this.readJson().orders;
  }

  async getOrderById(id) {
    if (this.isTidbActive) {
      const [rows] = await this.tidbPool.query('SELECT * FROM orders WHERE id = ?', [id]);
      if (!rows[0]) return null;
      return {
        ...rows[0],
        grabbedBy: rows[0].grabbedBy ? JSON.parse(rows[0].grabbedBy) : []
      };
    }
    if (this.isMongoActive) {
      return await Order.findOne({ id }).lean();
    }
    return this.getOrders().then(orders => orders.find(o => o.id === id));
  }

  async createOrder(order) {
    if (this.isTidbActive) {
      const { id, amount, productName, productImage, commissionRate, targetUser, grabbedBy, createdAt } = order;
      const grabbedStr = grabbedBy ? JSON.stringify(grabbedBy) : '[]';
      await this.tidbPool.query(
        'INSERT INTO orders (id, amount, productName, productImage, commissionRate, targetUser, grabbedBy, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [id, amount, productName, productImage, commissionRate, targetUser, grabbedStr, createdAt ? new Date(createdAt) : new Date()]
      );
      return order;
    }
    if (this.isMongoActive) {
      const newOrder = new Order(order);
      return await newOrder.save();
    }
    const data = this.readJson();
    data.orders.push(order);
    this.writeJson(data);
    return order;
  }

  async updateOrder(id, updates) {
    if (this.isTidbActive) {
      if (updates.grabbedBy) {
        updates.grabbedBy = JSON.stringify(updates.grabbedBy);
      }
      const keys = Object.keys(updates);
      if (keys.length === 0) return this.getOrderById(id);
      const sets = keys.map(k => `${k} = ?`).join(', ');
      const values = Object.values(updates);
      await this.tidbPool.query(`UPDATE orders SET ${sets} WHERE id = ?`, [...values, id]);
      return this.getOrderById(id);
    }
    if (this.isMongoActive) {
      return await Order.findOneAndUpdate({ id }, { $set: updates }, { new: true }).lean();
    }
    const data = this.readJson();
    const index = data.orders.findIndex(o => o.id === id);
    if (index !== -1) {
      data.orders[index] = { ...data.orders[index], ...updates };
      this.writeJson(data);
      return data.orders[index];
    }
    return null;
  }

  // --- User Grabs Operations ---
  async getUserGrabs(userId = null) {
    if (this.isTidbActive) {
      let q = 'SELECT * FROM user_grabs';
      let params = [];
      if (userId) {
        q += ' WHERE userId = ?';
        params.push(userId);
      }
      const [rows] = await this.tidbPool.query(q, params);
      return rows;
    }
    if (this.isMongoActive) {
      const query = userId ? { userId } : {};
      return await UserGrab.find(query).lean();
    }
    const grabs = this.readJson().user_grabs;
    if (userId) {
      return grabs.filter(g => g.userId === userId);
    }
    return grabs;
  }

  async createUserGrab(grab) {
    if (this.isTidbActive) {
      const { id, userId, orderId, amount, productName, productImage, commission, status, createdAt, settleAt } = grab;
      await this.tidbPool.query(
        'INSERT INTO user_grabs (id, userId, orderId, amount, productName, productImage, commission, status, createdAt, settleAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [id, userId, orderId, amount, productName, productImage, commission, status, createdAt ? new Date(createdAt) : new Date(), settleAt ? new Date(settleAt) : new Date()]
      );
      return grab;
    }
    if (this.isMongoActive) {
      const newGrab = new UserGrab(grab);
      return await newGrab.save();
    }
    const data = this.readJson();
    data.user_grabs.push(grab);
    this.writeJson(data);
    return grab;
  }

  async updateUserGrab(id, updates) {
    if (this.isTidbActive) {
      const keys = Object.keys(updates);
      if (keys.length === 0) return null;
      const sets = keys.map(k => `${k} = ?`).join(', ');
      const values = Object.values(updates);
      await this.tidbPool.query(`UPDATE user_grabs SET ${sets} WHERE id = ?`, [...values, id]);
      const [rows] = await this.tidbPool.query('SELECT * FROM user_grabs WHERE id = ?', [id]);
      return rows[0] || null;
    }
    if (this.isMongoActive) {
      return await UserGrab.findOneAndUpdate({ id }, { $set: updates }, { new: true }).lean();
    }
    const data = this.readJson();
    const index = data.user_grabs.findIndex(g => g.id === id);
    if (index !== -1) {
      data.user_grabs[index] = { ...data.user_grabs[index], ...updates };
      this.writeJson(data);
      return data.user_grabs[index];
    }
    return null;
  }

  // --- Recharges Operations ---
  async getRecharges(userId = null) {
    if (this.isTidbActive) {
      let q = 'SELECT * FROM recharges';
      let params = [];
      if (userId) {
        q += ' WHERE userId = ?';
        params.push(userId);
      }
      const [rows] = await this.tidbPool.query(q, params);
      return rows;
    }
    if (this.isMongoActive) {
      const query = userId ? { userId } : {};
      return await Recharge.find(query).lean();
    }
    const recharges = this.readJson().recharges;
    if (userId) {
      return recharges.filter(r => r.userId === userId);
    }
    return recharges;
  }

  async createRecharge(recharge) {
    if (this.isTidbActive) {
      const { id, userId, amount, channel, referenceNo, status, createdAt } = recharge;
      await this.tidbPool.query(
        'INSERT INTO recharges (id, userId, amount, channel, referenceNo, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, userId, amount, channel, referenceNo, status, createdAt ? new Date(createdAt) : new Date()]
      );
      return recharge;
    }
    if (this.isMongoActive) {
      const newRecharge = new Recharge(recharge);
      return await newRecharge.save();
    }
    const data = this.readJson();
    data.recharges.push(recharge);
    this.writeJson(data);
    return recharge;
  }

  async updateRecharge(id, updates) {
    if (this.isTidbActive) {
      const keys = Object.keys(updates);
      if (keys.length === 0) return null;
      const sets = keys.map(k => `${k} = ?`).join(', ');
      const values = Object.values(updates);
      await this.tidbPool.query(`UPDATE recharges SET ${sets} WHERE id = ?`, [...values, id]);
      const [rows] = await this.tidbPool.query('SELECT * FROM recharges WHERE id = ?', [id]);
      return rows[0] || null;
    }
    if (this.isMongoActive) {
      return await Recharge.findOneAndUpdate({ id }, { $set: updates }, { new: true }).lean();
    }
    const data = this.readJson();
    const index = data.recharges.findIndex(r => r.id === id);
    if (index !== -1) {
      data.recharges[index] = { ...data.recharges[index], ...updates };
      this.writeJson(data);
      return data.recharges[index];
    }
    return null;
  }

  // --- Withdrawals Operations ---
  async getWithdrawals(userId = null) {
    if (this.isTidbActive) {
      let q = 'SELECT * FROM withdrawals';
      let params = [];
      if (userId) {
        q += ' WHERE userId = ?';
        params.push(userId);
      }
      const [rows] = await this.tidbPool.query(q, params);
      return rows;
    }
    if (this.isMongoActive) {
      const query = userId ? { userId } : {};
      return await Withdrawal.find(query).lean();
    }
    const withdrawals = this.readJson().withdrawals;
    if (userId) {
      return withdrawals.filter(w => w.userId === userId);
    }
    return withdrawals;
  }

  async createWithdrawal(withdrawal) {
    if (this.isTidbActive) {
      const { id, userId, amount, bankAccount, bankName, holderName, ifsc, status, createdAt } = withdrawal;
      await this.tidbPool.query(
        'INSERT INTO withdrawals (id, userId, amount, bankAccount, bankName, holderName, ifsc, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [id, userId, amount, bankAccount, bankName, holderName, ifsc, status, createdAt ? new Date(createdAt) : new Date()]
      );
      return withdrawal;
    }
    if (this.isMongoActive) {
      const newWithdrawal = new Withdrawal(withdrawal);
      return await newWithdrawal.save();
    }
    const data = this.readJson();
    data.withdrawals.push(withdrawal);
    this.writeJson(data);
    return withdrawal;
  }

  async updateWithdrawal(id, updates) {
    if (this.isTidbActive) {
      const keys = Object.keys(updates);
      if (keys.length === 0) return null;
      const sets = keys.map(k => `${k} = ?`).join(', ');
      const values = Object.values(updates);
      await this.tidbPool.query(`UPDATE withdrawals SET ${sets} WHERE id = ?`, [...values, id]);
      const [rows] = await this.tidbPool.query('SELECT * FROM withdrawals WHERE id = ?', [id]);
      return rows[0] || null;
    }
    if (this.isMongoActive) {
      return await Withdrawal.findOneAndUpdate({ id }, { $set: updates }, { new: true }).lean();
    }
    const data = this.readJson();
    const index = data.withdrawals.findIndex(w => w.id === id);
    if (index !== -1) {
      data.withdrawals[index] = { ...data.withdrawals[index], ...updates };
      this.writeJson(data);
      return data.withdrawals[index];
    }
    return null;
  }

  // --- Redis / In-Memory Cache Operations for OTP and Rate Limiting ---
  async setCache(key, value, expirySeconds) {
    if (this.isRedisActive) {
      await this.redisClient.set(key, JSON.stringify(value), { EX: expirySeconds });
      return;
    }
    const expiresAt = Date.now() + expirySeconds * 1000;
    this.memoryCache.set(key, { value, expiresAt });
  }

  async getCache(key) {
    if (this.isRedisActive) {
      const data = await this.redisClient.get(key);
      return data ? JSON.parse(data) : null;
    }
    const cacheItem = this.memoryCache.get(key);
    if (!cacheItem) return null;
    if (Date.now() > cacheItem.expiresAt) {
      this.memoryCache.delete(key);
      return null;
    }
    return cacheItem.value;
  }

  async delCache(key) {
    if (this.isRedisActive) {
      await this.redisClient.del(key);
      return;
    }
    this.memoryCache.delete(key);
  }
}

module.exports = new DatabaseAdapter();
