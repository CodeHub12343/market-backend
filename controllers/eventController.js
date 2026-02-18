const Event = require('../models/eventModel');
const EventCategory = require('../models/eventCategoryModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const cloudinary = require('cloudinary').v2;
const Notification = require('../models/notificationModel');

// ✅ Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ✅ Generate Cloudinary signature for direct client upload
exports.getCloudinarySignature = catchAsync(async (req, res, next) => {
  const timestamp = Math.round(new Date().getTime() / 1000);
  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder: 'events' },
    process.env.CLOUDINARY_API_SECRET
  );

  res.status(200).json({
    status: 'success',
    data: {
      signature,
      timestamp,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      folder: 'events',
    },
  });
});

// ✅ Create Event
exports.createEvent = catchAsync(async (req, res, next) => {
  // Create event with all provided fields from request body
  const event = await Event.create({
    ...req.body,
    createdBy: req.user._id
  });

  // Prevent obvious duplicates by same creator within 1 hour, same title and date
  const duplicate = await Event.findOne({
    title: new RegExp(`^${req.body.title}$`, 'i'),
    date: new Date(req.body.date),
    createdBy: req.user._id,
    _id: { $ne: event._id } // Exclude the one we just created
  });
  if (duplicate) {
    // Delete the duplicate we just created
    await Event.findByIdAndDelete(event._id);
    return next(new AppError('You already created an event with the same title and date', 400));
  }

  // Notify campus members about new event (if public)
  if (event.visibility === 'public' || event.visibility === 'campus') {
    try {
      await Notification.create({
        user: null, // System notification
        sender: req.user._id,
        type: 'event_created',
        title: 'New Event Created',
        message: `${req.user.fullName || 'Someone'} created a new event: ${event.title}`,
        metadata: { 
          eventId: String(event._id),
          campus: String(req.body.campus),
          category: event.category
        },
        channels: ['in_app', 'email'],
        priority: 'medium'
      });
    } catch (_) {}
  }

  res.status(201).json({
    status: 'success',
    data: event
  });
});

