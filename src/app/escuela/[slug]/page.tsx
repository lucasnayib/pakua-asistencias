import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getUnlockedAdminId } from "@/lib/school-access";
import { SchoolUnlockGate } from "@/components/attendance/SchoolUnlockGate";
import { EscuelaCheckInClient } from "./EscuelaCheckInClient";

type Params = { params: Promise<{ slug: string }> };

export default async function EscuelaHomePage({ params }: Params) {
  const { slug } = await params;

  const school = await prisma.admin.findFirst({
    where: { slug, active: true, role: "ADMIN" },
    select: { id: true, displayName: true },
  });

  if (!school) {
    notFound();
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
