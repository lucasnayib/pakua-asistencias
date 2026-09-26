// Orden de graduación, de menos a más graduado. Cada uno de los 7 cintos de color ocupa un
// bloque de 5 valores (0 a 4 puntas del color del cinto siguiente); los 3 grados de Negro van
// justo después del bloque de Rojo. `graduacion` es texto libre (sin lista fija en la ficha del
// alumno), así que se interpreta por palabras clave en vez de un enum.
const BELT_KEYWORDS = ["BLANC", "AMARILL", "NARANJ", "VERDE", "GRIS", "AZUL", "ROJ"];

function normalizeGraduacion(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase();
}

function countPuntas(normalized: string): number {
  // Formato corto: "2P" (dígito + P, ej. "Cinto Naranja 2P"). Se acepta también la forma larga
  // "2 puntas" por si queda algún dato viejo con ese formato.
  const short = normalized.match(/(\d)\s*P\b/);
  if (short) return Math.min(4, Math.max(1, Number(short[1])));
  const long = normalized.match(/(\d)\s*PUNTA/);
  if (long) return Math.min(4, Math.max(1, Number(long[1])));
  return normalized.includes("PUNTA") ? 1 : 0;
}

/** Mapea el texto libre de graduación a un ranking numérico (-1 = desconocida, va primero). */
export function graduacionRank(graduacion: string | null): number {
  if (!graduacion) return -1;
  const n = normalizeGraduacion(graduacion);
  // Los 7 cintos de color se chequean ANTES que "negro": un texto como "Rojo 3 puntas negras"
  // contiene "NEGR" (de "negras") pero el cinto real es Rojo, no Negro.
  for (let i = 0; i < BELT_KEYWORDS.length; i++) {
    if (n.includes(BELT_KEYWORDS[i])) return i * 5 + countPuntas(n);
  }
  if (n.includes("NEGR")) {
    // Los cintos negros se identifican por grado ("Negro 1°", "Negro 2° Grado", "Negro 3°"),
    // no por "dan". No usan puntas.
    if (n.includes("3") || n.includes("TERCER")) return 7 * 5 + 2; // Negro 3°
    if (n.includes("2") || n.includes("SEGUND")) return 7 * 5 + 1; // Negro 2°
    return 7 * 5; // Negro 1° (default si no especifica grado)
  }
  return -1; // texto no reconocible → antes de Blanco
}
