CREATE TYPE "FailureSourceType" AS ENUM ('ticket','order');
CREATE TYPE "FailureResolutionType" AS ENUM ('remote','onsite','replacement');

CREATE TABLE "FailureRecord" (
  "id" TEXT PRIMARY KEY,
  "source_type" "FailureSourceType" NOT NULL,
  "source_id" TEXT NOT NULL,
  "equipment_id" TEXT,
  "client_id" TEXT,
  "failure_type" TEXT NOT NULL,
  "failure_category" TEXT NOT NULL,
  "root_cause" TEXT NOT NULL,
  "solution" TEXT NOT NULL,
  "resolution_type" "FailureResolutionType" NOT NULL,
  "resolved_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE "Ticket" ADD COLUMN "failure_type" TEXT, ADD COLUMN "failure_category" TEXT, ADD COLUMN "root_cause" TEXT, ADD COLUMN "solution" TEXT, ADD COLUMN "resolution_type" "FailureResolutionType", ADD COLUMN "failure_record_id" TEXT;
ALTER TABLE "ServiceOrder" ADD COLUMN "failure_type" TEXT, ADD COLUMN "failure_category" TEXT, ADD COLUMN "root_cause" TEXT, ADD COLUMN "solution" TEXT, ADD COLUMN "resolution_type" "FailureResolutionType", ADD COLUMN "failure_record_id" TEXT;

CREATE INDEX "FailureRecord_source_type_source_id_idx" ON "FailureRecord"("source_type","source_id");
CREATE INDEX "FailureRecord_equipment_id_failure_type_idx" ON "FailureRecord"("equipment_id","failure_type");
CREATE INDEX "FailureRecord_client_id_failure_type_idx" ON "FailureRecord"("client_id","failure_type");
ALTER TABLE "FailureRecord" ADD CONSTRAINT "FailureRecord_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_failure_record_id_fkey" FOREIGN KEY ("failure_record_id") REFERENCES "FailureRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ServiceOrder" ADD CONSTRAINT "ServiceOrder_failure_record_id_fkey" FOREIGN KEY ("failure_record_id") REFERENCES "FailureRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
