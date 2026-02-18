const Document = require('../models/documentModel');
const Faculty = require('../models/facultyModel');
const Department = require('../models/departmentModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const cloudinary = require('../utils/cloudinary');

// Upload middleware (from utils/multer)
const multer = require('../utils/multer');
// Accept either `file` or `fileUrl` as the multipart field (some clients use fileUrl)
exports.uploadDocumentFile = multer.fields([
  { name: 'file', maxCount: 1 },
  { name: 'fileUrl', maxCount: 1 }
]);

// 📚 Get all documents with advanced filtering
exports.getAllDocuments = catchAsync(async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const skip = (page - 1) * limit;

  // Build filter object
  const filter = { archived: false };

  // Campus filtering behavior - security-first defaults
  // 1) If user explicitly requests all campuses (allCampuses=true) we don't force campus filtering.
  //    - If they also provide a specific campus id (campus=ID), we use that single campus.
  // 2) Otherwise, when the requester is authenticated, default to their assigned campus.
  // 3) If requester is unauthenticated (guest), only expose public documents across campuses.
  if (req.query.allCampuses === 'true') {
    // Explicit request to view all campuses
    if (req.query.campus) filter.campus = req.query.campus; // Optional: narrow to a specific campus
  } else if (req.user) {
    // Authenticated: default to user's campus to avoid cross-campus leaks
    filter.campus = req.user.campus;
  } else {
    // Unauthenticated: do not expose non-public documents. Force public visibility.
    filter.visibility = 'public';
    if (req.query.campus) {
      // If a guest explicitly requests a campus, respect it but still only public docs
      filter.campus = req.query.campus;
    }
  }
  // Filter by faculty
  if (req.query.faculty) filter.faculty = req.query.faculty;
  // Filter by department
  if (req.query.department) filter.department = req.query.department;
  // Filter by category
  if (req.query.category) filter.category = req.query.category;
  // Filter by visibility
  if (req.query.visibility) filter.visibility = req.query.visibility;
  // Filter by academic level
  if (req.query.academicLevel) filter.academicLevel = req.query.academicLevel;
  // Filter by course code
  if (req.query.courseCode) filter.courseCode = req.query.courseCode;
  // Filter by semester
  if (req.query.semester) filter.semester = req.query.semester;
  // Filter by academic year
  if (req.query.academicYear) filter.academicYear = req.query.academicYear;
  // Filter by difficulty
  if (req.query.difficulty) filter.difficulty = req.query.difficulty;
  // Filter by upload status
  if (req.query.uploadStatus) filter.uploadStatus = req.query.uploadStatus;
  // Filter by uploader
  if (req.query.uploadedBy) filter.uploadedBy = req.query.uploadedBy;
  // Filter by tags
  if (req.query.tags) {
    const tags = Array.isArray(req.query.tags) ? req.query.tags : req.query.tags.split(',');
    filter.tags = { $in: tags };
  }
  // Filter by date range
  if (req.query.dateFrom || req.query.dateTo) {
    filter.createdAt = {};
    if (req.query.dateFrom) filter.createdAt.$gte = new Date(req.query.dateFrom);
    if (req.query.dateTo) filter.createdAt.$lte = new Date(req.query.dateTo);
  }
  // Filter by rating
  if (req.query.minRating) filter.averageRating = { $gte: parseFloat(req.query.minRating) };
  // Filter by minimum downloads
  if (req.query.minDownloads) filter.downloads = { $gte: parseInt(req.query.minDownloads, 10) };

  // Determine sort order
  let sort = '-createdAt'; // default
  if (req.query.sort) {
    const sortMap = {
      'newest': '-createdAt',
      'oldest': 'createdAt',
      'trending': '-downloads',
      'popular': '-views',
      'rated': '-averageRating',
      'favorites': '-favoritesCount',
      'downloaded': '-downloads',
      'views': '-views',
      'comments': '-commentsCount',
      'title': 'title',
      'size': '-fileSize'
    };
    sort = sortMap[req.query.sort] || '-createdAt';
  }

  // Execute query
  const totalDocuments = await Document.countDocuments(filter);
  const documents = await Document.find(filter)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .lean();

  res.status(200).json({
    status: 'success',
    results: documents.length,
    total: totalDocuments,
    page,
    pages: Math.ceil(totalDocuments / limit),
    data: { documents },
  });
});

