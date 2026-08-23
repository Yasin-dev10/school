CREATE TABLE "alumni" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "graduationYear" INTEGER NOT NULL,
    "program" TEXT,
    "currentCity" TEXT,
    "employmentStatus" TEXT NOT NULL DEFAULT 'unknown',
    "employer" TEXT,
    "jobTitle" TEXT,
    "university" TEXT,
    "degree" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "alumni_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "alumni_events" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "capacity" INTEGER,
    "attendeeCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'upcoming',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "alumni_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "alumni_donations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "alumniId" TEXT,
    "donorName" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "purpose" TEXT,
    "donatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'received',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "alumni_donations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "alumni_tenantId_graduationYear_idx" ON "alumni"("tenantId", "graduationYear");
CREATE INDEX "alumni_tenantId_employmentStatus_idx" ON "alumni"("tenantId", "employmentStatus");
CREATE INDEX "alumni_events_tenantId_startsAt_idx" ON "alumni_events"("tenantId", "startsAt");
CREATE INDEX "alumni_donations_tenantId_donatedAt_idx" ON "alumni_donations"("tenantId", "donatedAt");
CREATE INDEX "alumni_donations_alumniId_idx" ON "alumni_donations"("alumniId");

ALTER TABLE "alumni" ADD CONSTRAINT "alumni_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("tenantId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "alumni_events" ADD CONSTRAINT "alumni_events_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("tenantId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "alumni_donations" ADD CONSTRAINT "alumni_donations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("tenantId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "alumni_donations" ADD CONSTRAINT "alumni_donations_alumniId_fkey" FOREIGN KEY ("alumniId") REFERENCES "alumni"("id") ON DELETE SET NULL ON UPDATE CASCADE;