// ✅ Get all events (with advanced filtering)
exports.getAllEvents = catchAsync(async (req, res, next) => {
  const { 
    campus, startDate, endDate, upcoming, category, search, status, tags, 
    limit, page, latitude, longitude, radius, dateFilter, sortBy, sortOrder, sort, allCampuses
  } = req.query;

  const filter = {};

  // DEBUG: Log incoming parameters
  console.log('\n📋 GET ALL EVENTS - CAMPUS FILTERING DEBUG');
  console.log('   🔐 req.user:', req.user ? `${req.user.fullName} (${req.user.email})` : '❌ NOT AUTHENTICATED');
  console.log('   🏫 req.user.campus:', req.user?.campus);
  console.log('   📤 Query params:', { allCampuses, campus, sort, sortBy });
  
  // 🔹 Filter by campus: DEFAULT to user's campus, UNLESS they explicitly request allCampuses
  if (allCampuses === 'true') {
    // User explicitly requested all campuses
    if (campus) filter.campus = campus; // If specific campus provided, use it
    console.log('   ✅ allCampuses=true → showing all campuses');
  } else {
    // DEFAULT: Show only user's campus
    if (campus) {
      filter.campus = campus;
      console.log('   ✅ Filtering by provided campus:', campus);
    } else if (req.user?.campus) {
      // Handle both populated campus object and campus ID
      filter.campus = req.user.campus._id || req.user.campus;
      console.log('   ✅ DEFAULT: Filtering by user campus:', filter.campus?.toString());
    } else {
      console.log('   ⚠️ NO USER OR CAMPUS → NO FILTER APPLIED');
    }
  }
  console.log('   🔍 Final campus filter:', filter.campus?.toString() || 'NONE');

  // 🔹 Advanced date filtering
  if (dateFilter) {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    switch (dateFilter) {
      case 'today':
        filter.date = { $gte: startOfDay, $lt: endOfDay };
        break;
      case 'tomorrow':
        const tomorrow = new Date(startOfDay);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dayAfter = new Date(tomorrow);
        dayAfter.setDate(dayAfter.getDate() + 1);
        filter.date = { $gte: tomorrow, $lt: dayAfter };
        break;
      case 'this_week':
        filter.date = { $gte: startOfWeek, $lt: endOfWeek };
        break;
      case 'next_week':
        const nextWeekStart = new Date(endOfWeek);
        nextWeekStart.setDate(nextWeekStart.getDate() + 1);
        const nextWeekEnd = new Date(nextWeekStart);
        nextWeekEnd.setDate(nextWeekEnd.getDate() + 7);
        filter.date = { $gte: nextWeekStart, $lt: nextWeekEnd };
        break;
      case 'this_month':
        filter.date = { $gte: startOfMonth, $lt: endOfMonth };
        break;
      case 'next_month':
        const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const nextMonthEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0);
        filter.date = { $gte: nextMonthStart, $lt: nextMonthEnd };
        break;
    }
  }

  // 🔹 Filter by date range (legacy support)
  if (startDate || endDate) {
    filter.date = { ...filter.date };
    if (startDate) filter.date.$gte = new Date(startDate);
    if (endDate) filter.date.$lte = new Date(endDate);
  }

  // 🔹 Upcoming events only
  if (upcoming === 'true') {
    filter.date = { ...filter.date, $gte: new Date() };
  }

  // 🔹 Category filter - resolve category slug/name to ObjectId
  if (category) {
    const categoryId = await resolveCategoryId(category);
    if (categoryId) {
      filter.category = categoryId;
    }
  }

  // 🔹 Status filter
  if (status) filter.status = status;

  // 🔹 Tags filter
  if (tags) {
    const tagArray = tags.split(',');
    filter.tags = { $in: tagArray };
  }

  // 🔹 Geospatial search
  if (latitude && longitude && radius) {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const rad = parseFloat(radius) || 10; // Default 10km radius
    
    filter.coordinates = {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [lng, lat]
        },
        $maxDistance: rad * 1000 // Convert km to meters
      }
    };
  }

  // 🔹 Search (title, description, or tags)
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { tags: { $in: [new RegExp(search, 'i')] } }
    ];
  }

  // Pagination
  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 10;
  const skip = (pageNum - 1) * limitNum;

  // Sorting - handle both sort (new format) and sortBy+sortOrder (old format)
  let sortObj = {};
  
  // Use sort parameter if provided (frontend format with predefined options)
  if (sort) {
    switch (sort) {
      case 'newest':
        sortObj = { createdAt: -1 };
        break;
      case 'oldest':
        sortObj = { createdAt: 1 };
        break;
      case 'trending':
        sortObj = { attendeesCount: -1, createdAt: -1 };
        break;
      case 'mostAttended':
        sortObj = { attendeesCount: -1 };
        break;
      case 'highestRated':
        sortObj = { rating: -1, createdAt: -1 };
        break;
      case 'soonest':
        sortObj = { date: 1 };
        break;
      default:
        sortObj = { createdAt: -1 };
    }
    console.log('   ✅ Using sort parameter:', sort, '→', sortObj);
  } 
  // Fallback to sortBy+sortOrder if provided (old format)
  else if (sortBy) {
    sortObj[sortBy] = sortOrder === 'desc' ? -1 : 1;
    console.log('   ✅ Using sortBy parameter:', sortBy, 'order:', sortOrder);
  } 
  // Default: newest first
  else {
    sortObj = { createdAt: -1 };
    console.log('   ✅ Using default sort: createdAt descending');
  }

  const events = await Event.find(filter)
    .sort(sortObj)
    .skip(skip)
    .limit(limitNum)
    .populate('createdBy', 'fullName role')
    .populate('campus', 'name')
    .populate('category', 'name slug');

  const total = await Event.countDocuments(filter);

  res.status(200).json({
    status: 'success',
    results: events.length,
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum),
    data: events
  });
});

// ✅ Get single event
exports.getEvent = catchAsync(async (req, res, next) => {
  const event = await Event.findById(req.params.id)
    .populate('category', 'name slug')
    .populate('createdBy', 'fullName')
    .populate('campus', 'name');
  if (!event) return next(new AppError('Event not found', 404));

  // Increment views
  await event.incrementViews();

  // Set user-specific virtual fields
  if (req.user) {
    event._isFavorited = event.favorites.includes(req.user._id);
    event._isAttending = event.attendees.includes(req.user._id);
    event._isOwner = event.isOwnedBy(req.user._id);
    const userRating = event.ratings.find(r => r.user.toString() === req.user._id.toString());
    event._userRating = userRating ? userRating.rating : null;
  }

  res.status(200).json({ status: 'success', data: event });
});

// ✅ Update event (replace old banner if new one uploaded)
exports.updateEvent = catchAsync(async (req, res, next) => {
  const event = await Event.findOne({ _id: req.params.id, createdBy: req.user._id });
  if (!event) return next(new AppError('Not authorized or event not found', 404));

  // Delete old banner if new one provided
  if (req.body.bannerPublicId && event.bannerPublicId && req.body.bannerPublicId !== event.bannerPublicId) {
    await cloudinary.uploader.destroy(event.bannerPublicId);
  }

  Object.assign(event, req.body);
  await event.save();

  res.status(200).json({ status: 'success', data: event });
});

