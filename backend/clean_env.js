const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    const lines = content.split('\n');
    const newLines = lines.map(line => {
        if (line.includes('=')) {
            const parts = line.split('=');
            const key = parts[0].trim();
            const val = parts.slice(1).join('=').trim();
            return `${key}=${val}`;
        }
        return line;
    });
    fs.writeFileSync(envPath, newLines.join('\n'));
    console.log('.env file has been trimmed and cleaned.');
}
