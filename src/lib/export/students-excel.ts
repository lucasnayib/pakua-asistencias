import ExcelJS from "exceljs";
import { formatDateEs } from "@/lib/time";

export type StudentExportRow = {
  firstName: string;
  lastName: string;
  formacion: string | null;
  graduacion: string | null;
  evaluationDate: string | null;
  dni: string | null;
  birthDate: string | null;
  orientadorName: string | null;
  active: boolean;
};

export type StudentGraduationHistoryExportRow = {
  studentFirstName: string;
  studentLastName: string;
  graduacion: string;
  authorizedAt: string | null;
  delivered: boolean;
  deliveredAt: string | null;
};

export async function buildStudentsExcelBuffer(
  rows: StudentExportRow[],
  historyRows: StudentGraduationHistoryExportRow[]
): Promise<Buffer> {
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

  const historySheet = workbook.addWorksheet("Graduaciones anteriores");
  historySheet.columns = [
    { header: "Apellido y Nombre", key: "fullName", width: 32 },
    { header: "Graduación", key: "graduacion", width: 24 },
    { header: "Fecha Autorizado", key: "authorizedAt", width: 20 },
    { header: "Entregado", key: "delivered", width: 14 },
    { header: "Fecha de Entrega", key: "deliveredAt", width: 20 },
  ];

  historySheet.getRow(1).font = { bold: true };
  historySheet.getRow(1).alignment = { vertical: "middle" };
  historySheet.autoFilter = { from: "A1", to: "E1" };
  historySheet.views = [{ state: "frozen", ySplit: 1 }];

  for (const row of historyRows) {
    historySheet.addRow({
      fullName: `${row.studentLastName}, ${row.studentFirstName}`,
      graduacion: row.graduacion,
      authorizedAt: row.authorizedAt ? formatDateEs(row.authorizedAt) : "",
      delivered: row.delivered ? "Sí" : "Pendiente",
      deliveredAt: row.deliveredAt ? formatDateEs(row.deliveredAt) : "",
    });
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
