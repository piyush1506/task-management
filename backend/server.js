const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const { connectDB } = require('./config/db');

const path = require('path');

// Load environment variables from backend/.env
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config(); // fallback to current working directory .env if any

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to Database
connectDB();

// Core Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow local development and local Wi-Fi / LAN network access
    callback(null, true);
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Mount Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/employees', require('./routes/employeeRoutes'));
app.use('/api/projects', require('./routes/projectRoutes'));
app.use('/api/tasks', require('./routes/taskRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  const dbStateMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  res.status(200).json({
    success: true,
    message: 'WorkSphere API is operational',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    database: dbStateMap[mongoose.connection.readyState] || 'unknown',
  });
});

// Root API Welcome route
app.get('/api', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to WorkSphere REST API',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      employees: '/api/employees',
      projects: '/api/projects',
      tasks: '/api/tasks',
      dashboard: '/api/dashboard',
      reports: '/api/reports',
      notifications: '/api/notifications',
    },
  });
});

// 404 Handler for undefined API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// Start Server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] WorkSphere backend listening on port ${PORT}`);
    console.log(`[Server] Local:   http://localhost:${PORT}/api/health`);
    console.log(`[Server] Network: http://192.168.29.50:${PORT}/api/health`);
  });
}

module.exports = app;

