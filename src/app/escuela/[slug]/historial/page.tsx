import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getUnlockedAdminId } from "@/lib/school-access";
import { SchoolUnlockGate } from "@/components/attendance/SchoolUnlockGate";
import { HistorialClient } from "./HistorialClient";

type Params = { params: Promise<{ slug: string }> };

export default async function HistorialPage({ params }: Params) {
  const { slug } = await params;

  const school = await prisma.admin.findFirst({
    where: { slug, active: true, role: "ADMIN" },
    select: { id: true, displayName: true },
  });

  if (!school) {
    notFound();
  }

  const [session, unlockedAdminId] = await Promise.all([getSession(), getUnlockedAdminId(slug)]);
  const hasSessionAccess = session?.role === "ADMIN" && session.adminId === school.id;
  const hasUnlockAccess = unlockedAdminId === school.id;

  if (!hasSessionAccess && !hasUnlockAccess) {
    return <SchoolUnlockGate slug={slug} schoolName={school.displayName} />;
  }

  return <HistorialClient slug={slug} adminId={school.id} />;
}
