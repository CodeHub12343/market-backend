/**
 * Seed Type-Specific Category Models
 * Run: node scripts/seedCategories.js
 */

require('dotenv').config({ path: './config.env' });
const mongoose = require('mongoose');

// Construct MongoDB URI from config
const DB = process.env.DATABASE.replace('<PASSWORD>', process.env.DATABASE_PASSWORD);

// Connect to MongoDB
mongoose.connect(DB, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });

const ProductCategory = require('../models/productCategoryModel');
const ServiceCategory = require('../models/serviceCategoryModel');
const EventCategory = require('../models/eventCategoryModel');
const HostelCategory = require('../models/hostelCategoryModel');
const RoommateCategory = require('../models/roommateCategoryModel');
const RequestCategory = require('../models/requestCategoryModel');

const seedCategories = async () => {
  try {
    console.log('\n📋 Starting Category Seeding...\n');

    // Product Categories
    console.log('🛍️  Seeding Product Categories...');
    const productCategories = [
      { name: 'Books & Textbooks', slug: 'books-textbooks', description: 'New and used course books, study guides, notebooks', icon: '📚', color: '#FF6B6B', sortOrder: 1 },
      { name: 'Electronics', slug: 'electronics', description: 'Laptops, tablets, phones, chargers, headphones', icon: '💻', color: '#4ECDC4', sortOrder: 2 },
      { name: 'Clothing & Accessories', slug: 'clothing-accessories', description: 'Casual wear, uniforms, sportswear, shoes, accessories', icon: '👕', color: '#FFE66D', sortOrder: 3 },
      { name: 'Furniture & Home Goods', slug: 'furniture-home-goods', description: 'Desks, chairs, bedding, lamps and home items', icon: '🪑', color: '#95E1D3', sortOrder: 4 },
      { name: 'Stationery & Supplies', slug: 'stationery-supplies', description: 'Pens, planners, art supplies, lab gear', icon: '✏️', color: '#C7F9CC', sortOrder: 5 },
      { name: 'Sports & Fitness', slug: 'sports-fitness', description: 'Equipment, workout gear, bicycles', icon: '🏀', color: '#F38181', sortOrder: 6 },
      { name: 'Food & Groceries', slug: 'food-groceries', description: 'Packed meals, snacks, bulk staples', icon: '🍱', color: '#FFD8A9', sortOrder: 7 },
      { name: 'Tech Accessories', slug: 'tech-accessories', description: 'Cables, adapters, cases, peripherals', icon: '🔌', color: '#A0E7E5', sortOrder: 8 },
      { name: 'Musical Instruments & Gear', slug: 'musical-instruments', description: 'Guitars, keyboards, amps, sheet music', icon: '🎸', color: '#BDB2FF', sortOrder: 9 },
      { name: 'Art & Collectibles', slug: 'art-collectibles', description: 'Prints, crafts, posters and collectibles', icon: '🖼️', color: '#FFC6FF', sortOrder: 10 },
      { name: 'Health & Personal Care', slug: 'health-personal-care', description: 'Masks, toiletries, first-aid kits', icon: '🩺', color: '#D4F1F4', sortOrder: 11 },
      { name: 'Other / Miscellaneous', slug: 'other-misc', description: 'Anything else students sell or trade', icon: '📦', color: '#CCCCCC', sortOrder: 12 }
    ];
    await ProductCategory.deleteMany({});
    await ProductCategory.insertMany(productCategories);
    console.log(`✅ Created ${productCategories.length} product categories\n`);

    // Service Categories
    console.log('🔧 Seeding Service Categories...');
    const serviceCategories = [
      { name: 'Tutoring & Academic Help', slug: 'tutoring-academic-help', description: 'Subject tutoring, editing, thesis help', minRate: 500, rateUnit: 'hourly' },
      { name: 'Tech Support & Repair', slug: 'tech-support-repair', description: 'Laptop/phone repair, software help', minRate: 1000, rateUnit: 'hourly' },
      { name: 'Cleaning & Housekeeping', slug: 'cleaning-housekeeping', description: 'Room/flat cleaning, laundry', minRate: 2000, rateUnit: 'daily' },
      { name: 'Transport & Delivery', slug: 'transport-delivery', description: 'Rideshares, parcel runs, moving help', minRate: 3000, rateUnit: 'hourly' },
      { name: 'Photography & Videography', slug: 'photography-videography', description: 'Shoots, editing, event coverage', minRate: 5000, rateUnit: 'project' },
      { name: 'Food & Catering', slug: 'food-catering', description: 'Meal prep, event catering, baking', minRate: 3000, rateUnit: 'project' },
      { name: 'Fitness & Wellness', slug: 'fitness-wellness', description: 'Personal training, yoga, counseling', minRate: 1500, rateUnit: 'hourly' },
      { name: 'Creative & Freelance', slug: 'creative-freelance', description: 'Design, copywriting, web dev', minRate: 2000, rateUnit: 'project' },
      { name: 'Events & Party Services', slug: 'events-party-services', description: 'DJ, MC, decoration, equipment rental', minRate: 4000, rateUnit: 'project' },
      { name: 'Administrative & Legal Help', slug: 'administrative-legal', description: 'Document processing, visa/app guidance', minRate: 2500, rateUnit: 'hourly' },
      { name: 'Professional Services', slug: 'professional-services', description: 'CV/resume reviews, interview coaching', minRate: 1500, rateUnit: 'hourly' },
      { name: 'Other Services', slug: 'other-services', description: 'Misc student-oriented offers', minRate: 1000, rateUnit: 'hourly' }
    ];
    await ServiceCategory.deleteMany({});
    await ServiceCategory.insertMany(serviceCategories);
    console.log(`✅ Created ${serviceCategories.length} service categories\n`);

    // Event Categories
    console.log('🎉 Seeding Event Categories...');
    const eventCategories = [
      { name: 'Academic Events', slug: 'academic-events', description: 'Lectures, seminars, research talks, workshops' },
      { name: 'Career & Networking', slug: 'career-networking', description: 'Job fairs, company info sessions' },
      { name: 'Social & Parties', slug: 'social-parties', description: 'Club nights, mixers, themed parties' },
      { name: 'Cultural & Arts', slug: 'cultural-arts', description: 'Exhibitions, theater, cultural festivals' },
      { name: 'Music & Performances', slug: 'music-performances', description: 'Concerts, open-mic nights' },
      { name: 'Sports & Competitions', slug: 'sports-competitions', description: 'Tournaments, fitness events' },
      { name: 'Clubs & Societies', slug: 'clubs-societies', description: 'Regular meetings and special events' },
      { name: 'Volunteer & Charity', slug: 'volunteer-charity', description: 'Service days, drives, fundraisers' },
      { name: 'Competitions & Hackathons', slug: 'competitions-hackathons', description: 'Coding, case comps, debates' },
      { name: 'Orientation & Welcome Fairs', slug: 'orientation-welcome', description: 'New-student events' },
      { name: 'Online / Hybrid Events', slug: 'online-hybrid', description: 'Webinars, virtual meetups' },
      { name: 'Other Events', slug: 'other-events', description: 'Pop-ups, markets, swap meets' }
    ];
    await EventCategory.deleteMany({});
    await EventCategory.insertMany(eventCategories);
    console.log(`✅ Created ${eventCategories.length} event categories\n`);

    // Hostel Categories
    console.log('🏨 Seeding Hostel Categories...');
    const hostelCategories = [
      { name: 'Private Room', slug: 'private-room', description: 'Single-occupancy rooms', amenities: ['WiFi'], priceRange: { min: 5000, max: 40000 } },
      { name: 'Shared Room / Dorm Bed', slug: 'shared-room', description: 'Multi-occupancy dorms or bunk beds', amenities: ['Common Area'], priceRange: { min: 2000, max: 15000 } },
      { name: 'Studio / Self-contained', slug: 'studio-self-contained', description: 'Small unit with private bathroom/kitchen', amenities: ['Kitchen', 'Bathroom', 'WiFi'], priceRange: { min: 20000, max: 60000 } },
      { name: 'Short-term Stay / Sublet', slug: 'short-term-sublet', description: 'Weeks/months for visitors or breaks', amenities: [], priceRange: { min: 3000, max: 40000 } },
      { name: 'Long-term Lease', slug: 'long-term-lease', description: 'Semester/year agreements', amenities: [], priceRange: { min: 10000, max: 80000 } },
      { name: 'Furnished / Unfurnished', slug: 'furnished-unfurnished', description: 'Furnished or unfurnished options', amenities: [], priceRange: { min: 0, max: 0 } },
      { name: 'Graduate / Postgrad Housing', slug: 'graduate-housing', description: 'Quiet/academic-focused accommodations', amenities: [], priceRange: { min: 10000, max: 60000 } },
      { name: 'Couples / Family Friendly', slug: 'couples-family', description: 'For partners or family stays', amenities: [], priceRange: { min: 20000, max: 90000 } },
      { name: 'Hostel Facilities', slug: 'hostel-facilities', description: 'Laundry, common room, study spaces', amenities: ['Laundry', 'Study Room'], priceRange: { min: 0, max: 0 } },
      { name: 'Safety / Security Features', slug: 'safety-security', description: 'Gated, CCTV, 24/7 desk', amenities: ['CCTV', 'Security'], priceRange: { min: 0, max: 0 } },
      { name: 'Other Accommodation Types', slug: 'other-accommodation', description: 'Homestay, private landlord listings', amenities: [], priceRange: { min: 0, max: 0 } }
    ];
    await HostelCategory.deleteMany({});
    await HostelCategory.insertMany(hostelCategories);
    console.log(`✅ Created ${hostelCategories.length} hostel categories\n`);

    // Roommate Categories
    console.log('👥 Seeding Roommate Categories...');
    const roommateCategories = [
      { name: 'Looking for Roommate', slug: 'looking-for-roommate', description: 'Person seeking roommates' },
      { name: 'Offering Roommate Slot', slug: 'offering-roommate-slot', description: 'Vacancy announcement' },
      { name: 'Preferences — Gender', slug: 'preferences-gender', description: 'Male / Female / Any' },
      { name: 'Preferences — Pets', slug: 'preferences-pets', description: 'Pet-friendly or no-pets' },
      { name: 'Preferences — Smoking', slug: 'preferences-smoking', description: 'Smoking / Non-smoking' },
      { name: 'Budget Range', slug: 'budget-range', description: 'Monthly rent budget' },
      { name: 'Cleanliness / Lifestyle', slug: 'cleanliness-lifestyle', description: 'Quiet/study vs social/party' },
      { name: 'Schedule / Routine', slug: 'schedule-routine', description: 'Night-owl vs early-bird' },
      { name: 'Duration', slug: 'duration', description: 'Short-term vs long-term stay' },
      { name: 'International / Exchange-Friendly', slug: 'international-exchange', description: 'Open to international students' },
      { name: 'Work/Study Compatibility', slug: 'work-study-compatibility', description: 'Remote worker, student, intern' },
      { name: 'Other Roommate Notes', slug: 'other-roommate-notes', description: 'Food habits, guests policy, parking, etc.' }
    ];
    await RoommateCategory.deleteMany({});
    await RoommateCategory.insertMany(roommateCategories);
    console.log(`✅ Created ${roommateCategories.length} roommate categories\n`);

    // Request Categories
    console.log('📝 Seeding Request Categories...');
    const requestCategories = [
      { name: 'Buy / Wanted Items', slug: 'buy-wanted-items', description: 'Students requesting to buy specific items' },
      { name: 'Service Requests', slug: 'service-requests', description: 'Need tutoring, repairs, cleaning, etc.' },
      { name: 'Roommate Requests', slug: 'roommate-requests', description: 'Seeking roommates or rooms' },
      { name: 'Ride Shares / Transport Requests', slug: 'ride-share-requests', description: 'Looking for lifts or shared trips' },
      { name: 'Study Group Requests', slug: 'study-group-requests', description: 'Forming course study groups' },
      { name: 'Event Help Requests', slug: 'event-help-requests', description: 'Volunteers, assistants, crew' },
      { name: 'Equipment Borrow / Rent Requests', slug: 'equipment-borrow-rent', description: 'Need cameras, tools, instruments' },
      { name: 'Job & Gig Requests', slug: 'job-gig-requests', description: 'Short-term gigs, tutoring jobs' },
      { name: 'Lost & Found Requests', slug: 'lost-found-requests', description: 'Reporting or searching for lost items' },
      { name: 'Exchange / Swap Requests', slug: 'exchange-swap-requests', description: 'Swap textbooks, tickets, goods' },
      { name: 'Accommodation Short-term Requests', slug: 'accommodation-short-term', description: 'Sublets, short stays' },
      { name: 'Other Requests', slug: 'other-requests', description: 'Misc student needs' }
    ];
    await RequestCategory.deleteMany({});
    await RequestCategory.insertMany(requestCategories);
    console.log(`✅ Created ${requestCategories.length} request categories\n`);

    console.log('✅ Category seeding completed successfully!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding categories:', error);
    process.exit(1);
  }
};

seedCategories();
