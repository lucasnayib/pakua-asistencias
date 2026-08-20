import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { formatDateEs } from "@/lib/time";
import { ExportForm } from "@/components/admin/ExportForm";

export default async function ExportacionesAdminPage() {
  const [schedules, logs] = await Promise.all([
    prisma.schedule.findMany({ orderBy: { startTime: "asc" } }),
    prisma.exportLog.findMany({ orderBy: { createdAt: "desc" }, take: 15 }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Exportaciones</h1>
        <p className="text-sm text-muted-foreground">
          Generá un archivo con las asistencias de un rango de fechas, en Excel, PDF o TXT.
        </p>
      </div>

      <Card className="p-5">
        <ExportForm schedules={schedules.map((s) => ({ id: s.id, name: s.name, startTime: s.startTime, endTime: s.endTime }))} />
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Exportaciones recientes</h2>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no se generó ninguna exportación.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border text-sm">
            {logs.map((log) => (
              <li key={log.id} className="flex items-center justify-between py-2">
                <span>
                  {log.filename} · {formatDateEs(log.dateFrom)}
                  {log.dateFrom !== log.dateTo ? ` a ${formatDateEs(log.dateTo)}` : ""}
                </span>
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  {log.driveUploaded && <span className="text-success">Drive ✓</span>}
                  {new Date(log.createdAt).toLocaleString("es-AR")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
