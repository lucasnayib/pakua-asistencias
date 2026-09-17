import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSubscriptionSuspended } from "@/lib/subscription";

/**
 * Acceso público a Itinerancias, separado por completo del desbloqueo de asistencia
 * (school-access.ts): cookie propia, JWT propio, código propio (Admin.itineranciaAccessCodeHash,
 * nunca la contraseña real de la escuela). Así el código que se reparte para anotarse a
 * Itinerancias no sirve para nada más.
 */
export const ITINERANCIA_UNLOCK_COOKIE = "pakua_itinerancia_unlock";
const UNLOCK_DURATION_SECONDS = 24 * 60 * 60; // 24 horas

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("Falta la variable de entorno SESSION_SECRET");
  }
  return new TextEncoder().encode(secret);
}

export type ItineranciaUnlockPayload = {
  adminId: string;
  slug: string;
  purpose: "itinerancia_unlock";
};

export async function createItineranciaUnlockToken(adminId: string, slug: string): Promise<string> {
  return new SignJWT({ adminId, slug, purpose: "itinerancia_unlock" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${UNLOCK_DURATION_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifyItineranciaUnlockToken(token: string): Promise<ItineranciaUnlockPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (
      typeof payload.adminId !== "string" ||
      typeof payload.slug !== "string" ||
      payload.purpose !== "itinerancia_unlock"
    ) {
      return null;
    }
    return { adminId: payload.adminId, slug: payload.slug, purpose: "itinerancia_unlock" };
  } catch {
    return null;
  }
}

export async function setItineranciaUnlockCookie(payload: { adminId: string; slug: string }): Promise<void> {
  const token = await createItineranciaUnlockToken(payload.adminId, payload.slug);
  const store = await cookies();
  store.set(ITINERANCIA_UNLOCK_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.COOKIE_SECURE === "true",
    path: "/",
    maxAge: UNLOCK_DURATION_SECONDS,
  });
}

/** Lee la cookie de desbloqueo de Itinerancias server-side. Nunca lanza. */
export async function getUnlockedItineranciaAdminId(slug: string): Promise<string | null> {
  const store = await cookies();
  const token = store.get(ITINERANCIA_UNLOCK_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifyItineranciaUnlockToken(token);
  if (!payload || payload.slug !== slug) return null;
  return payload.adminId;
}

/**
 * Para usar al inicio de las rutas de API públicas de Itinerancias. Permite el acceso si: (a)
 * hay una sesión de admin normal cuyo adminId coincide con `targetAdminId` (para que el propio
 * admin pueda previsualizar sin pedirse el código a sí mismo), o (b) hay una cookie de
 * desbloqueo de Itinerancias válida cuyo adminId coincide. Si ninguna, 401.
 */
export async function requireItineranciaAccess(
  targetAdminId: string
): Promise<{ adminId: string } | NextResponse> {
  const session = await getSession();
  const store = await cookies();
  const token = store.get(ITINERANCIA_UNLOCK_COOKIE)?.value;

  let hasAccess = session && session.role === "ADMIN" && session.adminId === targetAdminId;
  if (!hasAccess && token) {
    const payload = await verifyItineranciaUnlockToken(token);
    hasAccess = !!payload && payload.adminId === targetAdminId;
  }

  if (!hasAccess) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // Mismo criterio que requireSchoolAccess(): se revalida en cada request para que una
  // suspensión mientras ya hay cookie/sesión vigente corte el acceso de inmediato.
  const admin = await prisma.admin.findUnique({
    where: { id: targetAdminId },
    select: { subscriptionStatus: true },
  });
  if (admin && isSubscriptionSuspended(admin.subscriptionStatus)) {
    return NextResponse.json(
      { error: "Esta escuela tiene la suscripción suspendida. Contactá al administrador." },
      { status: 403 }
    );
  }

  return { adminId: targetAdminId };
}
