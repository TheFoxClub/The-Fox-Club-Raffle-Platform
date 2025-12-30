const rateLimit = require("express-rate-limit");
const logger = require("../util/logger");

const payoutRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // Limit each IP to 5 payout requests per windowMs
  message: {
    success: false,
    message: "Too many payout requests from this IP, please try again later.",
    data: null,
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for payout endpoint from IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      message: "Too many payout requests from this IP, please try again later.",
      data: null,
    });
  },
});

// Rate limiter for general API endpoints
const generalRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later.",
    data: null,
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for general endpoint from IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      message: "Too many requests from this IP, please try again later.",
      data: null,
    });
  },
});

// Rate limiter for authentication endpoints
const authRateLimiter = rateLimit({
  windowMs: 55 * 60 * 1000, // 5 minutes
  max: 20, // Limit each IP to 20 auth requests per windowMs
  message: {
    success: false,
    message:
      "Too many authentication attempts from this IP, please try again later.",
    data: null,
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for auth endpoint from IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      message:
        "Too many authentication attempts from this IP, please try again later.",
      data: null,
    });
  },
});

module.exports = {
  payoutRateLimiter,
  generalRateLimiter,
  authRateLimiter,
};
