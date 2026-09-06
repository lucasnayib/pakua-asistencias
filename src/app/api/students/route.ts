import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { studentCreateSchema } from "@/lib/validations";
import { saveStudentPhoto, UploadError } from "@/lib/upload";
import { getSession, requireAdmin } from "@/lib/auth";
import { requireSchoolAccess } from "@/lib/school-access";
import { logChange } from "@/lib/audit";

const orientadorInclude = {
  orientadores: {
    include: { orientador: true },
    orderBy: { createdAt: "asc" as const },
    take: 1,
  },
};

function toStudentResponse(student: { orientadores: { orientador: unknown }[] } & Record<string, unknown>) {
  const { orientadores, ...rest } = student;
  return { ...rest, orientador: orientadores[0]?.orientador ?? null };
}

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

  const search = request.nextUrl.searchParams.get("search")?.trim();
  const includeInactive = request.nextUrl.searchParams.get("includeInactive") === "1";

  const students = await prisma.student.findMany({
    where: {
      adminId,
      ...(includeInactive ? {} : { active: true }),
      ...(search
        ? {
            OR: [
              { firstName: { contains: search } },
              { lastName: { contains: search } },
            ],
          }
        : {}),
    },
    include: orientadorInclude,
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  return NextResponse.json({ students: students.map(toStudentResponse) });
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const formData = await request.formData();
  const parsed = studentCreateSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    formacion: formData.get("formacion") || null,
    graduacion: formData.get("graduacion") || null,
    evaluationDate: formData.get("evaluationDate") || null,
    dni: formData.get("dni") || null,
    orientadorId: formData.get("orientadorId") || null,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }

  const { orientadorId, ...studentData } = parsed.data;
  if (orientadorId) {
    const orientador = await prisma.orientador.findUnique({ where: { id: orientadorId, adminId: session.adminId } });
    if (!orientador) {
      return NextResponse.json({ error: "Orientador no encontrado" }, { status: 400 });
    }
  }

  const photo = formData.get("photo");
  let photoUrl: string | undefined;
  if (photo instanceof File && photo.size > 0) {
    try {
      photoUrl = await saveStudentPhoto(photo);
    } catch (error) {
      if (error instanceof UploadError) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      throw error;
    }
  }

  const student = await prisma.student.create({
    data: {
      ...studentData,
      photoUrl,
      adminId: session.adminId,
      ...(orientadorId ? { orientadores: { create: { orientadorId } } } : {}),
    },
    include: orientadorInclude,
  });

  await logChange({
    actor: session.displayName,
    adminId: session.adminId,
    action: "CREATE_STUDENT",
    entity: "Student",
    entityId: student.id,
    detail: `${student.firstName} ${student.lastName}`,
  });

  return NextResponse.json({ student: toStudentResponse(student) }, { status: 201 });
}
