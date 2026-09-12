import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { ageFromISODate, daysBetweenISODates, formatDateEs, getLocalNow, monthsBetweenISODates } from "@/lib/time";
import type { StudentExportRow } from "@/lib/export/students-excel";

const TEMPLATE_PATH = path.join(process.cwd(), "src", "lib", "export", "templates", "itinerancia-planilla.pdf");

const STUDENTS_PER_PAGE = 15;
const ROWS_PER_PAGE = 5;
const COLS_PER_PAGE = 3;

// Coordenadas calibradas contra la plantilla real (medidas en pt, origen arriba-izquierda de la
// página). Cada columna repite el mismo patrón de campos; cada fila de bloques se repite cada
// BLOCK_SPACING puntos verticales.
// Bordes reales de cada columna, medidos uno por uno contra la plantilla (no son perfectamente
// parejos: la 3ra columna es varios puntos más angosta que las otras dos).
const COLUMN_LEFT = [15, 206, 390];
const COLUMN_RIGHT = [208, 386, 565];
// Baseline del campo "N" de cada uno de los 5 bloques (filas) — medidos individualmente contra
// la plantilla real porque el espaciado entre filas no es perfectamente uniforme (~123pt, con
// algo más de margen hacia las últimas dos filas).
const BLOCK_TOPS = [179, 302, 425, 551, 675];

const FIELD_OFFSET_Y = {
  nombre: 4,
  apellido: 22,
  graduacion: 38,
  dni: 83,
};

