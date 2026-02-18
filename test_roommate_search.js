const axios = require('axios');

const API_BASE = 'http://localhost:5000/api/v1';

async function testRoommateSearch() {
  try {
    console.log('🧪 Testing Roommate Search API...\n');

    // Test 1: Get all roommate listings
    console.log('Test 1️⃣: Getting all roommate listings...');
    const allResponse = await axios.get(`${API_BASE}/roommate-listings`);
    console.log('✅ All listings:', allResponse.data.results);
    if (allResponse.data.data?.listings?.length > 0) {
      console.log('📋 Sample listing:', JSON.stringify(allResponse.data.data.listings[0], null, 2));
    }

    // Test 2: Search for "clean"
    console.log('\nTest 2️⃣: Searching for "clean"...');
    const searchResponse = await axios.get(`${API_BASE}/roommate-listings?search=clean`);
    console.log('✅ Search results:', searchResponse.data.results);
    console.log('📊 Data:', JSON.stringify(searchResponse.data.data, null, 2));

    // Test 3: Search for "room"
    console.log('\nTest 3️⃣: Searching for "room"...');
    const roomSearchResponse = await axios.get(`${API_BASE}/roommate-listings?search=room`);
    console.log('✅ Search results:', roomSearchResponse.data.results);
    if (roomSearchResponse.data.data?.listings?.length > 0) {
      console.log('📋 Found listings:', roomSearchResponse.data.data.listings.map(l => l.title));
    }

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testRoommateSearch();
