CREATE TYPE "OrderOrigin" AS ENUM ('manual', 'ticket', 'preventive');

ALTER TABLE "ServiceOrder"
  ADD COLUMN "order_origin" "OrderOrigin" NOT NULL DEFAULT 'manual';

ALTER TABLE "MaintenanceExecution"
  ADD COLUMN "execution_key" TEXT NOT NULL DEFAULT '';

CREATE UNIQUE INDEX "MaintenanceExecution_plan_id_execution_key_key" ON "MaintenanceExecution"("plan_id", "execution_key");
