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

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <AdminSidebar displayName={session.displayName} role={session.role} schoolSlug={admin?.slug} />
      <main className="flex-1 overflow-y-auto p-4 md:p-8">{children}</main>
    </div>
  );
}
