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
app.set('trust proxy', 1);
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

// Grab auto-settlement scheduler disabled. All task orders must be approved manually by Admin.

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
