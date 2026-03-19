-- Phase 1: persist equipment technical metadata in backend
ALTER TABLE "Equipment"
  ADD COLUMN IF NOT EXISTS "observaciones" TEXT,
  ADD COLUMN IF NOT EXISTS "fecha_instalacion" TIMESTAMP(3);