// ✅ Delete event (also delete banner)
exports.deleteEvent = catchAsync(async (req, res, next) => {
  const event = await Event.findOne({ _id: req.params.id, createdBy: req.user._id });
  if (!event) return next(new AppError('Event not found or unauthorized', 404));

  if (event.bannerPublicId) {
    await cloudinary.uploader.destroy(event.bannerPublicId);
  }

  await event.deleteOne();

  res.status(204).json({ status: 'success', data: null });
});

// ✅ Join event
exports.joinEvent = catchAsync(async (req, res, next) => {
  const event = await Event.findById(req.params.id);
  if (!event) return next(new AppError('Event not found', 404));

  // Check if event is at capacity
  if (event.capacity && event.attendees.length >= event.capacity) {
    return next(new AppError('Event is at capacity', 400));
  }

  if (event.attendees.includes(req.user._id))
    return next(new AppError('You have already joined this event', 400));

  event.attendees.push(req.user._id);
  await event.save();

  // Optional: notify owner
  try {
    await Notification.create({
      user: event.createdBy,
      sender: req.user._id,
      type: 'event_join',
      title: 'New event attendee',
      message: `${req.user.fullName || 'Someone'} joined your event: ${event.title}`,
      metadata: { eventId: String(event._id) }
    });
  } catch (_) {}

  res.status(200).json({
    status: 'success',
    message: 'Successfully joined event',
    data: event
  });
});

// ✅ Leave event
exports.leaveEvent = catchAsync(async (req, res, next) => {
  const event = await Event.findById(req.params.id);
  if (!event) return next(new AppError('Event not found', 404));

  event.attendees = event.attendees.filter(
    (id) => id.toString() !== req.user._id.toString()
  );
  await event.save();

  // Notify event creator about attendee leaving
  try {
    await Notification.create({
      user: event.createdBy,
      sender: req.user._id,
      type: 'event_leave',
      title: 'Event attendee left',
      message: `${req.user.fullName || 'Someone'} left your event: ${event.title}`,
      metadata: { eventId: String(event._id) }
    });
  } catch (_) {}

  res.status(200).json({
    status: 'success',
    message: 'You have left the event',
    data: event
  });
});

// ✅ Toggle favorite
exports.toggleFavorite = catchAsync(async (req, res, next) => {
  const event = await Event.findById(req.params.id);
  if (!event) return next(new AppError('Event not found', 404));
  await event.toggleFavorite(req.user._id);
  res.status(200).json({ status: 'success', data: event });
});

// ✅ Add/update rating
exports.addRating = catchAsync(async (req, res, next) => {
  const { rating, review } = req.body;
  const event = await Event.findById(req.params.id);
  if (!event) return next(new AppError('Event not found', 404));
  
  const existingRating = event.ratings.find(r => r.user.toString() === req.user._id.toString());
  await event.addRating(req.user._id, rating, review);

  // Notify event creator about new/updated rating
  try {
    await Notification.create({
      user: event.createdBy,
      sender: req.user._id,
      type: existingRating ? 'event_rating_updated' : 'event_rating',
      title: existingRating ? 'Event rating updated' : 'New event rating',
      message: `${req.user.fullName || 'Someone'} ${existingRating ? 'updated their' : 'rated your'} event: ${event.title} (${rating}/5 stars)`,
      metadata: { 
        eventId: String(event._id),
        rating: rating,
        review: review
      }
    });
  } catch (_) {}

  res.status(200).json({ status: 'success', data: event });
});

// ✅ Add comment
exports.addComment = catchAsync(async (req, res, next) => {
  const { comment } = req.body;
  const event = await Event.findById(req.params.id);
  if (!event) return next(new AppError('Event not found', 404));
  if (event.settings && event.settings.allowComments === false) {
    return next(new AppError('Comments are disabled for this event', 400));
  }
  await event.addComment(req.user._id, comment);

  // Notify event creator about new comment
  try {
    await Notification.create({
      user: event.createdBy,
      sender: req.user._id,
      type: 'event_comment',
      title: 'New event comment',
      message: `${req.user.fullName || 'Someone'} commented on your event: ${event.title}`,
      metadata: { 
        eventId: String(event._id),
        comment: comment.substring(0, 100) // First 100 chars
      }
    });
  } catch (_) {}

  res.status(201).json({ status: 'success', data: event });
});

