/*
  Warnings:

  - Made the column `adminId` on table `ExportLog` required. This step will fail if there are existing NULL values in that column.
  - Made the column `adminId` on table `Orientador` required. This step will fail if there are existing NULL values in that column.
  - Made the column `adminId` on table `Schedule` required. This step will fail if there are existing NULL values in that column.
  - Made the column `adminId` on table `Student` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ExportLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "adminId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "dateFrom" TEXT NOT NULL,
    "dateTo" TEXT NOT NULL,
    "driveUploaded" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExportLog_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ExportLog" ("adminId", "createdAt", "dateFrom", "dateTo", "driveUploaded", "filename", "format", "id") SELECT "adminId", "createdAt", "dateFrom", "dateTo", "driveUploaded", "filename", "format", "id" FROM "ExportLog";
DROP TABLE "ExportLog";
ALTER TABLE "new_ExportLog" RENAME TO "ExportLog";
CREATE INDEX "ExportLog_adminId_idx" ON "ExportLog"("adminId");
CREATE TABLE "new_Orientador" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "adminId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "photoUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Orientador_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Orientador" ("active", "adminId", "createdAt", "email", "firstName", "id", "lastName", "phone", "photoUrl", "updatedAt") SELECT "active", "adminId", "createdAt", "email", "firstName", "id", "lastName", "phone", "photoUrl", "updatedAt" FROM "Orientador";
DROP TABLE "Orientador";
ALTER TABLE "new_Orientador" RENAME TO "Orientador";
CREATE INDEX "Orientador_lastName_firstName_idx" ON "Orientador"("lastName", "firstName");
CREATE INDEX "Orientador_adminId_idx" ON "Orientador"("adminId");
CREATE TABLE "new_Schedule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "adminId" TEXT NOT NULL,
    "name" TEXT,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Schedule_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Schedule" ("adminId", "createdAt", "endTime", "id", "name", "startTime", "updatedAt") SELECT "adminId", "createdAt", "endTime", "id", "name", "startTime", "updatedAt" FROM "Schedule";
DROP TABLE "Schedule";
ALTER TABLE "new_Schedule" RENAME TO "Schedule";
CREATE INDEX "Schedule_adminId_idx" ON "Schedule"("adminId");
CREATE TABLE "new_Student" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "adminId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "photoUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Student_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Student" ("active", "adminId", "createdAt", "firstName", "id", "lastName", "photoUrl", "updatedAt") SELECT "active", "adminId", "createdAt", "firstName", "id", "lastName", "photoUrl", "updatedAt" FROM "Student";
DROP TABLE "Student";
ALTER TABLE "new_Student" RENAME TO "Student";
CREATE INDEX "Student_lastName_firstName_idx" ON "Student"("lastName", "firstName");
CREATE INDEX "Student_adminId_idx" ON "Student"("adminId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
