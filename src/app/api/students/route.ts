import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { studentCreateSchema } from "@/lib/validations";
import { saveStudentPhoto, UploadError } from "@/lib/upload";
import { getSession } from "@/lib/auth";
import { logChange } from "@/lib/audit";

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams.get("search")?.trim();
  const includeInactive = request.nextUrl.searchParams.get("includeInactive") === "1";

  const students = await prisma.student.findMany({
    where: {
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
    data: { ...parsed.data, photoUrl },
  });

  const session = await getSession();
  await logChange({
    actor: session?.username ?? "admin",
    action: "CREATE_STUDENT",
    entity: "Student",
    entityId: student.id,
    detail: `${student.firstName} ${student.lastName}`,
  });

  return NextResponse.json({ student }, { status: 201 });
}
