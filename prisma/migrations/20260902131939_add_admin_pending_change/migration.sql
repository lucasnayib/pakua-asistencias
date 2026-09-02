-- Cambio pendiente de mail o contraseña, con código de confirmación por mail.
ALTER TABLE "Admin" ADD COLUMN "pendingChangeType" TEXT;
ALTER TABLE "Admin" ADD COLUMN "pendingChangeValue" TEXT;
ALTER TABLE "Admin" ADD COLUMN "pendingChangeCodeHash" TEXT;
ALTER TABLE "Admin" ADD COLUMN "pendingChangeExpiresAt" DATETIME;
