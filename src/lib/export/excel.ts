import ExcelJS from "exceljs";
import { formatDateEs, formatTimeShort } from "@/lib/time";
import type { ExportRow } from "@/lib/export/types";

export async function buildExcelBuffer(rows: ExportRow[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Pakua — Sistema de Asistencias";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Asistencias");
  sheet.columns = [
    { header: "Nombre", key: "firstName", width: 18 },
    { header: "Apellido", key: "lastName", width: 18 },
    { header: "Fecha", key: "date", width: 14 },
    { header: "Hora", key: "time", width: 10 },
    { header: "Horario", key: "schedule", width: 22 },
    { header: "Estado", key: "status", width: 12 },
  ];

  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).alignment = { vertical: "middle" };
  sheet.autoFilter = { from: "A1", to: "F1" };
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  for (const row of rows) {
    sheet.addRow({
      firstName: row.firstName,
      lastName: row.lastName,
      date: formatDateEs(row.date),
      time: formatTimeShort(row.time),
      schedule: row.scheduleLabel,
      status: row.status === "PRESENTE" ? "Presente" : row.status,
    });
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
