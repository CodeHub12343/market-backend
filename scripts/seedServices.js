// scripts/seedServices.js
// Seed a few test services for a given campus and provider

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
    console.log('Connected to MongoDB for seeding');

    // Adjust these IDs to match a real provider and campus from your DB (from logs)
    const providerId = '696c1b89ba9fbb62f81a99c9'; // logged-in user from latest logs
    const campusId = '68e5d74b9e9ea2f53162e9af'; // UI (University of Ibadan) from latest logs

    const sample = [
      {
        title: 'Mobile Phone Repair',
        description: 'Fast and affordable mobile phone repairs (screen, battery, charging port).',
        price: 2000,
        category: 'Electronics',
        tags: ['repair', 'phone'],
        provider: providerId,
        campus: campusId,
        duration: 60,
        maxBookings: 5,
        currentBookings: 0,
        images: [],
        status: 'active',
        active: true
      },
      {
        title: 'CV Review & Interview Prep',
        description: 'Professional CV review and mock interview tailored for campus recruiters.',
        price: 1500,
        category: 'Career',
        tags: ['cv', 'interview', 'career'],
        provider: providerId,
        campus: campusId,
        duration: 45,
        maxBookings: 10,
        currentBookings: 0,
        images: [],
        status: 'active',
        active: true
      },
      {
        title: 'Graphic Design (Flyers, Posters)',
        description: 'Custom flyers and posters for events and clubs with unlimited revisions.',
        price: 3000,
        category: 'Design',
        tags: ['design', 'graphics'],
        provider: providerId,
        campus: campusId,
        duration: 120,
        maxBookings: 3,
        currentBookings: 0,
        images: [],
        status: 'active',
        active: true
      }
    ];

    const inserted = await Service.insertMany(sample);
    console.log(`Inserted ${inserted.length} services.`);
    inserted.forEach(s => console.log('  -', s._id.toString(), s.title));

    await mongoose.disconnect();
    console.log('Disconnected, seeding complete.');
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err && err.message ? err.message : err);
    process.exit(1);
  }
}

main();
