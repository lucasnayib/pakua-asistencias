/**
 * Rate limiter simple en memoria, a nivel de módulo. Este proyecto corre como un único
 * proceso Node de larga duración (no serverless), así que un `Map` en memoria alcanza:
 * no necesita persistencia entre reinicios ni coordinación entre instancias.
 *
 * Pensado para el endpoint de desbloqueo de escuela: 5 intentos fallidos seguidos por
 * `key` (el slug de la escuela) bloquean esa key por 15 minutos. Un intento exitoso
 * resetea el contador.
 */

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

type Entry = {
  count: number;
  lockedUntil: number | null;
};

const attempts = new Map<string, Entry>();

export type RateLimitStatus =
  | { locked: false }
  | { locked: true; remainingMs: number };

/** Chequea si `key` está bloqueada en este momento, sin registrar ningún intento nuevo. */
export function checkRateLimit(key: string): RateLimitStatus {
  const entry = attempts.get(key);
  if (!entry || !entry.lockedUntil) return { locked: false };

  const remainingMs = entry.lockedUntil - Date.now();
  if (remainingMs <= 0) {
    attempts.delete(key);
    return { locked: false };
  }
  return { locked: true, remainingMs };
}

/** Registra un intento fallido para `key`. Si llega a MAX_ATTEMPTS, bloquea por LOCKOUT_MS. */
export function recordFailedAttempt(key: string): RateLimitStatus {
  const now = Date.now();
  const existing = attempts.get(key);

  if (existing?.lockedUntil && existing.lockedUntil > now) {
    return { locked: true, remainingMs: existing.lockedUntil - now };
  }

  const count = (existing && (!existing.lockedUntil || existing.lockedUntil <= now) ? existing.count : 0) + 1;

  if (count >= MAX_ATTEMPTS) {
    const lockedUntil = now + LOCKOUT_MS;
    attempts.set(key, { count, lockedUntil });
    return { locked: true, remainingMs: LOCKOUT_MS };
  }

  attempts.set(key, { count, lockedUntil: null });
  return { locked: false };
}

/** Resetea el contador de `key` (llamar tras un intento exitoso). */
export function resetRateLimit(key: string): void {
  attempts.delete(key);
}
