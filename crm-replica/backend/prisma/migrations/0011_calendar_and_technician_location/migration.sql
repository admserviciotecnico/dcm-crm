CREATE TYPE "CalendarProvider" AS ENUM ('google', 'outlook');
CREATE TYPE "CalendarSyncStatus" AS ENUM ('synced', 'pending', 'error');

CREATE TABLE "ExternalCalendarConnection" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "provider" "CalendarProvider" NOT NULL,
  "access_token" TEXT NOT NULL,
  "refresh_token" TEXT,
  "expires_at" TIMESTAMP(3),
  "external_calendar_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ExternalCalendarConnection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExternalCalendarEvent" (
  "id" TEXT NOT NULL,
  "order_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "provider" "CalendarProvider" NOT NULL,
  "external_event_id" TEXT NOT NULL,
  "sync_status" "CalendarSyncStatus" NOT NULL DEFAULT 'synced',
  "last_error" TEXT,
  "last_synced_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ExternalCalendarEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TechnicianLocation" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "lat" DOUBLE PRECISION NOT NULL,
  "lng" DOUBLE PRECISION NOT NULL,
  "accuracy" DOUBLE PRECISION,
  "captured_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TechnicianLocation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TechnicianLocationSharing" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TechnicianLocationSharing_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ExternalCalendarConnection_user_id_provider_key" ON "ExternalCalendarConnection"("user_id", "provider");
CREATE INDEX "ExternalCalendarConnection_provider_updated_at_idx" ON "ExternalCalendarConnection"("provider", "updated_at");

CREATE UNIQUE INDEX "ExternalCalendarEvent_order_id_user_id_provider_key" ON "ExternalCalendarEvent"("order_id", "user_id", "provider");
CREATE INDEX "ExternalCalendarEvent_user_id_provider_sync_status_idx" ON "ExternalCalendarEvent"("user_id", "provider", "sync_status");

CREATE INDEX "TechnicianLocation_user_id_captured_at_idx" ON "TechnicianLocation"("user_id", "captured_at");
CREATE UNIQUE INDEX "TechnicianLocationSharing_user_id_key" ON "TechnicianLocationSharing"("user_id");

ALTER TABLE "ExternalCalendarConnection"
  ADD CONSTRAINT "ExternalCalendarConnection_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ExternalCalendarEvent"
  ADD CONSTRAINT "ExternalCalendarEvent_order_id_fkey"
  FOREIGN KEY ("order_id") REFERENCES "ServiceOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ExternalCalendarEvent"
  ADD CONSTRAINT "ExternalCalendarEvent_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TechnicianLocation"
  ADD CONSTRAINT "TechnicianLocation_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TechnicianLocationSharing"
  ADD CONSTRAINT "TechnicianLocationSharing_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
