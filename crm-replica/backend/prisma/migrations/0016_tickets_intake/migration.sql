-- CreateTable
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "equipment_id" TEXT,
    "serial_number" TEXT,
    "channel" TEXT NOT NULL,
    "issue_description" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "category" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "reported_by_name" TEXT,
    "reported_by_contact" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketEvent" (
    "id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Ticket_client_id_idx" ON "Ticket"("client_id");

-- CreateIndex
CREATE INDEX "Ticket_status_idx" ON "Ticket"("status");

-- CreateIndex
CREATE INDEX "TicketEvent_ticket_id_idx" ON "TicketEvent"("ticket_id");

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketEvent" ADD CONSTRAINT "TicketEvent_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
