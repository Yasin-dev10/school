DROP INDEX IF EXISTS "attendances_studentId_classId_subjectId_date_tenantId_key";

CREATE INDEX IF NOT EXISTS "attendances_studentId_classId_subjectId_date_tenantId_idx"
ON "attendances"("studentId", "classId", "subjectId", "date", "tenantId");
