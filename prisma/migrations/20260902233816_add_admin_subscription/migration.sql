-- Suscripción (Mercado Pago). Nullable / default seguro, no toca filas existentes.
ALTER TABLE "Admin" ADD COLUMN "subscriptionStatus" TEXT NOT NULL DEFAULT 'TRIALING';
ALTER TABLE "Admin" ADD COLUMN "trialEndsAt" DATETIME;
ALTER TABLE "Admin" ADD COLUMN "trialWarningSentAt" DATETIME;
ALTER TABLE "Admin" ADD COLUMN "currentPeriodEnd" DATETIME;
ALTER TABLE "Admin" ADD COLUMN "periodWarningSentAt" DATETIME;
ALTER TABLE "Admin" ADD COLUMN "graceEndsAt" DATETIME;
ALTER TABLE "Admin" ADD COLUMN "mpPreapprovalId" TEXT;
ALTER TABLE "Admin" ADD COLUMN "mpPayerEmail" TEXT;
