import { jsPDF } from "jspdf";
import { readFileSync } from "node:fs";
import path from "node:path";
import { formatDateEs } from "@/lib/time";
import { formatMoney } from "@/lib/aranceles-calc";

export type ReciboData = {
  schoolName: string;
  concepto: string;
  categoria?: string;
  amount: number;
  date: string; // "YYYY-MM-DD"
  alumno?: string; // apellido, nombre — solo para cuotas ligadas a un alumno puntual
  numero: string; // identificador corto para que el recibo sea trazable
  contactEmail?: string | null;
  contactPhone?: string | null;
};

// Mismos tokens de color que src/app/globals.css (modo claro — un comprobante siempre se
// imprime/lee sobre fondo blanco, nunca en el tema oscuro de la app).
const COLOR_ACCENT: [number, number, number] = [185, 28, 28]; // --accent
const COLOR_ACCENT_TINT: [number, number, number] = [252, 237, 237]; // --accent al ~8% sobre blanco
const COLOR_FOREGROUND: [number, number, number] = [23, 24, 28]; // --foreground
const COLOR_MUTED: [number, number, number] = [107, 109, 118]; // --muted-foreground
const COLOR_BORDER: [number, number, number] = [226, 226, 230]; // --border
const COLOR_SURFACE_2: [number, number, number] = [240, 240, 242]; // --surface-2
const COLOR_FAINT: [number, number, number] = [180, 181, 188]; // --muted-foreground aclarado, para el pie disimulado

