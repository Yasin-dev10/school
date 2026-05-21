const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error('DATABASE_URL is missing from environment variables.');
}

const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

const connectDB = async () => {
    try {
        console.log('Attempting to connect to PostgreSQL via Prisma...');
        await prisma.$connect();
        console.log(' PostgreSQL Connected via Prisma');
    } catch (error) {
        console.error(` PostgreSQL Connection Error: ${error.message}`);
        process.exit(1);
    }
};

// Graceful shutdown
process.on('beforeExit', async () => {
    await prisma.$disconnect();
});

module.exports = { connectDB, prisma };
