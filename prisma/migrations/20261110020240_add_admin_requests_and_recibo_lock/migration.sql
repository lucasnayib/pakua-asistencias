-- AlterTable
ALTER TABLE "MovimientoFinanciero" ADD COLUMN "reciboExportedAt" DATETIME;

-- AlterTable
ALTER TABLE "PagoArancel" ADD COLUMN "reciboExportedAt" DATETIME;

-- CreateTable
CREATE TABLE "AdminRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "adminId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "targetLabel" TEXT,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "resolutionNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" DATETIME,
    CONSTRAINT "AdminRequest_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "AdminRequest_adminId_idx" ON "AdminRequest"("adminId");

-- CreateIndex
CREATE INDEX "AdminRequest_status_idx" ON "AdminRequest"("status");
