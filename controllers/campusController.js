const Campus = require('../models/campusModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// Create a new campus
exports.createCampus = catchAsync(async (req, res, next) => {
  const campus = await Campus.create(req.body);

  res.status(201).json({
    status: 'success',
    data: campus
  });
});

// Get all campuses
exports.getAllCampuses = catchAsync(async (req, res, next) => {
  const campuses = await Campus.find().sort('name');

  res.status(200).json({
    status: 'success',
    results: campuses.length,
    data: campuses
  });
});

// Get a single campus
exports.getCampus = catchAsync(async (req, res, next) => {
  const campus = await Campus.findById(req.params.id);
  if (!campus) return next(new AppError('No campus found with that ID', 404));

  res.status(200).json({
    status: 'success',
    data: campus
  });
});

// Update a campus
exports.updateCampus = catchAsync(async (req, res, next) => {
  const campus = await Campus.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  if (!campus) return next(new AppError('No campus found with that ID', 404));

  res.status(200).json({
    status: 'success',
    data: campus
  });
});

// Delete a campus
exports.deleteCampus = catchAsync(async (req, res, next) => {
  const campus = await Campus.findByIdAndDelete(req.params.id);
  if (!campus) return next(new AppError('No campus found with that ID', 404));

  res.status(204).json({
    status: 'success',
    data: null
  });
});
