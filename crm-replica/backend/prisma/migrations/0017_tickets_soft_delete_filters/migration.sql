-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN "deleted_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Ticket_deleted_at_idx" ON "Ticket"("deleted_at");

-- CreateIndex
CREATE INDEX "Ticket_status_created_at_idx" ON "Ticket"("status", "created_at");
