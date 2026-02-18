// scripts/countByCampus.js
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
    const campusId = '68e5d74b9e9ea2f53162e9ae';
    const count = await Service.countDocuments({ status: 'active', active: true, campus: campusId });
    console.log('Active services count for campus', campusId, ':', count);
    const docs = await Service.find({ status: 'active', active: true, campus: campusId }).limit(5).lean();
    console.log('Sample docs:');
    docs.forEach(d => console.log('-', d._id.toString(), d.title));
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message || err);
    process.exit(1);
  }
}
main();
