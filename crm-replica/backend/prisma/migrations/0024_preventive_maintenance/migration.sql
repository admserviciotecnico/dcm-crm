CREATE TYPE "MaintenanceFrequencyType" AS ENUM ('monthly', 'quarterly', 'semiannual', 'annual');
CREATE TYPE "MaintenanceExecutionStatus" AS ENUM ('generated', 'skipped', 'failed');

ALTER TABLE "ServiceOrder"
  ADD COLUMN "equipment_id" TEXT,
  ADD COLUMN "maintenance_plan_id" TEXT;

CREATE TABLE "MaintenancePlan" (
  "id" TEXT PRIMARY KEY,
  "client_id" TEXT NOT NULL,
  "equipment_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "frequency_type" "MaintenanceFrequencyType" NOT NULL,
  "frequency_value" INTEGER,
  "last_executed_at" TIMESTAMP(3),
  "next_execution_at" TIMESTAMP(3) NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "auto_generate" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "MaintenanceExecution" (
  "id" TEXT PRIMARY KEY,
  "plan_id" TEXT NOT NULL,
  "order_id" TEXT,
  "executed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status" "MaintenanceExecutionStatus" NOT NULL,
  "notes" TEXT
);

CREATE INDEX "ServiceOrder_equipment_id_idx" ON "ServiceOrder"("equipment_id");
CREATE INDEX "ServiceOrder_maintenance_plan_id_idx" ON "ServiceOrder"("maintenance_plan_id");
CREATE INDEX "MaintenancePlan_is_active_next_execution_at_idx" ON "MaintenancePlan"("is_active", "next_execution_at");
CREATE INDEX "MaintenancePlan_client_id_idx" ON "MaintenancePlan"("client_id");
CREATE INDEX "MaintenancePlan_equipment_id_idx" ON "MaintenancePlan"("equipment_id");
CREATE INDEX "MaintenanceExecution_plan_id_executed_at_idx" ON "MaintenanceExecution"("plan_id", "executed_at");

ALTER TABLE "ServiceOrder" ADD CONSTRAINT "ServiceOrder_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "Equipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ServiceOrder" ADD CONSTRAINT "ServiceOrder_maintenance_plan_id_fkey" FOREIGN KEY ("maintenance_plan_id") REFERENCES "MaintenancePlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MaintenancePlan" ADD CONSTRAINT "MaintenancePlan_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MaintenancePlan" ADD CONSTRAINT "MaintenancePlan_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MaintenanceExecution" ADD CONSTRAINT "MaintenanceExecution_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "MaintenancePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MaintenanceExecution" ADD CONSTRAINT "MaintenanceExecution_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "ServiceOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
