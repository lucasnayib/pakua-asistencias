import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

/** Marca la guía interactiva como ya ofrecida/completada (al decir "No, gracias", o al
 * terminar/saltar el recorrido la primera vez). Idempotente — "Volver a ver el recorrido"
 * desde Mi cuenta nunca llama a esta ruta, así que no hace falta "reabrir" nada acá. */
export async function PATCH() {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  await prisma.admin.update({
    where: { id: session.adminId },
    data: { onboardingCompletedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
