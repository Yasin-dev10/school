const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config({ path: __dirname + '/../../.env' });
const { prisma } = require('../config/db');

const seedSuperAdmin = async () => {
    try {
        console.log('Connecting to PostgreSQL...');

        const superAdminEmail = process.env.SUPERADMIN_EMAIL;
        const superAdminPassword = process.env.SUPERADMIN_PASSWORD;

        if (!superAdminEmail || !superAdminPassword) {
            console.error('Set SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD in the environment before seeding.');
            process.exit(1);
        }

        if (superAdminPassword.length < 12) {
            console.error('SUPERADMIN_PASSWORD must be at least 12 characters.');
            process.exit(1);
        }

        let existingAdmin = await prisma.user.findFirst({ where: { email: superAdminEmail.toLowerCase() } });

        if (existingAdmin) {
            console.log('Super Admin already exists.');
            process.exit();
        }

        let platformTenant = await prisma.tenant.findUnique({ where: { tenantId: 'platform' } });
        if (!platformTenant) {
            platformTenant = await prisma.tenant.create({
                data: {
                    tenantId: 'platform',
                    name: 'Super Admin Platform',
                    subscriptionPlan: 'unlimited'
                }
            });
            console.log('Platform Tenant Created.');
        }

        const salt = await bcrypt.genSalt(10);
        const hashed = await bcrypt.hash(superAdminPassword, salt);

        await prisma.user.create({
            data: {
                firstName: process.env.SUPERADMIN_FIRST_NAME || 'Super',
                lastName: process.env.SUPERADMIN_LAST_NAME || 'Admin',
                email: superAdminEmail.toLowerCase(),
                password: hashed,
                role: 'super_admin',
                tenantId: 'platform',
                status: 'active'
            }
        });

        console.log('Super Admin Created for:', superAdminEmail);
        console.log('(Password is not printed. Store SUPERADMIN_PASSWORD securely.)');

        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

seedSuperAdmin();
