import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <AdminSidebar
        displayName={session.displayName}
        role={session.role}
        schoolSlug={admin?.slug}
        pendingAdminCount={pendingAdminCount}
      />
      <main className="flex-1 overflow-y-auto p-4 md:p-8">{children}</main>
    </div>
  );
}
