-- AlterTable
ALTER TABLE "ItineranciaActivity" ADD COLUMN "period" TEXT;

-- CreateIndex
CREATE INDEX "ItineranciaActivity_adminId_period_idx" ON "ItineranciaActivity"("adminId", "period");
