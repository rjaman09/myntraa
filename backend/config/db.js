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
const Product = require('../models/Product');
const Task = require('../models/Task');
const InviteCode = require('../models/InviteCode');

const dbPath = path.join(__dirname, '..', 'db.json');

const defaultDb = {
  users: [],
  orders: [],
  user_grabs: [],
  recharges: [],
  withdrawals: [],
  products: [],
  tasks: [],
  invite_codes: []
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

      // 6. Products Table
      await this.tidbPool.query(`
        CREATE TABLE IF NOT EXISTS products (
          id VARCHAR(50) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          price DECIMAL(15, 2) NOT NULL,
          bonus DECIMAL(15, 2) NOT NULL,
          description TEXT,
          image VARCHAR(500) NOT NULL,
          isActive BOOLEAN DEFAULT TRUE,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 7. Assigned Tasks Table
      await this.tidbPool.query(`
        CREATE TABLE IF NOT EXISTS tasks (
          id VARCHAR(50) PRIMARY KEY,
          userId VARCHAR(50) NOT NULL,
          productId VARCHAR(50) NOT NULL,
          amount DECIMAL(15, 2) NOT NULL,
          bonus DECIMAL(15, 2) NOT NULL,
          status VARCHAR(20) DEFAULT 'assigned',
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          expiresAt DATETIME,
          submittedAt DATETIME
        )
      `);

      // 8. Invite Codes Table
      await this.tidbPool.query(`
        CREATE TABLE IF NOT EXISTS invite_codes (
          code VARCHAR(20) PRIMARY KEY,
          note VARCHAR(255) DEFAULT '',
          status VARCHAR(20) DEFAULT 'unused',
          createdBy VARCHAR(50) DEFAULT 'admin',
          usedBy VARCHAR(50),
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          usedAt DATETIME
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

  // --- Products CRUD Operations ---
  async getProducts() {
    if (this.isTidbActive) {
      const [rows] = await this.tidbPool.query('SELECT * FROM products');
      return rows;
    }
    if (this.isMongoActive) {
      return await Product.find().lean();
    }
    return this.readJson().products || [];
  }

  async getProductById(id) {
    if (this.isTidbActive) {
      const [rows] = await this.tidbPool.query('SELECT * FROM products WHERE id = ?', [id]);
      return rows[0] || null;
    }
    if (this.isMongoActive) {
      return await Product.findOne({ id }).lean();
    }
    return (this.readJson().products || []).find(p => p.id === id) || null;
  }

  async createProduct(product) {
    if (this.isTidbActive) {
      const { id, name, price, bonus, description, image, isActive, createdAt } = product;
      await this.tidbPool.query(
        'INSERT INTO products (id, name, price, bonus, description, image, isActive, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [id, name, price, bonus, description || '', image, isActive !== undefined ? isActive : true, createdAt ? new Date(createdAt) : new Date()]
      );
      return product;
    }
    if (this.isMongoActive) {
      const newProd = new Product(product);
      return await newProd.save();
    }
    const data = this.readJson();
    if (!data.products) data.products = [];
    data.products.push(product);
    this.writeJson(data);
    return product;
  }

  async updateProduct(id, updates) {
    if (this.isTidbActive) {
      const keys = Object.keys(updates);
      if (keys.length === 0) return this.getProductById(id);
      const sets = keys.map(k => `${k} = ?`).join(', ');
      const values = Object.values(updates);
      await this.tidbPool.query(`UPDATE products SET ${sets} WHERE id = ?`, [...values, id]);
      return this.getProductById(id);
    }
    if (this.isMongoActive) {
      return await Product.findOneAndUpdate({ id }, { $set: updates }, { new: true }).lean();
    }
    const data = this.readJson();
    if (!data.products) data.products = [];
    const index = data.products.findIndex(p => p.id === id);
    if (index !== -1) {
      data.products[index] = { ...data.products[index], ...updates };
      this.writeJson(data);
      return data.products[index];
    }
    return null;
  }

  async deleteProduct(id) {
    if (this.isTidbActive) {
      await this.tidbPool.query('DELETE FROM products WHERE id = ?', [id]);
      return true;
    }
    if (this.isMongoActive) {
      await Product.findOneAndDelete({ id });
      return true;
    }
    const data = this.readJson();
    if (!data.products) data.products = [];
    const index = data.products.findIndex(p => p.id === id);
    if (index !== -1) {
      data.products.splice(index, 1);
      this.writeJson(data);
      return true;
    }
    return false;
  }

  // --- Tasks CRUD Operations ---
  async getTasks(userId = null) {
    if (this.isTidbActive) {
      let q = 'SELECT * FROM tasks';
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
      return await Task.find(query).lean();
    }
    const tasks = this.readJson().tasks || [];
    if (userId) {
      return tasks.filter(t => t.userId === userId);
    }
    return tasks;
  }

  async getTaskById(id) {
    if (this.isTidbActive) {
      const [rows] = await this.tidbPool.query('SELECT * FROM tasks WHERE id = ?', [id]);
      return rows[0] || null;
    }
    if (this.isMongoActive) {
      return await Task.findOne({ id }).lean();
    }
    return (this.readJson().tasks || []).find(t => t.id === id) || null;
  }

  async createTask(task) {
    if (this.isTidbActive) {
      const { id, userId, productId, amount, bonus, status, createdAt, expiresAt, submittedAt } = task;
      await this.tidbPool.query(
        'INSERT INTO tasks (id, userId, productId, amount, bonus, status, createdAt, expiresAt, submittedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [id, userId, productId, amount, bonus, status || 'assigned', createdAt ? new Date(createdAt) : new Date(), expiresAt ? new Date(expiresAt) : null, submittedAt ? new Date(submittedAt) : null]
      );
      return task;
    }
    if (this.isMongoActive) {
      const newTask = new Task(task);
      return await newTask.save();
    }
    const data = this.readJson();
    if (!data.tasks) data.tasks = [];
    data.tasks.push(task);
    this.writeJson(data);
    return task;
  }

  async updateTask(id, updates) {
    if (this.isTidbActive) {
      const keys = Object.keys(updates);
      if (keys.length === 0) return this.getTaskById(id);
      const sets = keys.map(k => `${k} = ?`).join(', ');
      const values = Object.values(updates);
      await this.tidbPool.query(`UPDATE tasks SET ${sets} WHERE id = ?`, [...values, id]);
      return this.getTaskById(id);
    }
    if (this.isMongoActive) {
      return await Task.findOneAndUpdate({ id }, { $set: updates }, { new: true }).lean();
    }
    const data = this.readJson();
    if (!data.tasks) data.tasks = [];
    const index = data.tasks.findIndex(t => t.id === id);
    if (index !== -1) {
      data.tasks[index] = { ...data.tasks[index], ...updates };
      this.writeJson(data);
      return data.tasks[index];
    }
    return null;
  }

  // --- Invite Codes CRUD Operations ---
  async getInviteCodes() {
    if (this.isTidbActive) {
      const [rows] = await this.tidbPool.query('SELECT * FROM invite_codes');
      return rows;
    }
    if (this.isMongoActive) {
      return await InviteCode.find().lean();
    }
    return this.readJson().invite_codes || [];
  }

  async getInviteCodeByCode(code) {
    if (this.isTidbActive) {
      const [rows] = await this.tidbPool.query('SELECT * FROM invite_codes WHERE code = ?', [code]);
      return rows[0] || null;
    }
    if (this.isMongoActive) {
      return await InviteCode.findOne({ code }).lean();
    }
    return (this.readJson().invite_codes || []).find(ic => ic.code === code) || null;
  }

  async createInviteCode(inviteCode) {
    if (this.isTidbActive) {
      const { code, note, status, createdBy, usedBy, createdAt, usedAt } = inviteCode;
      await this.tidbPool.query(
        'INSERT INTO invite_codes (code, note, status, createdBy, usedBy, createdAt, usedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [code, note || '', status || 'unused', createdBy || 'admin', usedBy || null, createdAt ? new Date(createdAt) : new Date(), usedAt ? new Date(usedAt) : null]
      );
      return inviteCode;
    }
    if (this.isMongoActive) {
      const newCode = new InviteCode(inviteCode);
      return await newCode.save();
    }
    const data = this.readJson();
    if (!data.invite_codes) data.invite_codes = [];
    data.invite_codes.push(inviteCode);
    this.writeJson(data);
    return inviteCode;
  }

  async updateInviteCode(code, updates) {
    if (this.isTidbActive) {
      const keys = Object.keys(updates);
      if (keys.length === 0) return this.getInviteCodeByCode(code);
      const sets = keys.map(k => `${k} = ?`).join(', ');
      const values = Object.values(updates);
      await this.tidbPool.query(`UPDATE invite_codes SET ${sets} WHERE code = ?`, [...values, code]);
      return this.getInviteCodeByCode(code);
    }
    if (this.isMongoActive) {
      return await InviteCode.findOneAndUpdate({ code }, { $set: updates }, { new: true }).lean();
    }
    const data = this.readJson();
    if (!data.invite_codes) data.invite_codes = [];
    const index = data.invite_codes.findIndex(ic => ic.code === code);
    if (index !== -1) {
      data.invite_codes[index] = { ...data.invite_codes[index], ...updates };
      this.writeJson(data);
      return data.invite_codes[index];
    }
    return null;
  }

  async deleteInviteCode(code) {
    if (this.isTidbActive) {
      await this.tidbPool.query('DELETE FROM invite_codes WHERE code = ?', [code]);
      return true;
    }
    if (this.isMongoActive) {
      await InviteCode.findOneAndDelete({ code });
      return true;
    }
    const data = this.readJson();
    if (!data.invite_codes) data.invite_codes = [];
    const index = data.invite_codes.findIndex(ic => ic.code === code);
    if (index !== -1) {
      data.invite_codes.splice(index, 1);
      this.writeJson(data);
      return true;
    }
    return false;
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
