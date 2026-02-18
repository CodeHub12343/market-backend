// scripts/testApiWithCampus.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'config.env') });
const jwt = require('jsonwebtoken');
const axios = require('axios');

const userId = '693f3c99aeb125c279ee00fd';
const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '90d' });

(async () => {
  try {
    const campusId = '68e5d74b9e9ea2f53162e9ae';
    console.log('Token prefix:', token.substring(0,40) + '...');
    const url = `http://localhost:${process.env.PORT || 5000}/api/v1/services?page=1&limit=10&allCampuses=false&campus=${campusId}`;
    const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 });
    console.log('Status:', res.status, 'Results:', res.data.results);
    if (res.data.data && res.data.data.services) res.data.data.services.forEach(s => console.log('-', s._id, s.title));
  } catch (err) {
    if (err.response) console.error('API error:', err.response.status, err.response.data);
    else console.error('Request error:', err.message);
    process.exit(1);
  }
})();
