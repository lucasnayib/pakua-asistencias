import { jsPDF } from "jspdf";
import { formatDateEs } from "@/lib/time";
import { formatMoney } from "@/lib/aranceles-calc";

export type ReciboData = {
  schoolName: string;
  concepto: string;
  amount: number;
  date: string; // "YYYY-MM-DD"
  alumno?: string; // apellido, nombre — solo para cuotas ligadas a un alumno puntual
  numero: string; // identificador corto para que el recibo sea trazable
};

// Tamaño media carta apaisada: un recibo no necesita una hoja A4 entera. Mismo criterio de
// colores que el resto de los PDF de la app (src/lib/export/pdf.ts): rojo de marca #b91c1c.
export function buildReciboPdf(data: ReciboData): Buffer {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: [420, 300] });
  const pageWidth = 420;
  const margin = 32;

  doc.setFillColor(185, 28, 28);
  doc.rect(0, 0, pageWidth, 54, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text(data.schoolName, margin, 32);
  doc.setFontSize(10);
  doc.text("Recibo de pago", margin, 46);

  doc.setTextColor(120);
  doc.setFontSize(9);
  doc.text(`N.° ${data.numero}`, pageWidth - margin, 32, { align: "right" });
  doc.text(formatDateEs(data.date), pageWidth - margin, 46, { align: "right" });

  let y = 90;
  doc.setTextColor(40);

  if (data.alumno) {
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text("ALUMNO", margin, y);
    doc.setFontSize(13);
    doc.setTextColor(30);
    doc.text(data.alumno, margin, y + 16);
    y += 42;
  }

  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text("CONCEPTO", margin, y);
  doc.setFontSize(13);
  doc.setTextColor(30);
  doc.text(data.concepto, margin, y + 16);
  y += 42;

  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text("MONTO", margin, y);
  doc.setFontSize(20);
  doc.setTextColor(185, 28, 28);
  doc.text(formatMoney(data.amount), margin, y + 22);

  doc.setDrawColor(220);
  doc.line(margin, 270, pageWidth - margin, 270);
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text("Comprobante generado por Pakua Asistencias", margin, 284);

  const arrayBuffer = doc.output("arraybuffer");
  return Buffer.from(arrayBuffer);
}
