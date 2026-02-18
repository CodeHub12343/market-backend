const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middlewares/authMiddleware');
const ProductCategory = require('../models/productCategoryModel');

// @route   GET /api/product-categories
// @desc    Get all product categories
// @access  Public
router.get('/', async (req, res) => {
  try {
    const categories = await ProductCategory.find({ status: 'active' })
      .sort('sortOrder')
      .lean();
    
    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching product categories',
      error: error.message
    });
  }
});

// @route   GET /api/product-categories/:id
// @desc    Get single product category
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const category = await ProductCategory.findById(req.params.id);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Product category not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: category
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching product category',
      error: error.message
    });
  }
});

// @route   POST /api/product-categories
// @desc    Create new product category (Admin only)
// @access  Private/Admin
router.post('/', protect, restrictTo('admin'), async (req, res) => {
  try {
    const { name, slug, description, icon, color, sortOrder } = req.body;
    
    const category = await ProductCategory.create({
      name,
      slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
      description,
      icon,
      color,
      sortOrder
    });
    
    res.status(201).json({
      success: true,
      message: 'Product category created successfully',
      data: category
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error creating product category',
      error: error.message
    });
  }
});

// @route   PUT /api/product-categories/:id
// @desc    Update product category (Admin only)
// @access  Private/Admin
router.put('/:id', protect, restrictTo('admin'), async (req, res) => {
  try {
    const category = await ProductCategory.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Product category not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Product category updated successfully',
      data: category
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error updating product category',
      error: error.message
    });
  }
});

// @route   DELETE /api/product-categories/:id
// @desc    Delete product category (Admin only)
// @access  Private/Admin
router.delete('/:id', protect, restrictTo('admin'), async (req, res) => {
  try {
    const category = await ProductCategory.findByIdAndDelete(req.params.id);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Product category not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Product category deleted successfully',
      data: category
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting product category',
      error: error.message
    });
  }
});

module.exports = router;
