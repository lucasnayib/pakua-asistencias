import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRosterForSchedule } from "@/lib/roster";
import { requireSchoolAccess } from "@/lib/school-access";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const date = request.nextUrl.searchParams.get("date");
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Parámetro 'date' inválido (YYYY-MM-DD)" }, { status: 400 });
  }

  const schedule = await prisma.schedule.findUnique({ where: { id }, select: { adminId: true } });
  if (!schedule) {
    return NextResponse.json({ error: "Horario no encontrado" }, { status: 404 });
  }

  const access = await requireSchoolAccess(schedule.adminId);
  if (access instanceof NextResponse) return access;

  const result = await getRosterForSchedule(id, date);
  if (!result) {
    return NextResponse.json({ error: "Horario no encontrado" }, { status: 404 });
  }

  return NextResponse.json(result);
}
