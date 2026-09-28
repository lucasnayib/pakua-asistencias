import { NextRequest } from "next/server";

/**
 * Extrae una IP "mejor esfuerzo" del pedido para usarla como key del rate-limit. En producción
 * (detrás de un proxy) `x-forwarded-for` trae la IP real del cliente como primer valor de la
 * lista; en desarrollo local (sin proxy) esa cabecera no está presente, así que se usa un
 * fallback fijo — total, un único desarrollador pegándole al endpoint local no necesita
 * distinguirse por IP.
 */
export function getRequestIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "local";
}

export function lockoutMessage(remainingMs: number): string {
  const minutes = Math.max(1, Math.ceil(remainingMs / 60_000));
  return `Demasiadas solicitudes. Probá de nuevo en ${minutes} minuto${minutes === 1 ? "" : "s"}.`;
}
