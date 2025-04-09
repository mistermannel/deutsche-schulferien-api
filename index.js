const express = require("express");
const bodyParser = require("body-parser");
const logger = require("morgan");
const cors = require("cors");
const path = require("path");
const compression = require("compression");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const app = express();

const PORT = process.env.PORT || 8080;
const NODE_ENV = process.env.NODE_ENV || "production";

// Security headers
app.use(helmet({
  contentSecurityPolicy: false,  // Disable CSP for API
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

// Compression
app.use(compression());

app.set("port", PORT);
app.set("env", NODE_ENV);

// CORS configuration
app.use(cors({
  origin: '*',
  methods: ['GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'Content-Range'],
  maxAge: 1728000
}));

// Handle OPTIONS requests
app.options('*', cors());

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
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(
    `Express Server started on Port ${app.get("port")} | Environment: ${app.get("env")}`
  );
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use`);
  } else {
    console.error('Error starting server:', err);
  }
  process.exit(1);
});

// Handle process termination
process.on('SIGTERM', () => {
  server.close(() => {
    console.log('Server terminated');
    process.exit(0);
  });
});
