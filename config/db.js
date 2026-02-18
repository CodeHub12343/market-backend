const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      // Enable automatic index creation
      autoIndex: process.env.NODE_ENV === 'development',
      // Connection pool size
      maxPoolSize: 10,
      // Keep alive
      keepAlive: true,
      keepAliveInitialDelay: 300000,
      // Timeouts
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    // Create indexes for commonly queried fields
    await createIndexes();

    logger.info(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (err) {
    logger.error('MongoDB connection error:', err);
    process.exit(1);
  }
};

const createIndexes = async () => {
  try {
    // User indexes
    const User = mongoose.model('User');
    await User.collection.createIndexes([
      { key: { email: 1 }, unique: true },
      { key: { username: 1 }, unique: true },
      { key: { campus: 1 } },
      { key: { role: 1 } }
    ]);

    // Product indexes
    const Product = mongoose.model('Product');
    await Product.collection.createIndexes([
      { key: { name: 'text', description: 'text' } },
      { key: { category: 1 } },
      { key: { price: 1 } },
      { key: { shop: 1 } },
      { key: { createdAt: -1 } }
    ]);

    // Service indexes
    const Service = mongoose.model('Service');
    await Service.collection.createIndexes([
      { key: { name: 'text', description: 'text' } },
      { key: { category: 1 } },
      { key: { provider: 1 } },
      { key: { campus: 1 } }
    ]);

    // Message indexes
    const Message = mongoose.model('Message');
    await Message.collection.createIndexes([
      { key: { chat: 1 } },
      { key: { sender: 1 } },
      { key: { createdAt: 1 } },
      { key: { readBy: 1 } }
    ]);

    // Chat indexes
    const Chat = mongoose.model('Chat');
    await Chat.collection.createIndexes([
      { key: { participants: 1 } },
      { key: { lastMessageAt: -1 } }
    ]);

    // Post indexes
    const Post = mongoose.model('Post');
    await Post.collection.createIndexes([
      { key: { content: 'text' } },
      { key: { author: 1 } },
      { key: { campus: 1 } },
      { key: { createdAt: -1 } }
    ]);

    // Event indexes
    const Event = mongoose.model('Event');
    await Event.collection.createIndexes([
      { key: { title: 'text', description: 'text' } },
      { key: { campus: 1 } },
      { key: { startDate: 1 } },
      { key: { endDate: 1 } }
    ]);

    // Order indexes
    const Order = mongoose.model('Order');
    await Order.collection.createIndexes([
      { key: { buyer: 1 } },
      { key: { seller: 1 } },
      { key: { status: 1 } },
      { key: { createdAt: -1 } }
    ]);

    // Review indexes
    const Review = mongoose.model('Review');
    await Review.collection.createIndexes([
      { key: { product: 1 } },
      { key: { service: 1 } },
      { key: { author: 1 } },
      { key: { rating: -1 } }
    ]);

    // Notification indexes
    const Notification = mongoose.model('Notification');
    await Notification.collection.createIndexes([
      { key: { recipient: 1 } },
      { key: { read: 1 } },
      { key: { createdAt: -1 } }
    ]);

    logger.info('Database indexes created successfully');
  } catch (err) {
    logger.error('Error creating indexes:', err);
    throw err;
  }
};

module.exports = connectDB;
