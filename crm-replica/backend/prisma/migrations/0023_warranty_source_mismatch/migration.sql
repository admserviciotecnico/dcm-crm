CREATE TYPE "WarrantySource" AS ENUM ('ticket', 'order_override');

ALTER TABLE "Ticket"
  ADD COLUMN "warranty_source" "WarrantySource";

ALTER TABLE "ServiceOrder"
  ADD COLUMN "warranty_source" "WarrantySource";
