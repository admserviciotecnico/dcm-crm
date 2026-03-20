ALTER TABLE "Notification"
  ADD COLUMN IF NOT EXISTS "client_id" TEXT,
  ADD COLUMN IF NOT EXISTS "kind" TEXT;

CREATE INDEX IF NOT EXISTS "Notification_user_id_kind_service_order_id_created_at_idx"
  ON "Notification" ("user_id", "kind", "service_order_id", "created_at");

CREATE INDEX IF NOT EXISTS "Notification_user_id_kind_client_id_created_at_idx"
  ON "Notification" ("user_id", "kind", "client_id", "created_at");
