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

/**
 * Igual que getRequestIp, pero prioriza cf-connecting-ip (el header que pone Cloudflare en
 * el túnel) antes de caer a x-forwarded-for/x-real-ip. Exportada aparte en vez de tocar
 * getRequestIp: ese helper ya protege flujos en producción (desbloqueo de escuela,
 * Itinerancias) y no hace falta arriesgarlo por una feature nueva y acotada en el tiempo.
 */
export function getEventRequestIp(request: NextRequest): string {
  const cfIp = request.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp;
  return getRequestIp(request);
}

export function lockoutMessage(remainingMs: number): string {
  const minutes = Math.max(1, Math.ceil(remainingMs / 60_000));
  return `Demasiadas solicitudes. Probá de nuevo en ${minutes} minuto${minutes === 1 ? "" : "s"}.`;
}
