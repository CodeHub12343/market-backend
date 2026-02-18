const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middlewares/authMiddleware');
const EventCategory = require('../models/eventCategoryModel');

// @route   GET /api/event-categories
// @desc    Get all event categories
// @access  Public
router.get('/', async (req, res) => {
  try {
    const categories = await EventCategory.find({ status: 'active' })
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
      message: 'Error fetching event categories',
      error: error.message
    });
  }
});

// @route   GET /api/event-categories/:id
// @desc    Get single event category
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const category = await EventCategory.findById(req.params.id);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Event category not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: category
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching event category',
      error: error.message
    });
  }
});

// @route   POST /api/event-categories
// @desc    Create new event category (Admin only)
// @access  Private/Admin
router.post('/', protect, restrictTo('admin'), async (req, res) => {
  try {
    const { name, slug, description, icon, color, subtypes, sortOrder } = req.body;
    
    const category = await EventCategory.create({
      name,
      slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
      description,
      icon,
      color,
      subtypes,
      sortOrder
    });
    
    res.status(201).json({
      success: true,
      message: 'Event category created successfully',
      data: category
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error creating event category',
      error: error.message
    });
  }
});

// @route   PUT /api/event-categories/:id
// @desc    Update event category (Admin only)
// @access  Private/Admin
router.put('/:id', protect, restrictTo('admin'), async (req, res) => {
  try {
    const category = await EventCategory.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Event category not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Event category updated successfully',
      data: category
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error updating event category',
      error: error.message
    });
  }
});

// @route   DELETE /api/event-categories/:id
// @desc    Delete event category (Admin only)
// @access  Private/Admin
router.delete('/:id', protect, restrictTo('admin'), async (req, res) => {
  try {
    const category = await EventCategory.findByIdAndDelete(req.params.id);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Event category not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Event category deleted successfully',
      data: category
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting event category',
      error: error.message
    });
  }
});

module.exports = router;
