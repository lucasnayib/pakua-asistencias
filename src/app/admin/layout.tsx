import type { Metadata } from "next";

// Cubre TODO /admin/** (login, recuperar contraseña, y el panel protegido anidado en
// admin/(protected)/layout.tsx): es el panel privado de cada escuela, no debe indexarse.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
