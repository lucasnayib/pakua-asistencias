import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { orientadorUpdateSchema, studentIdsSchema } from "@/lib/validations";
import { deleteOrientadorPhoto, saveOrientadorPhoto, UploadError } from "@/lib/upload";
import { requireAdmin } from "@/lib/auth";
import { logChange } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

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

function parseStudentIds(raw: FormDataEntryValue | null): { ok: true; value: string[] | undefined } | { ok: false } {
  if (raw === null) return { ok: true, value: undefined };
  let input: unknown;
  try {
    input = JSON.parse(String(raw));
  } catch {
    return { ok: false };
  }
  const parsed = studentIdsSchema.safeParse(input);
  if (!parsed.success) return { ok: false };
  return { ok: true, value: parsed.data };
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const { id } = await params;
  const existing = await prisma.orientador.findUnique({ where: { id, adminId: session.adminId } });
  if (!existing) {
    return NextResponse.json({ error: "Orientador no encontrado" }, { status: 404 });
  }

  const formData = await request.formData();
  const rawActive = formData.get("active");
  const parsed = orientadorUpdateSchema.safeParse({
    firstName: formData.get("firstName") ?? undefined,
    lastName: formData.get("lastName") ?? undefined,
    email: formData.get("email") ?? undefined,
    phone: formData.get("phone") ?? undefined,
    active: rawActive === null ? undefined : rawActive === "true",
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }

  const studentIdsResult = parseStudentIds(formData.get("studentIds"));
  if (!studentIdsResult.ok) {
    return NextResponse.json({ error: "Lista de alumnos inválida" }, { status: 400 });
  }
  let studentIds = studentIdsResult.value;
  if (studentIds && studentIds.length > 0) {
    const validStudents = await prisma.student.findMany({
      where: { id: { in: studentIds }, adminId: session.adminId },
      select: { id: true },
    });
    const validIds = new Set(validStudents.map((s) => s.id));
    studentIds = studentIds.filter((sid) => validIds.has(sid));
  }

  const photo = formData.get("photo");
  let photoUrl: string | undefined;
  if (photo instanceof File && photo.size > 0) {
    try {
      photoUrl = await saveOrientadorPhoto(photo);
      await deleteOrientadorPhoto(existing.photoUrl);
    } catch (error) {
      if (error instanceof UploadError) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      throw error;
    }
  }

  const { email, phone, ...rest } = parsed.data;

  if (studentIds !== undefined) {
    await prisma.$transaction([
      prisma.orientadorStudent.deleteMany({
        where: { orientadorId: id, studentId: { notIn: studentIds } },
      }),
      ...studentIds.map((studentId) =>
        prisma.orientadorStudent.upsert({
          where: { orientadorId_studentId: { orientadorId: id, studentId } },
          update: {},
          create: { orientadorId: id, studentId },
        })
      ),
    ]);
  }

  const orientador = await prisma.orientador.update({
    where: { id, adminId: session.adminId },
    data: {
      ...rest,
      ...(email !== undefined ? { email: email || null } : {}),
      ...(phone !== undefined ? { phone: phone || null } : {}),
      ...(photoUrl ? { photoUrl } : {}),
    },
    include: studentsInclude,
  });

  await logChange({
    actor: session.displayName,
    adminId: session.adminId,
    action: "UPDATE_ORIENTADOR",
    entity: "Orientador",
    entityId: orientador.id,
    detail: `${orientador.firstName} ${orientador.lastName}`,
  });

  return NextResponse.json({ orientador: toOrientadorResponse(orientador) });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const { id } = await params;
  const existing = await prisma.orientador.findUnique({ where: { id, adminId: session.adminId } });
  if (!existing) {
    return NextResponse.json({ error: "Orientador no encontrado" }, { status: 404 });
  }

  await prisma.orientador.delete({ where: { id, adminId: session.adminId } });
  await deleteOrientadorPhoto(existing.photoUrl);

  await logChange({
    actor: session.displayName,
    adminId: session.adminId,
    action: "DELETE_ORIENTADOR",
    entity: "Orientador",
    entityId: id,
    detail: `${existing.firstName} ${existing.lastName}`,
  });

  return NextResponse.json({ ok: true });
}
