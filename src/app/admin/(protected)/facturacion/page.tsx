import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

// Página de vista previa (representativa): los datos de esta pantalla son de ejemplo,
// todavía no hay ninguna conexión real con Mercado Pago ni con el estado real de la cuenta.
export default async function FacturacionAdminPage() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  if (session.role === "SUPER_ADMIN") redirect("/admin/admins");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Facturación</h1>
        <p className="text-sm text-muted-foreground">
          Estado de tu suscripción y método de pago.
        </p>
      </div>

      <Card className="max-w-md border-accent/30 bg-accent/5 p-6">
        <p className="text-xs font-medium uppercase tracking-wide text-accent">
          Período de prueba
        </p>
        <p className="mt-1 text-lg font-semibold">Te quedan 4 días de prueba gratis</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Tu prueba termina el 27/08/2026. Cargá tu método de pago antes de esa fecha para
          que tu escuela no pierda el acceso.
        </p>
        <Button className="mt-4 w-full" disabled>
          Cargar método de pago
        </Button>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          (vista de ejemplo — todavía no está conectado a Mercado Pago)
        </p>
      </Card>

      <Card className="max-w-md p-6">
        <p className="text-sm font-medium">Plan único</p>
        <p className="mt-1 text-2xl font-semibold">
          $X.XXX<span className="text-sm font-normal text-muted-foreground">/mes</span>
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Pago mensual automático con Mercado Pago. Podés cancelar cuando quieras.
        </p>
      </Card>
    </div>
  );
}
