import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { SIDEBAR_COLLAPSED_COOKIE } from "@/lib/admin-sidebar";
import { prisma } from "@/lib/prisma";
import { isItineranciasSchool } from "@/lib/itinerancias";
import { isSubscriptionSuspended } from "@/lib/subscription";
import { countPendingEncuentroFiles } from "@/lib/encuentro-storage";
import { currentMonth } from "@/lib/aranceles-calc";
import { countStudentsWithUnpaidAranceles } from "@/lib/aranceles-server";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { TourProvider } from "@/components/admin/tour/TourProvider";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) {
    redirect("/admin/login");
  }

  // El super-admin no tiene escuela propia: no hace falta resolver un slug para él.
  const admin =
    session.role === "ADMIN"
      ? await prisma.admin.findUnique({
          where: { id: session.adminId },
          select: {
            slug: true,
            subscriptionStatus: true,
            onboardingCompletedAt: true,
            contactEmail: true,
            photoUrl: true,
          },
        })
      : null;

  const suspended = admin ? isSubscriptionSuspended(admin.subscriptionStatus) : false;

  // La guía interactiva solo se ofrece una vez: cuando el admin ya tiene acceso real al panel
  // (en prueba gratis o pago, da igual) y todavía no se le mostró ni completó. Antes exigía
  // subscriptionStatus === "ACTIVE", lo que dejaba afuera a cualquier cuenta en TRIALING — con
  // la prueba gratis restaurada, la gran mayoría de las cuentas nuevas arrancan en TRIALING, así
  // que nunca veían el cartel. isSubscriptionSuspended ya es el único criterio que decide en
  // todo el resto de la app si una cuenta puede usar el panel o no; se reusa acá por lo mismo.
  const showOnboardingPrompt =
    session.role === "ADMIN" &&
    admin != null &&
    !isSubscriptionSuspended(admin.subscriptionStatus) &&
    admin.onboardingCompletedAt == null;

  // Cantidad de solicitudes de escuela nueva pendientes de aprobación: solo le importa al
  // super-admin (única cuenta con acceso a /admin/admins), así que se resuelve solo para él.
  const pendingAdminCount =
    session.role === "SUPER_ADMIN"
      ? await prisma.admin.count({ where: { role: "ADMIN", approved: false } })
      : 0;

  // Solicitudes de los admins de escuela (hoy solo pedidos de borrar un movimiento con recibo
  // ya exportado) esperando aprobación — ver /admin/solicitudes.
  const pendingSolicitudesCount =
    session.role === "SUPER_ADMIN"
      ? await prisma.adminRequest.count({ where: { status: "PENDIENTE" } })
      : 0;

  // Conteo de archivos, no query a la base: es la única prop de este layout que no sale de
  // Prisma, porque Encuentro no toca la base a propósito (ver OPERACIONES.md).
  const pendingEncuentroCount = session.role === "SUPER_ADMIN" ? await countPendingEncuentroFiles() : 0;

  // Alumnos con algún arancel sin pagar este mes: solo tiene sentido por escuela, igual que
  // el resto de los datos de alumnos (el super-admin no gestiona finanzas de ninguna escuela).
  const pendingArancelCount =
    session.role === "ADMIN" ? await countStudentsWithUnpaidAranceles(session.adminId, currentMonth()) : 0;

  const itineranciasEnabled = isItineranciasSchool(admin?.slug);

  // La preferencia de barra contraída se guarda en una cookie (no en localStorage) para que
  // el servidor renderice ya el estado correcto y no haya un parpadeo al cargar la página.
  const sidebarCollapsed = (await cookies()).get(SIDEBAR_COLLAPSED_COOKIE)?.value === "1";

  return (
    // TourProvider envuelve TODO (sidebar incluido), no solo {children}: el modal de "Mi
    // cuenta" que se abre desde el sidebar (AccountDialog) necesita el mismo useTour() para
    // su fila "Guía interactiva", así que el sidebar también tiene que ser descendiente del
    // provider. Este layout no se remonta al navegar entre /admin/alumnos, /admin/horarios,
    // etc., así que el estado del tour sigue sobreviviendo la navegación igual que antes.
    <TourProvider initialShowPrompt={showOnboardingPrompt}>
      <div className="flex min-h-dvh flex-col md:flex-row">
        <AdminSidebar
          displayName={session.displayName}
          username={session.username}
          role={session.role}
          schoolSlug={admin?.slug}
          contactEmail={admin?.contactEmail}
          photoUrl={admin?.photoUrl}
          pendingAdminCount={pendingAdminCount}
          pendingEncuentroCount={pendingEncuentroCount}
          pendingArancelCount={pendingArancelCount}
          pendingSolicitudesCount={pendingSolicitudesCount}
          itineranciasEnabled={itineranciasEnabled}
          defaultCollapsed={sidebarCollapsed}
          suspended={suspended}
        />
        {/* Sin scroll propio: antes esta caja se recortaba a la altura de la pantalla y generaba
            su propia barra angosta, separada de la barra grande del navegador. Ahora el contenido
            alto simplemente hace crecer la página, y el sidebar (sticky) se mantiene fijo con el
            único scroll, el de la página entera. */}
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </TourProvider>
  );
}
