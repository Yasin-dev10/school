-- A student can start each quiz only once. Existing installations created
-- indexes but did not enforce this rule at the database boundary.
ALTER TABLE "quiz_attempts" ADD COLUMN "completedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "quiz_attempts_quizId_studentId_key"
ON "quiz_attempts"("quizId", "studentId");
