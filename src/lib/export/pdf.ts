import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatDateEs, formatTimeShort } from "@/lib/time";
import type { ExportRow } from "@/lib/export/types";

export function buildPdfBuffer(rows: ExportRow[], title: string): Buffer {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt" });

  doc.setFontSize(14);
  doc.text(title, 40, 40);
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Generado el ${formatDateEs(new Date().toISOString().slice(0, 10))}`, 40, 56);

  autoTable(doc, {
    startY: 72,
    head: [["Nombre", "Apellido", "Fecha", "Hora", "Horario", "Estado"]],
    body: rows.map((r) => [
      r.firstName,
      r.lastName,
      formatDateEs(r.date),
      formatTimeShort(r.time),
      r.scheduleLabel,
      r.status === "PRESENTE" ? "Presente" : r.status,
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [185, 28, 28] },
  });

  const arrayBuffer = doc.output("arraybuffer");
  return Buffer.from(arrayBuffer);
}
