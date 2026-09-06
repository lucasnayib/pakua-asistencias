import ExcelJS from "exceljs";
import { formatDateEs } from "@/lib/time";

export type StudentExportRow = {
  firstName: string;
  lastName: string;
  formacion: string | null;
  graduacion: string | null;
  evaluationDate: string | null;
  dni: string | null;
  orientadorName: string | null;
  active: boolean;
};

export async function buildStudentsExcelBuffer(rows: StudentExportRow[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Pakua — Sistema de Asistencias";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Alumnos");
  sheet.columns = [
    { header: "Apellido y Nombre", key: "fullName", width: 32 },
    { header: "Formación", key: "formacion", width: 20 },
    { header: "Graduación", key: "graduacion", width: 24 },
    { header: "¿Cuándo fue Autorizado?", key: "evaluationDate", width: 20 },
    { header: "D.N.I.", key: "dni", width: 16 },
    { header: "Orientador", key: "orientadorName", width: 28 },
    { header: "Estado", key: "active", width: 12 },
  ];

  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).alignment = { vertical: "middle" };
  sheet.autoFilter = { from: "A1", to: "G1" };
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  for (const row of rows) {
    sheet.addRow({
      fullName: `${row.lastName}, ${row.firstName}`,
      formacion: row.formacion ?? "",
      graduacion: row.graduacion ?? "",
      evaluationDate: row.evaluationDate ? formatDateEs(row.evaluationDate) : "",
      dni: row.dni ? `D.N.I. ${row.dni}` : "",
      orientadorName: row.orientadorName ?? "",
      active: row.active ? "Activo" : "Dado de baja",
    });
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
