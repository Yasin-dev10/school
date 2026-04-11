const fs = require('fs');
const path = require('path');
require('dotenv').config();

const routesDir = path.join(__dirname, '../src/routes');
const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));

files.forEach(file => {
    try {
        require(path.join(routesDir, file));
        // console.log(`[OK] ${file}`);
    } catch (err) {
        console.error(`[ERROR] ${file}: ${err.message}`);
    }
});
