// scripts/listServices.js
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
    console.log('Connected to MongoDB for listing');

    const services = await Service.find({}).limit(20).lean();
    console.log('Total services fetched:', services.length);
    services.forEach(s => {
      console.log('-', s._id.toString(), '|', s.title, '| campus:', s.campus, '| provider:', s.provider);
    });

    await mongoose.disconnect();
    console.log('Disconnected.');
    process.exit(0);
  } catch (err) {
    console.error('Error listing services:', err && err.message ? err.message : err);
    process.exit(1);
  }
}

main();
