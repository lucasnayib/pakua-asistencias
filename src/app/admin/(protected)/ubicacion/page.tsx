import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LocationSettings } from "@/components/admin/LocationSettings";

export default async function UbicacionAdminPage() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  if (session.role === "SUPER_ADMIN") redirect("/admin/admins");

  const admin = await prisma.admin.findUnique({
    where: { id: session.adminId },
    select: { latitude: true, longitude: true, attendanceRadiusMeters: true },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Ubicación</h1>
        <p className="text-sm text-muted-foreground">
          Si la activás, la asistencia solo se va a poder marcar estando físicamente en la
          escuela.
        </p>
      </div>
      <LocationSettings
        initialLatitude={admin?.latitude ?? null}
        initialLongitude={admin?.longitude ?? null}
        initialRadius={admin?.attendanceRadiusMeters ?? null}
      />
    </div>
  );
}
