import { Card } from "@/components/ui/Card";

type Props = {
  schoolName: string;
  openTime: string;
  closeTime: string;
};

/**
 * Se muestra en vez del contenido normal (o del candado de desbloqueo) en cualquier página
 * pública de una escuela (`/escuela/[slug]/...`) fuera del horario configurado — ver
 * isOutsidePublicHours() en @/lib/business-hours. Nunca aparece en el panel de administración.
 */
export function ClosedForHoursNotice({ schoolName, openTime, closeTime }: Props) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm p-8 text-center">
        <h1 className="mb-1 text-xl font-semibold">{schoolName}</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          La asistencia está cerrada en este horario. Disponible todos los días de {openTime} a{" "}
          {closeTime}.
        </p>
      </Card>
    </main>
  );
}
