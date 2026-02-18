
const path = require('path');
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const { defaultLimiter } = require('./middlewares/rateLimiter');
const cacheService = require('./utils/cacheService');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');

const safeRequire = (p) => {
  try {
    return require(p);
  } catch (e) {
    console.error(`Failed to load module ${p}:`, e && e.message ? e.message : e);
    throw e;
  }
};

// ROUTERS
const cloudinaryRoutes = require('./routes/cloudinaryRoutes');
const serviceReviewRoutes = require('./routes/serviceReviewRoutes');
const serviceOrderRoutes = require('./routes/serviceOrderRoutes');
const authRouter = safeRequire('./routes/authRoutes'); 
const userRouter = safeRequire('./routes/userRoutes');
const searchRouter = safeRequire('./routes/searchRoutes');
const productRouter = safeRequire('./routes/productRoutes');
const shopRouter = safeRequire('./routes/shopRoutes');
const categoryRouter = safeRequire('./routes/categoryRoutes');
const productCategoryRoutes = require('./routes/productCategoryRoutes');
const serviceCategoryRoutes = require('./routes/serviceCategoryRoutes');
const eventCategoryRoutes = require('./routes/eventCategoryRoutes');
const hostelCategoryRoutes = require('./routes/hostelCategoryRoutes');
const roommateCategoryRoutes = require('./routes/roommateCategoryRoutes');
const requestCategoryRoutes = require('./routes/requestCategoryRoutes');
const requestRouter = safeRequire('./routes/requestRoutes');
const offerRouter = safeRequire('./routes/offerRoutes');
const serviceRouter = safeRequire('./routes/serviceRoutes');
const reviewRouter = safeRequire('./routes/reviewRoutes');
const favoriteRouter = safeRequire('./routes/favoriteRoutes');
const chatRouter = safeRequire('./routes/chatRoutes');
const messageRouter = safeRequire('./routes/messageRoutes');
const notificationRouter = safeRequire('./routes/notificationRoutes');
const campusRouter = safeRequire('./routes/campusRoutes');
const postRouter = safeRequire('./routes/postRoutes');
const eventRouter = safeRequire('./routes/eventRoutes');
const newsRouter = safeRequire('./routes/newsRoutes');
const documentRouter = safeRequire('./routes/documentRoutes');
const facultyRouter = safeRequire('./routes/facultyRoutes');
const departmentRouter = safeRequire('./routes/departmentRoutes');
const reportRouter = safeRequire('./routes/reportRoutes');
const activityRouter = safeRequire('./routes/activityRoutes');
const uploadRouter = safeRequire('./routes/uploadRoutes');
const orderRouter = safeRequire('./routes/orderRoutes');
const hostelRouter = safeRequire('./routes/hostelRoutes');
const roommateListingRouter = safeRequire('./routes/roommateListingRoutes');
const adminRouter = safeRequire('./routes/adminRoutes');
const advancedSearchRoutes = require('./routes/advancedSearchRoutes');
const recommendationRoutes = require('./routes/recommendationRoutes');
const { detectDevice, generateSessionId } = require('./middlewares/behaviorTrackingMiddleware');

// ...existing code...

const app = express();

// 1) GLOBAL MIDDLEWARES
// CORS Configuration (must be first in middleware chain)
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://10.0.80.42:3000',
  'http://192.168.248.148:3000'
];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowedOrigins or if it's a local network IP
    const isAllowed = allowedOrigins.includes(origin) || 
                      /^http:\/\/192\.168\./.test(origin) ||
                      /^http:\/\/10\./.test(origin) ||
                      /^http:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\./.test(origin);
    
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'Expires', 'Cache-Control', 'Pragma'],
  exposedHeaders: ['Content-Range', 'X-Content-Range', 'Expires', 'Cache-Control', 'ETag'],
  maxAge: 86400 // 24 hours in seconds
}));

// Additional headers for OAuth and cross-origin communication
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  next();
});
// Serving static files
app.use(express.static(path.join(__dirname, 'public')));

// Set security HTTP headers
// Configure Helmet to allow Google OAuth cross-origin communication
app.use(helmet({
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// Enable gzip compression
app.use(compression());

// Apply rate limiting
// Avoid applying the global limiter to high-frequency, user-specific realtime endpoints.
// In development we skip the global limiter to avoid accidental 429s while testing.
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    const p = req.path || '';
    // Skip global limiter for chat and messages endpoints (real-time / websocket-adjacent)
    if (p.startsWith('/api/v1/chats') || p.startsWith('/api/v1/messages')) return next();
    return defaultLimiter(req, res, next);
  });
} else {
  console.log('⚠️ Skipping global rate limiter in non-production environment');
}

// Enable response caching
app.use(cacheService.middleware(3600));

// Request logging
const logger = require('./utils/logger');
app.use(logger.middleware);

// Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Body parser, reading data from body into req.body
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// Behavior tracking middleware
app.use(detectDevice);
app.use(generateSessionId);