// ✅ Get comments
exports.getComments = catchAsync(async (req, res, next) => {
  // Populate the comment user so frontend can show author name
  const event = await Event.findById(req.params.id)
    .select('comments')
    .populate('comments.user', 'fullName email');
  if (!event) return next(new AppError('Event not found', 404));
  res.status(200).json({ status: 'success', results: event.comments.length, data: event.comments });
});

// ✅ Update status (publish/cancel/complete)
exports.updateStatus = catchAsync(async (req, res, next) => {
  const { status } = req.body;
  const event = await Event.findOne({ _id: req.params.id, createdBy: req.user._id });
  if (!event) return next(new AppError('Event not found or unauthorized', 404));
  
  const oldStatus = event.status;
  await event.updateStatus(status, req.user._id);

  // Notify attendees about status changes
  if (event.attendees.length > 0 && ['cancelled', 'completed'].includes(status)) {
    try {
      const notifications = event.attendees.map(attendeeId => ({
        user: attendeeId,
        sender: req.user._id,
        type: 'event_status_changed',
        title: `Event ${status}`,
        message: `The event "${event.title}" has been ${status}`,
        metadata: { 
          eventId: String(event._id),
          oldStatus: oldStatus,
          newStatus: status
        },
        channels: ['in_app', 'email'],
        priority: 'high'
      }));
      
      await Notification.insertMany(notifications);
    } catch (_) {}
  }

  res.status(200).json({ status: 'success', data: event });
});

// ✅ Archive / Unarchive
exports.archiveEvent = catchAsync(async (req, res, next) => {
  const event = await Event.findOne({ _id: req.params.id, createdBy: req.user._id });
  if (!event) return next(new AppError('Event not found or unauthorized', 404));
  await event.archive(req.user._id);
  res.status(200).json({ status: 'success', data: event });
});

exports.unarchiveEvent = catchAsync(async (req, res, next) => {
  const event = await Event.findOne({ _id: req.params.id, createdBy: req.user._id });
  if (!event) return next(new AppError('Event not found or unauthorized', 404));
  await event.unarchive(req.user._id);
  res.status(200).json({ status: 'success', data: event });
});

// ✅ Popular/Trending
exports.getPopularEvents = catchAsync(async (req, res, next) => {
  const limit = parseInt(req.query.limit) || 10;
  const events = await Event.getPopularEvents(limit);
  res.status(200).json({ status: 'success', results: events.length, data: events });
});

exports.getTrendingEvents = catchAsync(async (req, res, next) => {
  const limit = parseInt(req.query.limit) || 10;
  const events = await Event.getTrendingEvents(limit);
  res.status(200).json({ status: 'success', results: events.length, data: events });
});

// ✅ Analytics
exports.getEventAnalytics = catchAsync(async (req, res, next) => {
  const { startDate, endDate } = req.query;
  const analytics = await Event.getAnalytics(startDate, endDate);
  res.status(200).json({ status: 'success', data: analytics[0] || {} });
});

exports.getUserEventStats = catchAsync(async (req, res, next) => {
  const userId = req.params.userId || req.user._id;
  const stats = await Event.aggregate([
    { $match: { createdBy: Event.db.cast(userId) } },
    {
      $group: {
        _id: '$createdBy',
        totalEvents: { $sum: 1 },
        totalViews: { $sum: '$analytics.totalViews' },
        totalFavorites: { $sum: '$analytics.totalFavorites' },
        totalComments: { $sum: '$analytics.totalComments' },
        averageRating: { $avg: '$analytics.averageRating' }
      }
    }
  ]);
  res.status(200).json({ status: 'success', data: stats[0] || { totalEvents: 0 } });
});

// ✅ Bulk operations
exports.bulkOperations = catchAsync(async (req, res, next) => {
  const { operation, eventIds, updateData } = req.body;
  let result;
  switch (operation) {
    case 'delete':
      result = await Event.deleteMany({ _id: { $in: eventIds } });
      break;
    case 'archive':
      result = await Event.updateMany({ _id: { $in: eventIds } }, { $set: { archived: true, archivedAt: new Date() } });
      break;
    case 'unarchive':
      result = await Event.updateMany({ _id: { $in: eventIds } }, { $set: { archived: false, archivedAt: null, archivedBy: null } });
      break;
    case 'publish':
      result = await Event.updateMany({ _id: { $in: eventIds } }, { $set: { status: 'published' } });
      break;
    case 'cancel':
      result = await Event.updateMany({ _id: { $in: eventIds } }, { $set: { status: 'cancelled' } });
      break;
    case 'update':
      result = await Event.updateMany({ _id: { $in: eventIds } }, { $set: updateData || {} });
      break;
    default:
      return next(new AppError('Unsupported bulk operation', 400));
  }
  res.status(200).json({ status: 'success', data: result });
});

