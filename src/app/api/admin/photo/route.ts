import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { logChange } from "@/lib/audit";
import { deleteAdminPhoto, saveAdminPhoto, UploadError } from "@/lib/upload";

export async function POST(request: Request) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const formData = await request.formData().catch(() => null);
  const photo = formData?.get("photo");
  if (!(photo instanceof File) || photo.size === 0) {
    return NextResponse.json({ error: "Falta la foto" }, { status: 400 });
  }

  const existing = await prisma.admin.findUnique({ where: { id: session.adminId }, select: { photoUrl: true } });

  let photoUrl: string;
  try {
    photoUrl = await saveAdminPhoto(photo);
  } catch (error) {
    if (error instanceof UploadError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
  await deleteAdminPhoto(existing?.photoUrl);

  await prisma.admin.update({ where: { id: session.adminId }, data: { photoUrl } });

  await logChange({
    actor: session.displayName,
    adminId: session.adminId,
    action: "UPDATE_ADMIN_PHOTO",
    entity: "Admin",
    entityId: session.adminId,
    detail: "Foto de perfil actualizada",
  });

  return NextResponse.json({ photoUrl });
}

export async function DELETE() {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const existing = await prisma.admin.findUnique({ where: { id: session.adminId }, select: { photoUrl: true } });
  await deleteAdminPhoto(existing?.photoUrl);
  await prisma.admin.update({ where: { id: session.adminId }, data: { photoUrl: null } });

  await logChange({
    actor: session.displayName,
    adminId: session.adminId,
    action: "UPDATE_ADMIN_PHOTO",
    entity: "Admin",
    entityId: session.adminId,
    detail: "Foto de perfil eliminada",
  });

  return NextResponse.json({ ok: true });
}