// Prevent parameter pollution
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price'
    ]
  })
);

// Test middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

// Middleware: Disable cache for product routes to ensure fresh data
app.use((req, res, next) => {
  // Disable caching for all product-related GET requests
  if (req.method === 'GET' && req.path.includes('/api/v1/products')) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  // CRITICAL FIX: Disable caching for message endpoints (messages are dynamic and must always be fresh)
  if (req.method === 'GET' && req.path.includes('/api/v1/messages')) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  // CRITICAL FIX: Disable caching for chat endpoints (user-specific and must always be fresh)
  if (req.method === 'GET' && req.path.includes('/api/v1/chats')) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  // CRITICAL FIX: Disable caching for auth endpoints (user-specific)
  if (req.method === 'GET' && req.path.includes('/api/v1/auth')) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
});

// 2) ROUTES

// Admin Dashboard
app.use('/api/v1/admin', adminRouter); // admin management endpoints (50+)

// Core User & Auth
app.use('/api/v1/auth', authRouter);        // signup, login, password reset 
app.use('/api/v1/users', userRouter);       // user profile, campus, roles
app.use('/api/v1/profile', require('./routes/profileRoutes')); // profile management
app.use('/api/v1/search', searchRouter);    // global search & filtering

// Marketplace
app.use('/api/v1/products', productRouter); // buying & selling products
app.use('/api/v1/shops', shopRouter);       // seller / service provider shops
app.use('/api/v1/categories', categoryRouter); // legacy categories (deprecated)
app.use('/api/v1/product-categories', productCategoryRoutes); // product categories
app.use('/api/v1/service-categories', serviceCategoryRoutes); // service categories
app.use('/api/v1/event-categories', eventCategoryRoutes); // event categories
app.use('/api/v1/hostel-categories', hostelCategoryRoutes); // hostel categories
app.use('/api/v1/roommate-categories', roommateCategoryRoutes); // roommate categories
app.use('/api/v1/request-categories', requestCategoryRoutes); // request categories
app.use('/api/v1/requests', requestRouter); // buyer requests for items
app.use('/api/v1/offers', offerRouter);     // sellersâ€™ offers to buyer requests
app.use('/api/v1/shop-offers', safeRequire('./routes/shopOfferRoutes')); // shop discount offers
app.use('/api/v1/cloudinary', cloudinaryRoutes);
app.use('/api/v1/reviews', require('./routes/reviewRoutes'));
// Services
app.use('/api/v1/services', serviceRouter); // service listings (e.g., haircuts, tutoring, etc.)
app.use('/api/v1/service-reviews', serviceReviewRoutes);

// Engagement
app.use('/api/v1/reviews', reviewRouter);   // reviews on shops, products, or services
app.use('/api/v1/favorites', favoriteRouter); // user saved products/services
app.use('/api/v1/search/advanced', advancedSearchRoutes); // advanced search with autocomplete & saved searches
app.use('/api/v1/recommendations', recommendationRoutes); // AI-powered recommendations

// Communication
app.use('/api/v1/chats', chatRouter);       // chat sessions between users
app.use('/api/v1/messages', messageRouter); // messages within chat threads
app.use('/api/v1/notifications', notificationRouter); // system/user notifications
app.use('/api/v1/service-orders', serviceOrderRoutes);

// Community & Campus Life
app.use('/api/v1/campus', campusRouter);    // campus info and segmentation
app.use('/api/v1/faculties', facultyRouter);    // faculty management and info
app.use('/api/v1/departments', departmentRouter); // department management and info
app.use('/api/v1/posts', postRouter);       // student community posts/feed
app.use('/api/v1/events', eventRouter);     // campus bulletin events, club activities, etc.
app.use('/api/v1/news', newsRouter);        // announcements, updates, campus bulletins

// Document Sharing
app.use('/api/v1/documents', documentRouter); // PDFs, past questions, e-books

// Accommodation & Housing
app.use('/api/v1/hostels', hostelRouter); // hostel listings and management
app.use('/api/v1/roommate-listings', roommateListingRouter); // roommate needed postings
app.use('/api/v1/roommate-applications', require('./routes/roommateApplicationRoutes')); // roommate applications
app.use('/api/v1/roommate-reviews', require('./routes/roommateReviewRoutes')); // roommate reviews
app.use('/api/v1/roommate-favorites', require('./routes/roomateFavoriteRoutes')); // roommate favorites

// Reports & Moderation
app.use('/api/v1/reports', reportRouter);   // report users, products, or posts

// Analytics / Activity
app.use('/api/v1/activity', activityRouter); // track user actions and engagement
app.use('/api/v1/orders', orderRouter);

// System / Utility
app.use('/api/v1/uploads', uploadRouter);   // image / file uploads

// 3) HANDLE UNDEFINED ROUTES
app.use((req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// 4) GLOBAL ERROR HANDLER
app.use(globalErrorHandler);

module.exports = app;