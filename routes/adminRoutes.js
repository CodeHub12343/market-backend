const express = require('express');
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const router = express.Router();

// Protect all admin routes - must be authenticated and have admin role
router.use(authMiddleware.protect);
router.use(roleMiddleware.restrictTo('admin'));

// ============================================================================
// 1️⃣ USER MANAGEMENT ROUTES
// ============================================================================
router.get('/users', adminController.getAllUsers);
router.get('/users/:id', adminController.getUserDetails);
router.patch('/users/:id/ban', adminController.banUser);
router.patch('/users/:id/unban', adminController.unbanUser);
router.patch('/users/:id/password-reset', adminController.resetUserPassword);
router.get('/users/:id/audit-trail', adminController.getUserAuditTrail);

// ============================================================================
// 2️⃣ SHOP MANAGEMENT ROUTES
// ============================================================================
router.get('/shops', adminController.getAllShops);
router.get('/shops/:shopId', adminController.getShopDetails);
router.patch('/shops/:shopId/verify', adminController.verifyShop);
router.patch('/shops/:shopId/suspend', adminController.suspendShop);
router.get('/shops/:shopId/revenue', adminController.getShopRevenue);

// ============================================================================
// 3️⃣ PRODUCT MANAGEMENT ROUTES
// ============================================================================
router.get('/products', adminController.getAllProducts);
router.patch('/products/:productId/reject', adminController.rejectProduct);
router.delete('/products/:productId', adminController.deleteProduct);

// ============================================================================
// 4️⃣ ORDER MANAGEMENT ROUTES
// ============================================================================
router.get('/orders', adminController.getAllOrders);
router.get('/orders/:orderId', adminController.getOrderDetails);
router.patch('/orders/:orderId/status', adminController.updateOrderStatus);
router.patch('/orders/:orderId/refund', adminController.processRefund);

// ============================================================================
// 5️⃣ DOCUMENT MANAGEMENT ROUTES
// ============================================================================
router.get('/documents', adminController.getAllDocuments);
router.patch('/documents/:documentId/approve', adminController.approveDocument);
router.patch('/documents/:documentId/reject', adminController.rejectDocument);
router.delete('/documents/:documentId', adminController.deleteDocument);

// ============================================================================
// 6️⃣ CONTENT MODERATION ROUTES
// ============================================================================
router.get('/reports', adminController.getAllReports);
router.get('/reports/:reportId', adminController.getReportDetails);
router.patch('/reports/:reportId/resolve', adminController.resolveReport);
router.delete('/posts/:postId', adminController.deletePost);

// ============================================================================
// 7️⃣ CHAT & MESSAGE MONITORING ROUTES
// ============================================================================
router.get('/chats', adminController.getAllChats);
router.get('/chats/:chatId/messages', adminController.getChatMessages);
router.delete('/messages/:messageId', adminController.deleteMessage);

// ============================================================================
// 8️⃣ REQUEST & OFFER MANAGEMENT ROUTES
// ============================================================================
router.get('/requests', adminController.getAllRequests);
router.get('/offers', adminController.getAllOffers);

// ============================================================================
// 9️⃣ ANALYTICS & INSIGHTS ROUTES
// ============================================================================
router.get('/analytics/dashboard', adminController.getDashboardOverview);
router.get('/analytics/users', adminController.getUserAnalytics);
router.get('/analytics/revenue', adminController.getRevenueAnalytics);
router.get('/analytics/products', adminController.getProductAnalytics);
router.get('/analytics/documents', adminController.getDocumentAnalytics);
router.get('/analytics/events', adminController.getEventAnalytics);

// ============================================================================
// 🔟 SYSTEM SETTINGS & HEALTH ROUTES
// ============================================================================
router.get('/system/health', adminController.getSystemHealth);
router.get('/system/logs', adminController.getSystemLogs);
router.post('/system/cache/clear', adminController.clearCache);
router.get('/system/performance', adminController.getSystemPerformance);

module.exports = router;
