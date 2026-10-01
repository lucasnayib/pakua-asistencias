-- CreateTable
CREATE TABLE "StudentMigration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "expiresAt" DATETIME NOT NULL,
    "destinationAdminId" TEXT,
    "newStudentId" TEXT,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StudentMigration_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "StudentMigration_studentId_idx" ON "StudentMigration"("studentId");

-- CreateIndex
CREATE INDEX "StudentMigration_codeHash_idx" ON "StudentMigration"("codeHash");

-- CreateIndex
CREATE INDEX "StudentMigration_status_expiresAt_idx" ON "StudentMigration"("status", "expiresAt");
