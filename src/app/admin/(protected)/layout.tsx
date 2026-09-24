import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { SIDEBAR_COLLAPSED_COOKIE } from "@/lib/admin-sidebar";
import { prisma } from "@/lib/prisma";
import { isItineranciasOpen, isItineranciasSchool } from "@/lib/itinerancias";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) {
    redirect("/admin/login");
  }

  // El super-admin no tiene escuela propia: no hace falta resolver un slug para él.
  const admin =
    session.role === "ADMIN"
      ? await prisma.admin.findUnique({ where: { id: session.adminId }, select: { slug: true } })
      : null;

  // Cantidad de solicitudes de escuela nueva pendientes de aprobación: solo le importa al
  // super-admin (única cuenta con acceso a /admin/admins), así que se resuelve solo para él.
  const pendingAdminCount =
    session.role === "SUPER_ADMIN"
      ? await prisma.admin.count({ where: { role: "ADMIN", approved: false } })
      : 0;

  const itineranciasEnabled = isItineranciasSchool(admin?.slug) && isItineranciasOpen();

  // La preferencia de barra contraída se guarda en una cookie (no en localStorage) para que
  // el servidor renderice ya el estado correcto y no haya un parpadeo al cargar la página.
  const sidebarCollapsed = (await cookies()).get(SIDEBAR_COLLAPSED_COOKIE)?.value === "1";

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <AdminSidebar
        displayName={session.displayName}
        username={session.username}
        role={session.role}
        schoolSlug={admin?.slug}
        pendingAdminCount={pendingAdminCount}
        itineranciasEnabled={itineranciasEnabled}
        defaultCollapsed={sidebarCollapsed}
      />
      {/* Sin scroll propio: antes esta caja se recortaba a la altura de la pantalla y generaba
          su propia barra angosta, separada de la barra grande del navegador. Ahora el contenido
          alto simplemente hace crecer la página, y el sidebar (sticky) se mantiene fijo con el
          único scroll, el de la página entera. */}
      <main className="flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
