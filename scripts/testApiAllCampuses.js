// scripts/testApiAllCampuses.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'config.env') });
const jwt = require('jsonwebtoken');
const axios = require('axios');

const userId = '693f3c99aeb125c279ee00fd';
const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '90d' });

(async () => {
  try {
    console.log('Using token prefix:', token.substring(0, 40) + '...');
    const url = `http://localhost:${process.env.PORT || 5000}/api/v1/services?page=1&limit=10&allCampuses=true`;
    const res = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 10000
    });
    console.log('Status:', res.status);
    console.log('Results:', res.data.results);
    if (res.data.data && res.data.data.services) {
      res.data.data.services.forEach(s => console.log('-', s._id, s.title, 'campus:', s.campus));
    }
  } catch (err) {
    if (err.response) console.error('API error status:', err.response.status, err.response.data);
    else console.error('Request error:', err.message);
    process.exit(1);
  }
})();
