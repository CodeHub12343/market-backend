const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middlewares/authMiddleware');
const RequestCategory = require('../models/requestCategoryModel');

// @route   GET /api/request-categories
// @desc    Get all request categories
// @access  Public
router.get('/', async (req, res) => {
  try {
    const categories = await RequestCategory.find({ status: 'active' })
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
      message: 'Error fetching request categories',
      error: error.message
    });
  }
});

// @route   GET /api/request-categories/:id
// @desc    Get single request category
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const category = await RequestCategory.findById(req.params.id);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Request category not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: category
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching request category',
      error: error.message
    });
  }
});

// @route   POST /api/request-categories
// @desc    Create new request category (Admin only)
// @access  Private/Admin
router.post('/', protect, restrictTo('admin'), async (req, res) => {
  try {
    const { name, slug, description, icon, color, estimatedBudgetRange, urgencyLevels, sortOrder } = req.body;
    
    const category = await RequestCategory.create({
      name,
      slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
      description,
      icon,
      color,
      estimatedBudgetRange,
      urgencyLevels,
      sortOrder
    });
    
    res.status(201).json({
      success: true,
      message: 'Request category created successfully',
      data: category
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error creating request category',
      error: error.message
    });
  }
});

// @route   PUT /api/request-categories/:id
// @desc    Update request category (Admin only)
// @access  Private/Admin
router.put('/:id', protect, restrictTo('admin'), async (req, res) => {
  try {
    const category = await RequestCategory.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Request category not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Request category updated successfully',
      data: category
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error updating request category',
      error: error.message
    });
  }
});

// @route   DELETE /api/request-categories/:id
// @desc    Delete request category (Admin only)
// @access  Private/Admin
router.delete('/:id', protect, restrictTo('admin'), async (req, res) => {
  try {
    const category = await RequestCategory.findByIdAndDelete(req.params.id);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Request category not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Request category deleted successfully',
      data: category
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting request category',
      error: error.message
    });
  }
});

module.exports = router;
