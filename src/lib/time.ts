export const DAY_NAMES = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
] as const;

export function dayName(dayOfWeek: number): string {
  return DAY_NAMES[dayOfWeek] ?? "";
}

/** "YYYY-MM-DD" -> "dd/mm/aaaa". Evita parsear con Date para no arrastrar desfases de zona horaria. */
export function formatDateEs(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  if (!year || !month || !day) return isoDate;
  return `${day}/${month}/${year}`;
}

/** "HH:mm:ss" o "HH:mm" -> "HH:mm" */
export function formatTimeShort(time: string): string {
  return time.slice(0, 5);
}

export function formatTimeRange(startTime: string, endTime: string): string {
  return `${formatTimeShort(startTime)} - ${formatTimeShort(endTime)}`;
}

/** Compara horas "HH:mm" (funciona lexicográficamente por el padding de dos dígitos). */
export function isTimeInRange(time: string, startTime: string, endTime: string): boolean {
  const t = formatTimeShort(time);
  return t >= formatTimeShort(startTime) && t < formatTimeShort(endTime);
}

export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** "YYYY-MM-DD" -> día de la semana (0=domingo). Usa el constructor local, no Date.parse (evita corrimientos de UTC). */
export function dayOfWeekFromISODate(isoDate: string): number {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1).getDay();
}

/** Fecha/hora local del dispositivo, no depende de la zona horaria del servidor. */
export function getLocalNow(date: Date = new Date()) {
  return {
    dayOfWeek: date.getDay(),
    date: `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`,
    time: `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`,
  };
}
