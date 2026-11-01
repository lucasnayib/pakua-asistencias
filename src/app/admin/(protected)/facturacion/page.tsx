import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { SubscriptionSettings } from "@/components/admin/SubscriptionSettings";

export default async function FacturacionAdminPage() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  if (session.role === "SUPER_ADMIN") redirect("/admin/admins");

  const subscriptionsEnabled = process.env.SUBSCRIPTIONS_ENABLED === "true";

  const admin = subscriptionsEnabled
    ? await prisma.admin.findUnique({
        where: { id: session.adminId },
        select: {
          subscriptionStatus: true,
          trialEndsAt: true,
          currentPeriodEnd: true,
          graceEndsAt: true,
        },
      })
    : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Facturación</h1>
        <p className="text-sm text-muted-foreground">Estado de tu suscripción y método de pago.</p>
      </div>

      {subscriptionsEnabled ? (
        <SubscriptionSettings
          subscriptionStatus={admin?.subscriptionStatus ?? "TRIALING"}
          trialEndsAt={admin?.trialEndsAt?.toISOString() ?? null}
          currentPeriodEnd={admin?.currentPeriodEnd?.toISOString() ?? null}
          graceEndsAt={admin?.graceEndsAt?.toISOString() ?? null}
          priceArs={process.env.SUBSCRIPTION_PRICE_ARS ?? null}
        />
      ) : (
        <Card className="max-w-md p-6">
          <p className="text-sm text-muted-foreground">
            La facturación todavía no está disponible. Por ahora tu escuela sigue funcionando
            normalmente.
          </p>
        </Card>
      )}
    </div>
  );
}
