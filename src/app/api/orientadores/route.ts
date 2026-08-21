import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { orientadorCreateSchema, studentIdsSchema } from "@/lib/validations";
import { saveOrientadorPhoto, UploadError } from "@/lib/upload";
import { requireAdmin } from "@/lib/auth";
import { logChange } from "@/lib/audit";

const studentsInclude = {
  students: {
    include: { student: true },
    orderBy: { student: { lastName: "asc" as const } },
  },
};

function toOrientadorResponse(orientador: { students: { student: unknown }[] } & Record<string, unknown>) {
  const { students, ...rest } = orientador;
  return { ...rest, students: students.map((l) => l.student) };
}

export async function GET(request: NextRequest) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const search = request.nextUrl.searchParams.get("search")?.trim();
  const includeInactive = request.nextUrl.searchParams.get("includeInactive") === "1";

  const orientadores = await prisma.orientador.findMany({
    where: {
      adminId: session.adminId,
      ...(includeInactive ? {} : { active: true }),
      ...(search
        ? {
            OR: [{ firstName: { contains: search } }, { lastName: { contains: search } }],
          }
        : {}),
    },
    include: studentsInclude,
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  return NextResponse.json({ orientadores: orientadores.map(toOrientadorResponse) });
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const formData = await request.formData();
  const parsed = orientadorCreateSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email") ?? undefined,
    phone: formData.get("phone") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }

  const rawStudentIds = formData.get("studentIds");
  let studentIdsInput: unknown = [];
  if (rawStudentIds) {
    try {
      studentIdsInput = JSON.parse(String(rawStudentIds));
    } catch {
      return NextResponse.json({ error: "Lista de alumnos inválida" }, { status: 400 });
    }
  }
  const studentIdsParsed = studentIdsSchema.safeParse(studentIdsInput);
  if (!studentIdsParsed.success) {
    return NextResponse.json({ error: "Lista de alumnos inválida" }, { status: 400 });
  }
  let studentIds = studentIdsParsed.data;
  if (studentIds.length > 0) {
    const validStudents = await prisma.student.findMany({
      where: { id: { in: studentIds }, adminId: session.adminId },
      select: { id: true },
    });
    const validIds = new Set(validStudents.map((s) => s.id));
    studentIds = studentIds.filter((id) => validIds.has(id));
  }

  const photo = formData.get("photo");
  let photoUrl: string | undefined;
  if (photo instanceof File && photo.size > 0) {
    try {
      photoUrl = await saveOrientadorPhoto(photo);
    } catch (error) {
      if (error instanceof UploadError) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      throw error;
    }
  }

  const { email, phone, ...rest } = parsed.data;
  const orientador = await prisma.orientador.create({
    data: {
      ...rest,
      adminId: session.adminId,
      email: email || null,
      phone: phone || null,
      photoUrl,
      students: { create: studentIds.map((studentId) => ({ studentId })) },
    },
    include: studentsInclude,
  });

  await logChange({
    actor: session.displayName,
    adminId: session.adminId,
    action: "CREATE_ORIENTADOR",
    entity: "Orientador",
    entityId: orientador.id,
    detail: `${orientador.firstName} ${orientador.lastName} (${studentIds.length} alumnos)`,
  });

  return NextResponse.json({ orientador: toOrientadorResponse(orientador) }, { status: 201 });
}
