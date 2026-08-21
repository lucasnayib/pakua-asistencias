import { redirect } from "next/navigation";
import { getStudentStats } from "@/lib/stats";
import { getSession } from "@/lib/auth";
import { StatsTable } from "@/components/admin/StatsTable";

export default async function EstadisticasAdminPage() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  const stats = await getStudentStats(session.adminId);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Estadísticas de asistencia</h1>
        <p className="text-sm text-muted-foreground">
          Porcentaje de asistencia por alumno desde que fue asignado a cada horario.
        </p>
      </div>
      <StatsTable stats={stats} />
    </div>
  );
}