// ✅ Schedule event reminders
exports.scheduleEventReminders = catchAsync(async (req, res, next) => {
  const event = await Event.findById(req.params.id);
  if (!event) return next(new AppError('Event not found', 404));
  
  if (!event.settings.sendReminders || event.attendees.length === 0) {
    return res.status(200).json({ 
      status: 'success', 
      message: 'No reminders to schedule' 
    });
  }

  const reminderDays = event.settings.reminderDays || 1;
  const reminderDate = new Date(event.date.getTime() - (reminderDays * 24 * 60 * 60 * 1000));
  
  if (reminderDate <= new Date()) {
    return res.status(400).json({ 
      status: 'error', 
      message: 'Reminder date has already passed' 
    });
  }

  // Schedule reminders for all attendees
  try {
    const reminders = event.attendees.map(attendeeId => ({
      user: attendeeId,
      sender: event.createdBy,
      type: 'event_reminder',
      title: 'Event Reminder',
      message: `Don't forget! "${event.title}" is happening in ${reminderDays} day(s)`,
      metadata: { 
        eventId: String(event._id),
        eventDate: event.date,
        reminderDays: reminderDays
      },
      scheduledAt: reminderDate,
      channels: ['in_app', 'email', 'push'],
      priority: 'medium'
    }));
    
    await Notification.insertMany(reminders);
    
    res.status(200).json({ 
      status: 'success', 
      message: `Reminders scheduled for ${event.attendees.length} attendees`,
      reminderDate: reminderDate
    });
  } catch (error) {
    return next(new AppError('Failed to schedule reminders', 500));
  }
});

// ✅ Get event notifications
exports.getEventNotifications = catchAsync(async (req, res, next) => {
  const eventId = req.params.id;
  const notifications = await Notification.find({
    'metadata.eventId': eventId
  }).sort('-createdAt').limit(50);
  
  res.status(200).json({ 
    status: 'success', 
    results: notifications.length,
    data: notifications 
  });
});

// ✅ Saved Search Functionality
exports.saveSearch = catchAsync(async (req, res, next) => {
  const { name, filters, isPublic } = req.body;
  
  const savedSearch = await Event.db.collection('savedSearches').insertOne({
    name,
    filters,
    isPublic: isPublic || false,
    createdBy: req.user._id,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  res.status(201).json({
    status: 'success',
    data: { id: savedSearch.insertedId, name, filters, isPublic }
  });
});

exports.getSavedSearches = catchAsync(async (req, res, next) => {
  const searches = await Event.db.collection('savedSearches').find({
    $or: [
      { createdBy: req.user._id },
      { isPublic: true }
    ]
  }).sort({ createdAt: -1 }).toArray();

  res.status(200).json({
    status: 'success',
    results: searches.length,
    data: searches
  });
});

exports.executeSavedSearch = catchAsync(async (req, res, next) => {
  const { searchId } = req.params;
  const { page, limit } = req.query;
  
  const savedSearch = await Event.db.collection('savedSearches').findOne({
    _id: Event.db.cast(searchId),
    $or: [
      { createdBy: req.user._id },
      { isPublic: true }
    ]
  });

  if (!savedSearch) {
    return next(new AppError('Saved search not found', 404));
  }

  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 10;
  const skip = (pageNum - 1) * limitNum;

  const events = await Event.find(savedSearch.filters)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum)
    .populate('createdBy', 'fullName role')
    .populate('campus', 'name');

  const total = await Event.countDocuments(savedSearch.filters);

  res.status(200).json({
    status: 'success',
    results: events.length,
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum),
    data: events
  });
});