// 📄 Get a single document
exports.getDocument = catchAsync(async (req, res, next) => {
  const document = await Document.findById(req.params.id);
  if (!document) return next(new AppError('No document found with that ID', 404));

  res.status(200).json({ status: 'success', data: { document } });
});

// 🆕 Create (upload) document with faculty/department
exports.createDocument = catchAsync(async (req, res, next) => {
  // Support both multer.single (req.file) and multer.fields (req.files)
  const uploadedFile = req.file || 
    (req.files && (req.files.file && req.files.file[0])) || 
    (req.files && (req.files.fileUrl && req.files.fileUrl[0]));
    
  if (!uploadedFile) {
    return next(new AppError('Please upload a document file.', 400));
  }

  // Validate title
  if (!req.body.title) {
    return next(new AppError('Please provide a document title.', 400));
  }

  // Validate faculty and department
  if (!req.body.faculty) {
    return next(new AppError('Please specify a faculty.', 400));
  }
  if (!req.body.department) {
    return next(new AppError('Please specify a department.', 400));
  }

  // Validate academic level (REQUIRED)
  const validAcademicLevels = ['100', '200', '300', '400', '500', 'postgraduate'];
  if (!req.body.academicLevel) {
    return next(new AppError(`Please specify an academic level. Valid options: ${validAcademicLevels.join(', ')}`, 400));
  }
  if (!validAcademicLevels.includes(req.body.academicLevel)) {
    return next(new AppError(`Invalid academic level. Must be one of: ${validAcademicLevels.join(', ')}`, 400));
  }

  // Verify faculty exists and belongs to user's campus
  const faculty = await Faculty.findById(req.body.faculty);
  if (!faculty) {
    return next(new AppError('Faculty not found.', 404));
  }

  // Verify department exists and belongs to the faculty
  const department = await Department.findById(req.body.department);
  if (!department) {
    return next(new AppError('Department not found.', 404));
  }
  if (department.faculty.toString() !== req.body.faculty) {
    return next(new AppError('Department does not belong to the specified faculty.', 400));
  }

  // Get file metadata
  const fileSize = uploadedFile.size;
  const fileType = uploadedFile.mimetype;

  // Upload file to Cloudinary using upload_stream wrapped in a Promise
  const uploadToCloudinary = (fileBuffer) =>
    new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'documents',
          resource_type: 'auto', // auto detects image/pdf/doc
        },
        (error, uploadResult) => {
          if (error) return reject(error);
          resolve(uploadResult);
        }
      );

      // Stream the file buffer to Cloudinary
      stream.end(fileBuffer);
    });

  let uploadResult;
  try {
    uploadResult = await uploadToCloudinary(uploadedFile.buffer);
  } catch (err) {
    console.error('Cloudinary upload error:', err && err.message ? err.message : err);
    return next(new AppError('Upload failed', 500));
  }

  // Parse tags
  let parsedTags = [];
  if (req.body.tags) {
    try { 
      parsedTags = JSON.parse(req.body.tags); 
    } catch(e) { 
      parsedTags = Array.isArray(req.body.tags) ? req.body.tags : (req.body.tags ? String(req.body.tags).split(',').map(t=>t.trim()) : []);
    }
  }

  const documentData = {
    title: req.body.title,
    description: req.body.description,
    fileUrl: uploadResult.secure_url,
    publicId: uploadResult.public_id,
    fileSize: fileSize,
    fileType: fileType,
    uploadedBy: req.user._id,
    campus: req.user.campus || req.body.campus,
    faculty: req.body.faculty,
    department: req.body.department,
    category: req.body.category || 'other',
    tags: parsedTags,
    visibility: req.body.visibility || 'department',
    academicLevel: req.body.academicLevel || 'general',
    course: req.body.course,
    courseCode: req.body.courseCode,
    semester: req.body.semester || 'all',
    academicYear: req.body.academicYear,
    language: req.body.language || 'en',
    difficulty: req.body.difficulty || 'all',
    uploadStatus: 'approved'
  };

  const newDoc = await Document.create(documentData);

  res.status(201).json({
    status: 'success',
    message: 'Document uploaded successfully',
    data: { document: newDoc },
  });
});

