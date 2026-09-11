import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { studentUpdateSchema } from "@/lib/validations";
import { deleteStudentPhoto, saveStudentPhoto, UploadError } from "@/lib/upload";
import { requireAdmin } from "@/lib/auth";
import { logChange } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

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

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const { id } = await params;
  const existing = await prisma.student.findUnique({ where: { id, adminId: session.adminId } });
  if (!existing) {
    return NextResponse.json({ error: "Alumno no encontrado" }, { status: 404 });
  }

  const formData = await request.formData();
  const rawActive = formData.get("active");
  const rawFormacion = formData.get("formacion");
  const rawGraduacion = formData.get("graduacion");
  const rawEvaluationDate = formData.get("evaluationDate");
  const rawDni = formData.get("dni");
  const rawBirthDate = formData.get("birthDate");
  const rawOrientadorId = formData.get("orientadorId");
  const parsed = studentUpdateSchema.safeParse({
    firstName: formData.get("firstName") ?? undefined,
    lastName: formData.get("lastName") ?? undefined,
    formacion: rawFormacion === null ? undefined : rawFormacion || null,
    graduacion: rawGraduacion === null ? undefined : rawGraduacion || null,
    evaluationDate: rawEvaluationDate === null ? undefined : rawEvaluationDate || null,
    dni: rawDni === null ? undefined : rawDni || null,
    birthDate: rawBirthDate === null ? undefined : rawBirthDate || null,
    orientadorId: rawOrientadorId === null ? undefined : rawOrientadorId || null,
    active: rawActive === null ? undefined : rawActive === "true",
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
      await deleteStudentPhoto(existing.photoUrl);
    } catch (error) {
      if (error instanceof UploadError) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      throw error;
    }
  }

  if (orientadorId !== undefined) {
    await prisma.$transaction([
      prisma.orientadorStudent.deleteMany({ where: { studentId: id } }),
      ...(orientadorId ? [prisma.orientadorStudent.create({ data: { studentId: id, orientadorId } })] : []),
    ]);
  }

  const student = await prisma.student.update({
    where: { id, adminId: session.adminId },
    data: { ...studentData, ...(photoUrl ? { photoUrl } : {}) },
    include: orientadorInclude,
  });

  await logChange({
    actor: session.displayName,
    adminId: session.adminId,
    action: "UPDATE_STUDENT",
    entity: "Student",
    entityId: student.id,
    detail: `${student.firstName} ${student.lastName}`,
  });

  return NextResponse.json({ student: toStudentResponse(student) });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const { id } = await params;
  const existing = await prisma.student.findUnique({ where: { id, adminId: session.adminId } });
  if (!existing) {
    return NextResponse.json({ error: "Alumno no encontrado" }, { status: 404 });
  }

  const attendanceCount = await prisma.attendance.count({ where: { studentId: id } });
  if (attendanceCount > 0) {
    return NextResponse.json(
      {
        error:
          "Este alumno tiene historial de asistencias. Para conservarlo, dalo de baja en vez de eliminarlo (podés reactivarlo cuando quieras).",
      },
      { status: 409 }
    );
  }

  await prisma.student.delete({ where: { id, adminId: session.adminId } });
  await deleteStudentPhoto(existing.photoUrl);

  await logChange({
    actor: session.displayName,
    adminId: session.adminId,
    action: "DELETE_STUDENT",
    entity: "Student",
    entityId: id,
    detail: `${existing.firstName} ${existing.lastName}`,
  });

  return NextResponse.json({ ok: true });
}
