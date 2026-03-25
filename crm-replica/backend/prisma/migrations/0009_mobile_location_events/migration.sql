CREATE TABLE "OrderLocationEvent" (
  "id" TEXT NOT NULL,
  "order_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "event_type" TEXT NOT NULL,
  "latitude" DOUBLE PRECISION NOT NULL,
  "longitude" DOUBLE PRECISION NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrderLocationEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OrderLocationEvent_order_id_created_at_idx" ON "OrderLocationEvent"("order_id", "created_at");
CREATE INDEX "OrderLocationEvent_user_id_created_at_idx" ON "OrderLocationEvent"("user_id", "created_at");

ALTER TABLE "OrderLocationEvent"
  ADD CONSTRAINT "OrderLocationEvent_order_id_fkey"
  FOREIGN KEY ("order_id") REFERENCES "ServiceOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrderLocationEvent"
  ADD CONSTRAINT "OrderLocationEvent_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
