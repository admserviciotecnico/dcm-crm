-- Persisted catalog for order status labels/colors and incremental configurability.
CREATE TABLE "OrderStatusConfig" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "color" TEXT NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "is_system" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrderStatusConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrderStatusConfig_key_key" ON "OrderStatusConfig"("key");
CREATE INDEX "OrderStatusConfig_is_active_sort_order_idx" ON "OrderStatusConfig"("is_active", "sort_order");

-- Make ServiceOrder.estado non-enum so custom catalog statuses can be persisted safely.
ALTER TABLE "ServiceOrder"
  ALTER COLUMN "estado" DROP DEFAULT,
  ALTER COLUMN "estado" TYPE TEXT USING "estado"::text,
  ALTER COLUMN "estado" SET DEFAULT 'presupuesto_generado';

INSERT INTO "OrderStatusConfig" ("id", "key", "label", "color", "sort_order", "is_active", "is_system", "created_at", "updated_at")
VALUES
  ('status_' || substr(md5(random()::text || clock_timestamp()::text), 1, 20), 'presupuesto_generado', 'Presupuesto generado', '#64748b', 10, true, true, NOW(), NOW()),
  ('status_' || substr(md5(random()::text || clock_timestamp()::text), 1, 20), 'oc_recibida', 'OC recibida', '#0ea5e9', 20, true, true, NOW(), NOW()),
  ('status_' || substr(md5(random()::text || clock_timestamp()::text), 1, 20), 'facturado', 'Facturado', '#2563eb', 30, true, true, NOW(), NOW()),
  ('status_' || substr(md5(random()::text || clock_timestamp()::text), 1, 20), 'pago_recibido', 'Pago recibido', '#06b6d4', 40, true, true, NOW(), NOW()),
  ('status_' || substr(md5(random()::text || clock_timestamp()::text), 1, 20), 'documentacion_enviada', 'Documentación enviada', '#8b5cf6', 50, true, true, NOW(), NOW()),
  ('status_' || substr(md5(random()::text || clock_timestamp()::text), 1, 20), 'documentacion_aprobada', 'Documentación aprobada', '#7c3aed', 60, true, true, NOW(), NOW()),
  ('status_' || substr(md5(random()::text || clock_timestamp()::text), 1, 20), 'service_programado', 'Service programado', '#f59e0b', 70, true, true, NOW(), NOW()),
  ('status_' || substr(md5(random()::text || clock_timestamp()::text), 1, 20), 'en_ejecucion', 'En ejecución', '#f97316', 80, true, true, NOW(), NOW()),
  ('status_' || substr(md5(random()::text || clock_timestamp()::text), 1, 20), 'completado', 'Completado', '#10b981', 90, true, true, NOW(), NOW()),
  ('status_' || substr(md5(random()::text || clock_timestamp()::text), 1, 20), 'cancelado', 'Cancelado', '#ef4444', 100, true, true, NOW(), NOW())
ON CONFLICT ("key") DO NOTHING;
