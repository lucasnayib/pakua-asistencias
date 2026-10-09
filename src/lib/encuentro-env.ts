// Igual criterio que isSubscriptionSuspended en src/lib/subscription.ts: una función pura,
// deshabilitada por default mientras la variable de entorno no esté puesta.
export function isEncuentroUploadsEnabled(): boolean {
  return Boolean(process.env.EVENT_UPLOAD_CODE) && process.env.EVENT_UPLOADS_ENABLED === "true";
}
