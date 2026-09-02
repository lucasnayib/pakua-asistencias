import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { SESSION_COOKIE } from "@/lib/auth";

async function getSessionRole(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const secret = process.env.SESSION_SECRET;
  if (!secret) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    return typeof payload.role === "string" ? payload.role : null;
  } catch {
    return null;
  }
}

/**
 * Rutas de UI/API reservadas exclusivamente para SUPER_ADMIN: gestión de cuentas de admin,
 * y el backup de la base completa (contiene datos de TODAS las escuelas, no solo una).
 */
function isSuperAdminOnlyRoute(pathname: string): boolean {
  if (pathname.startsWith("/api/admins")) return true;
  if (pathname.startsWith("/admin/admins")) return true;
  if (pathname.startsWith("/api/backup")) return true;
  if (pathname.startsWith("/admin/backups")) return true;
  if (pathname.startsWith("/api/admin/two-factor")) return true;
  if (pathname.startsWith("/admin/dos-factores")) return true;
  return false;
}

/** Rutas de API que sólo pueden usarse con sesión de administrador activa. */
function isAdminOnlyApiRoute(pathname: string, method: string): boolean {
  if (pathname === "/api/students" && method !== "GET") return true;
  if (/^\/api\/students\/[^/]+$/.test(pathname) && (method === "PATCH" || method === "DELETE")) return true;
  if (pathname === "/api/students/import") return true;

  if (pathname === "/api/schedules" && method !== "GET") return true;
  if (/^\/api\/schedules\/[^/]+$/.test(pathname) && (method === "PATCH" || method === "DELETE")) return true;

  if (pathname === "/api/assignments") return true;

  if (pathname === "/api/orientadores" && method !== "GET") return true;
  if (/^\/api\/orientadores\/[^/]+$/.test(pathname) && (method === "PATCH" || method === "DELETE")) return true;
  if (/^\/api\/orientadores\/[^/]+\/export$/.test(pathname)) return true;

  if (pathname.startsWith("/api/stats")) return true;
  if (pathname.startsWith("/api/backup")) return true;
  if (pathname.startsWith("/api/admins")) return true;
  if (pathname.startsWith("/api/admin/two-factor")) return true;
  if (pathname.startsWith("/api/admin/location")) return true;
  if (pathname.startsWith("/api/admin/contact-email")) return true;
  if (pathname.startsWith("/api/admin/password")) return true;

  return false;
}

/**
 * Rutas de datos de escuela (alumnos, horarios, orientadores, asistencia, estadísticas,
 * exportaciones). El super-admin no tiene acceso a ninguna de estas, ni siquiera a las que
 * son públicas para usuarios sin sesión (ej: check-in, historial). Algunas de estas rutas no
 * están en isAdminOnlyApiRoute porque son de uso público sin sesión — pero si HAY una sesión
 * de super-admin, igual se bloquean. `/api/backup` NO va acá: es al revés, exclusiva del
 * super-admin (ver isSuperAdminOnlyRoute), porque descarga la base completa de TODAS las
 * escuelas, no la de un admin individual.
 */
const SCHOOL_DATA_API_PREFIXES = [
  "/api/students",
  "/api/schedules",
  "/api/orientadores",
  "/api/assignments",
  "/api/attendance",
  "/api/export",
  "/api/stats",
];

function isSchoolDataApiRoute(pathname: string): boolean {
  return SCHOOL_DATA_API_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublicAdminPage =
    pathname === "/admin/login" ||
    pathname === "/admin/olvide-password" ||
    pathname === "/admin/restablecer-password";

  if (pathname.startsWith("/admin") && !isPublicAdminPage) {
    const role = await getSessionRole(request);
    if (role === null) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (isSuperAdminOnlyRoute(pathname)) {
      if (role !== "SUPER_ADMIN") {
        return NextResponse.redirect(new URL("/admin", request.url));
      }
      return NextResponse.next();
    }
    // El super-admin no tiene escuela: cualquier otra pantalla del panel lo manda de vuelta
    // a la gestión de cuentas, que es lo único a lo que tiene acceso.
    if (role === "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/admin/admins", request.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    const needsSession = isAdminOnlyApiRoute(pathname, request.method);
    const isSchoolData = isSchoolDataApiRoute(pathname);

    if (needsSession || isSchoolData) {
      const role = await getSessionRole(request);

      if (needsSession && role === null) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
      }
      if (isSuperAdminOnlyRoute(pathname) && role !== "SUPER_ADMIN") {
        return NextResponse.json({ error: "No tenés permisos para esta acción" }, { status: 403 });
      }
      if (isSchoolData && role === "SUPER_ADMIN") {
        return NextResponse.json(
          { error: "El super-admin no tiene acceso a datos de escuela" },
          { status: 403 }
        );
      }
      return NextResponse.next();
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/:path*"],
};
