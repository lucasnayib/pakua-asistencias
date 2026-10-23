"use client";

import { ReactNode, useState } from "react";
import { useRouter } from "next/navigation";

// Cierra la sesión de admin antes de ir a la página pública de asistencia, para que nadie
// pueda volver al panel con el botón "atrás" del navegador en un dispositivo compartido.
export function GoToAttendanceLink({
  href,
  className,
  title,
  children,
  "data-tour": dataTour,
}: {
  href: string;
  className?: string;
  title?: string;
  children: ReactNode;
  "data-tour"?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push(href);
    router.refresh();
  }

  return (
    <a href={href} onClick={handleClick} className={className} title={title} data-tour={dataTour}>
      {children}
    </a>
  );
}
