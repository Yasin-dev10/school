const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config({ path: __dirname + '/../../.env' });
const { prisma } = require('../config/db');

const seedSuperAdmin = async () => {
    try {
        console.log('Connecting to PostgreSQL...');
        
        const superAdminEmail = 'yasindev54@gmail.com';
        let existingAdmin = await prisma.user.findFirst({ where: { email: superAdminEmail } });

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
        const hashed = await bcrypt.hash('Yaasiin@2027', salt);

        await prisma.user.create({
            data: {
                firstName: 'Yasin',
                lastName: 'Dev',
                email: superAdminEmail,
                password: hashed,
                passwordPlain: 'Yaasiin@2027',
                role: 'super_admin',
                tenantId: 'platform',
                status: 'active'
            }
        });

        console.log('Super Admin Created:');
        console.log('Email: yasindev54@gmail.com');
        console.log('Password: Yaasiin@2027');

        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

seedSuperAdmin();
