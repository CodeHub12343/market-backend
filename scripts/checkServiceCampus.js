// scripts/checkServiceCampus.js
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'config.env') });

const Service = require('../models/serviceModel');

const DB = process.env.DATABASE && process.env.DATABASE.replace
  ? process.env.DATABASE.replace('<PASSWORD>', process.env.DATABASE_PASSWORD)
  : process.env.DATABASE;

async function main() {
  try {
    await mongoose.connect(DB, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB');

    // Get all unique campus IDs from services
    const services = await Service.find({}).select('_id title campus').limit(20).lean();
    console.log('\nServices with campus info:');
    services.forEach(s => {
      console.log('- ID:', s._id.toString(), 'Campus:', s.campus?.toString?.() || s.campus, 'Title:', s.title.substring(0, 30));
    });

    // Get unique campus IDs
    const uniqueCampuses = await Service.distinct('campus');
    console.log('\nUnique campus IDs in services:', uniqueCampuses.map(id => id.toString?.() || id));

    // Get count by campus
    const aggregation = await Service.aggregate([
      {
        $group: {
          _id: '$campus',
          count: { $sum: 1 },
          examples: { $push: '$title' }
        }
      }
    ]);
    console.log('\nServices per campus:', JSON.stringify(aggregation, null, 2));

    await mongoose.disconnect();
    console.log('\nDisconnected.');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err && err.message ? err.message : err);
    process.exit(1);
  }
}

main();
