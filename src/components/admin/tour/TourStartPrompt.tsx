"use client";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export function TourStartPrompt({ onAccept, onDecline }: { onAccept: () => void; onDecline: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-sm p-6 text-center shadow-drawer">
        <p className="text-lg font-semibold">¿Querés un recorrido guiado?</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Te mostramos, paso a paso, cómo registrar un alumno, crear un horario y anotar un
          gasto o ingreso en Aranceles. Dura un par de minutos y lo podés volver a hacer
          después desde &quot;Mi cuenta&quot;.
        </p>
        <div className="mt-5 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onDecline}>
            No, gracias
          </Button>
          <Button className="flex-1" onClick={onAccept}>
            Sí, mostrame
          </Button>
        </div>
      </Card>
    </div>
  );
}
