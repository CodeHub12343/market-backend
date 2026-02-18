const FavoriteCollection = require('../models/favoriteCollectionModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

// Create a new favorite collection
exports.createCollection = catchAsync(async (req, res, next) => {
  const { name, description, tags } = req.body;
  const userId = req.user.id;

  // Check if collection name already exists for this user
  const existingCollection = await FavoriteCollection.findOne({
    user: userId,
    name,
  });

  if (existingCollection) {
    return next(
      new AppError(
        'A collection with this name already exists for your account',
        400
      )
    );
  }

  const collection = await FavoriteCollection.create({
    user: userId,
    name,
    description: description || '',
    tags: tags || [],
    items: [],
  });

  res.status(201).json({
    status: 'success',
    data: {
      collection,
    },
  });
});

// Get all collections for current user
exports.getAllCollections = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 20, search } = req.query;
  const userId = req.user.id;

  const skip = (page - 1) * limit;

  let query = {
    $or: [{ user: userId }, { 'sharedWith.userId': userId }],
  };

  if (search) {
    query.name = { $regex: search, $options: 'i' };
  }

  const collections = await FavoriteCollection.find(query)
    .sort('-updatedAt')
    .skip(skip)
    .limit(parseInt(limit))
    .populate('user', 'name avatar');

  const total = await FavoriteCollection.countDocuments(query);

  res.status(200).json({
    status: 'success',
    results: collections.length,
    total,
    data: {
      collections,
    },
  });
});

// Get single collection
exports.getCollection = catchAsync(async (req, res, next) => {
  const { collectionId } = req.params;
  const userId = req.user.id;

  const collection = await FavoriteCollection.findById(collectionId).populate(
    'user',
    'name avatar'
  );

  if (!collection) {
    return next(new AppError('Collection not found', 404));
  }

  // Check access: owner or shared with
  const isOwner = collection.user._id.toString() === userId;
  const isShared = collection.sharedWith.some(
    (share) => share.userId.toString() === userId
  );

  if (!isOwner && !isShared && !collection.isPublic) {
    return next(
      new AppError('You do not have access to this collection', 403)
    );
  }

  res.status(200).json({
    status: 'success',
    data: {
      collection,
    },
  });
});

// Update collection
exports.updateCollection = catchAsync(async (req, res, next) => {
  const { collectionId } = req.params;
  const { name, description, tags, isPublic } = req.body;
  const userId = req.user.id;

  const collection = await FavoriteCollection.findById(collectionId);

  if (!collection) {
    return next(new AppError('Collection not found', 404));
  }

  // Check authorization
  if (collection.user.toString() !== userId) {
    return next(
      new AppError(
        'You do not have permission to update this collection',
        403
      )
    );
  }

  // Check if new name already exists
  if (name && name !== collection.name) {
    const existingCollection = await FavoriteCollection.findOne({
      user: userId,
      name,
    });
    if (existingCollection) {
      return next(
        new AppError(
          'A collection with this name already exists for your account',
          400
        )
      );
    }
  }

  if (name) collection.name = name;
  if (description !== undefined) collection.description = description;
  if (tags !== undefined) collection.tags = tags;
  if (isPublic !== undefined) collection.isPublic = isPublic;

  await collection.save();

  res.status(200).json({
    status: 'success',
    data: {
      collection,
    },
  });
});

// Delete collection
exports.deleteCollection = catchAsync(async (req, res, next) => {
  const { collectionId } = req.params;
  const userId = req.user.id;

  const collection = await FavoriteCollection.findById(collectionId);

  if (!collection) {
    return next(new AppError('Collection not found', 404));
  }

  // Check authorization
  if (collection.user.toString() !== userId) {
    return next(
      new AppError(
        'You do not have permission to delete this collection',
        403
      )
    );
  }

  await FavoriteCollection.findByIdAndDelete(collectionId);

  res.status(200).json({
    status: 'success',
    message: 'Collection deleted successfully',
  });
});

