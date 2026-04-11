const mongoose = require('mongoose');

async function testLocal() {
    try {
        console.log('Attempting to connect to LOCAL MongoDB...');
        await mongoose.connect('mongodb://localhost:27017/school_management');
        console.log('Connected to LOCAL successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Local connection failed:', err.message);
        process.exit(1);
    }
}

testLocal();
