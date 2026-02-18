const Department = require('../models/departmentModel');
const Faculty = require('../models/facultyModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// 📂 Get all departments
exports.getAllDepartments = catchAsync(async (req, res, next) => {
  const { faculty, campus, isActive = true, page = 1, limit = 20, sort = '-createdAt' } = req.query;

  const skip = (page - 1) * limit;
  const filter = { isActive };

  if (faculty) filter.faculty = faculty;
  if (campus) filter.campus = campus;

  const total = await Department.countDocuments(filter);
  const departments = await Department.find(filter)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .populate('faculty', 'name code')
    .populate('campus', 'name location')
    .populate('hod', 'fullName email')
    .lean();

  res.status(200).json({
    status: 'success',
    results: departments.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    data: { departments }
  });
});

// 📋 Get single department
exports.getDepartment = catchAsync(async (req, res, next) => {
  const department = await Department.findById(req.params.id)
    .populate('faculty', 'name code')
    .populate('campus', 'name location')
    .populate('hod', 'fullName email');

  if (!department) {
    return next(new AppError('Department not found.', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { department }
  });
});

// ✏️ Create department (admin only)
exports.createDepartment = catchAsync(async (req, res, next) => {
  // Validate required fields
  if (!req.body.name || !req.body.code || !req.body.faculty) {
    return next(new AppError('Please provide name, code, and faculty.', 400));
  }

  // Verify faculty exists
  const faculty = await Faculty.findById(req.body.faculty);
  if (!faculty) {
    return next(new AppError('Faculty not found.', 404));
  }

  const newDepartment = await Department.create({
    name: req.body.name,
    code: req.body.code.toUpperCase(),
    description: req.body.description,
    faculty: req.body.faculty,
    campus: faculty.campus,
    hod: req.body.hod,
    image: req.body.image,
    website: req.body.website,
    email: req.body.email,
    phoneNumber: req.body.phoneNumber,
    programLevels: req.body.programLevels || ['100', '200', '300', '400'],
    isActive: req.body.isActive !== false
  });

  // Update faculty's departmentsCount
  faculty.departmentsCount = (faculty.departmentsCount || 0) + 1;
  if (!faculty.departments) faculty.departments = [];
  faculty.departments.push(newDepartment._id);
  await faculty.save();

  res.status(201).json({
    status: 'success',
    message: 'Department created successfully.',
    data: { department: newDepartment }
  });
});

// 🔄 Update department
exports.updateDepartment = catchAsync(async (req, res, next) => {
  // Don't allow faculty/code updates after creation for integrity
  delete req.body.faculty;
  delete req.body.code;

  const department = await Department.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  if (!department) {
    return next(new AppError('Department not found.', 404));
  }

  res.status(200).json({
    status: 'success',
    message: 'Department updated successfully.',
    data: { department }
  });
});

// ❌ Delete department
exports.deleteDepartment = catchAsync(async (req, res, next) => {
  const department = await Department.findById(req.params.id);

  if (!department) {
    return next(new AppError('Department not found.', 404));
  }

  // Remove from faculty's departments array
  const faculty = await Faculty.findById(department.faculty);
  if (faculty) {
    faculty.departments = faculty.departments.filter(d => d.toString() !== req.params.id);
    faculty.departmentsCount = Math.max(0, (faculty.departmentsCount || 1) - 1);
    await faculty.save();
  }

  await Department.findByIdAndDelete(req.params.id);

  res.status(204).json({
    status: 'success',
    message: 'Department deleted successfully.',
    data: null
  });
});

// 🔍 Search departments
exports.searchDepartments = catchAsync(async (req, res, next) => {
  const { q, faculty, page = 1, limit = 20 } = req.query;

  if (!q) {
    return next(new AppError('Please provide a search query.', 400));
  }

  const skip = (page - 1) * limit;
  const filter = {
    $text: { $search: q },
    isActive: true
  };

  if (faculty) filter.faculty = faculty;

  const total = await Department.countDocuments(filter);
  const departments = await Department.find(filter)
    .sort({ score: { $meta: 'textScore' } })
    .skip(skip)
    .limit(limit)
    .lean();

  res.status(200).json({
    status: 'success',
    results: departments.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    data: { departments }
  });
});

// 📊 Get department statistics
exports.getDepartmentStats = catchAsync(async (req, res, next) => {
  const { departmentId } = req.params;

  const department = await Department.findById(departmentId);
  if (!department) {
    return next(new AppError('Department not found.', 404));
  }

  // Get document counts
  const Document = require('../models/documentModel');
  const mongoose = require('mongoose');
  
  const stats = await Document.aggregate([
    { 
      $match: { 
        department: mongoose.Types.ObjectId(departmentId), 
        archived: false 
      } 
    },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        views: { $sum: '$views' },
        downloads: { $sum: '$downloads' },
        avgRating: { $avg: '$averageRating' }
      }
    }
  ]);

  // Get by academic level
  const byLevel = await Document.aggregate([
    { 
      $match: { 
        department: mongoose.Types.ObjectId(departmentId), 
        archived: false 
      } 
    },
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
      department: { 
        name: department.name, 
        code: department.code,
        faculty: department.faculty 
      },
      documentStats: stats,
      byAcademicLevel: byLevel,
      totalDocuments: department.documentsCount
    }
  });
});

// 📚 Get departments by faculty
exports.getDepartmentsByFaculty = catchAsync(async (req, res, next) => {
  const { facultyId } = req.params;
  const { page = 1, limit = 20, sort = '-createdAt' } = req.query;

  // Verify faculty exists
  const faculty = await Faculty.findById(facultyId);
  if (!faculty) {
    return next(new AppError('Faculty not found.', 404));
  }

  const skip = (page - 1) * limit;
  const filter = { faculty: facultyId, isActive: true };

  const total = await Department.countDocuments(filter);
  const departments = await Department.find(filter)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .populate('hod', 'fullName email')
    .lean();

  res.status(200).json({
    status: 'success',
    results: departments.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    faculty: {
      id: faculty._id,
      name: faculty.name,
      code: faculty.code
    },
    data: { departments }
  });
});