// Add item to collection
exports.addItemToCollection = catchAsync(async (req, res, next) => {
  const { collectionId } = req.params;
  const { itemId, itemType } = req.body;
  const userId = req.user.id;

  const validItemTypes = ['Post', 'Product', 'Service', 'Event', 'Document'];
  if (!validItemTypes.includes(itemType)) {
    return next(
      new AppError(
        `Invalid itemType. Must be one of: ${validItemTypes.join(', ')}`,
        400
      )
    );
  }

  const collection = await FavoriteCollection.findById(collectionId);

  if (!collection) {
    return next(new AppError('Collection not found', 404));
  }

  // Check authorization
  if (collection.user.toString() !== userId) {
    return next(
      new AppError(
        'You do not have permission to modify this collection',
        403
      )
    );
  }

  // Check if item already exists
  const itemExists = collection.items.some(
    (item) =>
      item.itemId.toString() === itemId && item.itemType === itemType
  );

  if (itemExists) {
    return next(new AppError('Item already exists in this collection', 400));
  }

  collection.items.push({
    itemId,
    itemType,
  });

  await collection.save();

  res.status(200).json({
    status: 'success',
    data: {
      collection,
    },
  });
});

// Remove item from collection
exports.removeItemFromCollection = catchAsync(async (req, res, next) => {
  const { collectionId, itemId } = req.params;
  const userId = req.user.id;

  const collection = await FavoriteCollection.findById(collectionId);

  if (!collection) {
    return next(new AppError('Collection not found', 404));
  }

  // Check authorization
  if (collection.user.toString() !== userId) {
    return next(
      new AppError(
        'You do not have permission to modify this collection',
        403
      )
    );
  }

  // Remove item
  const initialLength = collection.items.length;
  collection.items = collection.items.filter(
    (item) => item.itemId.toString() !== itemId
  );

  if (collection.items.length === initialLength) {
    return next(new AppError('Item not found in this collection', 404));
  }

  await collection.save();

  res.status(200).json({
    status: 'success',
    message: 'Item removed from collection',
    data: {
      collection,
    },
  });
});

// Share collection with user
exports.shareCollection = catchAsync(async (req, res, next) => {
  const { collectionId } = req.params;
  const { userId: shareWithUserId, permission = 'view' } = req.body;
  const userId = req.user.id;

  if (!['view', 'edit'].includes(permission)) {
    return next(
      new AppError("Permission must be 'view' or 'edit'", 400)
    );
  }

  const collection = await FavoriteCollection.findById(collectionId);

  if (!collection) {
    return next(new AppError('Collection not found', 404));
  }

  // Check authorization
  if (collection.user.toString() !== userId) {
    return next(
      new AppError(
        'You do not have permission to share this collection',
        403
      )
    );
  }

  // Check if already shared
  const alreadyShared = collection.sharedWith.some(
    (share) => share.userId.toString() === shareWithUserId
  );

  if (alreadyShared) {
    return next(new AppError('Collection already shared with this user', 400));
  }

  collection.sharedWith.push({
    userId: shareWithUserId,
    permission,
  });

  await collection.save();

  res.status(200).json({
    status: 'success',
    message: 'Collection shared successfully',
    data: {
      collection,
    },
  });
});

// Unshare collection
exports.unshareCollection = catchAsync(async (req, res, next) => {
  const { collectionId, shareWithUserId } = req.params;
  const userId = req.user.id;

  const collection = await FavoriteCollection.findById(collectionId);

  if (!collection) {
    return next(new AppError('Collection not found', 404));
  }

  // Check authorization
  if (collection.user.toString() !== userId) {
    return next(
      new AppError(
        'You do not have permission to unshare this collection',
        403
      )
    );
  }

  collection.sharedWith = collection.sharedWith.filter(
    (share) => share.userId.toString() !== shareWithUserId
  );

  await collection.save();

  res.status(200).json({
    status: 'success',
    message: 'Collection unshared successfully',
    data: {
      collection,
    },
  });
});

// Export collection as JSON
exports.exportCollection = catchAsync(async (req, res, next) => {
  const { collectionId } = req.params;
  const userId = req.user.id;

  const collection = await FavoriteCollection.findById(collectionId);

  if (!collection) {
    return next(new AppError('Collection not found', 404));
  }

  // Check access
  const isOwner = collection.user.toString() === userId;
  const isShared = collection.sharedWith.some(
    (share) => share.userId.toString() === userId
  );

  if (!isOwner && !isShared && !collection.isPublic) {
    return next(
      new AppError('You do not have access to this collection', 403)
    );
  }

  const exportData = {
    name: collection.name,
    description: collection.description,
    tags: collection.tags,
    items: collection.items,
    exportedAt: new Date(),
  };

  res.set('Content-Disposition', `attachment; filename="${collection.name}.json"`);
  res.set('Content-Type', 'application/json');
  res.send(JSON.stringify(exportData, null, 2));
});
