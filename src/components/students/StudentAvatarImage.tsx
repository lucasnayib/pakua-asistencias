"use client";

import { useState } from "react";

type StudentAvatarImageProps = {
  photoUrl: string;
  firstName: string;
  lastName: string;
  textClassName?: string;
};

// Nada de next/image acá a propósito: algunas fotos subidas por el admin fallan al pasar por el
// optimizador server-side de Next (formatos/archivos que su decodificador no procesa bien) y
// terminan mostrando el ícono roto nativo, aunque el archivo esté perfectamente servible tal
// cual — mismo criterio que ya usa StudentFormDialog para su vista previa. onError además cubre
// el caso de una URL que directamente ya no sirve (archivo borrado, foto migrada de otra
// escuela), cayendo a las iniciales igual que cuando no hay foto cargada.
export function StudentAvatarImage({ photoUrl, firstName, lastName, textClassName = "text-xs text-muted-foreground" }: StudentAvatarImageProps) {
  const [broken, setBroken] = useState(false);

  if (broken) {
    return (
      <span className={`flex h-full w-full items-center justify-center bg-surface-2 ${textClassName}`}>
        {firstName[0]}
        {lastName[0]}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={photoUrl}
      alt={`${firstName} ${lastName}`}
      className="h-full w-full object-cover"
      onError={() => setBroken(true)}
    />
  );
}
