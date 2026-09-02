import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createHash } from "node:crypto";

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

const TWO_FACTOR_PENDING_DURATION_SECONDS = 5 * 60; // 5 minutos

/**
 * Token intermedio emitido tras validar usuario/contraseña cuando la cuenta tiene 2FA
 * activo. No es una sesión: no alcanza por sí solo para pasar setSessionCookie, tiene
 * que pasar primero por /api/auth/verify-2fa.
 */
export async function createTwoFactorPendingToken(adminId: string): Promise<string> {
  return new SignJWT({ adminId, purpose: "2fa_pending" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${TWO_FACTOR_PENDING_DURATION_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifyTwoFactorPendingToken(token: string): Promise<{ adminId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (payload.purpose !== "2fa_pending" || typeof payload.adminId !== "string") return null;
    return { adminId: payload.adminId };
  } catch {
    return null;
  }
}

const PASSWORD_RESET_DURATION_SECONDS = 60 * 60; // 1 hora

/**
 * Huella corta del passwordHash actual, para meter en el token de reseteo. Sirve para que
 * el token quede "invalidado" solo con que la contraseña cambie mientras tanto (uso único
 * de facto, sin necesitar guardar el token en la base) — no expone el hash real, solo un
 * hash del hash.
 */
function passwordFingerprint(passwordHash: string): string {
  return createHash("sha256").update(passwordHash).digest("hex").slice(0, 16);
}

/** Token de "olvidé mi contraseña", pensado únicamente para cuentas ADMIN (no super-admin). */
export async function createPasswordResetToken(adminId: string, passwordHash: string): Promise<string> {
  return new SignJWT({ adminId, fp: passwordFingerprint(passwordHash), purpose: "password_reset" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${PASSWORD_RESET_DURATION_SECONDS}s`)
    .sign(getSecretKey());
}

/**
 * Decodifica el token de reseteo (firma + purpose), sin validar todavía la huella contra
 * ningún passwordHash — para eso hace falta buscar primero al admin por el adminId que
 * devuelve acá. Separado en dos pasos porque no se puede buscar al admin sin decodificar,
 * ni validar la huella sin haberlo buscado.
 */
export async function decodePasswordResetToken(token: string): Promise<{ adminId: string; fp: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (
      payload.purpose !== "password_reset" ||
      typeof payload.adminId !== "string" ||
      typeof payload.fp !== "string"
    ) {
      return null;
    }
    return { adminId: payload.adminId, fp: payload.fp };
  } catch {
    return null;
  }
}

/**
 * Compara la huella del token contra el passwordHash actual del admin. Si no coincide, el
 * token ya fue usado (cambió la contraseña) o pertenece a otra cuenta.
 */
export function passwordResetFingerprintMatches(fp: string, currentPasswordHash: string): boolean {
  return fp === passwordFingerprint(currentPasswordHash);
}

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