// Dónde arranca el valor, pegado a la etiqueta pero sin superponerla (N/A/G son una letra; D.N.I. es más ancha).
const LABEL_WIDTH = 40;
const DNI_LABEL_WIDTH = 60;
const RIGHT_MARGIN = 4;

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
function graduacionRank(graduacion: string | null): number {
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

function orientadorInitials(orientadorName: string | null): string {
  if (!orientadorName) return "";
  // orientadorName viene como "Apellido, Nombre"
  const [lastName, firstName] = orientadorName.split(",").map((s) => s.trim());
  // .toUpperCase() por apellidos que empiezan en minúscula (ej. "del Castaño") — sin esto la
  // inicial quedaba en minúscula y no combinaba bien con la del nombre.
  const first = firstName?.[0]?.toUpperCase() ?? "";
  const last = lastName?.[0]?.toUpperCase() ?? "";
  return first && last ? `${first}${last}` : "";
}

// Cabecera de página, renglón "Orientador:" — calibrado contra la plantilla real (la etiqueta
// impresa termina justo antes de x=100; y=165 alinea el baseline de este texto con el de esa
// etiqueta, en el mismo renglón, sin invadir el renglón de arriba ni la tabla de abajo).
const ORIENTADOR_LEGEND_X = 100;
const ORIENTADOR_LEGEND_Y = 165;
const ORIENTADOR_LEGEND_MAX_WIDTH = 565 - ORIENTADOR_LEGEND_X - RIGHT_MARGIN;
const ORIENTADOR_LEGEND_MIN_SIZE = 5;

/** Referencia de iniciales -> nombre completo, para las O de todos los alumnos de la página
 * ("MM= Molina Matias"). Si dos orientadores distintos comparten iniciales, se listan ambos. */
function orientadorLegendText(font: PDFFont, pageRows: StudentExportRow[]): string {
  const namesByInitials = new Map<string, Set<string>>();
  for (const row of pageRows) {
    const initials = orientadorInitials(row.orientadorName);
    if (!initials || !row.orientadorName) continue;
    const displayName = row.orientadorName.replace(", ", " ");
    if (!namesByInitials.has(initials)) namesByInitials.set(initials, new Set());
    namesByInitials.get(initials)!.add(displayName);
  }

  const entries: string[] = [];
  for (const [initials, names] of [...namesByInitials.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    for (const name of names) entries.push(`${initials}= ${name}`);
  }
  if (entries.length === 0) return "";

  let text = entries.join("   ");
  // Si no entra ni al tamaño mínimo, se van sacando entradas del final hasta que entre.
  while (
    entries.length > 1 &&
    font.widthOfTextAtSize(text, ORIENTADOR_LEGEND_MIN_SIZE) > ORIENTADOR_LEGEND_MAX_WIDTH
  ) {
    entries.pop();
    text = `${entries.join("   ")}…`;
  }
  return text;
}

/** Reduce el tamaño de fuente hasta que el texto entre en maxWidth (o hasta minSize). */
function fittingFontSize(font: PDFFont, text: string, maxWidth: number, startSize: number, minSize = 6): number {
  let size = startSize;
  while (size > minSize && font.widthOfTextAtSize(text, size) > maxWidth) {
    size -= 0.5;
  }
  return size;
}

// Franja angosta (O/T) donde van las iniciales del orientador y el tiempo de grado: pegada al
// borde derecho REAL de cada columna (medido, no asumido — ver COLUMN_RIGHT), con un margen chico
// para no tocar la línea. Es realmente angosta en la plantilla, así que además de achicar la letra
// bastante más que en el resto de los campos, se le permite bajar mucho de tamaño
// (RIGHT_BOX_MIN_SIZE) para que nunca se salga del recuadro hacia el borde de la página.
const RIGHT_BOX_WIDTH = 16;
const RIGHT_BOX_MARGIN = 2;
const RIGHT_BOX_MIN_SIZE = 4;
// Los valores de Apellido/Graduación no deben invadir la franja O/T: se cortan bastante antes de
// donde esta arranca (el margen es grande a propósito: la posición exacta de la etiqueta "O"/"T"
// varía un poco entre columnas y este margen evita que un texto largo la toque).
const NAME_GAP_BEFORE_BOX = 22;
// Alto aproximado de cada celda ("A"/"O" y "G"/"T"), para centrar verticalmente dentro de ella.
const ORIENTADOR_BOX_Y_TOP = FIELD_OFFSET_Y.nombre + (FIELD_OFFSET_Y.apellido - FIELD_OFFSET_Y.nombre) / 2;
const ORIENTADOR_BOX_Y_BOTTOM = FIELD_OFFSET_Y.apellido + (FIELD_OFFSET_Y.graduacion - FIELD_OFFSET_Y.apellido) / 2;
const TIEMPO_BOX_Y_TOP = ORIENTADOR_BOX_Y_BOTTOM;
const TIEMPO_BOX_Y_BOTTOM = FIELD_OFFSET_Y.graduacion + (FIELD_OFFSET_Y.graduacion - FIELD_OFFSET_Y.apellido) / 2;

/** Redondea "cuánto hace que se autorizó" a lo que entra en el recuadro angosto: años y meses si
 * entra, y si ni así entra, redondea al año más cercano (>=6 meses redondea hacia arriba). */
function tiempoDeGradoText(font: PDFFont, evaluationDate: string | null, todayIso: string, maxWidth: number): string {
  if (!evaluationDate) return "";
  const totalMonths = monthsBetweenISODates(evaluationDate, todayIso);
  if (totalMonths === null) return "";

  // Autorización muy reciente (menos de un mes): mostrar días.
  if (totalMonths === 0) {
    const days = daysBetweenISODates(evaluationDate, todayIso);
    return days !== null ? `${days}D` : "";
  }

  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;

  // Menos de un año: mostrar meses solos (entra sin problema, no hace falta redondear a "0A").
  if (years === 0) return `${months}M`;

  const full = months > 0 ? `${years}A ${months}M` : `${years}A`;
  if (font.widthOfTextAtSize(full, RIGHT_BOX_MIN_SIZE) <= maxWidth) return full;
  const roundedYears = months >= 6 ? years + 1 : years;
  return `${roundedYears}A`;
}

function drawCenteredInBox(
  page: PDFPage,
  font: PDFFont,
  pageHeight: number,
  boxRight: number,
  blockTop: number,
  text: string,
  boxYTop: number,
  boxYBottom: number,
  startSize: number
) {
  if (!text) return;
  const size = fittingFontSize(font, text, RIGHT_BOX_WIDTH, startSize, RIGHT_BOX_MIN_SIZE);
  const textWidth = font.widthOfTextAtSize(text, size);
  const boxStart = boxRight - RIGHT_BOX_MARGIN - RIGHT_BOX_WIDTH;
  const centeredX = boxStart + Math.max(0, (RIGHT_BOX_WIDTH - textWidth) / 2);
  const boxCenterY = (boxYTop + boxYBottom) / 2;
  const centeredY = boxCenterY + size * 0.12; // el baseline va apenas debajo del centro visual del glifo (el texto "cuelga" hacia arriba desde el baseline)
  page.drawText(text, {
    x: centeredX,
    y: pageHeight - (blockTop + centeredY),
    size,
    font,
    color: rgb(0.1, 0.1, 0.1),
  });
}

function drawSlot(
  page: PDFPage,
  font: PDFFont,
  pageHeight: number,
  colIndex: number,
  blockIndex: number,
  row: StudentExportRow,
  activityDate: string,
  todayIso: string
) {
  const x = COLUMN_LEFT[colIndex];
  const columnRight = COLUMN_RIGHT[colIndex];
  const boxLeft = columnRight - RIGHT_BOX_MARGIN - RIGHT_BOX_WIDTH;
  const blockTop = BLOCK_TOPS[blockIndex];
  const color = rgb(0.1, 0.1, 0.1);

  // Dibuja el texto pegado a la etiqueta (N/A/G/D.N.I.), reduciendo el tamaño de letra si hace
  // falta para no invadir la celda vecina.
  const drawLeft = (text: string, yOffset: number, xStart: number, maxWidth: number, startSize: number) => {
    if (!text) return;
    const size = fittingFontSize(font, text, maxWidth, startSize);
    page.drawText(text, {
      x: x + xStart,
      y: pageHeight - (blockTop + yOffset),
      size,
      font,
      color,
    });
  };

  const age = row.birthDate ? ageFromISODate(row.birthDate, activityDate) : null;
  const nombreText = age !== null ? `${row.firstName} (${age})` : row.firstName;

  // Apellido y Graduación comparten fila con el recuadro O/T: su ancho se corta ahí. Nombre y
  // D.N.I. no tienen ese recuadro al lado, así que llegan hasta el borde real de la columna.
  const nameMaxWidth = boxLeft - NAME_GAP_BEFORE_BOX - (x + LABEL_WIDTH);
  drawLeft(nombreText, FIELD_OFFSET_Y.nombre, LABEL_WIDTH, columnRight - RIGHT_MARGIN - (x + LABEL_WIDTH), 11.4);
  drawLeft(row.lastName, FIELD_OFFSET_Y.apellido, LABEL_WIDTH, nameMaxWidth, 11.4);
  drawLeft(row.graduacion ?? "", FIELD_OFFSET_Y.graduacion, LABEL_WIDTH, nameMaxWidth, 11.4);
  drawLeft(row.dni ?? "", FIELD_OFFSET_Y.dni, DNI_LABEL_WIDTH, columnRight - RIGHT_MARGIN - (x + DNI_LABEL_WIDTH), 10.8);

  // Iniciales del orientador y tiempo de grado: totalmente centrados (horizontal y vertical)
  // dentro de su recuadro angosto, pegado al borde real de la columna.
  const initials = orientadorInitials(row.orientadorName);
  drawCenteredInBox(page, font, pageHeight, columnRight, blockTop, initials, ORIENTADOR_BOX_Y_TOP, ORIENTADOR_BOX_Y_BOTTOM, 9);

  const tiempoDeGrado = tiempoDeGradoText(font, row.evaluationDate, todayIso, RIGHT_BOX_WIDTH);
  drawCenteredInBox(page, font, pageHeight, columnRight, blockTop, tiempoDeGrado, TIEMPO_BOX_Y_TOP, TIEMPO_BOX_Y_BOTTOM, 9);
}

/** Genera la planilla evaluatoria (PDF) con los alumnos superpuestos sobre la plantilla original. */
export async function buildItineranciaPlanillaPdfBuffer(
  rows: StudentExportRow[],
  activityDate: string
): Promise<Buffer> {
  const templateBytes = await readFile(TEMPLATE_PATH);
  const templateDoc = await PDFDocument.load(templateBytes);
  const [templatePage] = templateDoc.getPages();
  const pageHeight = templatePage.getHeight();

  const outDoc = await PDFDocument.create();
  const font = await outDoc.embedFont(StandardFonts.Helvetica);
  const embeddedTemplatePage = await outDoc.embedPage(templatePage);
  const todayIso = getLocalNow().date;

  // Orden por graduación (de menos a más graduado); dentro de la misma graduación, por edad
  // ascendente. Copia para no mutar el array recibido, que puede compartirse con otro llamador.
  const sortedRows = [...rows].sort((a, b) => {
    const rankDiff = graduacionRank(a.graduacion) - graduacionRank(b.graduacion);
    if (rankDiff !== 0) return rankDiff;
    const ageA = a.birthDate ? ageFromISODate(a.birthDate, activityDate) : null;
    const ageB = b.birthDate ? ageFromISODate(b.birthDate, activityDate) : null;
    if (ageA === null && ageB === null) return 0;
    if (ageA === null) return 1;
    if (ageB === null) return -1;
    return ageA - ageB;
  });

  const pageCount = Math.max(1, Math.ceil(sortedRows.length / STUDENTS_PER_PAGE));

  for (let p = 0; p < pageCount; p++) {
    const page = outDoc.addPage([templatePage.getWidth(), pageHeight]);
    page.drawPage(embeddedTemplatePage);

    page.drawText(formatDateEs(activityDate), {
      x: 100,
      y: pageHeight - 122,
      size: 9,
      font,
      color: rgb(0.1, 0.1, 0.1),
    });

    const pageRows = sortedRows.slice(p * STUDENTS_PER_PAGE, p * STUDENTS_PER_PAGE + STUDENTS_PER_PAGE);

    const legendText = orientadorLegendText(font, pageRows);
    if (legendText) {
      const legendSize = fittingFontSize(font, legendText, ORIENTADOR_LEGEND_MAX_WIDTH, 8, ORIENTADOR_LEGEND_MIN_SIZE);
      page.drawText(legendText, {
        x: ORIENTADOR_LEGEND_X,
        y: pageHeight - ORIENTADOR_LEGEND_Y,
        size: legendSize,
        font,
        color: rgb(0.1, 0.1, 0.1),
      });
    }

    pageRows.forEach((row, i) => {
      // Llenado de abajo hacia arriba, de derecha a izquierda: el primero del orden (graduación
      // más baja) cae en la esquina inferior derecha de la página.
      const colIndex = COLS_PER_PAGE - 1 - (i % COLS_PER_PAGE);
      const blockIndex = ROWS_PER_PAGE - 1 - Math.floor(i / COLS_PER_PAGE);
      if (blockIndex < 0) return;
      drawSlot(page, font, pageHeight, colIndex, blockIndex, row, activityDate, todayIso);
    });
  }

  const bytes = await outDoc.save();
  return Buffer.from(bytes);
}
