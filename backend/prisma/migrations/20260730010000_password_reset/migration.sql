ALTER TABLE "users"
ADD COLUMN "resetPasswordTokenHash" TEXT,
ADD COLUMN "resetPasswordExpires" TIMESTAMP(3);

CREATE INDEX "users_resetPasswordTokenHash_idx" ON "users"("resetPasswordTokenHash");
