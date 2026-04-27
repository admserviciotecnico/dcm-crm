-- CreateTable
CREATE TABLE "TicketSLAConfig" (
  "id" TEXT NOT NULL,
  "client_id" TEXT,
  "priority" TEXT NOT NULL,
  "response_time_hours" INTEGER NOT NULL,
  "resolution_time_hours" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TicketSLAConfig_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Ticket"
ADD COLUMN "sla_response_deadline" TIMESTAMP(3),
ADD COLUMN "sla_resolution_deadline" TIMESTAMP(3),
ADD COLUMN "first_response_at" TIMESTAMP(3),
ADD COLUMN "resolved_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "TicketSLAConfig_priority_client_id_created_at_idx" ON "TicketSLAConfig"("priority", "client_id", "created_at");
