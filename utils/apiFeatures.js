class APIFeatures {
  constructor(query, queryString) {
    this.query = query; // mongoose query
    this.queryString = queryString; // req.query
  }

  filter() {
    const queryObj = { ...this.queryString };
    const excludedFields = ['page', 'sort', 'limit', 'fields', 'search', 'allCampuses'];
    excludedFields.forEach(el => delete queryObj[el]);

    // Advanced filtering (gte, gt, lte, lt)
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt|ne|in)\b/g, match => `$${match}`);
    
    // IMPORTANT: The controller already called Product.find() with initial filters
    // Only apply additional filters if queryObj is not empty
    const filterObj = JSON.parse(queryStr);

    // Convert comma-separated strings (e.g. category=id1,id2) or arrays into $in filters
    Object.keys(filterObj).forEach((key) => {
      const val = filterObj[key];
      // If value is a string containing commas, convert to $in array
      if (typeof val === 'string' && val.includes(',')) {
        filterObj[key] = { $in: val.split(',').map(v => v.trim()).filter(Boolean) };
      }
      // If value is an array (from query parsing), also convert to $in
      if (Array.isArray(val)) {
        filterObj[key] = { $in: val.map(v => (typeof v === 'string' ? v.trim() : v)).filter(Boolean) };
      }
    });
    if (Object.keys(filterObj).length > 0) {
      // Use .where() to ADD to existing query, NOT .find() which would replace it
      this.query = this.query.where(filterObj);
    }
    return this;
  }

  search() {
    if (this.queryString.search) {
      const searchRegex = new RegExp(this.queryString.search, 'i');
      console.log('\n🔎 APIFeatures.search() called');
      console.log('   Search term:', this.queryString.search);
      console.log('   Regex pattern:', searchRegex.toString());
      console.log('   Searching in fields:');
      console.log('     - title');
      console.log('     - description');
      console.log('     - location.address');
      console.log('     - location.city');
      console.log('     - amenities');
      console.log('     - preferences.lifestyleCompatibility');
      console.log('     - preferences.studyHabits');
      
      // IMPORTANT: Use .or() instead of .where() for complex $or queries
      // .where($or) doesn't work properly - it requires separate conditions
      this.query = this.query.or([
        { title: searchRegex },
        { name: searchRegex },
        { description: searchRegex },
        { address: searchRegex },
        { 'location.address': searchRegex },
        { 'location.city': searchRegex },
        { amenities: searchRegex },
        { 'preferences.lifestyleCompatibility': searchRegex },
        { 'preferences.studyHabits': searchRegex }
      ]);
      console.log('   ✅ Search filter applied using .or()');
    } else {
      console.log('\n🔎 APIFeatures.search() - NO search term provided');
    }
    return this;
  }

  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').join(' ');
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort('-createdAt');
    }
    return this;
  }

  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ');
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select('-__v');
    }
    return this;
  }

  paginate() {
    const page = parseInt(this.queryString.page, 10) || 1;
    const limit = parseInt(this.queryString.limit, 10) || 100;
    const skip = (page - 1) * limit;
    this.query = this.query.skip(skip).limit(limit);
    return this;
  }
}

module.exports = APIFeatures;
