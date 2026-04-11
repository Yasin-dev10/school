const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
    console.log('.env file not found');
    process.exit(1);
}

const content = fs.readFileSync(envPath, 'utf8');
const lines = content.split('\n');

lines.forEach((line, i) => {
    if (line.startsWith('MONGO_URI=')) {
        const val = line.substring('MONGO_URI='.length);
        console.log(`Line ${i + 1} starts with MONGO_URI`);
        console.log(`Value length: ${val.length}`);
        console.log(`Raw value: [${val}]`);

        const atCount = (val.match(/@/g) || []).length;
        console.log(`Number of @ symbols: ${atCount}`);
        if (atCount > 1) {
            console.log('WARNING: Multiple @ symbols found. Special characters in password must be URL encoded!');
        }

        if (val.trim() !== val) {
            console.log('WARNING: Value still has leading/trailing whitespace!');
        }
    }
});