// ✏️ Update document metadata (not file)
exports.updateDocument = catchAsync(async (req, res, next) => {
  const document = await Document.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!document) return next(new AppError('No document found with that ID', 404));

  res.status(200).json({
    status: 'success',
    message: 'Document updated successfully',
    data: { document },
  });
});

// ❌ Delete document (and file on Cloudinary)
exports.deleteDocument = catchAsync(async (req, res, next) => {
  const document = await Document.findById(req.params.id);
  if (!document) return next(new AppError('No document found with that ID', 404));

  if (document.publicId) {
    await cloudinary.uploader.destroy(document.publicId, {
      resource_type: 'auto',
    });
  }

  await document.deleteOne();

  res.status(204).json({
    status: 'success',
    message: 'Document deleted successfully',
    data: null,
  });
});

// 🔍 Search documents with full-text search
exports.searchDocuments = catchAsync(async (req, res, next) => {
  const { q, page = 1, limit = 20, faculty, department, category, sort = '-createdAt' } = req.query;

  if (!q) {
    return next(new AppError('Please provide a search query.', 400));
  }

  const skip = (page - 1) * limit;

  // Build filter
  const filter = {
    $text: { $search: q },
    archived: false
  };

  if (faculty) filter.faculty = faculty;
  if (department) filter.department = department;
  if (category) filter.category = category;

  const totalResults = await Document.countDocuments(filter);
  const documents = await Document.find(filter)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .lean();

  res.status(200).json({
    status: 'success',
    results: documents.length,
    total: totalResults,
    page,
    pages: Math.ceil(totalResults / limit),
    data: { documents }
  });
});

// 📊 Get documents by faculty
exports.getDocumentsByFaculty = catchAsync(async (req, res, next) => {
  const { facultyId } = req.params;
  const { page = 1, limit = 20, sort = '-createdAt', department, category } = req.query;

  // Verify faculty exists
  const faculty = await Faculty.findById(facultyId);
  if (!faculty) {
    return next(new AppError('Faculty not found.', 404));
  }

  const skip = (page - 1) * limit;
  const filter = { faculty: facultyId, archived: false };

  if (department) filter.department = department;
  if (category) filter.category = category;

  const total = await Document.countDocuments(filter);
  const documents = await Document.find(filter)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .lean();

  res.status(200).json({
    status: 'success',
    results: documents.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    faculty: {
      id: faculty._id,
      name: faculty.name,
      code: faculty.code
    },
    data: { documents }
  });
});

// 📂 Get documents by department
exports.getDocumentsByDepartment = catchAsync(async (req, res, next) => {
  const { departmentId } = req.params;
  const { page = 1, limit = 20, sort = '-createdAt', category, academicLevel } = req.query;

  // Verify department exists
  const department = await Department.findById(departmentId);
  if (!department) {
    return next(new AppError('Department not found.', 404));
  }

  const skip = (page - 1) * limit;
  const filter = { department: departmentId, archived: false };

  if (category) filter.category = category;
  if (academicLevel) filter.academicLevel = academicLevel;

  const total = await Document.countDocuments(filter);
  const documents = await Document.find(filter)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .lean();

  res.status(200).json({
    status: 'success',
    results: documents.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    department: {
      id: department._id,
      name: department.name,
      code: department.code,
      faculty: department.faculty
    },
    data: { documents }
  });
});

// 🏆 Get trending documents
exports.getTrendingDocuments = catchAsync(async (req, res, next) => {
  const { timeframe = '7d', faculty, department, limit = 20 } = req.query;

  let dateFilter = new Date();
  const timeframeMap = {
    '24h': 1,
    '7d': 7,
    '30d': 30,
    '90d': 90,
    'all': 365
  };

  const days = timeframeMap[timeframe] || 7;
  dateFilter.setDate(dateFilter.getDate() - days);

  const filter = {
    createdAt: { $gte: dateFilter },
    archived: false,
    uploadStatus: 'approved'
  };

  if (faculty) filter.faculty = faculty;
  if (department) filter.department = department;

  const documents = await Document.find(filter)
    .sort({ downloads: -1, views: -1, favoritesCount: -1 })
    .limit(parseInt(limit, 10))
    .lean();

  res.status(200).json({
    status: 'success',
    results: documents.length,
    timeframe,
    data: { documents }
  });
});

