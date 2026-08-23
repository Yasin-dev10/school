ALTER TABLE "quizzes"
ADD COLUMN "durationMin" INTEGER,
ADD COLUMN "availableFrom" TIMESTAMP(3),
ADD COLUMN "deadline" TIMESTAMP(3);
