-- CreateTable
CREATE TABLE "TipoArancel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "adminId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TipoArancel_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AlumnoArancel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "tipoArancelId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "startMonth" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AlumnoArancel_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AlumnoArancel_tipoArancelId_fkey" FOREIGN KEY ("tipoArancelId") REFERENCES "TipoArancel" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PagoArancel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "tipoArancelId" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "paidAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PagoArancel_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PagoArancel_tipoArancelId_fkey" FOREIGN KEY ("tipoArancelId") REFERENCES "TipoArancel" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PagoArancel_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MovimientoFinanciero" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "adminId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "concepto" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'PAGADO',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MovimientoFinanciero_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "TipoArancel_adminId_idx" ON "TipoArancel"("adminId");

-- CreateIndex
CREATE INDEX "AlumnoArancel_studentId_idx" ON "AlumnoArancel"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "AlumnoArancel_studentId_tipoArancelId_key" ON "AlumnoArancel"("studentId", "tipoArancelId");

-- CreateIndex
CREATE INDEX "PagoArancel_adminId_month_idx" ON "PagoArancel"("adminId", "month");

-- CreateIndex
CREATE INDEX "PagoArancel_studentId_idx" ON "PagoArancel"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "PagoArancel_studentId_tipoArancelId_month_key" ON "PagoArancel"("studentId", "tipoArancelId", "month");

-- CreateIndex
CREATE INDEX "MovimientoFinanciero_adminId_date_idx" ON "MovimientoFinanciero"("adminId", "date");
