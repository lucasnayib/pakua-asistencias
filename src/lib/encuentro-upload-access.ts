import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

/**
 * Acceso público para subir fotos/video del encuentro, separado por completo de cualquier
 * otro desbloqueo (school-access.ts, itinerancia-access.ts): cookie propia, JWT propio,
 * código propio (EVENT_UPLOAD_CODE, una variable de entorno — no hay fila en la base para
 * este secreto compartido, por eso no se hashea con bcrypt como las contraseñas de escuela).
 */
export const ENCUENTRO_UPLOAD_COOKIE = "pakua_encuentro_upload";
// 7 días, no 24hs como los otros desbloqueos: es un evento de varios días y no tiene sentido
// pedirle a alguien que re-escanee el QR cada rato mientras dura.
const UNLOCK_DURATION_SECONDS = 7 * 24 * 60 * 60;

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("Falta la variable de entorno SESSION_SECRET");
  }
  return new TextEncoder().encode(secret);
}

export type EncuentroUploadPayload = { purpose: "encuentro_upload" };

export async function createEncuentroUploadToken(): Promise<string> {
  return new SignJWT({ purpose: "encuentro_upload" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${UNLOCK_DURATION_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifyEncuentroUploadToken(token: string): Promise<EncuentroUploadPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (payload.purpose !== "encuentro_upload") return null;
    return { purpose: "encuentro_upload" };
  } catch {
    return null;
  }
}

export async function setEncuentroUploadCookie(): Promise<void> {
  const token = await createEncuentroUploadToken();
  const store = await cookies();
  store.set(ENCUENTRO_UPLOAD_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.COOKIE_SECURE === "true",
    path: "/",
    maxAge: UNLOCK_DURATION_SECONDS,
  });
}

/** Lee la cookie de subida server-side. Nunca lanza. */
export async function getEncuentroUploadAccess(): Promise<boolean> {
  const store = await cookies();
  const token = store.get(ENCUENTRO_UPLOAD_COOKIE)?.value;
  if (!token) return false;
  return (await verifyEncuentroUploadToken(token)) !== null;
}

/** Para usar al inicio de las rutas de API de subida. 401 si no hay cookie válida. */
export async function requireEncuentroUploadAccess(): Promise<true | NextResponse> {
  const hasAccess = await getEncuentroUploadAccess();
  if (!hasAccess) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  return true;
}
