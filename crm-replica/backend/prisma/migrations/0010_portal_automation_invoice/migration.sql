CREATE TABLE "PortalUser" (
  "id" TEXT NOT NULL,
  "client_id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "password" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "last_login_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PortalUser_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PortalUser_email_key" ON "PortalUser"("email");
CREATE INDEX "PortalUser_client_id_active_idx" ON "PortalUser"("client_id", "active");

ALTER TABLE "PortalUser"
  ADD CONSTRAINT "PortalUser_client_id_fkey"
  FOREIGN KEY ("client_id") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "AutomationRule" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "trigger_type" TEXT NOT NULL,
  "target_status" "OrderStatus" NOT NULL,
  "threshold_hours" INTEGER NOT NULL,
  "action_type" TEXT NOT NULL,
  "action_payload" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AutomationRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InvoiceDraft" (
  "id" TEXT NOT NULL,
  "order_id" TEXT NOT NULL,
  "client_id" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "labor_hours" DOUBLE PRECISION NOT NULL,
  "labor_rate" DOUBLE PRECISION NOT NULL,
  "labor_amount" DOUBLE PRECISION NOT NULL,
  "materials_amount" DOUBLE PRECISION NOT NULL,
  "total_amount" DOUBLE PRECISION NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "payload" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InvoiceDraft_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InvoiceDraft_order_id_key" ON "InvoiceDraft"("order_id");
CREATE INDEX "InvoiceDraft_client_id_created_at_idx" ON "InvoiceDraft"("client_id", "created_at");

ALTER TABLE "InvoiceDraft"
  ADD CONSTRAINT "InvoiceDraft_order_id_fkey"
  FOREIGN KEY ("order_id") REFERENCES "ServiceOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InvoiceDraft"
  ADD CONSTRAINT "InvoiceDraft_client_id_fkey"
  FOREIGN KEY ("client_id") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
