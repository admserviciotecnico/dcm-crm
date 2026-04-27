-- CreateEnum
CREATE TYPE "WarrantyStatus" AS ENUM ('unknown', 'pending_review', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "WarrantyCoverage" AS ENUM ('full', 'partial', 'none');

-- AlterTable Ticket
ALTER TABLE "Ticket"
  ADD COLUMN "warranty_status" "WarrantyStatus" NOT NULL DEFAULT 'unknown',
  ADD COLUMN "coverage" "WarrantyCoverage" NOT NULL DEFAULT 'none',
  ADD COLUMN "approved_by" TEXT,
  ADD COLUMN "warranty_reason" TEXT,
  ADD COLUMN "warranty_notes" TEXT,
  ADD COLUMN "reviewed_at" TIMESTAMP(3);

-- AlterTable ServiceOrder
ALTER TABLE "ServiceOrder"
  ADD COLUMN "warranty_status" "WarrantyStatus" NOT NULL DEFAULT 'unknown',
  ADD COLUMN "coverage" "WarrantyCoverage" NOT NULL DEFAULT 'none',
  ADD COLUMN "approved_by" TEXT,
  ADD COLUMN "warranty_reason" TEXT,
  ADD COLUMN "warranty_notes" TEXT,
  ADD COLUMN "reviewed_at" TIMESTAMP(3);
