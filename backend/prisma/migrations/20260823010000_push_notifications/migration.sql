ALTER TYPE "NotificationChannel" ADD VALUE IF NOT EXISTS 'push';

CREATE TYPE "DevicePlatform" AS ENUM ('android', 'ios', 'web');
CREATE TYPE "DeliveryStatus" AS ENUM ('pending', 'sent', 'failed');

ALTER TABLE "notifications"
  ADD COLUMN "targetUserId" TEXT,
  ADD COLUMN "deepLink" TEXT,
  ADD COLUMN "data" JSONB;

CREATE TABLE "device_tokens" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "platform" "DevicePlatform" NOT NULL,
  "deviceName" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "device_tokens_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notification_preferences" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "pushEnabled" BOOLEAN NOT NULL DEFAULT true,
  "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
  "smsEnabled" BOOLEAN NOT NULL DEFAULT true,
  "attendanceAlerts" BOOLEAN NOT NULL DEFAULT true,
  "examResultAlerts" BOOLEAN NOT NULL DEFAULT true,
  "assignmentAlerts" BOOLEAN NOT NULL DEFAULT true,
  "feeAlerts" BOOLEAN NOT NULL DEFAULT true,
  "announcementAlerts" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notification_deliveries" (
  "id" TEXT NOT NULL,
  "notificationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "deviceTokenId" TEXT,
  "status" "DeliveryStatus" NOT NULL DEFAULT 'pending',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "nextRetryAt" TIMESTAMP(3),
  "sentAt" TIMESTAMP(3),
  "errorCode" TEXT,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "notification_deliveries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "device_tokens_token_key" ON "device_tokens"("token");
CREATE INDEX "device_tokens_userId_active_idx" ON "device_tokens"("userId", "active");
CREATE INDEX "device_tokens_tenantId_idx" ON "device_tokens"("tenantId");
CREATE UNIQUE INDEX "notification_preferences_userId_key" ON "notification_preferences"("userId");
CREATE INDEX "notification_preferences_tenantId_idx" ON "notification_preferences"("tenantId");
CREATE UNIQUE INDEX "notification_deliveries_notificationId_deviceTokenId_key" ON "notification_deliveries"("notificationId", "deviceTokenId");
CREATE INDEX "notification_deliveries_status_nextRetryAt_idx" ON "notification_deliveries"("status", "nextRetryAt");
CREATE INDEX "notification_deliveries_userId_idx" ON "notification_deliveries"("userId");

ALTER TABLE "device_tokens" ADD CONSTRAINT "device_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_deviceTokenId_fkey" FOREIGN KEY ("deviceTokenId") REFERENCES "device_tokens"("id") ON DELETE SET NULL ON UPDATE CASCADE;
