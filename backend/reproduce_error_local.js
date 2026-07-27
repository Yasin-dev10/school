const http = require('http');

const email = process.env.TEST_LOGIN_EMAIL;
const password = process.env.TEST_LOGIN_PASSWORD;

if (!email || !password) {
    console.error('Set TEST_LOGIN_EMAIL and TEST_LOGIN_PASSWORD env vars.');
    process.exit(1);
}

const data = JSON.stringify({ email, password });

const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
    }
};

const req = http.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
        console.log('STATUS:', res.statusCode);
        console.log('BODY:', body);
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.write(data);
req.end();
