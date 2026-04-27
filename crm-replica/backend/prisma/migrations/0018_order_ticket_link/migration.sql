-- AlterTable
ALTER TABLE "ServiceOrder" ADD COLUMN "ticket_id" TEXT;

-- CreateIndex
CREATE INDEX "ServiceOrder_ticket_id_idx" ON "ServiceOrder"("ticket_id");

-- AddForeignKey
ALTER TABLE "ServiceOrder" ADD CONSTRAINT "ServiceOrder_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "Ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE;
