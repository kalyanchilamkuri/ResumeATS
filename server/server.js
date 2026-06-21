/**
 * server.js
 * Entry point for the ResumeATS-X backend.
 *
 * - Loads environment configuration
 * - Initializes Express with CORS and JSON parsing
 * - Connects to MongoDB
 * - Mounts API routes
 * - Global error handler for unhandled exceptions
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

// Import route modules
const scoreRoutes = require('./routes/score');
const jobDescriptionRoutes = require('./routes/jobDescription');

const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────

// CORS: allow all origins (needed for browser extension cross-origin requests)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-Device-ID', 'Authorization']
}));

// JSON body parser with 5MB limit (LaTeX documents can be large)
app.use(express.json({ limit: '5mb' }));

// Request logging (lightweight — no external dependency needed)
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} → ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

// ── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/score', scoreRoutes);
app.use('/api/job-description', jobDescriptionRoutes);

// ── 404 handler for unknown routes ───────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} does not exist`
  });
});

// ── Global error handler ─────────────────────────────────────────────────────
// Must have 4 parameters for Express to recognize it as an error handler
app.use((err, req, res, _next) => {
  console.error('❌ Unhandled error:', err.message);
  console.error(err.stack);

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      error: 'Validation Error',
      messages
    });
  }

  // Mongoose cast errors (invalid ObjectId, etc.)
  if (err.name === 'CastError') {
    return res.status(400).json({
      error: 'Invalid ID format',
      message: `Invalid value for ${err.path}: ${err.value}`
    });
  }

  // JSON parse errors
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: 'Invalid JSON',
      message: 'Request body contains invalid JSON'
    });
  }

  // Payload too large
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      error: 'Payload Too Large',
      message: 'Request body exceeds the 5MB limit'
    });
  }

  // Default: Internal Server Error
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : err.message
  });
});

// ── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Connect to MongoDB first
    await connectDB();

    app.listen(PORT, () => {
      console.log('');
      console.log('╔═══════════════════════════════════════════════════╗');
      console.log('║         ResumeATS-X Backend Server                ║');
      console.log('╠═══════════════════════════════════════════════════╣');
      console.log(`║  🚀 Server running on port ${PORT}                  ║`);
      console.log(`║  📡 API base URL: http://localhost:${PORT}/api      ║`);
      console.log('║  📋 Routes:                                       ║');
      console.log('║     POST /api/score                               ║');
      console.log('║     GET  /api/job-description/:projectId          ║');
      console.log('║     POST /api/job-description                     ║');
      console.log('║     DELETE /api/job-description/:projectId        ║');
      console.log('║     GET  /api/health                              ║');
      console.log('╚═══════════════════════════════════════════════════╝');
      console.log('');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();

module.exports = app; // Export for testing
