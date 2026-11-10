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

/** Mismo ranking que graduacionRank(), pero sin graduación (o un texto no reconocible) cuenta
 * como Cinto Blanco (rank 0) en vez de "antes de Blanco" — para listar alumnos de mayor a
 * menor graduación, donde no tener nada cargado todavía se considera el punto de partida, no
 * un valor especial aparte. */
function effectiveGraduacionRank(graduacion: string | null): number {
  const rank = graduacionRank(graduacion);
  return rank === -1 ? 0 : rank;
}

type GraduacionSortable = {
  graduacion: string | null;
  birthDate: string | null;
  createdAt: Date;
};

/** Orden para listar alumnos de mayor a menor graduación (los sin graduación van con los
 * Cinto Blanco). Dentro de un mismo rank: primero por fecha de nacimiento ascendente, y los
 * que no la tienen cargada van al final de ese grupo, ordenados entre sí por la fecha en que
 * se registraron en la página. */
export function compareByGraduacionDesc(a: GraduacionSortable, b: GraduacionSortable): number {
  const rankDiff = effectiveGraduacionRank(b.graduacion) - effectiveGraduacionRank(a.graduacion);
  if (rankDiff !== 0) return rankDiff;

  if (a.birthDate && b.birthDate) {
    if (a.birthDate !== b.birthDate) return a.birthDate < b.birthDate ? -1 : 1;
  } else if (a.birthDate && !b.birthDate) {
    return -1;
  } else if (!a.birthDate && b.birthDate) {
    return 1;
  }

  return a.createdAt.getTime() - b.createdAt.getTime();
}
