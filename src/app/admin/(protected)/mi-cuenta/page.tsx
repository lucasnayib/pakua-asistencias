import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MiCuentaSettings } from "@/components/admin/MiCuentaSettings";

export default async function MiCuentaPage() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  if (session.role === "SUPER_ADMIN") redirect("/admin/admins");

  const admin = await prisma.admin.findUnique({
    where: { id: session.adminId },
    select: { contactEmail: true },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Mi cuenta</h1>
        <p className="text-sm text-muted-foreground">
          Cambiá tu mail de contacto o tu contraseña. Por seguridad, ambos cambios se confirman
          con un código que te mandamos por mail.
        </p>
      </div>
      <MiCuentaSettings initialContactEmail={admin?.contactEmail ?? null} />
    </div>
  );
}
