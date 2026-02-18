const AppError = require('../utils/appError');

/**
 * Validate document upload fields
 * Ensures all required fields are present and valid
 */
exports.validateDocumentUpload = (req, res, next) => {
  const errors = [];

  // Check required fields
  if (!req.body.title || req.body.title.trim() === '') {
    errors.push('Title is required');
  }

  if (!req.body.faculty || req.body.faculty.trim() === '') {
    errors.push('Faculty is required');
  }

  if (!req.body.department || req.body.department.trim() === '') {
    errors.push('Department is required');
  }

  if (!req.body.academicLevel || req.body.academicLevel.trim() === '') {
    errors.push('Academic level is required (100, 200, 300, 400, 500, or postgraduate)');
  }

  // Validate academic level
  const validLevels = ['100', '200', '300', '400', '500', 'postgraduate'];
  if (req.body.academicLevel && !validLevels.includes(req.body.academicLevel)) {
    errors.push(`Invalid academic level. Must be one of: ${validLevels.join(', ')}`);
  }

  // Validate optional fields if provided
  if (req.body.semester) {
    const validSemesters = ['first', 'second', 'summer', 'all'];
    if (!validSemesters.includes(req.body.semester)) {
      errors.push(`Invalid semester. Must be one of: ${validSemesters.join(', ')}`);
    }
  }

  if (req.body.difficulty) {
    const validDifficulty = ['beginner', 'intermediate', 'advanced', 'all'];
    if (!validDifficulty.includes(req.body.difficulty)) {
      errors.push(`Invalid difficulty. Must be one of: ${validDifficulty.join(', ')}`);
    }
  }

  if (req.body.category) {
    const validCategories = ['assignment', 'note', 'past-question', 'project', 'other'];
    if (!validCategories.includes(req.body.category)) {
      errors.push(`Invalid category. Must be one of: ${validCategories.join(', ')}`);
    }
  }

  if (req.body.visibility) {
    const validVisibility = ['public', 'campus', 'faculty', 'department', 'private'];
    if (!validVisibility.includes(req.body.visibility)) {
      errors.push(`Invalid visibility. Must be one of: ${validVisibility.join(', ')}`);
    }
  }

  if (req.body.language) {
    const validLanguages = ['en', 'fr', 'es', 'other'];
    if (!validLanguages.includes(req.body.language)) {
      errors.push(`Invalid language. Must be one of: ${validLanguages.join(', ')}`);
    }
  }

  // Validate academic year format if provided
  if (req.body.academicYear) {
    const yearRegex = /^\d{4}\/\d{4}$/;
    if (!yearRegex.test(req.body.academicYear)) {
      errors.push('Academic year must be in format YYYY/YYYY (e.g., 2024/2025)');
    }
  }

  // Return errors if any
  if (errors.length > 0) {
    return next(new AppError(errors.join('; '), 400));
  }

  next();
};

/**
 * Validate level-based filter
 */
exports.validateAcademicLevel = (req, res, next) => {
  const validLevels = ['100', '200', '300', '400', '500', 'postgraduate'];
  const level = req.params.level;

  if (!validLevels.includes(level)) {
    return next(
      new AppError(
        `Invalid academic level. Must be one of: ${validLevels.join(', ')}`,
        400
      )
    );
  }

  next();
};

/**
 * Validate semester filter
 */
exports.validateSemester = (req, res, next) => {
  const validSemesters = ['first', 'second', 'summer'];
  const semester = req.params.semester;

  if (!validSemesters.includes(semester)) {
    return next(
      new AppError(
        `Invalid semester. Must be one of: ${validSemesters.join(', ')}`,
        400
      )
    );
  }

  next();
};

/**
 * Validate document category
 */
exports.validateCategory = (req, res, next) => {
  const validCategories = ['assignment', 'note', 'past-question', 'project', 'other'];
  
  if (req.query.category && !validCategories.includes(req.query.category)) {
    return next(
      new AppError(
        `Invalid category. Must be one of: ${validCategories.join(', ')}`,
        400
      )
    );
  }

  next();
};

/**
 * Validate faculty query
 */
exports.validateFacultyQuery = (req, res, next) => {
  if (req.query.faculty && !req.query.faculty.match(/^[0-9a-fA-F]{24}$/)) {
    return next(new AppError('Invalid faculty ID format', 400));
  }
  next();
};

/**
 * Validate department query
 */
exports.validateDepartmentQuery = (req, res, next) => {
  if (req.query.department && !req.query.department.match(/^[0-9a-fA-F]{24}$/)) {
    return next(new AppError('Invalid department ID format', 400));
  }
  next();
};
