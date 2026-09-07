-- AlterTable
ALTER TABLE "Admin" ADD COLUMN "itineranciaAccessCodeHash" TEXT;

-- CreateTable
CREATE TABLE "ItineranciaActivity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "adminId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ItineranciaActivity_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ItineranciaStudentRegistration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "activityId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ItineranciaStudentRegistration_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "ItineranciaActivity" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ItineranciaStudentRegistration_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ItineranciaOrientadorRegistration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "activityId" TEXT NOT NULL,
    "orientadorId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ItineranciaOrientadorRegistration_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "ItineranciaActivity" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ItineranciaOrientadorRegistration_orientadorId_fkey" FOREIGN KEY ("orientadorId") REFERENCES "Orientador" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ItineranciaActivity_adminId_idx" ON "ItineranciaActivity"("adminId");

-- CreateIndex
CREATE INDEX "ItineranciaActivity_date_idx" ON "ItineranciaActivity"("date");

-- CreateIndex
CREATE UNIQUE INDEX "ItineranciaStudentRegistration_activityId_studentId_key" ON "ItineranciaStudentRegistration"("activityId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "ItineranciaOrientadorRegistration_activityId_orientadorId_key" ON "ItineranciaOrientadorRegistration"("activityId", "orientadorId");
