/**
 * Ventana horaria en la que las páginas públicas de asistencia (check-in, historial, clases
 * anteriores, Itinerancias) están disponibles. Fuera de este rango se muestra un aviso de
 * "cerrado" en vez del contenido normal — nunca afecta al panel de administración (ninguna
 * ruta bajo /admin ni requireAdmin() la consultan).
 *
 * Nunca es true si PUBLIC_HOURS_ENABLED no es "true", así este chequeo puede desplegarse sin
 * afectar a nadie hasta activarlo a propósito — mismo criterio que SUBSCRIPTIONS_ENABLED en
 * @/lib/subscription.
 *
 * Compara contra la hora local del propio proceso de Node (el servidor corre en hora
 * Argentina), no hace falta ninguna conversión de zona horaria.
 */
function parseHourMinute(value: string): { hour: number; minute: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

export function getPublicHoursWindow(): { open: string; close: string } {
  return {
    open: process.env.PUBLIC_HOURS_OPEN ?? "08:00",
    close: process.env.PUBLIC_HOURS_CLOSE ?? "22:00",
  };
}

export function isOutsidePublicHours(now: Date = new Date()): boolean {
  if (process.env.PUBLIC_HOURS_ENABLED !== "true") return false;

  const window = getPublicHoursWindow();
  const open = parseHourMinute(window.open);
  const close = parseHourMinute(window.close);
  // Si la config quedó mal escrita, no se cierra nada antes que romper el acceso de todos.
  if (!open || !close) return false;

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const openMinutes = open.hour * 60 + open.minute;
  const closeMinutes = close.hour * 60 + close.minute;

  return nowMinutes < openMinutes || nowMinutes >= closeMinutes;
}

export const PUBLIC_HOURS_CLOSED_MESSAGE = "La página está cerrada en este horario.";
