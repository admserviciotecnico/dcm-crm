CREATE TABLE "FailureCatalog" (
  "id" TEXT PRIMARY KEY,
  "failure_type" TEXT NOT NULL,
  "failure_category" TEXT NOT NULL,
  "common_root_cause" TEXT NOT NULL,
  "recommended_solution" TEXT NOT NULL,
  "usage_count" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE "FailureRecord" ADD COLUMN "failure_catalog_id" TEXT;
CREATE UNIQUE INDEX "FailureCatalog_failure_type_failure_category_key" ON "FailureCatalog"("failure_type", "failure_category");
CREATE INDEX "FailureCatalog_usage_count_idx" ON "FailureCatalog"("usage_count");
ALTER TABLE "FailureRecord" ADD CONSTRAINT "FailureRecord_failure_catalog_id_fkey" FOREIGN KEY ("failure_catalog_id") REFERENCES "FailureCatalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;
