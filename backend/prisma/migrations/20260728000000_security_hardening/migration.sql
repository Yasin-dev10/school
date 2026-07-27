-- Security hardening: drop plaintext passwords, add token version for revocation
ALTER TABLE "users" DROP COLUMN IF EXISTS "passwordPlain";
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "tokenVersion" INTEGER NOT NULL DEFAULT 0;
