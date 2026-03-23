ALTER TABLE "ServiceOrder"
  ADD COLUMN "tiempo_trabajado_horas" DOUBLE PRECISION,
  ADD COLUMN "firma_cliente" TEXT,
  ADD COLUMN "foto_trabajo_url" TEXT,
  ADD COLUMN "checklist_cierre" JSONB;

CREATE TABLE "OrderMaterial" (
  "id" TEXT NOT NULL,
  "order_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "quantity" DOUBLE PRECISION NOT NULL,
  "unit_cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrderMaterial_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OrderMaterial_order_id_created_at_idx" ON "OrderMaterial"("order_id", "created_at");

ALTER TABLE "OrderMaterial"
  ADD CONSTRAINT "OrderMaterial_order_id_fkey"
  FOREIGN KEY ("order_id") REFERENCES "ServiceOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
