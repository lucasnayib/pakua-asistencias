import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { logChange } from "@/lib/audit";

function normalizeHeader(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Subí un archivo .xlsx" }, { status: 400 });
  }

  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(await file.arrayBuffer());
  } catch {
    return NextResponse.json({ error: "No se pudo leer el archivo Excel" }, { status: 400 });
  }

  const sheet = workbook.worksheets[0];
  if (!sheet) {
    return NextResponse.json({ error: "El archivo no tiene hojas" }, { status: 400 });
  }

  const headerRow = sheet.getRow(1);
  const columnIndex: Record<string, number> = {};
  headerRow.eachCell((cell, colNumber) => {
    const header = normalizeHeader(cell.value);
    if (header.startsWith("nombre")) columnIndex.firstName = colNumber;
    if (header.startsWith("apellido")) columnIndex.lastName = colNumber;
  });

  if (!columnIndex.firstName || !columnIndex.lastName) {
    return NextResponse.json(
      { error: "El Excel debe tener columnas 'Nombre' y 'Apellido'" },
      { status: 400 }
    );
  }

  const toCreate: { firstName: string; lastName: string }[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const firstName = String(row.getCell(columnIndex.firstName).value ?? "").trim();
    const lastName = String(row.getCell(columnIndex.lastName).value ?? "").trim();
    if (firstName && lastName) toCreate.push({ firstName, lastName });
  });

  if (toCreate.length === 0) {
    return NextResponse.json({ error: "No se encontraron filas válidas para importar" }, { status: 400 });
  }

  await prisma.student.createMany({
    data: toCreate.map((s) => ({ ...s, adminId: session.adminId })),
  });

  await logChange({
    actor: session.displayName,
    adminId: session.adminId,
    action: "IMPORT_STUDENTS",
    entity: "Student",
    detail: `${toCreate.length} alumnos importados`,
  });

  return NextResponse.json({ imported: toCreate.length });
}
