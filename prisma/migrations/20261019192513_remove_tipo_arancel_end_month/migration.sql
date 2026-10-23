/*
  Warnings:

  - You are about to drop the column `endMonth` on the `TipoArancel` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_TipoArancel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "adminId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TipoArancel_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_TipoArancel" ("active", "adminId", "amount", "createdAt", "id", "name", "updatedAt") SELECT "active", "adminId", "amount", "createdAt", "id", "name", "updatedAt" FROM "TipoArancel";
DROP TABLE "TipoArancel";
ALTER TABLE "new_TipoArancel" RENAME TO "TipoArancel";
CREATE INDEX "TipoArancel_adminId_idx" ON "TipoArancel"("adminId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
