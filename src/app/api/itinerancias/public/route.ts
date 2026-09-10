import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireItineranciaAccess } from "@/lib/itinerancia-access";
import { isItineranciasOpen, isItineranciasSchool } from "@/lib/itinerancias";

export async function GET(request: NextRequest) {
  const adminId = request.nextUrl.searchParams.get("adminId");
  if (!adminId) {
    return NextResponse.json({ error: "Falta adminId" }, { status: 400 });
  }

  const access = await requireItineranciaAccess(adminId);
  if (access instanceof NextResponse) return access;

  const admin = await prisma.admin.findUnique({ where: { id: adminId }, select: { slug: true } });
  if (!isItineranciasSchool(admin?.slug) || !isItineranciasOpen()) {
    return NextResponse.json({ error: "Itinerancias no está disponible ahora" }, { status: 404 });
  }

  const [activities, students] = await Promise.all([
    prisma.itineranciaActivity.findMany({
      where: { adminId },
      include: {
        studentRegistrations: { select: { studentId: true } },
      },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    }),
    prisma.student.findMany({
      where: { adminId, active: true },
      select: { id: true, firstName: true, lastName: true, photoUrl: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
  ]);

  return NextResponse.json({
    activities: activities.map((a) => ({
      id: a.id,
      title: a.title,
      description: a.description,
      category: a.category,
      date: a.date,
      startTime: a.startTime,
      endTime: a.endTime,
      registeredStudentIds: a.studentRegistrations.map((r) => r.studentId),
    })),
    students,
  });
}
