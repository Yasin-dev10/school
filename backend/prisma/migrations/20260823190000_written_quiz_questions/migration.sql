ALTER TABLE "quiz_questions"
ADD COLUMN "questionType" TEXT NOT NULL DEFAULT 'multiple_choice',
ADD COLUMN "modelAnswer" TEXT,
ADD COLUMN "keywords" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
