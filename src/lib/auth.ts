import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const SESSION_COOKIE = "pakua_admin_session";
const SESSION_DURATION_SECONDS = 8 * 60 * 60; // 8 horas

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("Falta la variable de entorno SESSION_SECRET");
  }
  return new TextEncoder().encode(secret);
}

export type AdminRole = "ADMIN" | "SUPER_ADMIN";

export type SessionPayload = {
  adminId: string;
  username: string;
  displayName: string;
  role: AdminRole;
};

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (
      typeof payload.adminId !== "string" ||
      typeof payload.username !== "string" ||
      typeof payload.displayName !== "string" ||
      (payload.role !== "ADMIN" && payload.role !== "SUPER_ADMIN")
    ) {
      return null;
    }
    return {
      adminId: payload.adminId,
      username: payload.username,
      displayName: payload.displayName,
      role: payload.role,
    };
  } catch {
    return null;
  }
}

/** Para usar en Route Handlers / Server Components. */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function setSessionCookie(payload: SessionPayload): Promise<void> {
  const token = await createSessionToken(payload);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    // COOKIE_SECURE=true una vez que la app se sirve por HTTPS (ej. detrás de un túnel
    // de Cloudflare). Mientras se acceda solo por HTTP en la LAN, dejar sin definir/false.
    secure: process.env.COOKIE_SECURE === "true",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/**
 * Para usar al inicio de un Route Handler que requiere sesión de administrador con datos
 * de escuela (alumnos, horarios, orientadores, asistencia, estadísticas, exportaciones, backups).
 * Devuelve el payload de sesión, o una respuesta 401/403 lista para retornar.
 *
 * El super-admin NO tiene acceso a datos de escuela (solo gestiona cuentas desde /api/admins),
 * así que se rechaza acá también como defensa en profundidad, además del bloqueo en proxy.ts.
 */
export async function requireAdmin(): Promise<SessionPayload | NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (session.role === "SUPER_ADMIN") {
    return NextResponse.json(
      { error: "El super-admin no tiene acceso a datos de escuela" },
      { status: 403 }
    );
  }
  return session;
}

/**
 * Igual que requireAdmin(), pero además exige rol SUPER_ADMIN.
 */
export async function requireSuperAdmin(): Promise<SessionPayload | NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (session.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "No tenés permisos para esta acción" }, { status: 403 });
  }
  return session;
}
