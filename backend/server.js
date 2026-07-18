require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const morgan = require('morgan');
const fs = require('fs');

const db = require('./config/db');
const { apiLimiter } = require('./middleware/rateLimiter');

// Copy generated banner on startup
try {
  const sourceImg = '/Users/aman/.gemini/antigravity/brain/0bfdc767-933c-40cc-9caa-09e8c9169317/shopping_offer_banner_1784303243792.jpg';
  const destImg = path.join(__dirname, '..', 'frontend', 'public', 'images', 'banner.jpg');
  const destImgPublic = path.join(__dirname, 'public', 'images', 'banner.jpg');

  if (fs.existsSync(sourceImg)) {
    fs.mkdirSync(path.dirname(destImg), { recursive: true });
    fs.copyFileSync(sourceImg, destImg);
    console.log('Successfully copied banner to frontend public source');
    
    fs.mkdirSync(path.dirname(destImgPublic), { recursive: true });
    fs.copyFileSync(sourceImg, destImgPublic);
    console.log('Successfully copied banner to public build folder');
  }
} catch (e) {
  console.log('Failed to copy banner on startup:', e.message);
}

const app = express();
const PORT = process.env.PORT || 5005;

// Basic Middlewares
app.use(helmet({
  // Disable CSP for easy development and asset loading, keep other security headers
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

app.use(cors({
  origin: process.env.CORS_WHITELIST ? process.env.CORS_WHITELIST.split(',') : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(morgan('dev'));

// Apply rate limiting to all API routes
app.use('/api', apiLimiter);

// Serve static files from frontend build
app.use(express.static(path.join(__dirname, 'public')));

// Modular Routers
app.use('/api/auth', require('./routes/auth'));
app.use('/api/grab', require('./routes/grab'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api', require('./routes/transactions'));

// Periodically check and settle user grabs (runs every 5 seconds)
// Grabs settle after 30 seconds for quick testing/evaluation.
setInterval(async () => {
  try {
    if (db.isMongoActive) {
      const UserGrabModel = require('./models/UserGrab');
      // Settle grabs that are pending and settleAt has passed
      const pendingGrabs = await UserGrabModel.find({
        status: 'pending',
        settleAt: { $lte: new Date() }
      });

      for (const grab of pendingGrabs) {
        grab.status = 'settled';
        await grab.save();

        const user = await db.getUserById(grab.userId);
        if (user) {
          const frozenAmount = Math.max(0, parseFloat((user.frozenAmount - grab.amount).toFixed(2)));
          const balance = parseFloat((user.balance + grab.amount + grab.commission).toFixed(2));
          const todayEarnings = parseFloat((user.todayEarnings + grab.commission).toFixed(2));
          const getEarnings = parseFloat((user.getEarnings + grab.commission).toFixed(2));

          await db.updateUser(user.id, { frozenAmount, balance, todayEarnings, getEarnings });

          // Direct referrer commission (10% of grab commission)
          if (user.referrerPhone) {
            const referrer = await db.getUserByPhone(user.referrerPhone);
            if (referrer) {
              const teamCommission = parseFloat((grab.commission * 0.1).toFixed(2));
              await db.updateUser(referrer.id, {
                balance: parseFloat((referrer.balance + teamCommission).toFixed(2)),
                teamIncome: parseFloat((referrer.teamIncome + teamCommission).toFixed(2)),
                todayEarnings: parseFloat((referrer.todayEarnings + teamCommission).toFixed(2))
              });
            }
          }
        }
      }
    } else {
      // Local JSON File Database Fallback
      const data = db.readJson();
      let updated = false;
      const now = new Date();

      data.user_grabs.forEach(grab => {
        if (grab.status === 'pending' && new Date(grab.settleAt) <= now) {
          grab.status = 'settled';
          
          const userIndex = data.users.findIndex(u => u.id === grab.userId);
          if (userIndex !== -1) {
            const user = data.users[userIndex];
            user.frozenAmount = Math.max(0, user.frozenAmount - grab.amount);
            user.balance += (grab.amount + grab.commission);
            user.todayEarnings += grab.commission;
            user.getEarnings += grab.commission;
            
            // Add team commission (10%)
            if (user.referrerPhone) {
              const referrerIndex = data.users.findIndex(u => u.phone === user.referrerPhone);
              if (referrerIndex !== -1) {
                const referrer = data.users[referrerIndex];
                const teamCommission = parseFloat((grab.commission * 0.1).toFixed(2));
                referrer.balance += teamCommission;
                referrer.teamIncome += teamCommission;
                referrer.todayEarnings += teamCommission;
              }
            }
          }
          updated = true;
        }
      });

      if (updated) {
        db.writeJson(data);
      }
    }
  } catch (error) {
    console.error('Error in grab auto-settlement scheduler:', error);
  }
}, 5000);

// Catch-all route to serve the React index.html for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`\n=========================================`);
  console.log(`Server is running on port ${PORT}`);
  console.log(`Server mode: ${process.env.NODE_ENV || 'development'}`);
  console.log(`=========================================\n`);
});
