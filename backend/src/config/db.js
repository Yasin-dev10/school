const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const connectionString = process.env.DATABASE_URL?.trim();

if (!connectionString) {
    throw new Error('DATABASE_URL is missing from environment variables.');
}

const parsePositiveInt = (value, fallback) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const maxConnectAttempts = parsePositiveInt(
    process.env.DATABASE_CONNECT_RETRIES,
    process.env.NODE_ENV === 'production' ? 12 : 1
);
const connectRetryMs = parsePositiveInt(process.env.DATABASE_CONNECT_RETRY_MS, 5000);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const safeDatabaseTarget = () => {
    try {
        const url = new URL(connectionString);
        return `${url.protocol}//${url.hostname}:${url.port || 5432}${url.pathname}`;
    } catch {
        return '<invalid DATABASE_URL>';
    }
};

const redactConnectionStrings = (value) => String(value || '').replace(
    /(postgres(?:ql)?:\/\/[^:\s/]+:)[^@\s]+@/gi,
    '$1***@'
);

const describeConnectionError = (error) => {
    const details = [error.message];

    if (error.code) {
        details.push(`code=${error.code}`);
    }

    if (error.cause?.code) {
        details.push(`causeCode=${error.cause.code}`);
    }

    if (error.cause?.message) {
        details.push(`cause=${error.cause.message}`);
    }

    return redactConnectionStrings(details.filter(Boolean).join(' | '));
};

const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

const connectDB = async () => {
    console.log(`Attempting to connect to PostgreSQL via Prisma at ${safeDatabaseTarget()}...`);

    let lastError;

    for (let attempt = 1; attempt <= maxConnectAttempts; attempt += 1) {
        try {
            await prisma.$connect();
            await prisma.$queryRaw`SELECT 1`;
            console.log('PostgreSQL Connected via Prisma');
            return;
        } catch (error) {
            lastError = error;
            console.error(`PostgreSQL Connection Error (attempt ${attempt}/${maxConnectAttempts}): ${describeConnectionError(error)}`);

            if (error.code === 'ECONNREFUSED' || error.cause?.code === 'ECONNREFUSED') {
                console.error('PostgreSQL is not accepting connections. Check that the database server is running and DATABASE_URL points to the correct host and port.');
            }

            await prisma.$disconnect().catch(() => undefined);

            if (attempt < maxConnectAttempts) {
                console.log(`Retrying PostgreSQL connection in ${connectRetryMs}ms...`);
                await sleep(connectRetryMs);
            }
        }
    }

    throw lastError;
};

// Graceful shutdown
process.on('beforeExit', async () => {
    await prisma.$disconnect();
});

module.exports = { connectDB, prisma };
