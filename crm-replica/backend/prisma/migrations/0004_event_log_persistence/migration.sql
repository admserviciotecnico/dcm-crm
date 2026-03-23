-- Phase 3: persistent event log
DO $$ BEGIN
  CREATE TYPE "EventEntityType" AS ENUM ('order', 'client', 'equipment', 'document', 'system');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "EventType" AS ENUM ('created', 'updated', 'deleted', 'status_changed', 'document_added', 'document_removed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "EventLog" (
  "id" TEXT NOT NULL,
  "entity_type" "EventEntityType" NOT NULL,
  "entity_id" TEXT,
  "event_type" "EventType" NOT NULL,
  "message" TEXT NOT NULL,
  "actor_user_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EventLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "EventLog_entity_type_entity_id_idx" ON "EventLog"("entity_type", "entity_id");
CREATE INDEX IF NOT EXISTS "EventLog_created_at_idx" ON "EventLog"("created_at");
