const rateLimit = require('express-rate-limit');

// General API rate limiter (relaxed to support polling intervals)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000, // Limit each IP to 10000 requests per window to support frontend polling
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests from this IP, please try again after 15 minutes.'
  }
});

// Relaxed rate limiter for requesting OTPs to prevent blocking testers
const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 200, // Limit each IP to 200 OTP requests per 10 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many OTP requests. Please wait 10 minutes before requesting another OTP.'
  }
});

// Auth endpoints rate limiter (Login/Register attempts)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500, // 500 attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many login or registration attempts. Please try again after 15 minutes.'
  }
});

module.exports = {
  apiLimiter,
  otpLimiter,
  authLimiter
};
