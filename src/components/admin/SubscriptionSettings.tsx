"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

type Props = {
  subscriptionStatus: string;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  graceEndsAt: string | null;
  priceArs: string | null;
};

function daysUntil(iso: string): number {
  const diffMs = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const STATUS_LABELS: Record<string, string> = {
  TRIALING: "Período de prueba",
  ACTIVE: "Activa",
  PAST_DUE: "Pago pendiente",
  SUSPENDED: "Suspendida",
  CANCELED: "Cancelada",
};

export function SubscriptionSettings({
  subscriptionStatus,
  trialEndsAt,
  currentPeriodEnd,
  graceEndsAt,
  priceArs,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubscribe() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/subscription/checkout", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo iniciar la suscripción");
        return;
      }
      window.location.href = data.init_point;
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="max-w-md border-accent/30 bg-accent/5 p-6">
        <p className="text-xs font-medium uppercase tracking-wide text-accent">
          {STATUS_LABELS[subscriptionStatus] ?? subscriptionStatus}
        </p>

        {subscriptionStatus === "TRIALING" && trialEndsAt && (
          <>
            <p className="mt-1 text-lg font-semibold">
              Te quedan {daysUntil(trialEndsAt)} día{daysUntil(trialEndsAt) === 1 ? "" : "s"} de prueba gratis
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Tu prueba termina el {formatDate(trialEndsAt)}. Suscribite antes de esa fecha para que tu
              escuela no pierda el acceso al panel.
            </p>
          </>
        )}

        {subscriptionStatus === "ACTIVE" && currentPeriodEnd && (
          <p className="mt-1 text-lg font-semibold">
            Tu próximo cobro es el {formatDate(currentPeriodEnd)}
          </p>
        )}

        {subscriptionStatus === "PAST_DUE" && graceEndsAt && (
          <>
            <p className="mt-1 text-lg font-semibold">No pudimos procesar tu último cobro</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Tenés hasta el {formatDate(graceEndsAt)} para regularizar el pago antes de que se
              suspenda el panel.
            </p>
          </>
        )}

        {subscriptionStatus === "SUSPENDED" && (
          <p className="mt-1 text-lg font-semibold">
            El panel está suspendido por falta de pago. Suscribite para reactivarlo.
          </p>
        )}

        {subscriptionStatus === "CANCELED" && (
          <p className="mt-1 text-lg font-semibold">Tu suscripción está cancelada.</p>
        )}

        {subscriptionStatus !== "ACTIVE" && (
          <>
            <Button onClick={handleSubscribe} loading={loading} className="mt-4 w-full">
              Suscribirme
            </Button>
            {error && <p className="mt-2 text-sm text-danger">{error}</p>}
          </>
        )}
      </Card>

      <Card className="max-w-md p-6">
        <p className="text-sm font-medium">Plan único</p>
        <p className="mt-1 text-2xl font-semibold">
          ${priceArs ?? "—"}
          <span className="text-sm font-normal text-muted-foreground">/mes</span>
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Pago mensual automático con Mercado Pago. Podés cancelar cuando quieras.
        </p>
      </Card>
    </div>
  );
}
