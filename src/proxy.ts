import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { SESSION_COOKIE } from "@/lib/auth";

async function hasValidSession(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return false;
  const secret = process.env.SESSION_SECRET;
  if (!secret) return false;
  try {
    await jwtVerify(token, new TextEncoder().encode(secret));
    return true;
  } catch {
    return false;
  }
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

  return false;
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    if (!(await hasValidSession(request))) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/") && isAdminOnlyApiRoute(pathname, request.method)) {
    if (!(await hasValidSession(request))) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/:path*"],
};
