"use client";

import { Button } from "@/components/ui/Button";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { useTour } from "./TourProvider";

export function TourReplayButton() {
  const { start } = useTour();

  return (
    <CollapsibleSection title="Guía interactiva" subtitle="Repetir el recorrido guiado">
      <p className="text-sm text-muted-foreground">
        Volvé a ver el recorrido que explica cómo registrar un alumno, crear un horario y
        anotar un gasto o ingreso en Aranceles.
      </p>
      <Button variant="secondary" className="mt-4" onClick={start}>
        Volver a ver el recorrido guiado
      </Button>
    </CollapsibleSection>
  );
}
