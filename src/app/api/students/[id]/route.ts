import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { studentUpdateSchema } from "@/lib/validations";
import { deleteStudentPhoto, saveStudentPhoto, UploadError } from "@/lib/upload";
import { getSession } from "@/lib/auth";
import { logChange } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const existing = await prisma.student.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Alumno no encontrado" }, { status: 404 });
  }

  const formData = await request.formData();
  const rawActive = formData.get("active");
  const parsed = studentUpdateSchema.safeParse({
    firstName: formData.get("firstName") ?? undefined,
    lastName: formData.get("lastName") ?? undefined,
    active: rawActive === null ? undefined : rawActive === "true",
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
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

  const student = await prisma.student.update({
    where: { id },
    data: { ...parsed.data, ...(photoUrl ? { photoUrl } : {}) },
  });

  const session = await getSession();
  await logChange({
    actor: session?.username ?? "admin",
    action: "UPDATE_STUDENT",
    entity: "Student",
    entityId: student.id,
    detail: `${student.firstName} ${student.lastName}`,
  });

  return NextResponse.json({ student });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const existing = await prisma.student.findUnique({ where: { id } });
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

  await prisma.student.delete({ where: { id } });
  await deleteStudentPhoto(existing.photoUrl);

  const session = await getSession();
  await logChange({
    actor: session?.username ?? "admin",
    action: "DELETE_STUDENT",
    entity: "Student",
    entityId: id,
    detail: `${existing.firstName} ${existing.lastName}`,
  });

  return NextResponse.json({ ok: true });
}
