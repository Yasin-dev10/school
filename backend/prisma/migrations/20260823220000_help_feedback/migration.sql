CREATE TYPE "SupportTicketStatus" AS ENUM ('open', 'in_progress', 'resolved', 'closed');
CREATE TYPE "SupportTicketPriority" AS ENUM ('low', 'normal', 'high', 'urgent');

CREATE TABLE "support_tickets" (
  "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "requesterId" TEXT NOT NULL, "assignedToId" TEXT,
  "category" TEXT NOT NULL, "subject" TEXT NOT NULL, "description" TEXT NOT NULL,
  "priority" "SupportTicketPriority" NOT NULL DEFAULT 'normal', "status" "SupportTicketStatus" NOT NULL DEFAULT 'open',
  "adminReply" TEXT, "resolvedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "satisfaction_surveys" (
  "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "userId" TEXT NOT NULL, "rating" INTEGER NOT NULL,
  "comment" TEXT, "context" TEXT NOT NULL DEFAULT 'general', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "satisfaction_surveys_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "support_tickets_tenantId_status_createdAt_idx" ON "support_tickets"("tenantId", "status", "createdAt");
CREATE INDEX "support_tickets_requesterId_createdAt_idx" ON "support_tickets"("requesterId", "createdAt");
CREATE INDEX "support_tickets_tenantId_category_idx" ON "support_tickets"("tenantId", "category");
CREATE INDEX "satisfaction_surveys_tenantId_createdAt_idx" ON "satisfaction_surveys"("tenantId", "createdAt");
CREATE INDEX "satisfaction_surveys_userId_createdAt_idx" ON "satisfaction_surveys"("userId", "createdAt");
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("tenantId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "satisfaction_surveys" ADD CONSTRAINT "satisfaction_surveys_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("tenantId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "satisfaction_surveys" ADD CONSTRAINT "satisfaction_surveys_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
