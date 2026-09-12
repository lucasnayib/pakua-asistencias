/**
 * Itinerancias: evento trimestral (marzo/junio/septiembre/diciembre) exclusivo de una escuela
 * puntual, identificada por ITINERANCIAS_SCHOOL_SLUG. Tanto el panel de admin como la página
 * pública se apagan automáticamente fuera de esos meses — ver OPERACIONES.md.
 */
const OPEN_MONTHS = [3, 6, 9, 12];

export function isItineranciasOpen(date: Date = new Date()): boolean {
  return OPEN_MONTHS.includes(date.getMonth() + 1);
}

export function isItineranciasSchool(slug: string | null | undefined): boolean {
  const target = process.env.ITINERANCIAS_SCHOOL_SLUG;
  return !!target && slug === target;
}

export const ITINERANCIA_CATEGORIES = [
  "EVALUACION",
  "SEMINARIO",
  "CURSO",
  "COMPENSATORIOS",
  "CLASES_ESPECIALES",
] as const;
export type ItineranciaCategory = (typeof ITINERANCIA_CATEGORIES)[number];

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Corta con 403 si la escuela del admin logueado no es la de Itinerancias, o si el mes actual
 * no es uno de los abiertos. Repetir este chequeo en cada ruta de admin es intencional: nunca
 * alcanza con ocultar el link en el sidebar.
 */
export async function requireItineranciaAdminAccess(adminId: string): Promise<NextResponse | null> {
  const admin = await prisma.admin.findUnique({ where: { id: adminId }, select: { slug: true } });
  if (!isItineranciasSchool(admin?.slug) || !isItineranciasOpen()) {
    return NextResponse.json({ error: "Itinerancias no está disponible ahora" }, { status: 403 });
  }
  return null;
}
