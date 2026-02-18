const mongoose = require('mongoose');

class SearchFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  // Text search with scoring
  search() {
    if (this.queryString.search) {
      this.query = this.query.find(
        { $text: { $search: this.queryString.search } },
        { score: { $meta: 'textScore' } }
      ).sort({ score: { $meta: 'textScore' } });
    }
    return this;
  }

  // Filter by price range
  filterByPrice() {
    if (this.queryString.minPrice || this.queryString.maxPrice) {
      const priceFilter = {};
      if (this.queryString.minPrice) priceFilter.$gte = Number(this.queryString.minPrice);
      if (this.queryString.maxPrice) priceFilter.$lte = Number(this.queryString.maxPrice);
      this.query = this.query.find({ price: priceFilter });
    }
    return this;
  }

  // Filter by category
  filterByCategory() {
    if (this.queryString.category) {
      const categories = this.queryString.category.split(',');
      this.query = this.query.find({ category: { $in: categories } });
    }
    return this;
  }

  // Filter by location
  filterByLocation() {
    if (this.queryString.location) {
      const [lng, lat, radius] = this.queryString.location.split(',').map(Number);
      this.query = this.query.find({
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [lng, lat]
            },
            $maxDistance: radius * 1000 // Convert km to meters
          }
        }
      });
    }
    return this;
  }

  // Filter by availability
  filterByAvailability() {
    if (this.queryString.available === 'true') {
      this.query = this.query.find({ available: true });
    }
    return this;
  }

  // Filter by tags
  filterByTags() {
    if (this.queryString.tags) {
      const tags = this.queryString.tags.split(',');
      this.query = this.query.find({ tags: { $in: tags } });
    }
    return this;
  }

  // Filter by skills
  filterBySkills() {
    if (this.queryString.skills) {
      const skills = this.queryString.skills.split(',');
      this.query = this.query.find({ skills: { $in: skills } });
    }
    return this;
  }

  // Sort results
  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').join(' ');
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort('-createdAt');
    }
    return this;
  }

  // Paginate results
  paginate() {
    const page = parseInt(this.queryString.page, 10) || 1;
    const limit = parseInt(this.queryString.limit, 10) || 10;
    const skip = (page - 1) * limit;
    this.query = this.query.skip(skip).limit(limit);
    return this;
  }
}

module.exports = SearchFeatures;