const User = require('../models/userModel');
const Document = require('../models/documentModel');
const Post = require('../models/postModel');
const Order = require('../models/orderModel');

/**
 * Bulk ban users
 */
exports.bulkBanUsers = async (userIds, reason = '', durationDays = 30) => {
  if (!Array.isArray(userIds) || userIds.length === 0) {
    throw new Error('userIds must be a non-empty array');
  }

  const banUntil = new Date();
  banUntil.setDate(banUntil.getDate() + durationDays);

  const result = await User.updateMany(
    { _id: { $in: userIds } },
    {
      $set: {
        status: 'suspended',
        bannedReason: reason,
        bannedUntil: banUntil,
      },
    }
  );

  return result;
};

/**
 * Bulk unban users
 */
exports.bulkUnbanUsers = async (userIds) => {
  if (!Array.isArray(userIds) || userIds.length === 0) {
    throw new Error('userIds must be a non-empty array');
  }

  const result = await User.updateMany(
    { _id: { $in: userIds } },
    {
      $set: {
        status: 'active',
        bannedReason: null,
        bannedUntil: null,
      },
    }
  );

  return result;
};

/**
 * Bulk approve documents
 */
exports.bulkApproveDocuments = async (documentIds) => {
  if (!Array.isArray(documentIds) || documentIds.length === 0) {
    throw new Error('documentIds must be a non-empty array');
  }

  const result = await Document.updateMany(
    { _id: { $in: documentIds } },
    {
      $set: {
        status: 'approved',
        approvedAt: new Date(),
      },
    }
  );

  return result;
};

/**
 * Bulk reject documents
 */
exports.bulkRejectDocuments = async (documentIds, reason = '') => {
  if (!Array.isArray(documentIds) || documentIds.length === 0) {
    throw new Error('documentIds must be a non-empty array');
  }

  const result = await Document.updateMany(
    { _id: { $in: documentIds } },
    {
      $set: {
        status: 'rejected',
        rejectionReason: reason,
        rejectedAt: new Date(),
      },
    }
  );

  return result;
};

/**
 * Bulk delete posts
 */
exports.bulkDeletePosts = async (postIds) => {
  if (!Array.isArray(postIds) || postIds.length === 0) {
    throw new Error('postIds must be a non-empty array');
  }

  const result = await Post.deleteMany({ _id: { $in: postIds } });

  return result;
};

/**
 * Bulk update order status
 */
exports.bulkUpdateOrderStatus = async (orderIds, status) => {
  if (!Array.isArray(orderIds) || orderIds.length === 0) {
    throw new Error('orderIds must be a non-empty array');
  }

  const validStatuses = [
    'pending',
    'processing',
    'shipped',
    'delivered',
    'cancelled',
  ];
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }

  const result = await Order.updateMany(
    { _id: { $in: orderIds } },
    {
      $set: {
        status,
        updatedAt: new Date(),
      },
    }
  );

  return result;
};

/**
 * Generate CSV report from data
 */
exports.generateCSVReport = (data, fields) => {
  if (!Array.isArray(data) || data.length === 0) {
    return '';
  }

  // Create header row
  const header = fields.join(',');

  // Create data rows
  const rows = data.map((item) => {
    return fields
      .map((field) => {
        const value = item[field];
        // Escape quotes and wrap in quotes if contains comma
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value || '';
      })
      .join(',');
  });

  return [header, ...rows].join('\n');
};

/**
 * Generate JSON report from data
 */
exports.generateJSONReport = (data, metadata = {}) => {
  return {
    metadata: {
      generatedAt: new Date(),
      totalRecords: data.length,
      ...metadata,
    },
    data,
  };
};

/**
 * Export users as CSV
 */
exports.exportUsersCSV = async (filters = {}) => {
  const users = await User.find(filters).select(
    'name email role status campus createdAt'
  );

  const fields = ['id', 'name', 'email', 'role', 'status', 'campus', 'createdAt'];
  const data = users.map((user) => ({
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    campus: user.campus,
    createdAt: user.createdAt,
  }));

  return exports.generateCSVReport(data, fields);
};

/**
 * Export documents as CSV
 */
exports.exportDocumentsCSV = async (filters = {}) => {
  const documents = await Document.find(filters)
    .populate('uploadedBy', 'name email')
    .select(
      'title faculty department visibility status downloadCount createdAt'
    );

  const fields = [
    'id',
    'title',
    'faculty',
    'department',
    'visibility',
    'status',
    'downloadCount',
    'uploadedBy',
    'createdAt',
  ];
  const data = documents.map((doc) => ({
    id: doc._id.toString(),
    title: doc.title,
    faculty: doc.faculty,
    department: doc.department,
    visibility: doc.visibility,
    status: doc.status,
    downloadCount: doc.downloadCount,
    uploadedBy: doc.uploadedBy?.name || 'Unknown',
    createdAt: doc.createdAt,
  }));

  return exports.generateCSVReport(data, fields);
};

/**
 * Export orders as CSV
 */
exports.exportOrdersCSV = async (filters = {}) => {
  const orders = await Order.find(filters)
    .populate('buyer', 'name email')
    .populate('items.product', 'name price')
    .select('orderNumber status totalAmount buyer createdAt');

  const fields = [
    'id',
    'orderNumber',
    'buyer',
    'status',
    'totalAmount',
    'itemCount',
    'createdAt',
  ];
  const data = orders.map((order) => ({
    id: order._id.toString(),
    orderNumber: order.orderNumber,
    buyer: order.buyer?.name || 'Unknown',
    status: order.status,
    totalAmount: order.totalAmount,
    itemCount: order.items?.length || 0,
    createdAt: order.createdAt,
  }));

  return exports.generateCSVReport(data, fields);
};
