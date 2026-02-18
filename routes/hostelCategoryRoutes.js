const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middlewares/authMiddleware');
const HostelCategory = require('../models/hostelCategoryModel');

// @route   GET /api/hostel-categories
// @desc    Get all hostel categories
// @access  Public
router.get('/', async (req, res) => {
  try {
    const categories = await HostelCategory.find({ status: 'active' })
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
      message: 'Error fetching hostel categories',
      error: error.message
    });
  }
});

// @route   GET /api/hostel-categories/:id
// @desc    Get single hostel category
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const category = await HostelCategory.findById(req.params.id);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Hostel category not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: category
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching hostel category',
      error: error.message
    });
  }
});

// @route   POST /api/hostel-categories
// @desc    Create new hostel category (Admin only)
// @access  Private/Admin
router.post('/', protect, restrictTo('admin'), async (req, res) => {
  try {
    const { name, slug, description, icon, color, amenities, priceRange, sortOrder } = req.body;
    
    const category = await HostelCategory.create({
      name,
      slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
      description,
      icon,
      color,
      amenities,
      priceRange,
      sortOrder
    });
    
    res.status(201).json({
      success: true,
      message: 'Hostel category created successfully',
      data: category
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error creating hostel category',
      error: error.message
    });
  }
});

// @route   PUT /api/hostel-categories/:id
// @desc    Update hostel category (Admin only)
// @access  Private/Admin
router.put('/:id', protect, restrictTo('admin'), async (req, res) => {
  try {
    const category = await HostelCategory.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Hostel category not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Hostel category updated successfully',
      data: category
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error updating hostel category',
      error: error.message
    });
  }
});

// @route   DELETE /api/hostel-categories/:id
// @desc    Delete hostel category (Admin only)
// @access  Private/Admin
router.delete('/:id', protect, restrictTo('admin'), async (req, res) => {
  try {
    const category = await HostelCategory.findByIdAndDelete(req.params.id);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Hostel category not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Hostel category deleted successfully',
      data: category
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting hostel category',
      error: error.message
    });
  }
});

module.exports = router;
