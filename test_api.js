const axios = require('axios');

async function testAPI() {
  try {
    // First, login to get JWT token
    const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'vadeleye314@gmail.com',
      password: 'Test1234'
    });

    const token = loginRes.data.data.token;
    console.log('✅ Logged in successfully');

    // Test 1: No campus filter
    console.log('\n=== Test 1: No campus filter (allCampuses=false) ===');
    const res1 = await axios.get('http://localhost:5000/api/products/search/advanced?allCampuses=false&page=1&limit=12', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Results:', res1.data.results);
    console.log('Products:', res1.data.data.products.length);

    // Test 2: With campus filter
    console.log('\n=== Test 2: With campus filter (campus=68e5d74b9e9ea2f53162e9ae) ===');
    const res2 = await axios.get('http://localhost:5000/api/products/search/advanced?allCampuses=false&campus=68e5d74b9e9ea2f53162e9ae&page=1&limit=12', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Results:', res2.data.results);
    console.log('Products:', res2.data.data.products.length);

  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
  }
}

testAPI();
