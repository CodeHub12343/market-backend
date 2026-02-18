#!/usr/bin/env node
require('dotenv').config({ path: './config.env' });

const mongoose = require('mongoose');
const Hostel = require('../models/hostelModel');
const HostelCategory = require('../models/hostelCategoryModel');

async function assignCategories() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Get all categories
    const categories = await HostelCategory.find();
    if (categories.length === 0) {
      console.log('❌ No hostel categories found. Run seedCategories.js first.');
      process.exit(1);
    }

    console.log(`📂 Found ${categories.length} hostel categories`);

    // Get all hostels without a category
    const hostelCount = await Hostel.countDocuments({ category: null });
    console.log(`🏨 Found ${hostelCount} hostels without a category`);

    if (hostelCount === 0) {
      console.log('✅ All hostels already have categories assigned!');
      process.exit(0);
    }

    // Assign categories to hostels (cycling through available categories)
    const hostels = await Hostel.find({ category: null });
    
    let updateCount = 0;
    for (let i = 0; i < hostels.length; i++) {
      const hostel = hostels[i];
      const categoryIndex = i % categories.length; // Cycle through categories
      const category = categories[categoryIndex];
      
      await Hostel.findByIdAndUpdate(hostel._id, { category: category._id });
      updateCount++;
      
      if ((i + 1) % 10 === 0) {
        console.log(`  ✓ Assigned categories to ${i + 1}/${hostels.length} hostels...`);
      }
    }

    console.log(`\n✅ Successfully assigned categories to ${updateCount} hostels`);
    console.log(`   Categories distributed evenly across ${categories.length} types`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

assignCategories();