// ✅ Event Recurrence Management
exports.createRecurringEvent = catchAsync(async (req, res, next) => {
  const { 
    title, description, date, endDate, location, campus, category,
    recurrence, recurrenceEndDate, daysOfWeek, dayOfMonth
  } = req.body;

  const baseEvent = {
    title,
    description,
    date: new Date(date),
    endDate: endDate ? new Date(endDate) : null,
    location,
    campus,
    category,
    createdBy: req.user._id,
    recurrence: {
      type: recurrence,
      interval: 1,
      endDate: recurrenceEndDate ? new Date(recurrenceEndDate) : null,
      daysOfWeek: daysOfWeek || [],
      dayOfMonth: dayOfMonth || null
    }
  };

  const events = [];
  const startDate = new Date(date);
  const endRecurrence = recurrenceEndDate ? new Date(recurrenceEndDate) : new Date(startDate.getTime() + (365 * 24 * 60 * 60 * 1000)); // 1 year default

  let currentDate = new Date(startDate);
  let eventCount = 0;
  const maxEvents = 100; // Prevent infinite loops

  while (currentDate <= endRecurrence && eventCount < maxEvents) {
    const eventData = { ...baseEvent, date: new Date(currentDate) };
    if (baseEvent.endDate) {
      const duration = baseEvent.endDate.getTime() - baseEvent.date.getTime();
      eventData.endDate = new Date(currentDate.getTime() + duration);
    }

    const event = await Event.create(eventData);
    events.push(event);

    // Calculate next occurrence
    switch (recurrence) {
      case 'daily':
        currentDate.setDate(currentDate.getDate() + 1);
        break;
      case 'weekly':
        currentDate.setDate(currentDate.getDate() + 7);
        break;
      case 'monthly':
        currentDate.setMonth(currentDate.getMonth() + 1);
        break;
      case 'yearly':
        currentDate.setFullYear(currentDate.getFullYear() + 1);
        break;
      default:
        break;
    }
    eventCount++;
  }

  res.status(201).json({
    status: 'success',
    results: events.length,
    data: events
  });
});

exports.getRecurringEvents = catchAsync(async (req, res, next) => {
  const { parentEventId } = req.params;
  const events = await Event.find({
    'recurrence.parentEvent': parentEventId
  }).sort({ createdAt: -1 });

  res.status(200).json({
    status: 'success',
    results: events.length,
    data: events
  });
});

// ✅ Event Templates
exports.createEventTemplate = catchAsync(async (req, res, next) => {
  const { name, description, templateData, isPublic } = req.body;
  
  const template = await Event.db.collection('eventTemplates').insertOne({
    name,
    description,
    templateData,
    isPublic: isPublic || false,
    createdBy: req.user._id,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  res.status(201).json({
    status: 'success',
    data: { id: template.insertedId, name, description, templateData, isPublic }
  });
});

exports.getEventTemplates = catchAsync(async (req, res, next) => {
  const templates = await Event.db.collection('eventTemplates').find({
    $or: [
      { createdBy: req.user._id },
      { isPublic: true }
    ]
  }).sort({ createdAt: -1 }).toArray();

  res.status(200).json({
    status: 'success',
    results: templates.length,
    data: templates
  });
});

exports.createEventFromTemplate = catchAsync(async (req, res, next) => {
  const { templateId } = req.params;
  const { title, date, location, campus, customizations } = req.body;
  
  const template = await Event.db.collection('eventTemplates').findOne({
    _id: Event.db.cast(templateId),
    $or: [
      { createdBy: req.user._id },
      { isPublic: true }
    ]
  });

  if (!template) {
    return next(new AppError('Event template not found', 404));
  }

  const eventData = {
    ...template.templateData,
    ...customizations,
    title,
    date: new Date(date),
    location,
    campus,
    createdBy: req.user._id
  };

  const event = await Event.create(eventData);

  res.status(201).json({
    status: 'success',
    data: event
  });
});

// ✅ Event Export
exports.exportEvents = catchAsync(async (req, res, next) => {
  const { format, eventIds, startDate, endDate, campus } = req.query;
  
  let filter = {};
  if (eventIds) {
    filter._id = { $in: eventIds.split(',') };
  }
  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = new Date(startDate);
    if (endDate) filter.date.$lte = new Date(endDate);
  }
  if (campus) filter.campus = campus;

  const events = await Event.find(filter)
    .populate('createdBy', 'fullName email')
    .populate('campus', 'name')
    .sort({ createdAt: -1 });

  if (format === 'csv') {
    const csv = generateCSV(events);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="events.csv"');
    return res.send(csv);
  } else if (format === 'ical') {
    const ical = generateICal(events);
    res.setHeader('Content-Type', 'text/calendar');
    res.setHeader('Content-Disposition', 'attachment; filename="events.ics"');
    return res.send(ical);
  } else {
    return next(new AppError('Unsupported export format', 400));
  }
});

// ✅ Event Moderation
exports.reportEvent = catchAsync(async (req, res, next) => {
  const { reason, description } = req.body;
  const eventId = req.params.id;
  
  const report = await Event.db.collection('eventReports').insertOne({
    eventId: Event.db.cast(eventId),
    reportedBy: req.user._id,
    reason,
    description,
    status: 'pending',
    createdAt: new Date()
  });

  res.status(201).json({
    status: 'success',
    message: 'Event reported successfully',
    data: { reportId: report.insertedId }
  });
});

exports.getEventReports = catchAsync(async (req, res, next) => {
  if (!['admin', 'moderator'].includes(req.user.role)) {
    return next(new AppError('Insufficient permissions', 403));
  }

  const reports = await Event.db.collection('eventReports')
    .aggregate([
      {
        $lookup: {
          from: 'events',
          localField: 'eventId',
          foreignField: '_id',
          as: 'event'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'reportedBy',
          foreignField: '_id',
          as: 'reporter'
        }
      },
      { $sort: { createdAt: -1 } }
    ]).toArray();

  res.status(200).json({
    status: 'success',
    results: reports.length,
    data: reports
  });
});

exports.moderateEvent = catchAsync(async (req, res, next) => {
  if (!['admin', 'moderator'].includes(req.user.role)) {
    return next(new AppError('Insufficient permissions', 403));
  }

  const { action, reason } = req.body;
  const eventId = req.params.id;
  
  const event = await Event.findById(eventId);
  if (!event) {
    return next(new AppError('Event not found', 404));
  }

  switch (action) {
    case 'hide':
      event.visibility = 'private';
      break;
    case 'archive':
      event.archived = true;
      event.archivedAt = new Date();
      event.archivedBy = req.user._id;
      break;
    case 'delete':
      await event.deleteOne();
      break;
    default:
      return next(new AppError('Invalid moderation action', 400));
  }

  await event.save();

  // Log moderation action
  await Event.db.collection('moderationLogs').insertOne({
    eventId: Event.db.cast(eventId),
    moderatorId: req.user._id,
    action,
    reason,
    timestamp: new Date()
  });

  res.status(200).json({
    status: 'success',
    message: `Event ${action}ed successfully`,
    data: event
  });
});

// ✅ Calendar Integration
exports.getEventCalendar = catchAsync(async (req, res, next) => {
  const { format, eventId } = req.params;
  const { startDate, endDate, campus } = req.query;
  
  let filter = {};
  if (eventId) {
    filter._id = Event.db.cast(eventId);
  }
  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = new Date(startDate);
    if (endDate) filter.date.$lte = new Date(endDate);
  }
  if (campus) filter.campus = campus;

  const events = await Event.find(filter)
    .populate('createdBy', 'fullName email')
    .populate('campus', 'name')
    .sort({ createdAt: -1 });

  if (format === 'google') {
    const googleCalendarUrl = generateGoogleCalendarUrl(events);
    res.status(200).json({
      status: 'success',
      data: { calendarUrl: googleCalendarUrl }
    });
  } else if (format === 'outlook') {
    const outlookCalendarUrl = generateOutlookCalendarUrl(events);
    res.status(200).json({
      status: 'success',
      data: { calendarUrl: outlookCalendarUrl }
    });
  } else {
    return next(new AppError('Unsupported calendar format', 400));
  }
});

