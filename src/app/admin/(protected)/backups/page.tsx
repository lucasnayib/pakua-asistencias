import { Card } from "@/components/ui/Card";

export default function BackupsAdminPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Copias de seguridad</h1>
        <p className="text-sm text-muted-foreground">
          Descargá una copia completa de la base de datos (alumnos, horarios, asistencias e historial).
        </p>
      </div>

      <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <p className="font-medium">Base de datos completa (.db)</p>
          <p className="text-sm text-muted-foreground">
            Guardá este archivo en un lugar seguro. Recomendado: una vez por semana.
          </p>
        </div>
        <a
          href="/api/backup"
          className="inline-flex h-10 items-center justify-center rounded-lg bg-accent px-4 text-sm font-medium text-accent-foreground transition hover:opacity-90"
        >
          Descargar copia de seguridad
        </a>
      </Card>
    </div>
  );
}