const UNIDADES = ["", "un", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve"];
const DIEZ_A_VEINTE = [
  "diez", "once", "doce", "trece", "catorce", "quince", "dieciséis", "diecisiete", "dieciocho", "diecinueve",
];
const DECENAS = ["", "", "veinte", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"];
// El veintenario (21-29) se escribe contraído en una sola palabra ("veintiún", no "veinte y un");
// de treinta para arriba sí se usa "y" (treinta y uno, cuarenta y dos, ...).
const VEINTIALGO = [
  "veinte", "veintiún", "veintidós", "veintitrés", "veinticuatro",
  "veinticinco", "veintiséis", "veintisiete", "veintiocho", "veintinueve",
];
const CENTENAS = [
  "", "ciento", "doscientos", "trescientos", "cuatrocientos", "quinientos",
  "seiscientos", "setecientos", "ochocientos", "novecientos",
];

function centenasATexto(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "cien";
  const c = Math.floor(n / 100);
  const resto = n % 100;
  const partes: string[] = [];
  if (c > 0) partes.push(CENTENAS[c]);
  if (resto > 0) {
    if (resto < 10) partes.push(UNIDADES[resto]);
    else if (resto < 20) partes.push(DIEZ_A_VEINTE[resto - 10]);
    else if (resto < 30) partes.push(VEINTIALGO[resto - 20]);
    else {
      const d = Math.floor(resto / 10);
      const u = resto % 10;
      partes.push(u > 0 ? `${DECENAS[d]} y ${UNIDADES[u]}` : DECENAS[d]);
    }
  }
  return partes.join(" ");
}

// Convierte un entero no negativo a su forma en palabras (español rioplatense), hasta los
// millones — de sobra para un monto de cuota o arancel. No cubre decimales: los pesos se
// manejan redondeados, como ya hace formatMoney en el resto de la app.
function numeroATexto(n: number): string {
  if (n === 0) return "cero";
  const millones = Math.floor(n / 1_000_000);
  const miles = Math.floor((n % 1_000_000) / 1000);
  const resto = n % 1000;

  const partes: string[] = [];
  if (millones > 0) {
    partes.push(millones === 1 ? "un millón" : `${centenasATexto(millones)} millones`);
  }
  if (miles > 0) {
    partes.push(miles === 1 ? "mil" : `${centenasATexto(miles)} mil`);
  }
  if (resto > 0) {
    partes.push(centenasATexto(resto));
  }
  return partes.join(" ");
}

// "$1100" -> "mil cien pesos". Redondea al entero más cercano porque los montos de la app
// siempre se manejan en pesos enteros (ver formatMoney).
function montoATexto(amount: number): string {
  const entero = Math.round(Math.abs(amount));
  const texto = numeroATexto(entero);
  return `${texto} peso${entero === 1 ? "" : "s"}`;
}

// Copia reducida y aplanada (sin canal alfa) de public/logo.png, generada una sola vez para
// este recibo: jsPDF embebe las imágenes como bitmap sin aprovechar la compresión del PNG
// original, así que reusar el logo de 1554x514 (pensado para pantalla) inflaba cada recibo a
// varios MB. 480x159 alcanza de sobra para los ~108pt (1.5") a los que se muestra acá.
const LOGO_PATH = path.join(process.cwd(), "src", "lib", "export", "assets", "recibo-logo.png");
const LOGO_ASPECT = 480 / 159;
let cachedLogoBase64: string | null | undefined;

function getLogoBase64(): string | null {
  if (cachedLogoBase64 !== undefined) return cachedLogoBase64;
  try {
    cachedLogoBase64 = readFileSync(LOGO_PATH).toString("base64");
  } catch {
    cachedLogoBase64 = null;
  }
  return cachedLogoBase64;
}

// Tamaño media carta apaisada: un recibo no necesita una hoja A4 entera. Estructura calcada de
// las tarjetas de la app (etiqueta gris en mayúsculas + valor destacado, caja con borde suave,
// acento rojo de marca) para que se sienta parte del mismo producto sin perder la seriedad de
// un comprobante de pago.
export function buildReciboPdf(data: ReciboData): Buffer {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: [480, 350], compress: true });
  const pageWidth = 480;
  const pageHeight = 350;
  const margin = 32;
  const contentWidth = pageWidth - margin * 2;

  // --- Encabezado: logo a la izquierda, identificación del comprobante a la derecha ---
  const logo = getLogoBase64();
  if (logo) {
    const logoWidth = 108;
    const logoHeight = logoWidth / LOGO_ASPECT;
    doc.addImage(logo, "PNG", margin, 18, logoWidth, logoHeight);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...COLOR_ACCENT);
  doc.text("COMPROBANTE DE PAGO", pageWidth - margin, 28, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...COLOR_MUTED);
  doc.text(`N.° ${data.numero}`, pageWidth - margin, 42, { align: "right" });
  doc.text(formatDateEs(data.date), pageWidth - margin, 55, { align: "right" });

  // Línea de acento de borde a borde, mismo recurso que los bordes superiores de color que usan
  // las tarjetas de estado en el panel.
  doc.setFillColor(...COLOR_ACCENT);
  doc.rect(0, 72, pageWidth, 2.5, "F");

  // --- Nombre de la escuela (emisor del comprobante) ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(...COLOR_FOREGROUND);
  doc.text(data.schoolName, margin, 98);

  // --- Caja de datos: mismo patrón "etiqueta chica en mayúsculas + valor" que el resto de la
  // app (ver StudentDetailsDialog, MovimientosTab) ---
  const boxTop = 114;
  const boxPadding = 16;
  const boxHeight = data.alumno ? 108 : 78;
  doc.setDrawColor(...COLOR_BORDER);
  doc.setLineWidth(1);
  doc.roundedRect(margin, boxTop, contentWidth, boxHeight, 6, 6, "S");

  let fieldY = boxTop + boxPadding + 6;
  const colLeftX = margin + boxPadding;
  const colRightX = margin + contentWidth / 2;

  function field(label: string, value: string, x: number, y: number, valueColor: [number, number, number] = COLOR_FOREGROUND) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...COLOR_MUTED);
    doc.text(label, x, y);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...valueColor);
    doc.text(value, x, y + 16);
  }

  if (data.alumno) {
    field("ALUMNO", data.alumno, colLeftX, fieldY);
    fieldY += 42;
  }

  field("CONCEPTO", data.concepto, colLeftX, fieldY);
  if (data.categoria && data.categoria !== "CUOTAS") {
    field("CATEGORÍA", data.categoria, colRightX, fieldY, COLOR_ACCENT);
  }
  fieldY += 42;

  // --- Monto: barra destacada con tinte del color de marca, igual criterio que los badges
  // bg-accent/10 que ya usa la app para resaltar un valor sin ser un botón ---
  const amountTop = boxTop + boxHeight + 16;
  const amountHeight = 72;
  doc.setFillColor(...COLOR_ACCENT_TINT);
  doc.roundedRect(margin, amountTop, contentWidth, amountHeight, 6, 6, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...COLOR_ACCENT);
  doc.text("MONTO", margin + boxPadding, amountTop + 20);

  doc.setFontSize(26);
  doc.text(formatMoney(data.amount), margin + boxPadding, amountTop + 42);

  // Monto en palabras debajo del número, igual que un recibo/cheque tradicional — ayuda a
  // que no haya ambigüedad sobre la cifra.
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...COLOR_MUTED);
  const montoTexto = montoATexto(data.amount);
  doc.text(`(${montoTexto})`, margin + boxPadding, amountTop + 60);

  // --- Pie: línea fina + créditos, y datos de contacto de la escuela si los tiene cargados ---
  const footerY = pageHeight - 24;
  doc.setDrawColor(...COLOR_SURFACE_2);
  doc.setLineWidth(1);
  doc.line(margin, footerY - 12, pageWidth - margin, footerY - 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...COLOR_FAINT);
  doc.text("Comprobante generado por Pakua Asistencias", margin, footerY);

  const contact = [data.contactEmail, data.contactPhone].filter(Boolean).join(" · ");
  if (contact) {
    doc.setTextColor(...COLOR_MUTED);
    doc.setFontSize(8);
    doc.text(contact, pageWidth - margin, footerY, { align: "right" });
  }

  const arrayBuffer = doc.output("arraybuffer");
  return Buffer.from(arrayBuffer);
}
