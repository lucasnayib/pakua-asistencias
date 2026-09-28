import type { NextConfig } from "next";

// CSP pragmática para una app Next.js sin nonces: permite el inline que Next inyecta para
// hidratar (bootstrap scripts/estilos) y deja abierto el origen del futuro script de GA4
// (bloque de analytics, condicionado al consentimiento de cookies).
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https://www.google-analytics.com",
  "frame-ancestors 'none'",
].join("; ");

// Headers siempre activos, en dev y en producción: no interfieren con nada del modo desarrollo.
const baseHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
];

// CSP y HSTS solo en producción: en desarrollo, Turbopack/React usan eval() para el hot
// reload y para reconstruir stack traces (la CSP lo bloquearía sin agregar 'unsafe-eval',
// lo que debilitaría la protección real), y HSTS lo cachea el navegador por meses — rompería
// las pruebas por HTTP en la LAN (allowedDevOrigins de abajo).
const productionOnlyHeaders = [
  { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  serverExternalPackages: ["@prisma/adapter-better-sqlite3", "better-sqlite3"],
  // Permite probar el modo desarrollo desde otros dispositivos de la misma LAN (ej. un
  // celular real) por la IP de red que imprime `next dev` — si no, el navegador bloquea
  // la conexión de HMR y la página queda sin interactividad.
  allowedDevOrigins: ["192.168.0.249"],
  devIndicators: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: process.env.NODE_ENV === "production" ? [...baseHeaders, ...productionOnlyHeaders] : baseHeaders,
      },
    ];
  },
};

export default nextConfig;
