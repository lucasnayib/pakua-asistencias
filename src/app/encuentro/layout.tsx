import type { Metadata } from "next";

// Cubre /encuentro y /encuentro/galeria por herencia (ninguna de las dos se indexa) — mismo
// patrón de src/app/admin/layout.tsx.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function EncuentroLayout({ children }: { children: React.ReactNode }) {
  return children;
}
