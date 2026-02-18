const Faculty = require('../models/facultyModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// 📚 Get all faculties
exports.getAllFaculties = catchAsync(async (req, res, next) => {
  const { campus, isActive = true, page = 1, limit = 20, sort = '-createdAt' } = req.query;

  const skip = (page - 1) * limit;
  const filter = { isActive };

  if (campus) filter.campus = campus;

  const total = await Faculty.countDocuments(filter);
  const faculties = await Faculty.find(filter)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .populate('dean', 'fullName email')
    .populate('campus', 'name location')
    .lean();

  res.status(200).json({
    status: 'success',
    results: faculties.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    data: { faculties }
  });
});

// 📄 Get single faculty
exports.getFaculty = catchAsync(async (req, res, next) => {
  const faculty = await Faculty.findById(req.params.id)
    .populate('dean', 'fullName email')
    .populate('campus', 'name location')
    .populate({
      path: 'departments',
      select: 'name code description'
    });

  if (!faculty) {
    return next(new AppError('Faculty not found.', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { faculty }
  });
});

// ✏️ Create faculty (admin only)
exports.createFaculty = catchAsync(async (req, res, next) => {
  // Validate required fields
  if (!req.body.name || !req.body.code || !req.body.campus) {
    return next(new AppError('Please provide name, code, and campus.', 400));
  }

  const newFaculty = await Faculty.create({
    name: req.body.name,
    code: req.body.code.toUpperCase(),
    description: req.body.description,
    campus: req.body.campus,
    dean: req.body.dean,
    image: req.body.image,
    website: req.body.website,
    email: req.body.email,
    phoneNumber: req.body.phoneNumber,
    isActive: req.body.isActive !== false
  });

  res.status(201).json({
    status: 'success',
    message: 'Faculty created successfully.',
    data: { faculty: newFaculty }
  });
});

// 🔄 Update faculty
exports.updateFaculty = catchAsync(async (req, res, next) => {
  // Don't allow campus/code updates after creation for integrity
  delete req.body.campus;
  delete req.body.code;

  const faculty = await Faculty.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  if (!faculty) {
    return next(new AppError('Faculty not found.', 404));
  }

  res.status(200).json({
    status: 'success',
    message: 'Faculty updated successfully.',
    data: { faculty }
  });
});

// ❌ Delete faculty
exports.deleteFaculty = catchAsync(async (req, res, next) => {
  const faculty = await Faculty.findById(req.params.id);

  if (!faculty) {
    return next(new AppError('Faculty not found.', 404));
  }

  // Check if faculty has departments
  if (faculty.departmentsCount > 0) {
    return next(new AppError('Cannot delete faculty with departments. Delete departments first.', 400));
  }

  await Faculty.findByIdAndDelete(req.params.id);

  res.status(204).json({
    status: 'success',
    message: 'Faculty deleted successfully.',
    data: null
  });
});

// 🔍 Search faculties
exports.searchFaculties = catchAsync(async (req, res, next) => {
  const { q, campus, page = 1, limit = 20 } = req.query;

  if (!q) {
    return next(new AppError('Please provide a search query.', 400));
  }

  const skip = (page - 1) * limit;
  const filter = {
    $text: { $search: q },
    isActive: true
  };

  if (campus) filter.campus = campus;

  const total = await Faculty.countDocuments(filter);
  const faculties = await Faculty.find(filter)
    .sort({ score: { $meta: 'textScore' } })
    .skip(skip)
    .limit(limit)
    .lean();

  res.status(200).json({
    status: 'success',
    results: faculties.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    data: { faculties }
  });
});

// 📊 Get faculty statistics
exports.getFacultyStats = catchAsync(async (req, res, next) => {
  const { facultyId } = req.params;

  const faculty = await Faculty.findById(facultyId);
  if (!faculty) {
    return next(new AppError('Faculty not found.', 404));
  }

  // Get document counts by category
  const Document = require('../models/documentModel');
  const stats = await Document.aggregate([
    { $match: { faculty: new require('mongoose').Types.ObjectId(facultyId), archived: false } },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        views: { $sum: '$views' },
        downloads: { $sum: '$downloads' }
      }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      faculty: { name: faculty.name, code: faculty.code },
      documentStats: stats,
      totalDocuments: faculty.documentsCount,
      totalDepartments: faculty.departmentsCount
    }
  });
});
