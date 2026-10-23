"use client";

import { CSSProperties } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { TourStep } from "@/lib/tour-steps";

const GAP = 14;
const TOOLTIP_WIDTH = 288;
const MARGIN = 16;

function computeStyle(rect: DOMRect, placement: TourStep["placement"]): CSSProperties {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const style: CSSProperties = {
    position: "fixed",
    width: TOOLTIP_WIDTH,
    zIndex: 61,
    // El scroll vive en el bloque de texto de adentro (ver TourTooltip), no acá — así los
    // botones de abajo quedan siempre fijos y visibles aunque el texto no entre.
    overflow: "hidden",
  };
  let left: number;

  if (placement === "bottom") {
    const top = Math.min(rect.bottom + GAP, vh - MARGIN);
    style.top = top;
    // maxHeight depende de DÓNDE quedó "top", no de toda la pantalla — si no, una tarjeta con
    // texto largo puede renderizar más alta que el espacio real que le queda hasta el borde de
    // abajo y salirse igual, aunque el número en sí sea "razonable".
    style.maxHeight = Math.max(vh - top - MARGIN, 80);
    left = rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2;
  } else if (placement === "top") {
    // Se ancla por "bottom", no por "top": el alto de la tarjeta depende del texto y no se
    // conoce de antemano. Anclada por arriba crecía hacia abajo y terminaba tapando el propio
    // botón que señala — anclada por abajo crece hacia arriba sin superponerse nunca.
    const bottom = Math.max(vh - rect.top + GAP, MARGIN);
    style.bottom = bottom;
    style.maxHeight = Math.max(vh - bottom - MARGIN, 80);
    left = rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2;
  } else if (placement === "left" || placement === "right") {
    // Centrado sobre el target, salvo que eso deje muy poco lugar hacia abajo (target pegado
    // al borde inferior, como el link de "Toma de asistencia") — ahí se prioriza reservar
    // DESIRED_MIN_HEIGHT en vez de quedar perfectamente centrado, para no depender tanto del
    // scroll interno en el caso común.
    const DESIRED_MIN_HEIGHT = 240;
    const centeredTop = rect.top + rect.height / 2 - 60;
    const maxAllowedTop = Math.max(vh - DESIRED_MIN_HEIGHT - MARGIN, MARGIN);
    const top = Math.min(Math.max(centeredTop, MARGIN), maxAllowedTop);
    style.top = top;
    style.maxHeight = Math.max(vh - top - MARGIN, 80);
    left = placement === "left" ? rect.left - TOOLTIP_WIDTH - GAP : rect.right + GAP;
  } else {
    left = 0; // inalcanzable: placement ya cubre los 4 casos arriba
  }

  // Clamp para no salirse de la pantalla por los costados.
  style.left = Math.min(Math.max(left, MARGIN), vw - TOOLTIP_WIDTH - MARGIN);
  return style;
}

export function TourTooltip({
  step,
  rect,
  stepNumber,
  totalSteps,
  canGoBack,
  isLast,
  onNext,
  onBack,
  onSkip,
}: {
  step: TourStep;
  rect: DOMRect;
  stepNumber: number;
  totalSteps: number;
  canGoBack: boolean;
  isLast: boolean;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}) {
  return (
    <Card style={computeStyle(rect, step.placement)} className="flex flex-col p-0 shadow-drawer">
      {/* El texto va en su propia caja con scroll propio; los botones quedan afuera, siempre
          visibles, para que nunca se vuelvan inalcanzables por un texto largo en un target
          cerca del borde de la pantalla (el maxHeight de la tarjeta, calculado en
          computeStyle, es lo que puede hacer que esto scrollee). */}
      <div className="scrollbar-themed min-h-0 flex-1 overflow-y-auto p-4 pb-2">
        <p className="text-xs font-medium text-muted-foreground">
          Paso {stepNumber} de {totalSteps}
        </p>
        <p className="mt-1 text-base font-semibold">{step.title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
      </div>
      <div className="flex shrink-0 items-center justify-between gap-2 p-4 pt-2">
        <button type="button" onClick={onSkip} className="text-xs text-muted-foreground hover:underline">
          Saltar guía
        </button>
        <div className="flex gap-2">
          {canGoBack && (
            <Button variant="secondary" size="sm" onClick={onBack}>
              Atrás
            </Button>
          )}
          <Button size="sm" onClick={onNext}>
            {isLast ? "Terminar" : "Siguiente"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
