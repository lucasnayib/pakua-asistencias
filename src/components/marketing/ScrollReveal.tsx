"use client";

import { ReactNode, useEffect, useRef, useState } from "react";

type ScrollRevealProps = {
  children: ReactNode;
  className?: string;
};

// Cada sección de la landing arranca oculta y se desliza/desvanece hacia su lugar la primera
// vez que entra en el viewport al scrollear — una vez visible se queda así (no vuelve a
// ocultarse si se sube y se baja de nuevo, para no ser molesto). La transición/estado inicial
// vive en la clase .scroll-reveal de globals.css, que además la anula entera bajo
// prefers-reduced-motion.
export function ScrollReveal({ children, className = "" }: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={`scroll-reveal ${visible ? "is-visible" : ""} ${className}`}>
      {children}
    </div>
  );
}
