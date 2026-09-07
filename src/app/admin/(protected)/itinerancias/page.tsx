import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isItineranciasOpen, isItineranciasSchool } from "@/lib/itinerancias";
import { ItineranciasAdminClient } from "@/components/admin/ItineranciasAdminClient";

export default async function ItineranciasAdminPage() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  if (session.role === "SUPER_ADMIN") redirect("/admin/admins");

  const admin = await prisma.admin.findUnique({ where: { id: session.adminId }, select: { slug: true } });

  if (!isItineranciasSchool(admin?.slug)) {
    redirect("/admin");
  }

  if (!isItineranciasOpen()) {
    return (
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Itinerancias</h1>
        <p className="text-sm text-muted-foreground">
          Esta sección se abre en marzo, junio, septiembre y diciembre. Fuera de esos meses no
          se puede crear ni editar actividades.
        </p>
      </div>
    );
  }

  return <ItineranciasAdminClient />;
}
