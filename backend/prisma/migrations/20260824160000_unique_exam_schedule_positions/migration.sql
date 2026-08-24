CREATE UNIQUE INDEX "exam_schedules_examId_classId_date_startTime_key"
ON "exam_schedules"("examId", "classId", "date", "startTime");
