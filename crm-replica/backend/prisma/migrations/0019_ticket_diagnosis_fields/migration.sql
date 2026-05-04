-- AlterTable
ALTER TABLE "Ticket"
ADD COLUMN "diagnosis" TEXT,
ADD COLUMN "diagnosis_result" TEXT,
ADD COLUMN "requires_intervention" BOOLEAN NOT NULL DEFAULT false;
