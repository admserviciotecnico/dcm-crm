DELETE FROM "Notification" n
USING "Notification" dup
WHERE n.id > dup.id
  AND n.user_id = dup.user_id
  AND n.kind = dup.kind
  AND n.service_order_id = dup.service_order_id
  AND n.kind IS NOT NULL
  AND n.service_order_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "Notification_user_id_kind_service_order_id_key"
  ON "Notification" ("user_id", "kind", "service_order_id");
