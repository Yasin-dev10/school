ALTER TABLE "users"
ALTER COLUMN "email" DROP NOT NULL,
ADD COLUMN "username" TEXT;

WITH ranked_users AS (
  SELECT
    id,
    role,
    "tenantId",
    ROW_NUMBER() OVER (
      PARTITION BY "tenantId", role
      ORDER BY "createdAt", id
    ) AS sequence_number
  FROM "users"
  WHERE role IN ('teacher', 'student')
)
UPDATE "users" AS users
SET "username" =
  CASE WHEN ranked_users.role = 'student' THEN 'STU-' ELSE 'TCH-' END ||
  UPPER(SUBSTRING(REGEXP_REPLACE(COALESCE(ranked_users."tenantId", 'GLOBAL'), '[^A-Za-z0-9]', '', 'g') FROM 1 FOR 8)) ||
  '-' || LPAD(ranked_users.sequence_number::TEXT, 4, '0')
FROM ranked_users
WHERE users.id = ranked_users.id;

CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
CREATE INDEX "users_username_idx" ON "users"("username");