// ⭐ Get documents by academic level
exports.getDocumentsByAcademicLevel = catchAsync(async (req, res, next) => {
  const { level } = req.params;
  const { page = 1, limit = 20, sort = '-createdAt', department, course, semester } = req.query;

  const validLevels = ['100', '200', '300', '400', '500', 'postgraduate'];
  if (!validLevels.includes(level)) {
    return next(new AppError(`Invalid academic level. Must be one of: ${validLevels.join(', ')}`, 400));
  }

  const skip = (page - 1) * limit;
  const filter = { academicLevel: level, archived: false };

  if (department) filter.department = department;
  if (course) filter.course = course;
  if (semester) filter.semester = semester;

  const total = await Document.countDocuments(filter);
  const documents = await Document.find(filter)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .lean();

  res.status(200).json({
    status: 'success',
    results: documents.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    academicLevel: level,
    data: { documents }
  });
});

// 📚 Get documents by course
exports.getDocumentsByCourse = catchAsync(async (req, res, next) => {
  const { courseCode } = req.params;
  const { page = 1, limit = 20, sort = '-createdAt', department, academicLevel } = req.query;

  const skip = (page - 1) * limit;
  const filter = { courseCode: courseCode.toUpperCase(), archived: false };

  if (department) filter.department = department;
  if (academicLevel) filter.academicLevel = academicLevel;

  const total = await Document.countDocuments(filter);
  const documents = await Document.find(filter)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .lean();

  res.status(200).json({
    status: 'success',
    results: documents.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    courseCode: courseCode.toUpperCase(),
    data: { documents }
  });
});

// 🎓 Get documents by semester
exports.getDocumentsBySemester = catchAsync(async (req, res, next) => {
  const { semester } = req.params;
  const { page = 1, limit = 20, sort = '-createdAt', department, academicYear, academicLevel } = req.query;

  const validSemesters = ['first', 'second', 'summer'];
  if (!validSemesters.includes(semester)) {
    return next(new AppError(`Invalid semester. Must be one of: ${validSemesters.join(', ')}`, 400));
  }

  const skip = (page - 1) * limit;
  const filter = { semester: semester, archived: false };

  if (department) filter.department = department;
  if (academicYear) filter.academicYear = academicYear;
  if (academicLevel) filter.academicLevel = academicLevel;

  const total = await Document.countDocuments(filter);
  const documents = await Document.find(filter)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .lean();

  res.status(200).json({
    status: 'success',
    results: documents.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    semester,
    data: { documents }
  });
});

// 📈 Get document analytics by faculty/department
exports.getDocumentAnalytics = catchAsync(async (req, res, next) => {
  const { faculty, department } = req.query;

  const filter = { archived: false, uploadStatus: 'approved' };
  if (faculty) filter.faculty = faculty;
  if (department) filter.department = department;

  // Analytics aggregation
  const analytics = await Document.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        totalDocuments: { $sum: 1 },
        totalViews: { $sum: '$views' },
        totalDownloads: { $sum: '$downloads' },
        totalFavorites: { $sum: '$favoritesCount' },
        averageRating: { $avg: '$averageRating' },
        totalComments: { $sum: '$commentsCount' }
      }
    }
  ]);

  // Category breakdown
  const categoryBreakdown = await Document.aggregate([
    { $match: filter },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        views: { $sum: '$views' },
        downloads: { $sum: '$downloads' }
      }
    }
  ]);

  // Academic level breakdown
  const levelBreakdown = await Document.aggregate([
    { $match: filter },
    {
      $group: {
        _id: '$academicLevel',
        count: { $sum: 1 },
        views: { $sum: '$views' }
      }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      overall: analytics[0] || { totalDocuments: 0, totalViews: 0, totalDownloads: 0 },
      byCategory: categoryBreakdown,
      byAcademicLevel: levelBreakdown
    }
  });
});


