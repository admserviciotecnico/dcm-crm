-- Allow status history to persist configurable/custom status keys.
ALTER TABLE "ServiceOrderStatusHistory"
  ALTER COLUMN "estado_anterior" TYPE TEXT USING "estado_anterior"::text,
  ALTER COLUMN "estado_nuevo" TYPE TEXT USING "estado_nuevo"::text;