// ✅ Social Media Sharing
exports.shareEvent = catchAsync(async (req, res, next) => {
  const { platform } = req.params;
  const eventId = req.params.id;
  
  const event = await Event.findById(eventId)
    .populate('createdBy', 'fullName')
    .populate('campus', 'name');

  if (!event) {
    return next(new AppError('Event not found', 404));
  }

  const shareData = generateShareData(event, platform);
  
  res.status(200).json({
    status: 'success',
    data: shareData
  });
});

// Helper functions
function generateCSV(events) {
  const headers = ['Title', 'Description', 'Date', 'Location', 'Category', 'Created By', 'Campus'];
  const rows = events.map(event => [
    event.title,
    event.description,
    event.date.toISOString(),
    event.location,
    event.category,
    event.createdBy?.fullName || '',
    event.campus?.name || ''
  ]);
  
  return [headers, ...rows].map(row => row.map(field => `"${field}"`).join(',')).join('\n');
}

function generateICal(events) {
  let ical = 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Student Marketplace//Events//EN\n';
  
  events.forEach(event => {
    ical += 'BEGIN:VEVENT\n';
    ical += `UID:${event._id}@studentmarketplace.com\n`;
    ical += `DTSTART:${event.date.toISOString().replace(/[-:]/g, '').split('.')[0]}Z\n`;
    if (event.endDate) {
      ical += `DTEND:${event.endDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z\n`;
    }
    ical += `SUMMARY:${event.title}\n`;
    ical += `DESCRIPTION:${event.description}\n`;
    ical += `LOCATION:${event.location}\n`;
    ical += 'END:VEVENT\n';
  });
  
  ical += 'END:VCALENDAR';
  return ical;
}

