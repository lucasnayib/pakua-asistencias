-- CreateTable
CREATE TABLE "Orientador" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "photoUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "OrientadorStudent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orientadorId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrientadorStudent_orientadorId_fkey" FOREIGN KEY ("orientadorId") REFERENCES "Orientador" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrientadorStudent_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Orientador_lastName_firstName_idx" ON "Orientador"("lastName", "firstName");

-- CreateIndex
CREATE UNIQUE INDEX "OrientadorStudent_orientadorId_studentId_key" ON "OrientadorStudent"("orientadorId", "studentId");
