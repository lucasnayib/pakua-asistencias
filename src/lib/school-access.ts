import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export const SCHOOL_UNLOCK_COOKIE = "pakua_school_unlock";
const UNLOCK_DURATION_SECONDS = 24 * 60 * 60; // 24 horas

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("Falta la variable de entorno SESSION_SECRET");
  }
  return new TextEncoder().encode(secret);
}

export type SchoolUnlockPayload = {
  adminId: string;
  slug: string;
  purpose: "school_unlock";
};

export async function createSchoolUnlockToken(adminId: string, slug: string): Promise<string> {
  return new SignJWT({ adminId, slug, purpose: "school_unlock" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${UNLOCK_DURATION_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifySchoolUnlockToken(token: string): Promise<SchoolUnlockPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (
      typeof payload.adminId !== "string" ||
      typeof payload.slug !== "string" ||
      payload.purpose !== "school_unlock"
    ) {
      return null;
    }
    return { adminId: payload.adminId, slug: payload.slug, purpose: "school_unlock" };
  } catch {
    return null;
  }
}

export async function setSchoolUnlockCookie(payload: { adminId: string; slug: string }): Promise<void> {
  const token = await createSchoolUnlockToken(payload.adminId, payload.slug);
  const store = await cookies();
  store.set(SCHOOL_UNLOCK_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    // Ver misma variable COOKIE_SECURE en src/lib/auth.ts.
    secure: process.env.COOKIE_SECURE === "true",
    path: "/",
    maxAge: UNLOCK_DURATION_SECONDS,
  });
}

/**
 * Lee la cookie de desbloqueo de escuela server-side y devuelve el `adminId` solo si
 * el token es válido y su `slug` coincide con el pedido. Nunca lanza.
 */
export async function getUnlockedAdminId(slug: string): Promise<string | null> {
  const store = await cookies();
  const token = store.get(SCHOOL_UNLOCK_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifySchoolUnlockToken(token);
  if (!payload || payload.slug !== slug) return null;
  return payload.adminId;
}

/**
 * Para usar al inicio de un Route Handler detrás de una página pública de escuela
 * (check-in, clases anteriores, historial, y las rutas de API que consumen). Permite el
 * acceso si: (a) hay una sesión de admin normal cuyo adminId coincide con `targetAdminId`,
 * o (b) hay una cookie de desbloqueo de escuela válida cuyo adminId coincide. Si ninguna de
 * las dos se cumple, devuelve un NextResponse 401 (mismo patrón que requireAdmin()).
 *
 * No alcanza con "hay alguna sesión" o "hay alguna cookie de desbloqueo": tienen que
 * apuntar exactamente al adminId pedido, para que el desbloqueo de una escuela no sirva
 * para otra.
 */
export async function requireSchoolAccess(
  targetAdminId: string
): Promise<{ adminId: string } | NextResponse> {
  const session = await getSession();
  if (session && session.role === "ADMIN" && session.adminId === targetAdminId) {
    return { adminId: session.adminId };
  }

  const store = await cookies();
  const token = store.get(SCHOOL_UNLOCK_COOKIE)?.value;
  if (token) {
    const payload = await verifySchoolUnlockToken(token);
    if (payload && payload.adminId === targetAdminId) {
      return { adminId: payload.adminId };
    }
  }

  return NextResponse.json({ error: "No autorizado" }, { status: 401 });
}
