const Product = require('../models/productModel');
const Service = require('../models/serviceModel');
const User = require('../models/userModel');
const Post = require('../models/postModel');
const SearchFeatures = require('../utils/searchFeatures');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// Search & Filter Products
exports.searchProducts = catchAsync(async (req, res, next) => {
  const features = new SearchFeatures(Product.find(), req.query)
    .search()
    .filterByPrice()
    .filterByCategory()
    .filterByTags()
    .sort()
    .paginate();

  const products = await features.query;

  res.status(200).json({
    status: 'success',
    results: products.length,
    data: { products }
  });
});

// Search & Filter Services
exports.searchServices = catchAsync(async (req, res, next) => {
  const features = new SearchFeatures(Service.find(), req.query)
    .search()
    .filterByPrice()
    .filterByLocation()
    .filterByAvailability()
    .filterByCategory()
    .filterByTags()
    .sort()
    .paginate();

  const services = await features.query;

  res.status(200).json({
    status: 'success',
    results: services.length,
    data: { services }
  });
});

// Search & Filter Posts
exports.searchPosts = catchAsync(async (req, res, next) => {
  const features = new SearchFeatures(Post.find(), req.query)
    .search()
    .filterByTags()
    .sort()
    .paginate();

  const posts = await features.query;

  res.status(200).json({
    status: 'success',
    results: posts.length,
    data: { posts }
  });
});

// Search & Filter Users
exports.searchUsers = catchAsync(async (req, res, next) => {
  const features = new SearchFeatures(User.find(), req.query)
    .search()
    .filterBySkills()
    .filterByLocation()
    .sort()
    .paginate();

  const users = await features.query;

  res.status(200).json({
    status: 'success',
    results: users.length,
    data: { users }
  });
});

// Advanced Search across all collections
exports.globalSearch = catchAsync(async (req, res, next) => {
  const { query } = req.query;
  if (!query) {
    return next(new AppError('Please provide a search query', 400));
  }

  const [products, services, posts, users] = await Promise.all([
    Product.find(
      { $text: { $search: query } },
      { score: { $meta: 'textScore' } }
    ).sort({ score: { $meta: 'textScore' } }).limit(5),
    
    Service.find(
      { $text: { $search: query } },
      { score: { $meta: 'textScore' } }
    ).sort({ score: { $meta: 'textScore' } }).limit(5),
    
    Post.find(
      { $text: { $search: query } },
      { score: { $meta: 'textScore' } }
    ).sort({ score: { $meta: 'textScore' } }).limit(5),
    
    User.find(
      { $text: { $search: query } },
      { score: { $meta: 'textScore' } }
    ).sort({ score: { $meta: 'textScore' } }).limit(5)
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      products,
      services,
      posts,
      users
    }
  });
});