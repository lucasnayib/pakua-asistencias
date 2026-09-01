-- Agrega columnas de 2FA (TOTP) al modelo Admin. Nullable / default seguro para no romper
-- filas existentes.
ALTER TABLE "Admin" ADD COLUMN "twoFactorSecret" TEXT;
ALTER TABLE "Admin" ADD COLUMN "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Admin" ADD COLUMN "twoFactorBackupCodes" TEXT;
