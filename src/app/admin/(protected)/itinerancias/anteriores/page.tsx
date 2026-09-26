import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isItineranciasSchool } from "@/lib/itinerancias";
import { ItineranciasAnterioresClient } from "@/components/admin/ItineranciasAnterioresClient";

export default async function ItineranciasAnterioresPage() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  if (session.role === "SUPER_ADMIN") redirect("/admin/admins");

  const admin = await prisma.admin.findUnique({ where: { id: session.adminId }, select: { slug: true } });

  if (!isItineranciasSchool(admin?.slug)) {
    redirect("/admin");
  }

  return <ItineranciasAnterioresClient />;
}
