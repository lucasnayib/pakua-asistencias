import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  serverExternalPackages: ["@prisma/adapter-better-sqlite3", "better-sqlite3"],
  // Permite probar el modo desarrollo desde otros dispositivos de la misma LAN (ej. un
  // celular real) por la IP de red que imprime `next dev` — si no, el navegador bloquea
  // la conexión de HMR y la página queda sin interactividad.
  allowedDevOrigins: ["192.168.0.249"],
};

export default nextConfig;
