const express = require("express");
const bodyParser = require("body-parser");
const logger = require("morgan");
const cors = require("cors");
const path = require("path");
const compression = require("compression");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const app = express();

const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || "development";

// Security headers
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Compression
app.use(compression());

app.set("port", PORT);
app.set("env", NODE_ENV);

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET'],
  allowedHeaders: ['Content-Type']
}));

// Logging
app.use(logger("tiny"));

// Body parsing
app.use(bodyParser.json());

// Routes
app.use("/", require(path.join(__dirname, "routes/vacations")));

// 404 handler
app.use((req, res, next) => {
  const err = new Error(`Route ${req.method} ${req.url} Not Found`);
  err.status = 404;
  next(err);
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  
  // Set default status if not set
  const status = err.status || 500;
  
  // Don't expose internal errors in production
  const message = NODE_ENV === 'production' && status === 500
    ? 'Internal Server Error'
    : err.message;

  res.status(status).json({
    error: {
      message,
      status
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(
    `Express Server started on Port ${app.get("port")} | Environment: ${app.get("env")}`
  );
});
