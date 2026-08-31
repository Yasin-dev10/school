CREATE TABLE "branches" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "managerName" TEXT,
    "isMain" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "custom_fields" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "fieldType" TEXT NOT NULL DEFAULT 'text',
    "placeholder" TEXT,
    "options" JSONB,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "custom_fields_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "custom_field_values" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customFieldId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "custom_field_values_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workflows" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "entityType" TEXT NOT NULL,
    "trigger" TEXT NOT NULL DEFAULT 'manual',
    "steps" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "workflows_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "users" ADD COLUMN "branchId" TEXT;
ALTER TABLE "classes" ADD COLUMN "branchId" TEXT;
CREATE UNIQUE INDEX "branches_tenantId_code_key" ON "branches"("tenantId", "code");
CREATE INDEX "branches_tenantId_isActive_idx" ON "branches"("tenantId", "isActive");
CREATE UNIQUE INDEX "custom_fields_tenantId_entityType_fieldKey_key" ON "custom_fields"("tenantId", "entityType", "fieldKey");
CREATE INDEX "custom_fields_tenantId_entityType_isActive_idx" ON "custom_fields"("tenantId", "entityType", "isActive");
CREATE UNIQUE INDEX "custom_field_values_customFieldId_entityId_key" ON "custom_field_values"("customFieldId", "entityId");
CREATE INDEX "custom_field_values_tenantId_entityType_entityId_idx" ON "custom_field_values"("tenantId", "entityType", "entityId");
CREATE UNIQUE INDEX "workflows_tenantId_name_key" ON "workflows"("tenantId", "name");
CREATE INDEX "workflows_tenantId_entityType_isActive_idx" ON "workflows"("tenantId", "entityType", "isActive");
CREATE INDEX "users_branchId_idx" ON "users"("branchId");
CREATE INDEX "classes_branchId_idx" ON "classes"("branchId");
ALTER TABLE "branches" ADD CONSTRAINT "branches_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("tenantId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "custom_fields" ADD CONSTRAINT "custom_fields_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("tenantId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "custom_field_values" ADD CONSTRAINT "custom_field_values_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("tenantId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "custom_field_values" ADD CONSTRAINT "custom_field_values_customFieldId_fkey" FOREIGN KEY ("customFieldId") REFERENCES "custom_fields"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("tenantId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "users" ADD CONSTRAINT "users_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "classes" ADD CONSTRAINT "classes_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
