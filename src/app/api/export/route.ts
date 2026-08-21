import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exportRequestSchema } from "@/lib/validations";
import { formatTimeRange } from "@/lib/time";
import { buildExcelBuffer } from "@/lib/export/excel";
import { buildPdfBuffer } from "@/lib/export/pdf";
import { buildTxtContent } from "@/lib/export/txt";
import type { ExportRow } from "@/lib/export/types";
import { uploadToDrive } from "@/lib/google-drive";
import { getSession } from "@/lib/auth";
import { requireSchoolAccess } from "@/lib/school-access";
import { logChange } from "@/lib/audit";

const MIME_TYPES: Record<string, string> = {
  XLSX: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  PDF: "application/pdf",
  TXT: "text/plain; charset=utf-8",
};

const EXTENSIONS: Record<string, string> = { XLSX: "xlsx", PDF: "pdf", TXT: "txt" };

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = exportRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }
  const { format, dateFrom, dateTo, scheduleId } = parsed.data;

  // Con sesión de admin, se usa el tenant de la sesión (ignora cualquier adminId del body).
  // Sin sesión (página pública de check-in), se exige adminId en el body.
  const session = await getSession();
  const adminId = session?.adminId ?? parsed.data.adminId;
  if (!adminId) {
    return NextResponse.json({ error: "Falta adminId" }, { status: 400 });
  }

  const access = await requireSchoolAccess(adminId);
  if (access instanceof NextResponse) return access;

  const attendances = await prisma.attendance.findMany({
    where: {
      date: { gte: dateFrom, lte: dateTo },
      schedule: { adminId },
      ...(scheduleId ? { scheduleId } : {}),
    },
    include: { student: true, schedule: true },
    orderBy: [{ date: "asc" }, { time: "asc" }],
  });

  const rows: ExportRow[] = attendances.map((a) => ({
    firstName: a.student.firstName,
    lastName: a.student.lastName,
    date: a.date,
    time: a.time,
    scheduleLabel: `${a.schedule.name ? a.schedule.name + " · " : ""}${formatTimeRange(a.schedule.startTime, a.schedule.endTime)}`,
    status: a.status,
  }));

  let buffer: Buffer;
  if (format === "PDF") {
    const title = dateFrom === dateTo ? `Asistencias — ${dateFrom}` : `Asistencias — ${dateFrom} a ${dateTo}`;
    buffer = buildPdfBuffer(rows, title);
  } else if (format === "TXT") {
    buffer = Buffer.from(buildTxtContent(rows), "utf-8");
  } else {
    buffer = await buildExcelBuffer(rows);
  }

  const rangeLabel = dateFrom === dateTo ? dateFrom : `${dateFrom}_a_${dateTo}`;
  const filename = `asistencias_${rangeLabel}.${EXTENSIONS[format]}`;

  const driveResult = await uploadToDrive(buffer, filename, MIME_TYPES[format]);

  await prisma.exportLog.create({
    data: {
      adminId,
      filename,
      format,
      dateFrom,
      dateTo,
      driveUploaded: driveResult.uploaded,
    },
  });

  await logChange({
    actor: session?.displayName ?? "profesor",
    adminId,
    action: "EXPORT_ATTENDANCE",
    entity: "ExportLog",
    detail: `${filename} (${rows.length} registros)${driveResult.uploaded ? " — subido a Drive" : ""}`,
  });

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": MIME_TYPES[format],
      "Content-Disposition": `attachment; filename="${filename}"`,
      "X-Filename": filename,
      "X-Drive-Uploaded": driveResult.uploaded ? "1" : "0",
    },
  });
}
