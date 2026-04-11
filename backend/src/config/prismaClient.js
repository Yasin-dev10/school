// Central re-export so all files import from one place
const { prisma } = require('../config/db');
module.exports = prisma;
