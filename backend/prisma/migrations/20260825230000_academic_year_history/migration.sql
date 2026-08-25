CREATE TABLE "academic_years" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "academic_years_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "academic_years_tenantId_name_key"
ON "academic_years"("tenantId", "name");

CREATE INDEX "academic_years_tenantId_isCurrent_idx"
ON "academic_years"("tenantId", "isCurrent");

CREATE UNIQUE INDEX "academic_years_one_current_per_tenant_key"
ON "academic_years"("tenantId") WHERE "isCurrent" = true;

CREATE INDEX "academic_years_tenantId_startDate_endDate_idx"
ON "academic_years"("tenantId", "startDate", "endDate");

ALTER TABLE "academic_years"
ADD CONSTRAINT "academic_years_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "tenants"("tenantId")
ON DELETE CASCADE ON UPDATE CASCADE;

-- Preserve every school's existing current academic year as its first history row.
INSERT INTO "academic_years" (
    "id", "tenantId", "name", "startDate", "endDate", "isCurrent", "createdAt", "updatedAt"
)
SELECT
    'ay-' || md5("tenantId" || COALESCE("academicYear", 'current')),
    "tenantId",
    COALESCE(NULLIF("academicYear", ''),
        EXTRACT(YEAR FROM CURRENT_DATE)::TEXT || '-' || (EXTRACT(YEAR FROM CURRENT_DATE)::INT + 1)::TEXT),
    make_date(
        CASE WHEN "academicYear" ~ '^\d{4}-\d{4}$'
            THEN substring("academicYear" from 1 for 4)::INT
            ELSE EXTRACT(YEAR FROM CURRENT_DATE)::INT END,
        9, 1
    ),
    make_date(
        CASE WHEN "academicYear" ~ '^\d{4}-\d{4}$'
            THEN substring("academicYear" from 6 for 4)::INT
            ELSE EXTRACT(YEAR FROM CURRENT_DATE)::INT + 1 END,
        8, 31
    ),
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "tenants";
