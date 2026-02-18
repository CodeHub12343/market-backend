// scripts/simulateQuery.js
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'config.env') });
const Service = require('../models/serviceModel');
const APIFeatures = require('../utils/apiFeatures');

const DB = process.env.DATABASE && process.env.DATABASE.replace
  ? process.env.DATABASE.replace('<PASSWORD>', process.env.DATABASE_PASSWORD)
  : process.env.DATABASE;

async function main() {
  try {
    await mongoose.connect(DB, { useNewUrlParser: true, useUnifiedTopology: true });
    const campusId = '68e5d74b9e9ea2f53162e9ae';
    const reqQuery = { page: '1', limit: '10', allCampuses: 'false' };

    const features = new APIFeatures(
      Service.find({ status: 'active', active: true, campus: campusId })
        .populate('provider', 'fullName email role campus')
        .populate('campus', 'name'),
      reqQuery
    )
      .filter()
      .sort()
      .limitFields()
      .paginate();

    try {
      console.log('Built Mongoose query filter:', features.query.getQuery());
    } catch (err) {
      console.log('Could not get query object:', err.message);
    }

    const docs = await features.query.exec();
    console.log('Docs returned:', docs.length);
    docs.forEach(d => console.log('-', d._id.toString(), d.title));

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err && err.message ? err.message : err);
    process.exit(1);
  }
}

main();
