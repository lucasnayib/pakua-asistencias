-- AlterTable
ALTER TABLE "Admin" ADD COLUMN "approved" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Admin" ADD COLUMN "contactEmail" TEXT;
ALTER TABLE "Admin" ADD COLUMN "contactPhone" TEXT;
