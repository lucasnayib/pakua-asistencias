/**
 * Único lugar que decide si una escuela debe tratarse como "cortada" por falta de pago.
 * Nunca es true si las suscripciones todavía no están habilitadas globalmente — así este
 * chequeo puede agregarse a todos los puntos de acceso sin afectar a nadie mientras
 * SUBSCRIPTIONS_ENABLED sea "false".
 */
export function isSubscriptionSuspended(subscriptionStatus: string): boolean {
  return process.env.SUBSCRIPTIONS_ENABLED === "true" && subscriptionStatus === "SUSPENDED";
}

/** Etiqueta en español de cada subscriptionStatus, compartida entre la tarjeta de Facturación
 * de la propia escuela y la lista de cuentas del super-admin. */
export const SUBSCRIPTION_STATUS_LABELS: Record<string, string> = {
  TRIALING: "Período de prueba",
  ACTIVE: "Activa",
  PAST_DUE: "Pago pendiente",
  SUSPENDED: "Suspendida",
  CANCELED: "Cancelada",
};
