/**
 * Único lugar que decide si una escuela debe tratarse como "cortada" por falta de pago —
 * ya sea porque nunca pagó (UNPAID, estado de nacimiento de toda cuenta nueva) o porque
 * tenía una suscripción activa y se cortó (SUSPENDED). Nunca es true si las suscripciones
 * todavía no están habilitadas globalmente — así este chequeo puede agregarse a todos los
 * puntos de acceso sin afectar a nadie mientras SUBSCRIPTIONS_ENABLED sea "false".
 */
export function isSubscriptionSuspended(subscriptionStatus: string): boolean {
  if (process.env.SUBSCRIPTIONS_ENABLED !== "true") return false;
  return subscriptionStatus === "SUSPENDED" || subscriptionStatus === "UNPAID";
}

/** Etiqueta en español de cada subscriptionStatus, compartida entre la tarjeta de Facturación
 * de la propia escuela y la lista de cuentas del super-admin. TRIALING queda solo para filas
 * históricas (ya no se asigna a cuentas nuevas) — se conserva la etiqueta para no romper el
 * historial/auditoría de cuentas viejas. EXEMPT es un caso especial puntual (ver
 * scripts/_set_exempt.ts o el historial de auditoría de cada cuenta): no se asigna desde
 * ningún flujo normal, solo a mano por el dueño del producto para una escuela puntual que
 * queda con acceso gratuito permanente, sin fecha de corte. */
export const SUBSCRIPTION_STATUS_LABELS: Record<string, string> = {
  UNPAID: "Pendiente de pago",
  TRIALING: "Período de prueba",
  ACTIVE: "Activa",
  PAST_DUE: "Pago pendiente",
  SUSPENDED: "Suspendida",
  CANCELED: "Cancelada",
  EXEMPT: "Acceso gratuito permanente",
};
