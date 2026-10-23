import ExcelJS from "exceljs";
import type { MovimientoRow } from "@/lib/aranceles-server";

export async function buildArancelesExcelBuffer(month: string | null, rows: MovimientoRow[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Pakua — Sistema de Asistencias";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(month ? `Movimientos ${month}` : "Todos los movimientos");
  sheet.columns = [
    { header: "Fecha", key: "date", width: 12 },
    { header: "Tipo", key: "tipo", width: 10 },
    { header: "Categoría", key: "categoria", width: 18 },
    { header: "Concepto", key: "concepto", width: 40 },
    { header: "Monto", key: "amount", width: 14 },
    { header: "Estado", key: "estado", width: 12 },
    { header: "N.° recibo", key: "numero", width: 14 },
  ];
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).alignment = { vertical: "middle" };
  sheet.autoFilter = { from: "A1", to: "G1" };
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  // Más nuevo primero, igual que en la pantalla.
  for (const row of rows) {
    sheet.addRow({
      date: row.date,
      tipo: row.tipo === "INGRESO" ? "Ingreso" : "Egreso",
      categoria: row.categoria,
      concepto: row.concepto,
      amount: row.amount,
      estado: row.estado === "PAGADO" ? "Pagado" : "No pagado",
      numero: row.numero,
    });
  }
  sheet.getColumn("amount").numFmt = "#,##0";

  // Solo lo PAGADO cuenta para los totales, mismo criterio que el resto de Aranceles
  // (ver soloPagadas en src/lib/aranceles-calc.ts).
  const ingresos = rows.filter((r) => r.tipo === "INGRESO" && r.estado === "PAGADO").reduce((s, r) => s + r.amount, 0);
  const egresos = rows.filter((r) => r.tipo === "EGRESO" && r.estado === "PAGADO").reduce((s, r) => s + r.amount, 0);

  sheet.addRow({});
  const totalsFirstRow = sheet.rowCount + 1;
  sheet.addRow({ concepto: "Ingresos totales (pagado)", amount: ingresos });
  sheet.addRow({ concepto: "Egresos totales (pagado)", amount: egresos });
  sheet.addRow({ concepto: "Saldo", amount: ingresos - egresos });
  for (let i = totalsFirstRow; i <= sheet.rowCount; i++) {
    sheet.getRow(i).font = { bold: true };
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
