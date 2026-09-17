import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getUnlockedAdminId } from "@/lib/school-access";
import { isSubscriptionSuspended } from "@/lib/subscription";
import { SchoolUnlockGate } from "@/components/attendance/SchoolUnlockGate";
import { SchoolSuspendedNotice } from "@/components/attendance/SchoolSuspendedNotice";
import { HistorialClient } from "./HistorialClient";

type Params = { params: Promise<{ slug: string }> };

export default async function HistorialPage({ params }: Params) {
  const { slug } = await params;

  const school = await prisma.admin.findFirst({
    where: { slug, active: true, role: "ADMIN" },
    select: { id: true, displayName: true, subscriptionStatus: true },
  });

  if (!school) {
    notFound();
  }

  if (isSubscriptionSuspended(school.subscriptionStatus)) {
    return <SchoolSuspendedNotice schoolName={school.displayName} />;
  }

  const [session, unlockedAdminId] = await Promise.all([getSession(), getUnlockedAdminId(slug)]);
  const hasSessionAccess = session?.role === "ADMIN" && session.adminId === school.id;
  const hasUnlockAccess = unlockedAdminId === school.id;

  if (!hasSessionAccess && !hasUnlockAccess) {
    return <SchoolUnlockGate slug={slug} schoolName={school.displayName} />;
  }

  return <HistorialClient slug={slug} adminId={school.id} />;
}
