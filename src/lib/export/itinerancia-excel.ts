import ExcelJS from "exceljs";

export type ItineranciaRegistrationRow = {
  firstName: string;
  lastName: string;
  type: "Alumno" | "Orientador";
};

export async function buildItineranciaRegistrationsExcelBuffer(
  rows: ItineranciaRegistrationRow[]
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Pakua — Sistema de Asistencias";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Inscriptos");
  sheet.columns = [
    { header: "Nombre", key: "firstName", width: 22 },
    { header: "Apellido", key: "lastName", width: 22 },
    { header: "Tipo", key: "type", width: 14 },
  ];

  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).alignment = { vertical: "middle" };
  sheet.autoFilter = { from: "A1", to: "C1" };
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  for (const row of rows) {
    sheet.addRow(row);
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
