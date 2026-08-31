require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function main() {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured');
    const migrationPath = path.join(__dirname, '../../prisma/migrations/20260831120000_branches_customization/migration.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('COMMIT');
        console.log('Customization migration applied successfully.');
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        await client.end();
    }
}

main().catch(error => {
    console.error(error.message);
    process.exit(1);
});
