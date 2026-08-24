CREATE TABLE "exam_schedules" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "room" TEXT,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "exam_schedules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "exam_schedule_invigilators" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    CONSTRAINT "exam_schedule_invigilators_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "exam_schedules_examId_classId_subjectId_key" ON "exam_schedules"("examId", "classId", "subjectId");
CREATE INDEX "exam_schedules_tenantId_date_idx" ON "exam_schedules"("tenantId", "date");
CREATE UNIQUE INDEX "exam_schedule_invigilators_scheduleId_teacherId_key" ON "exam_schedule_invigilators"("scheduleId", "teacherId");
ALTER TABLE "exam_schedules" ADD CONSTRAINT "exam_schedules_examId_fkey" FOREIGN KEY ("examId") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "exam_schedules" ADD CONSTRAINT "exam_schedules_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "exam_schedules" ADD CONSTRAINT "exam_schedules_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "exam_schedules" ADD CONSTRAINT "exam_schedules_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("tenantId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "exam_schedule_invigilators" ADD CONSTRAINT "exam_schedule_invigilators_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "exam_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "exam_schedule_invigilators" ADD CONSTRAINT "exam_schedule_invigilators_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
