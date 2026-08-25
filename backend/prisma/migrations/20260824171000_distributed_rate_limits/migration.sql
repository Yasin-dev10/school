CREATE TABLE "api_rate_limits" (
  "key" TEXT NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  "resetAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "api_rate_limits_pkey" PRIMARY KEY ("key")
);
CREATE INDEX "api_rate_limits_resetAt_idx" ON "api_rate_limits"("resetAt");
