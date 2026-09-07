/*
  Warnings:

  - Added the required column `slug` to the `Admin` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Admin" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL DEFAULT '',
    "slug" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'ADMIN',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "approved" BOOLEAN NOT NULL DEFAULT true,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "twoFactorSecret" TEXT,
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorBackupCodes" TEXT,
    "latitude" REAL,
    "longitude" REAL,
    "attendanceRadiusMeters" INTEGER,
    "pendingChangeType" TEXT,
    "pendingChangeValue" TEXT,
    "pendingChangeCodeHash" TEXT,
    "pendingChangeExpiresAt" DATETIME,
    "subscriptionStatus" TEXT NOT NULL DEFAULT 'TRIALING',
    "trialEndsAt" DATETIME,
    "trialWarningSentAt" DATETIME,
    "currentPeriodEnd" DATETIME,
    "periodWarningSentAt" DATETIME,
    "graceEndsAt" DATETIME,
    "mpPreapprovalId" TEXT,
    "mpPayerEmail" TEXT,
    "inactivityDeactivationDays" INTEGER
);
INSERT INTO "new_Admin" ("active", "approved", "attendanceRadiusMeters", "contactEmail", "contactPhone", "createdAt", "currentPeriodEnd", "displayName", "graceEndsAt", "id", "latitude", "longitude", "mpPayerEmail", "mpPreapprovalId", "passwordHash", "pendingChangeCodeHash", "pendingChangeExpiresAt", "pendingChangeType", "pendingChangeValue", "periodWarningSentAt", "role", "subscriptionStatus", "trialEndsAt", "trialWarningSentAt", "twoFactorBackupCodes", "twoFactorEnabled", "twoFactorSecret", "username") SELECT "active", "approved", "attendanceRadiusMeters", "contactEmail", "contactPhone", "createdAt", "currentPeriodEnd", "displayName", "graceEndsAt", "id", "latitude", "longitude", "mpPayerEmail", "mpPreapprovalId", "passwordHash", "pendingChangeCodeHash", "pendingChangeExpiresAt", "pendingChangeType", "pendingChangeValue", "periodWarningSentAt", "role", "subscriptionStatus", "trialEndsAt", "trialWarningSentAt", "twoFactorBackupCodes", "twoFactorEnabled", "twoFactorSecret", "username" FROM "Admin";
DROP TABLE "Admin";
ALTER TABLE "new_Admin" RENAME TO "Admin";
CREATE UNIQUE INDEX "Admin_username_key" ON "Admin"("username");
CREATE UNIQUE INDEX "Admin_slug_key" ON "Admin"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
