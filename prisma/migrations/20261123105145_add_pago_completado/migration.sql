-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PagoArancel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "tipoArancelId" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "paidAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "escuelaPorcentaje" INTEGER,
    "porcentajePagado" INTEGER,
    "pagoCompletado" BOOLEAN NOT NULL DEFAULT true,
    "reciboExportedAt" DATETIME,
    CONSTRAINT "PagoArancel_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PagoArancel_tipoArancelId_fkey" FOREIGN KEY ("tipoArancelId") REFERENCES "TipoArancel" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PagoArancel_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_PagoArancel" ("adminId", "amount", "createdAt", "escuelaPorcentaje", "id", "month", "paidAt", "porcentajePagado", "reciboExportedAt", "studentId", "tipoArancelId") SELECT "adminId", "amount", "createdAt", "escuelaPorcentaje", "id", "month", "paidAt", "porcentajePagado", "reciboExportedAt", "studentId", "tipoArancelId" FROM "PagoArancel";
DROP TABLE "PagoArancel";
ALTER TABLE "new_PagoArancel" RENAME TO "PagoArancel";
CREATE INDEX "PagoArancel_adminId_month_idx" ON "PagoArancel"("adminId", "month");
CREATE INDEX "PagoArancel_studentId_idx" ON "PagoArancel"("studentId");
CREATE UNIQUE INDEX "PagoArancel_studentId_tipoArancelId_month_key" ON "PagoArancel"("studentId", "tipoArancelId", "month");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
