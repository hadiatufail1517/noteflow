const { User } = require('./models');
const jwt = require('jsonwebtoken');
const http = require('http');
require('dotenv').config();

const AUTH_SECRET = process.env.AUTH_SECRET || 'fallback_secret_for_development_purposes';

async function test() {
  const user = await User.findOne();
  if (!user) {
    console.error('No users found in database.');
    process.exit(1);
  }

  const token = jwt.sign({ id: user.id }, AUTH_SECRET, { expiresIn: '7d' });
  console.log(`Testing with user: ${user.name} (${user.email})`);

  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/notes/shared-with-me',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      console.log('Status Code:', res.statusCode);
      try {
        const json = JSON.parse(data);
        console.log('Response JSON:', json);
      } catch (err) {
        console.log('Raw Response:', data);
      }
    });
  });

  req.on('error', (error) => {
    console.error('HTTP request failed:', error);
  });

  req.end();
}

test();
