-- Phase 2: persist documents metadata in backend
DO $$ BEGIN
  CREATE TYPE "DocumentEntityType" AS ENUM ('order', 'client', 'equipment');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "DocumentCategory" AS ENUM ('contract', 'report', 'photo', 'other');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "Document" (
  "id" TEXT NOT NULL,
  "entity_type" "DocumentEntityType" NOT NULL,
  "entity_id" TEXT NOT NULL,
  "file_name" TEXT NOT NULL,
  "file_category" "DocumentCategory" NOT NULL DEFAULT 'other',
  "file_path" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Document_entity_type_entity_id_created_at_idx"
  ON "Document"("entity_type", "entity_id", "created_at");
