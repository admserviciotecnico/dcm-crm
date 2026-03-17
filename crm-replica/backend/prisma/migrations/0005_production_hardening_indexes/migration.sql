-- Document: add created_at index for global chronological queries
CREATE INDEX IF NOT EXISTS "Document_created_at_idx" ON "Document"("created_at");

-- EventLog: optimize entity timeline queries ordered by created_at
DROP INDEX IF EXISTS "EventLog_entity_type_entity_id_idx";
CREATE INDEX IF NOT EXISTS "EventLog_entity_type_entity_id_created_at_idx" ON "EventLog"("entity_type", "entity_id", "created_at");
