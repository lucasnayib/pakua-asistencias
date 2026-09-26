/**
 * Itinerancias: evento trimestral (marzo/junio/septiembre/diciembre) exclusivo de una escuela
 * puntual, identificada por ITINERANCIAS_SCHOOL_SLUG. Solo la página pública se apaga
 * automáticamente fuera de esos meses — el panel de admin está disponible todo el año, y en su
 * lugar usa un archivado explícito (ver ItineranciaActivity.period) para separar el período en
 * curso de los ya cerrados. Ver OPERACIONES.md.
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
import { distanceMeters } from "@/lib/geo";

type AdminLocation = { latitude: number | null; longitude: number | null; attendanceRadiusMeters: number | null };

/**
 * Restricción de ubicación de Itinerancias: reutiliza la misma configuración de la escuela que
 * ya usa la asistencia normal (Admin.latitude/longitude/attendanceRadiusMeters), pero solo se
 * exige para actividades de sede Córdoba — Alta Gracia es una sede distinta, fuera de este
 * control. Si la escuela no configuró ubicación, no se exige nada (igual que hoy).
 */
export function itineranciaRequiresLocation(admin: AdminLocation, activityLocation: string | null): boolean {
  return (
    activityLocation === "CORDOBA" &&
    admin.latitude != null &&
    admin.longitude != null &&
    admin.attendanceRadiusMeters != null
  );
}

/** Valida lat/long contra el radio configurado. Devuelve el error a responder, o null si está OK. */
export function checkItineranciaLocation(
  admin: AdminLocation,
  latitude: number | undefined,
  longitude: number | undefined
): { status: number; error: string } | null {
  if (latitude === undefined || longitude === undefined) {
    return { status: 400, error: "Esta sede requiere ubicación" };
  }
  const distance = distanceMeters(admin.latitude!, admin.longitude!, latitude, longitude);
  if (distance > admin.attendanceRadiusMeters!) {
    return { status: 403, error: "No estás dentro del rango permitido de la sede" };
  }
  return null;
}

/**
 * Corta con 403 si la escuela del admin logueado no es la de Itinerancias. Ya no exige que el
 * mes actual sea uno de los "abiertos": el panel de admin de Itinerancias no tiene restricción
 * horaria, solo el lado público (inscripción/asistencia/listado/desbloqueo) sigue usando
 * isItineranciasOpen() directamente. Repetir este chequeo en cada ruta de admin es intencional:
 * nunca alcanza con ocultar el link en el sidebar.
 */
export async function requireItineranciaAdminAccess(adminId: string): Promise<NextResponse | null> {
  const admin = await prisma.admin.findUnique({ where: { id: adminId }, select: { slug: true } });
  if (!isItineranciasSchool(admin?.slug)) {
    return NextResponse.json({ error: "Itinerancias no está disponible para esta escuela" }, { status: 403 });
  }
  return null;
}

export { formatItineranciaPeriodLabel } from "./itinerancia-period";
