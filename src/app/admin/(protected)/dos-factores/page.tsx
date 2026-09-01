import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TwoFactorSettings } from "@/components/admin/TwoFactorSettings";

export default async function DosFactoresPage() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  if (session.role !== "SUPER_ADMIN") redirect("/admin");

  const admin = await prisma.admin.findUnique({
    where: { id: session.adminId },
    select: { twoFactorEnabled: true },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Seguridad</h1>
        <p className="text-sm text-muted-foreground">
          Autenticación en dos pasos para tu cuenta de super-admin.
        </p>
      </div>
      <TwoFactorSettings initiallyEnabled={admin?.twoFactorEnabled ?? false} />
    </div>
  );
}
