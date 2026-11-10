"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

// Solo fotos verticales/cuadradas acá: el panel es angosto y alto, las horizontales
// (hero-sparring, team-banner — se siguen usando en la home) quedan recortadas feo con
// object-cover.
const PHOTOS = [
  "/images/action-kick.png",
  "/images/dojo-trio.jpg",
  "/images/dojo-fan.jpg",
  "/images/dojo-duo-espada.jpg",
  "/images/dojo-patada.jpg",
];
const ROTATE_MS = 4500;

/** Panel ilustrado del login/registro: rota entre fotos reales de la escuela con un crossfade
 * suave, oscurecidas para que el texto de arriba se lea bien. */
export function AuthIllustration({ children }: { children: React.ReactNode }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % PHOTOS.length);
    }, ROTATE_MS);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden bg-background">
      {PHOTOS.map((src, i) => (
        <Image
          key={src}
          src={src}
          alt=""
          fill
          sizes="50vw"
          priority={i === 0}
          className={`object-cover transition-opacity duration-1000 ease-in-out ${
            i === index ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}
      {/* Oscurece la foto para que el texto blanco de arriba se lea en cualquiera de las tres. */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/55 to-black/40" />
      <div className="relative flex h-full flex-col items-center justify-center gap-4 p-8 text-center text-white">
        {children}
      </div>
    </div>
  );
}
