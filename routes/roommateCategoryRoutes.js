const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middlewares/authMiddleware');
const RoommateCategory = require('../models/roommateCategoryModel');

// @route   GET /api/roommate-categories
// @desc    Get all roommate categories
// @access  Public
router.get('/', async (req, res) => {
  try {
    const categories = await RoommateCategory.find({ status: 'active' })
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
      message: 'Error fetching roommate categories',
      error: error.message
    });
  }
});

// @route   GET /api/roommate-categories/:id
// @desc    Get single roommate category
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const category = await RoommateCategory.findById(req.params.id);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Roommate category not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: category
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching roommate category',
      error: error.message
    });
  }
});

// @route   POST /api/roommate-categories
// @desc    Create new roommate category (Admin only)
// @access  Private/Admin
router.post('/', protect, restrictTo('admin'), async (req, res) => {
  try {
    const { name, slug, description, icon, color, accommodationType, roomType, sortOrder } = req.body;
    
    const category = await RoommateCategory.create({
      name,
      slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
      description,
      icon,
      color,
      accommodationType,
      roomType,
      sortOrder
    });
    
    res.status(201).json({
      success: true,
      message: 'Roommate category created successfully',
      data: category
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error creating roommate category',
      error: error.message
    });
  }
});

// @route   PUT /api/roommate-categories/:id
// @desc    Update roommate category (Admin only)
// @access  Private/Admin
router.put('/:id', protect, restrictTo('admin'), async (req, res) => {
  try {
    const category = await RoommateCategory.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Roommate category not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Roommate category updated successfully',
      data: category
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error updating roommate category',
      error: error.message
    });
  }
});

// @route   DELETE /api/roommate-categories/:id
// @desc    Delete roommate category (Admin only)
// @access  Private/Admin
router.delete('/:id', protect, restrictTo('admin'), async (req, res) => {
  try {
    const category = await RoommateCategory.findByIdAndDelete(req.params.id);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Roommate category not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Roommate category deleted successfully',
      data: category
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting roommate category',
      error: error.message
    });
  }
});

module.exports = router;
