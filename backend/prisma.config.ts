import 'dotenv/config';
import { defineConfig, env } from '@prisma/config';

export default defineConfig({
  earlyAccess: true,
  datasource: {
    // Prisma CLI operations (migrate, db push, studio) need a session-based
    // direct connection; the app runtime uses DATABASE_URL in config/db.js.
    url: env('DIRECT_URL'),
  },
});
