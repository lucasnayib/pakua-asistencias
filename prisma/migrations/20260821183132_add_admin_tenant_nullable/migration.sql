-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN "adminId" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Admin" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL DEFAULT '',
    "role" TEXT NOT NULL DEFAULT 'ADMIN',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Admin" ("createdAt", "id", "passwordHash", "username") SELECT "createdAt", "id", "passwordHash", "username" FROM "Admin";
DROP TABLE "Admin";
ALTER TABLE "new_Admin" RENAME TO "Admin";
CREATE UNIQUE INDEX "Admin_username_key" ON "Admin"("username");
CREATE TABLE "new_ExportLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "adminId" TEXT,
    "filename" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "dateFrom" TEXT NOT NULL,
    "dateTo" TEXT NOT NULL,
    "driveUploaded" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExportLog_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ExportLog" ("createdAt", "dateFrom", "dateTo", "driveUploaded", "filename", "format", "id") SELECT "createdAt", "dateFrom", "dateTo", "driveUploaded", "filename", "format", "id" FROM "ExportLog";
DROP TABLE "ExportLog";
ALTER TABLE "new_ExportLog" RENAME TO "ExportLog";
CREATE INDEX "ExportLog_adminId_idx" ON "ExportLog"("adminId");
CREATE TABLE "new_Orientador" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "adminId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "photoUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Orientador_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Orientador" ("active", "createdAt", "email", "firstName", "id", "lastName", "phone", "photoUrl", "updatedAt") SELECT "active", "createdAt", "email", "firstName", "id", "lastName", "phone", "photoUrl", "updatedAt" FROM "Orientador";
DROP TABLE "Orientador";
ALTER TABLE "new_Orientador" RENAME TO "Orientador";
CREATE INDEX "Orientador_lastName_firstName_idx" ON "Orientador"("lastName", "firstName");
CREATE INDEX "Orientador_adminId_idx" ON "Orientador"("adminId");
CREATE TABLE "new_Schedule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "adminId" TEXT,
    "name" TEXT,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Schedule_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Schedule" ("createdAt", "endTime", "id", "name", "startTime", "updatedAt") SELECT "createdAt", "endTime", "id", "name", "startTime", "updatedAt" FROM "Schedule";
DROP TABLE "Schedule";
ALTER TABLE "new_Schedule" RENAME TO "Schedule";
CREATE INDEX "Schedule_adminId_idx" ON "Schedule"("adminId");
CREATE TABLE "new_Student" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "adminId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "photoUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Student_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Student" ("active", "createdAt", "firstName", "id", "lastName", "photoUrl", "updatedAt") SELECT "active", "createdAt", "firstName", "id", "lastName", "photoUrl", "updatedAt" FROM "Student";
DROP TABLE "Student";
ALTER TABLE "new_Student" RENAME TO "Student";
CREATE INDEX "Student_lastName_firstName_idx" ON "Student"("lastName", "firstName");
CREATE INDEX "Student_adminId_idx" ON "Student"("adminId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- Backfill: el admin mas antiguo pasa a ser SUPER_ADMIN activo, con displayName = username,
-- y todos los datos existentes (Student/Schedule/Orientador/ExportLog) quedan bajo su tenant.
UPDATE "Admin"
SET "role" = 'SUPER_ADMIN', "active" = 1, "displayName" = "username"
WHERE "id" = (SELECT "id" FROM "Admin" ORDER BY "createdAt" ASC LIMIT 1);

UPDATE "Student" SET "adminId" = (SELECT "id" FROM "Admin" ORDER BY "createdAt" ASC LIMIT 1) WHERE "adminId" IS NULL;
UPDATE "Schedule" SET "adminId" = (SELECT "id" FROM "Admin" ORDER BY "createdAt" ASC LIMIT 1) WHERE "adminId" IS NULL;
UPDATE "Orientador" SET "adminId" = (SELECT "id" FROM "Admin" ORDER BY "createdAt" ASC LIMIT 1) WHERE "adminId" IS NULL;
UPDATE "ExportLog" SET "adminId" = (SELECT "id" FROM "Admin" ORDER BY "createdAt" ASC LIMIT 1) WHERE "adminId" IS NULL;
