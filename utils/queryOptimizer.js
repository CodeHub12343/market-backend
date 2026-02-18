const logger = require('./logger');

class QueryOptimizer {
  // Optimize sort operations
  static optimizeSort(query, allowedFields) {
    if (query.sort) {
      const sortFields = query.sort.split(',');
      const validSortFields = sortFields.filter(field => 
        allowedFields.includes(field.replace('-', ''))
      );
      return validSortFields.join(' ');
    }
    return '-createdAt'; // default sort
  }

  // Optimize field selection
  static optimizeSelect(query, allowedFields) {
    if (query.fields) {
      const fields = query.fields.split(',');
      const validFields = fields.filter(field => 
        allowedFields.includes(field)
      );
      return validFields.join(' ');
    }
    return ''; // return all fields by default
  }

  // Optimize pagination
  static optimizePagination(query) {
    const page = parseInt(query.page, 10) || 1;
    const limit = Math.min(parseInt(query.limit, 10) || 10, 100); // max 100 items per page
    const skip = (page - 1) * limit;

    return { skip, limit };
  }

  // Optimize filters
  static optimizeFilters(query, allowedFields) {
    const queryObj = { ...query };
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach(el => delete queryObj[el]);

    // Filter out invalid fields
    Object.keys(queryObj).forEach(key => {
      if (!allowedFields.includes(key)) {
        delete queryObj[key];
      }
    });

    // Advanced filtering
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);

    return JSON.parse(queryStr);
  }

  // Create compound index suggestions
  static analyzeQueryPatterns(query, model) {
    const patterns = [];
    const fields = Object.keys(query);

    if (fields.length > 1) {
      // Log potential index suggestions
      logger.info('Compound index suggestion:', fields.join(' '));
      patterns.push(fields);
    }

    return patterns;
  }

  // Main optimization method
  static async optimizeQuery(model, query, allowedFields) {
    try {
      // Analyze query patterns for index suggestions
      this.analyzeQueryPatterns(query, model);

      // Build optimized query
      const filters = this.optimizeFilters(query, allowedFields);
      const sort = this.optimizeSort(query, allowedFields);
      const select = this.optimizeSelect(query, allowedFields);
      const { skip, limit } = this.optimizePagination(query);

      // Create base query
      let dbQuery = model.find(filters);

      // Apply sort
      if (sort) {
        dbQuery = dbQuery.sort(sort);
      }

      // Apply field selection
      if (select) {
        dbQuery = dbQuery.select(select);
      }

      // Apply pagination
      dbQuery = dbQuery.skip(skip).limit(limit);

      // Use lean() for better performance when possible
      if (!query.requireDocuments) {
        dbQuery = dbQuery.lean();
      }

      // Execute query
      const results = await dbQuery;
      const total = await model.countDocuments(filters);

      return {
        results,
        total,
        page: Math.ceil(skip / limit) + 1,
        totalPages: Math.ceil(total / limit)
      };
    } catch (err) {
      logger.error('Query optimization error:', err);
      throw err;
    }
  }
}

module.exports = QueryOptimizer;