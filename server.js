const fs = require('fs');
const path = require('path');

// Early handler for truly uncaught exceptions (use console here to guarantee working before logger is loaded)
process.on('uncaughtException', err => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});

// Load environment variables as early as possible
const dotenv = require('dotenv');
dotenv.config({
  path: path.join(__dirname, 'config.env'),
  override: true,
  debug: process.env.NODE_ENV === 'development'
});

// Ensure logs directory exists before initializing logger
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Logger (uses the logs directory)
const logger = require('./utils/logger');

const mongoose = require('mongoose');
const uploadMiddleware = require('./middlewares/uploadMiddleware');

// Now that logger is available, log uncaught exceptions with structured logger too
process.on('uncaughtException', err => {
  logger.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  logger.error(err.name, err.message);
  logger.error(err.stack);
  process.exit(1);
});

// Application bootstrap
const app = require('./app');

// Connect to MongoDB
const DB = process.env.DATABASE && process.env.DATABASE.replace
  ? process.env.DATABASE.replace('<PASSWORD>', process.env.DATABASE_PASSWORD)
  : process.env.DATABASE;

mongoose
  .connect(DB)
  .then(() => logger.info('DB connection successful!'))
  .catch(err => {
    logger.error('DB connection error:', err);
    process.exit(1);
  });

const port = process.env.PORT || 3000;
const server = app.listen(port, '0.0.0.0', () => {
  logger.info(`App running on port ${port} (listening on all network interfaces)...`);

  // Initialize orphaned files cleanup scheduler (if available)
  if (uploadMiddleware && typeof uploadMiddleware.scheduleOrphanedFilesCleanup === 'function') {
    try {
      uploadMiddleware.scheduleOrphanedFilesCleanup();
    } catch (err) {
      logger.warn('Failed to initialize orphaned files cleanup scheduler', err.message);
    }
  }
});

// Initialize Socket.IO
const socketManager = require('./socketManager');
const io = socketManager.initSocket(server);

// Attach io instance to app for use in routes/controllers
app.set('io', socketManager.getIO());

// Handle unhandled promise rejections
process.on('unhandledRejection', err => {
  logger.error('UNHANDLED REJECTION! 💥 Shutting down...');
  logger.error(err && err.stack ? err.stack : err);
  server.close(() => {
    process.exit(1);
  });
});
