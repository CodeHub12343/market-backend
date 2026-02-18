const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middlewares/authMiddleware');
const ServiceCategory = require('../models/serviceCategoryModel');

// @route   GET /api/service-categories
// @desc    Get all service categories
// @access  Public
router.get('/', async (req, res) => {
  try {
    const categories = await ServiceCategory.find({ status: 'active' })
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
      message: 'Error fetching service categories',
      error: error.message
    });
  }
});

// @route   GET /api/service-categories/:id
// @desc    Get single service category
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const category = await ServiceCategory.findById(req.params.id);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Service category not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: category
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching service category',
      error: error.message
    });
  }
});

// @route   POST /api/service-categories
// @desc    Create new service category (Admin only)
// @access  Private/Admin
router.post('/', protect, restrictTo('admin'), async (req, res) => {
  try {
    const { name, slug, description, icon, color, minRate, rateUnit, sortOrder } = req.body;
    
    const category = await ServiceCategory.create({
      name,
      slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
      description,
      icon,
      color,
      minRate,
      rateUnit,
      sortOrder
    });
    
    res.status(201).json({
      success: true,
      message: 'Service category created successfully',
      data: category
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error creating service category',
      error: error.message
    });
  }
});

// @route   PUT /api/service-categories/:id
// @desc    Update service category (Admin only)
// @access  Private/Admin
router.put('/:id', protect, restrictTo('admin'), async (req, res) => {
  try {
    const category = await ServiceCategory.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Service category not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Service category updated successfully',
      data: category
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error updating service category',
      error: error.message
    });
  }
});

// @route   DELETE /api/service-categories/:id
// @desc    Delete service category (Admin only)
// @access  Private/Admin
router.delete('/:id', protect, restrictTo('admin'), async (req, res) => {
  try {
    const category = await ServiceCategory.findByIdAndDelete(req.params.id);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Service category not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Service category deleted successfully',
      data: category
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting service category',
      error: error.message
    });
  }
});

module.exports = router;
