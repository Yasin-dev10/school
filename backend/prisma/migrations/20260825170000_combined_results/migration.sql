CREATE TABLE "combined_results" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "examIds" TEXT[] NOT NULL,
    "exams" JSONB NOT NULL,
    "subjects" JSONB NOT NULL,
    "rows" JSONB NOT NULL,
    "publishedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "combined_results_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "combined_results_tenantId_classId_fingerprint_key"
ON "combined_results"("tenantId", "classId", "fingerprint");
CREATE INDEX "combined_results_tenantId_classId_idx"
ON "combined_results"("tenantId", "classId");
