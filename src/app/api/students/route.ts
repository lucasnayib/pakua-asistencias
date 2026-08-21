import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { studentCreateSchema } from "@/lib/validations";
import { saveStudentPhoto, UploadError } from "@/lib/upload";
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
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  return NextResponse.json({ students });
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const formData = await request.formData();
  const parsed = studentCreateSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
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
    data: { ...parsed.data, photoUrl, adminId: session.adminId },
  });

  await logChange({
    actor: session.displayName,
    adminId: session.adminId,
    action: "CREATE_STUDENT",
    entity: "Student",
    entityId: student.id,
    detail: `${student.firstName} ${student.lastName}`,
  });

  return NextResponse.json({ student }, { status: 201 });
}
