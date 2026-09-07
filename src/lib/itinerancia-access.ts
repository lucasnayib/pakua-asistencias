import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

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
  if (session && session.role === "ADMIN" && session.adminId === targetAdminId) {
    return { adminId: session.adminId };
  }

  const store = await cookies();
  const token = store.get(ITINERANCIA_UNLOCK_COOKIE)?.value;
  if (token) {
    const payload = await verifyItineranciaUnlockToken(token);
    if (payload && payload.adminId === targetAdminId) {
      return { adminId: payload.adminId };
    }
  }

  return NextResponse.json({ error: "No autorizado" }, { status: 401 });
}
