/**
 * Único lugar que decide si una escuela debe tratarse como "cortada" por falta de pago.
 * Nunca es true si las suscripciones todavía no están habilitadas globalmente — así este
 * chequeo puede agregarse a todos los puntos de acceso sin afectar a nadie mientras
 * SUBSCRIPTIONS_ENABLED sea "false".
 */
export function isSubscriptionSuspended(subscriptionStatus: string): boolean {
  return process.env.SUBSCRIPTIONS_ENABLED === "true" && subscriptionStatus === "SUSPENDED";
}