function generateGoogleCalendarUrl(events) {
  const baseUrl = 'https://calendar.google.com/calendar/render?action=TEMPLATE';
  const params = new URLSearchParams();
  
  if (events.length === 1) {
    const event = events[0];
    params.append('text', event.title);
    params.append('dates', `${event.date.toISOString().replace(/[-:]/g, '').split('.')[0]}Z/${event.endDate ? event.endDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z' : event.date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'}`);
    params.append('details', event.description);
    params.append('location', event.location);
  }
  
  return `${baseUrl}&${params.toString()}`;
}

function generateOutlookCalendarUrl(events) {
  const baseUrl = 'https://outlook.live.com/calendar/0/deeplink/compose';
  const params = new URLSearchParams();
  
  if (events.length === 1) {
    const event = events[0];
    params.append('subject', event.title);
    params.append('startdt', event.date.toISOString());
    params.append('enddt', event.endDate ? event.endDate.toISOString() : event.date.toISOString());
    params.append('body', event.description);
    params.append('location', event.location);
  }
  
  return `${baseUrl}?${params.toString()}`;
}

function generateShareData(event, platform) {
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const eventUrl = `${baseUrl}/events/${event._id}`;
  
  const shareData = {
    url: eventUrl,
    title: event.title,
    description: event.description,
    image: event.bannerUrl
  };
  
  switch (platform) {
    case 'facebook':
      return {
        ...shareData,
        shareUrl: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(eventUrl)}`
      };
    case 'twitter':
      return {
        ...shareData,
        shareUrl: `https://twitter.com/intent/tweet?text=${encodeURIComponent(event.title)}&url=${encodeURIComponent(eventUrl)}`
      };
    case 'linkedin':
      return {
        ...shareData,
        shareUrl: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(eventUrl)}`
      };
    case 'whatsapp':
      return {
        ...shareData,
        shareUrl: `https://wa.me/?text=${encodeURIComponent(`${event.title} - ${eventUrl}`)}`
      };
    default:
      return shareData;
  }
}

// ✅ Get upcoming events
exports.getUpcomingEvents = catchAsync(async (req, res, next) => {
  const limit = parseInt(req.query.limit) || 6;
  const daysAhead = parseInt(req.query.daysAhead) || 30;
  
  const now = new Date();
  const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
  
  const events = await Event.find({
    eventDate: { $gte: now, $lte: futureDate },
    status: 'active'
  })
    .sort({ eventDate: 1 })
    .limit(limit)
    .populate('createdBy', 'fullName')
    .lean();
  
  res.status(200).json({
    status: 'success',
    results: events.length,
    data: events
  });
});

// ✅ Get nearby events
exports.getNearbyEvents = catchAsync(async (req, res, next) => {
  const limit = parseInt(req.query.limit) || 6;
  const radiusKm = parseInt(req.query.radiusKm) || 50;
  
  // Get user coordinates from query or use default
  const userLat = req.query.lat ? parseFloat(req.query.lat) : null;
  const userLng = req.query.lng ? parseFloat(req.query.lng) : null;
  
  // If no coordinates provided, return empty array
  if (!userLat || !userLng) {
    return res.status(200).json({
      status: 'success',
      results: 0,
      data: []
    });
  }
  
  const events = await Event.find({
    status: 'active',
    'coordinates': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [userLng, userLat]
        },
        $maxDistance: radiusKm * 1000 // Convert km to meters
      }
    }
  })
    .limit(limit)
    .populate('createdBy', 'fullName')
    .lean();
  
  res.status(200).json({
    status: 'success',
    results: events.length,
    data: events
  });
});

// ✅ Get trending event tags
exports.getTrendingEventTags = catchAsync(async (req, res, next) => {
  const limit = parseInt(req.query.limit) || 12;
  
  const tags = await Event.aggregate([
    { $match: { status: 'active' } },
    { $unwind: '$tags' },
    { $group: { _id: '$tags', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: limit },
    { $project: { _id: 0, name: '$_id', count: 1 } }
  ]);
  
  res.status(200).json({
    status: 'success',
    results: tags.length,
    data: tags
  });
});

// ✅ Helper function to resolve category slug/name to ObjectId
const mongoose = require('mongoose');
async function resolveCategoryId(categoryInput) {
  if (!categoryInput) return null;
  
  // If already a valid ObjectId, return it
  if (mongoose.Types.ObjectId.isValid(categoryInput)) {
    return new mongoose.Types.ObjectId(categoryInput);
  }
  
  // Try to find category by slug or name
  const category = await EventCategory.findOne({
    $or: [
      { slug: categoryInput.toLowerCase() },
      { name: new RegExp(`^${categoryInput}$`, 'i') }
    ],
    status: 'active'
  }).select('_id');
  
  return category ? category._id : null;
}
