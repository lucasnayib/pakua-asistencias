import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendSubscriptionWarningEmail } from "@/lib/email";

const WARNING_WINDOW_MS = 12 * 60 * 60 * 1000; // 12 horas

/**
 * Job periódico (corre cada hora vía el Programador de tareas de Windows, ver
 * scripts/check-subscriptions.ts) que hace cumplir el trial y la gracia de pago sin
 * depender solo de que lleguen webhooks. No usa sesión de admin — se protege con un
 * secreto simple en el header `x-cron-secret`.
 */
export async function POST(request: Request) {
  const secret = process.env.INTERNAL_CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "No configurado" }, { status: 500 });
  }
  if (request.headers.get("x-cron-secret") !== secret) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const now = new Date();
  const warningThreshold = new Date(now.getTime() + WARNING_WINDOW_MS);

  const admins = await prisma.admin.findMany({ where: { role: "ADMIN" } });

  let trialWarnings = 0;
  let trialSuspensions = 0;
  let periodWarnings = 0;
  let graceSuspensions = 0;

  for (const admin of admins) {
    if (admin.subscriptionStatus === "TRIALING" && admin.trialEndsAt) {
      if (admin.trialEndsAt <= now) {
        await prisma.admin.update({ where: { id: admin.id }, data: { subscriptionStatus: "SUSPENDED" } });
        trialSuspensions++;
        continue;
      }
      if (!admin.trialWarningSentAt && admin.trialEndsAt <= warningThreshold) {
        await prisma.admin.update({ where: { id: admin.id }, data: { trialWarningSentAt: now } });
        if (admin.contactEmail) {
          await sendSubscriptionWarningEmail({
            contactEmail: admin.contactEmail,
            displayName: admin.displayName,
            reason: "TRIAL_ENDING",
          });
        }
        trialWarnings++;
      }
      continue;
    }

    if (admin.subscriptionStatus === "ACTIVE" && admin.currentPeriodEnd) {
      if (!admin.periodWarningSentAt && admin.currentPeriodEnd <= warningThreshold && admin.currentPeriodEnd > now) {
        await prisma.admin.update({ where: { id: admin.id }, data: { periodWarningSentAt: now } });
        if (admin.contactEmail) {
          await sendSubscriptionWarningEmail({
            contactEmail: admin.contactEmail,
            displayName: admin.displayName,
            reason: "PAYMENT_DUE",
          });
        }
        periodWarnings++;
      }
      continue;
    }

    if (admin.subscriptionStatus === "PAST_DUE" && admin.graceEndsAt && admin.graceEndsAt <= now) {
      await prisma.admin.update({ where: { id: admin.id }, data: { subscriptionStatus: "SUSPENDED" } });
      graceSuspensions++;
    }
  }

  return NextResponse.json({ ok: true, trialWarnings, trialSuspensions, periodWarnings, graceSuspensions });
}
