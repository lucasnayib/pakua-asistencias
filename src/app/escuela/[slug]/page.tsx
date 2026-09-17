import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getUnlockedAdminId } from "@/lib/school-access";
import { isSubscriptionSuspended } from "@/lib/subscription";
import { SchoolUnlockGate } from "@/components/attendance/SchoolUnlockGate";
import { SchoolSuspendedNotice } from "@/components/attendance/SchoolSuspendedNotice";
import { EscuelaCheckInClient } from "./EscuelaCheckInClient";

type Params = { params: Promise<{ slug: string }> };

export default async function EscuelaHomePage({ params }: Params) {
  const { slug } = await params;

  const school = await prisma.admin.findFirst({
    where: { slug, active: true, role: "ADMIN" },
    select: { id: true, displayName: true, subscriptionStatus: true },
  });

  if (!school) {
    notFound();
  }

  // La suspensión corta el acceso a toda la página, tenga o no tenga ya una cookie de
  // desbloqueo vigente — se chequea antes que nada, ni siquiera se llega a pedir la contraseña.
  if (isSubscriptionSuspended(school.subscriptionStatus)) {
    return <SchoolSuspendedNotice schoolName={school.displayName} />;
  }

  // Acceso permitido con sesión de admin normal (para ese mismo tenant) o con la cookie de
  // desbloqueo de escuela — igual criterio que requireSchoolAccess() para las rutas de API.
  const [session, unlockedAdminId] = await Promise.all([getSession(), getUnlockedAdminId(slug)]);
  const hasSessionAccess = session?.role === "ADMIN" && session.adminId === school.id;
  const hasUnlockAccess = unlockedAdminId === school.id;

  if (!hasSessionAccess && !hasUnlockAccess) {
    return <SchoolUnlockGate slug={slug} schoolName={school.displayName} />;
  }

  return <EscuelaCheckInClient slug={slug} adminId={school.id} />;
}
