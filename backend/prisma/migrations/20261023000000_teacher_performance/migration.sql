CREATE TABLE "teacher_performance_evaluations" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "teacherId" TEXT NOT NULL,
  "reviewerId" TEXT NOT NULL,
  "periodType" TEXT NOT NULL,
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd" TIMESTAMP(3) NOT NULL,
  "rating" INTEGER NOT NULL,
  "notes" TEXT,
  "improvements" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "teacher_performance_evaluations_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "teacher_performance_evaluations_tenantId_teacherId_periodStart_idx" ON "teacher_performance_evaluations"("tenantId", "teacherId", "periodStart");
ALTER TABLE "teacher_performance_evaluations" ADD CONSTRAINT "teacher_performance_evaluations_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "teacher_performance_evaluations" ADD CONSTRAINT "teacher_performance_evaluations_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
