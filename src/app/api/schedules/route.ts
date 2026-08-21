import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { scheduleSchema } from "@/lib/validations";
import { getSession, requireAdmin } from "@/lib/auth";
import { requireSchoolAccess } from "@/lib/school-access";
import { logChange } from "@/lib/audit";

export async function GET(request: NextRequest) {
  // Con sesión de admin, se usa el tenant de la sesión. Sin sesión (páginas públicas de
  // check-in / historial), se exige adminId como query param — validado con requireSchoolAccess.
  const session = await getSession();
  const adminId = session?.adminId ?? request.nextUrl.searchParams.get("adminId");
  if (!adminId) {
    return NextResponse.json({ error: "Falta adminId" }, { status: 400 });
  }

  const access = await requireSchoolAccess(adminId);
  if (access instanceof NextResponse) return access;

  const dayOfWeekParam = request.nextUrl.searchParams.get("dayOfWeek");
  const dayOfWeek = dayOfWeekParam !== null ? Number(dayOfWeekParam) : undefined;

  const schedules = await prisma.schedule.findMany({
    where: {
      adminId,
      ...(dayOfWeek !== undefined && !Number.isNaN(dayOfWeek) ? { days: { some: { dayOfWeek } } } : {}),
    },
    include: {
      days: true,
      _count: { select: { students: true } },
    },
    orderBy: [{ startTime: "asc" }],
  });

  return NextResponse.json({ schedules });
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const body = await request.json().catch(() => null);
  const parsed = scheduleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }

  const { name, startTime, endTime, days } = parsed.data;
  const schedule = await prisma.schedule.create({
    data: {
      adminId: session.adminId,
      name: name || null,
      startTime,
      endTime,
      days: { create: days.map((dayOfWeek) => ({ dayOfWeek })) },
    },
    include: { days: true },
  });

  await logChange({
    actor: session.displayName,
    adminId: session.adminId,
    action: "CREATE_SCHEDULE",
    entity: "Schedule",
    entityId: schedule.id,
    detail: `${schedule.name ?? ""} ${schedule.startTime}-${schedule.endTime}`.trim(),
  });

  return NextResponse.json({ schedule }, { status: 201 });
}
