import ExcelJS from "exceljs";

export type OrientadorStudentRow = {
  firstName: string;
  lastName: string;
  active: boolean;
};

export async function buildOrientadorStudentsExcelBuffer(rows: OrientadorStudentRow[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Pakua — Sistema de Asistencias";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Alumnos");
  sheet.columns = [
    { header: "Nombre", key: "firstName", width: 22 },
    { header: "Apellido", key: "lastName", width: 22 },
    { header: "Estado", key: "status", width: 14 },
  ];

  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).alignment = { vertical: "middle" };
  sheet.autoFilter = { from: "A1", to: "C1" };
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  for (const row of rows) {
    sheet.addRow({
      firstName: row.firstName,
      lastName: row.lastName,
      status: row.active ? "Activo" : "Dado de baja",
    });
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
