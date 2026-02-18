const express = require("express");
const authMiddleware = require("../middlewares/authMiddleware");
const { validate } = require("../middlewares/validationMiddleware");
const eventValidation = require("../validators/eventValidation");
const eventMiddleware = require("../middlewares/eventMiddleware");
const { apiLimiter } = require("../middlewares/rateLimiter");
const eventController = require("../controllers/eventController");

const router = express.Router();

// Parse and sanitize JSON fields from form-data
function parseEventJsonFields(req, res, next) {
  if (!req.body) {
    return next();
  }
  
  // First, trim all string values and handle type conversions
  Object.keys(req.body).forEach(key => {
    const value = req.body[key];
    
    if (typeof value === 'string') {
      // Trim whitespace
      let trimmed = value.trim();
      
      // Convert string booleans
      if (trimmed === 'true') {
        req.body[key] = true;
      } else if (trimmed === 'false') {
        req.body[key] = false;
      } 
      // Convert string numbers (but not IDs which are strings)
      else if (key === 'capacity' || key === 'reminderDays') {
        const num = parseInt(trimmed);
        if (!isNaN(num)) {
          req.body[key] = num;
        }
      }
      // Keep trimmed string for everything else
      else {
        req.body[key] = trimmed;
      }
    }
  });
  
  // Then parse JSON fields
  const jsonFields = ['tags', 'contactInfo', 'settings', 'coordinates', 'recurrence'];
  jsonFields.forEach(field => {
    if (req.body[field] && typeof req.body[field] === 'string') {
      try {
        req.body[field] = JSON.parse(req.body[field]);
      } catch (e) {
        // Ignore parse error, validation will catch it
      }
    }
  });
  
  next();
}

// ✅ Public (no auth required)
router.get("/popular", eventController.getPopularEvents);
router.get("/trending", eventController.getTrendingEvents);
router.get("/upcoming", eventController.getUpcomingEvents);
router.get("/nearby", eventController.getNearbyEvents);
router.get("/analytics", eventValidation.getEventAnalytics, validate, eventController.getEventAnalytics);
router.get("/tags/trending", eventController.getTrendingEventTags);

router.get("/:id", eventValidation.eventIdParam, validate, eventController.getEvent);

// ✅ Auth-protected (campus filtering applied)
router.use(authMiddleware.protect);

// Events list endpoint - REQUIRES authentication for campus filtering
router.get("/", eventValidation.searchEvents, validate, apiLimiter, eventController.getAllEvents);

router.get("/analytics/user", eventController.getUserEventStats);
router.get("/analytics/user/:userId", eventController.getUserEventStats);

router.post("/", eventMiddleware.uploadEventBanner, eventMiddleware.processEventBanner, parseEventJsonFields, eventValidation.createEvent, validate, eventController.createEvent);
router.patch("/:id", eventMiddleware.uploadEventBanner, eventMiddleware.processEventBanner, parseEventJsonFields, eventValidation.eventIdParam, eventValidation.updateEvent, validate, eventController.updateEvent);
router.delete("/:id", eventValidation.eventIdParam, validate, eventController.deleteEvent);

// ✅ Join/Leave
router.post("/:id/join", eventValidation.eventIdParam, validate, eventMiddleware.ensureCapacityBeforeJoin, eventMiddleware.ensureRegistrationOpen, eventController.joinEvent);
router.post("/:id/leave", eventValidation.eventIdParam, validate, eventController.leaveEvent);

// ✅ Favorites, ratings, comments
router.post("/:id/favorite", eventValidation.eventIdParam, validate, eventController.toggleFavorite);
router.post("/:id/rating", eventValidation.eventIdParam, eventValidation.addEventRating, validate, eventController.addRating);
router.post("/:id/comments", eventValidation.eventIdParam, eventValidation.addEventComment, validate, eventController.addComment);
router.get("/:id/comments", eventValidation.eventIdParam, validate, eventController.getComments);

// ✅ Status & archive
router.patch("/:id/status", eventValidation.eventIdParam, validate, eventMiddleware.checkEventManagement, eventController.updateStatus);
router.patch("/:id/archive", eventValidation.eventIdParam, validate, eventMiddleware.checkEventManagement, eventController.archiveEvent);
router.patch("/:id/unarchive", eventValidation.eventIdParam, validate, eventMiddleware.checkEventManagement, eventController.unarchiveEvent);

// ✅ Bulk operations
router.post("/bulk", eventValidation.bulkEventOperations, validate, eventMiddleware.validateBulkPermissions, eventController.bulkOperations);

// ✅ Event reminders and notifications
router.post("/:id/reminders", eventValidation.eventIdParam, validate, eventMiddleware.checkEventOwnership, eventController.scheduleEventReminders);
router.get("/:id/notifications", eventValidation.eventIdParam, validate, eventController.getEventNotifications);

// ✅ Cloudinary signed upload route
router.get("/upload/signature", eventController.getCloudinarySignature);

// ✅ Advanced Search Features
router.post("/search/save", eventValidation.saveSearch, validate, eventController.saveSearch);
router.get("/search/saved", eventController.getSavedSearches);
router.get("/search/saved/:searchId", eventValidation.executeSavedSearch, validate, eventMiddleware.validateSavedSearchPermissions, eventController.executeSavedSearch);

// ✅ Event Recurrence
router.post("/recurring", eventValidation.createRecurringEvent, validate, eventController.createRecurringEvent);
router.get("/recurring/:parentEventId", eventController.getRecurringEvents);

// ✅ Event Templates
router.post("/templates", eventValidation.createEventTemplate, validate, eventController.createEventTemplate);
router.get("/templates", eventController.getEventTemplates);
router.post("/templates/:templateId/create", eventValidation.createEventFromTemplate, validate, eventMiddleware.validateTemplatePermissions, eventController.createEventFromTemplate);

// ✅ Event Export
router.get("/export", eventValidation.exportEvents, validate, eventMiddleware.validateExportPermissions, eventController.exportEvents);

// ✅ Event Moderation
router.post("/:id/report", eventValidation.eventIdParam, eventValidation.reportEvent, validate, eventController.reportEvent);
router.get("/reports", authMiddleware.restrictTo('admin', 'moderator'), eventController.getEventReports);
router.patch("/:id/moderate", eventValidation.eventIdParam, eventValidation.moderateEvent, validate, authMiddleware.restrictTo('admin', 'moderator'), eventController.moderateEvent);

// ✅ Calendar Integration
router.get("/calendar/:format", eventValidation.getEventCalendar, validate, eventMiddleware.validateCalendarAccess, eventController.getEventCalendar);
router.get("/calendar/:format/:eventId", eventValidation.getEventCalendar, validate, eventMiddleware.validateCalendarAccess, eventController.getEventCalendar);

// ✅ Social Media Sharing
router.get("/:id/share/:platform", eventValidation.eventIdParam, validate, eventMiddleware.validateSharingPermissions, eventController.shareEvent);

module.exports = router;
