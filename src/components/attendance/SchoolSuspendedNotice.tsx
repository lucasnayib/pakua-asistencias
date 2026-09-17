import Link from "next/link";
import { Card } from "@/components/ui/Card";

type Props = {
  schoolName: string;
};

/**
 * Se muestra en vez del contenido normal (o del candado de desbloqueo) en cualquier página
 * pública de una escuela (`/escuela/[slug]/...`) cuando su suscripción está SUSPENDED — ver
 * isSubscriptionSuspended() en @/lib/subscription. El botón manda al login de admin con
 * `from=/admin/facturacion`: como esta pantalla es pública (sin sesión), no se puede llevar
 * directo a facturación, pero si quien la ve es el admin, al loguearse cae ahí directo.
 */
export function SchoolSuspendedNotice({ schoolName }: Props) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm p-8 text-center">
        <h1 className="mb-1 text-xl font-semibold">{schoolName}</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          Esta escuela tiene la suscripción suspendida. Para volver a usar la asistencia, el
          administrador tiene que reactivarla desde Facturación.
        </p>
        <Link
          href="/admin/login?from=/admin/facturacion"
          className="mt-6 inline-flex h-10 w-full items-center justify-center rounded-lg bg-accent px-4 text-sm font-medium text-accent-foreground transition hover:opacity-90"
        >
          Ir a facturación
        </Link>
      </Card>
    </main>
  );
}
