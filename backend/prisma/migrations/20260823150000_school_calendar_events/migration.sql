CREATE TYPE "SchoolEventType" AS ENUM ('holiday', 'exam', 'parent_meeting', 'school_event');
CREATE TYPE "RsvpStatus" AS ENUM ('going', 'maybe', 'not_going');

CREATE TABLE "school_events" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "type" "SchoolEventType" NOT NULL,
  "startAt" TIMESTAMP(3) NOT NULL,
  "endAt" TIMESTAMP(3) NOT NULL,
  "allDay" BOOLEAN NOT NULL DEFAULT false,
  "location" TEXT,
  "classId" TEXT,
  "targetRoles" "UserRole"[],
  "createdById" TEXT NOT NULL,
  "reminderMinutes" INTEGER NOT NULL DEFAULT 1440,
  "reminderSentAt" TIMESTAMP(3),
  "cancelled" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "school_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "event_rsvps" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" "RsvpStatus" NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "event_rsvps_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "school_events_tenantId_startAt_idx" ON "school_events"("tenantId", "startAt");
CREATE INDEX "school_events_classId_idx" ON "school_events"("classId");
CREATE INDEX "school_events_reminderSentAt_startAt_idx" ON "school_events"("reminderSentAt", "startAt");
CREATE UNIQUE INDEX "event_rsvps_eventId_userId_key" ON "event_rsvps"("eventId", "userId");
CREATE INDEX "event_rsvps_userId_idx" ON "event_rsvps"("userId");
ALTER TABLE "school_events" ADD CONSTRAINT "school_events_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "event_rsvps" ADD CONSTRAINT "event_rsvps_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "school_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_rsvps" ADD CONSTRAINT "event_rsvps_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
