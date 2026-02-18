const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const RealTimeManager = require('./utils/realTimeManager');
const {
  handleChatEvents,
  handlePostEvents,
  handleOrderEvents,
  handleReportEvents
} = require('./sockets/handlers');

let io;
let realTimeManager;

// Authenticate socket connection
const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.token;
    
    if (!token) {
      return next(new Error('Authentication required'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
};

exports.initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || '*',
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 60000
  });

  // Initialize real-time manager
  realTimeManager = new RealTimeManager(io);

  // Use authentication middleware
  io.use(authenticateSocket);

  // Global error handler
  io.on('error', (err) => {
    console.error('❌ [SOCKET.IO] Global error:', err?.message || err);
  });

  io.on('connection', async (socket) => {
    try {
      console.log('🟢 Socket connected:', socket.id, 'User:', socket.userId);
      console.log('🔍 Socket object type:', typeof socket, 'Has on method:', typeof socket.on === 'function');

      // Add error handler to socket
      socket.on('error', (err) => {
        console.error('❌ [SOCKET ERROR]', socket.id, ':', err?.message || err);
      });

      // Handle connection in real-time manager
      try {
        await realTimeManager.handleConnection(socket);
      } catch (err) {
        console.error('❌ [SOCKET] Error in handleConnection:', err?.message || err, err?.stack);
        throw err;
      }

      // CATCH-ALL EVENT LISTENER - for debugging
      socket.onAny((event, ...args) => {
        console.log('📡 CAUGHT EVENT:', {
          eventName: event,
          socketId: socket.id,
          dataLength: args.length,
          firstArgType: args[0] ? typeof args[0] : 'undefined'
        });
      });

      // Initialize chat events with error handling
      try {
        console.log('🔧 About to call handleChatEvents');
        handleChatEvents(socket, io, realTimeManager);
        console.log('🔧 handleChatEvents call completed');
      } catch (err) {
        console.error('❌ [SOCKET] Error in handleChatEvents:', err?.message || err, err?.stack);
        throw err;
      }

      // Initialize post interaction events with error handling
      try {
        handlePostEvents(socket, io, realTimeManager);
      } catch (err) {
        console.error('❌ [SOCKET] Error in handlePostEvents:', err?.message || err, err?.stack);
        throw err;
      }

      // Initialize order status events with error handling
      try {
        handleOrderEvents(socket, io, realTimeManager);
      } catch (err) {
        console.error('❌ [SOCKET] Error in handleOrderEvents:', err?.message || err, err?.stack);
        throw err;
      }

      // Initialize report resolution events with error handling
      try {
        handleReportEvents(socket, io, realTimeManager);
      } catch (err) {
        console.error('❌ [SOCKET] Error in handleReportEvents:', err?.message || err, err?.stack);
        throw err;
      }

      // Handle presence events
      socket.on('setStatus', async (status) => {
        try {
          await realTimeManager.updateUserStatus(socket.userId, status);
        } catch (err) {
          console.error('❌ [SOCKET] Error in setStatus:', err?.message || err);
        }
      });

      // Handle typing indicators
      socket.on('typing', (data) => {
        try {
          realTimeManager.handleTyping(socket, data);
        } catch (err) {
          console.error('❌ [SOCKET] Error in typing handler:', err?.message || err);
        }
      });

      // Handle disconnection
      socket.on('disconnect', async () => {
        try {
          await realTimeManager.handleDisconnection(socket);
        } catch (err) {
          console.error('❌ [SOCKET] Error in handleDisconnection:', err?.message || err);
        }
      });
    } catch (err) {
      console.error('❌ [SOCKET] Error in connection handler:', err?.message || err);
      console.error('❌ [SOCKET] Full error stack:', err?.stack);
      socket.disconnect(true);
    }
  });
};

// Send event to a specific user (handles offline storage)
exports.sendToUser = async (userId, event, payload) => {
  if (!io || !realTimeManager) return;

  if (realTimeManager.isUserOnline(userId)) {
    io.to(`user_${userId}`).emit(event, payload);
  } else {
    // Store for offline delivery
    await realTimeManager.storeOfflineMessage(userId, event, payload);
  }
};

// Broadcast notification to specific users with offline handling
exports.broadcastNotification = async (data) => {
  if (!io || !realTimeManager) return;

  try {
    const { userIds = [], title, message, type, extraData } = data || {};
    const notification = { title, message, type, data: extraData };

    for (const userId of userIds) {
      await realTimeManager.sendNotification(userId, notification);
    }
  } catch (err) {
    console.error('broadcastNotification error:', err);
  }
};

// Schedule cleanup of inactive sessions (run daily)
setInterval(async () => {
  if (realTimeManager) {
    await realTimeManager.cleanupInactiveSessions();
  }
}, 24 * 60 * 60 * 1000);

// Expose io and realTimeManager for global use
exports.getIO = () => io;
exports.getRealTimeManager = () => realTimeManager;

