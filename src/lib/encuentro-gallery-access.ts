import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { readEncuentroConfig } from "@/lib/encuentro-config";

/**
 * Acceso público para VER la galería de aprobados, distinto del acceso para subir
 * (encuentro-upload-access.ts). El token no es una variable de entorno: lo genera el
 * super-admin desde el panel y vive en storage/evento/config.json, para poder
 * regenerarlo/activarlo/desactivarlo sin reiniciar el servidor.
 */
export const ENCUENTRO_GALLERY_COOKIE = "pakua_encuentro_gallery";
const UNLOCK_DURATION_SECONDS = 7 * 24 * 60 * 60;

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("Falta la variable de entorno SESSION_SECRET");
  }
  return new TextEncoder().encode(secret);
}

export type EncuentroGalleryPayload = { purpose: "encuentro_gallery"; token: string };

export async function createEncuentroGalleryToken(token: string): Promise<string> {
  return new SignJWT({ purpose: "encuentro_gallery", token })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${UNLOCK_DURATION_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifyEncuentroGalleryToken(jwt: string): Promise<EncuentroGalleryPayload | null> {
  try {
    const { payload } = await jwtVerify(jwt, getSecretKey());
    if (payload.purpose !== "encuentro_gallery" || typeof payload.token !== "string") return null;
    return { purpose: "encuentro_gallery", token: payload.token };
  } catch {
    return null;
  }
}

export async function setEncuentroGalleryCookie(token: string): Promise<void> {
  const jwt = await createEncuentroGalleryToken(token);
  const store = await cookies();
  store.set(ENCUENTRO_GALLERY_COOKIE, jwt, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.COOKIE_SECURE === "true",
    path: "/",
    maxAge: UNLOCK_DURATION_SECONDS,
  });
}

/**
 * Revalida en cada llamada contra storage/evento/config.json (no solo contra el JWT
 * firmado): regenerar o desactivar el token invalida al instante todas las cookies ya
 * repartidas, aunque el JWT en sí todavía no haya vencido — mismo criterio de "revalidar
 * siempre" que school-access.ts usa para suscripción suspendida. También deja pasar al
 * SUPER_ADMIN sin token, para que pueda previsualizar la galería desde el panel. Para usar
 * en Server Components (no puede devolver un NextResponse); los Route Handlers usan
 * requireEncuentroGalleryAccess() en su lugar.
 */
export async function getEncuentroGalleryAccess(): Promise<boolean> {
  const session = await getSession();
  if (session?.role === "SUPER_ADMIN") return true;

  const store = await cookies();
  const jwt = store.get(ENCUENTRO_GALLERY_COOKIE)?.value;
  if (!jwt) return false;

  const payload = await verifyEncuentroGalleryToken(jwt);
  if (!payload) return false;

  const config = await readEncuentroConfig();
  return config.galleryEnabled && !!config.galleryToken && payload.token === config.galleryToken;
}

/** Para usar al inicio de las rutas públicas de galería. */
export async function requireEncuentroGalleryAccess(): Promise<true | NextResponse> {
  const hasAccess = await getEncuentroGalleryAccess();
  if (!hasAccess) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  return true;
}
