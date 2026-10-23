"use client";

import { CSSProperties, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { TourStep } from "@/lib/tour-steps";
import { TOUR_STEPS } from "@/lib/tour-steps";
import { TourTooltip } from "./TourTooltip";

const LOCATE_RETRY_MS = 150;
const LOCATE_MAX_ATTEMPTS = 30; // ~4.5s: cubre una navegación de página + el mount del contenido
const SETTLE_MS = 700; // tiempo que se sigue recalculando el rect tras encontrar el target, para
// no quedarse con una medida tomada a mitad de una animación (ej. el sidebar desplegando un
// grupo colapsado con su transición de grid-rows, que tarda ~200ms en terminar)
const HIGHLIGHT_PADDING = 6;
const MOBILE_BREAKPOINT = 768; // mismo "md" que usa Tailwind acá — por debajo de esto el sidebar es un menú hamburguesa cerrado por defecto

export function TourSpotlight({
  step,
  onNext,
  onBack,
  onSkip,
  canGoBack,
  isLast,
}: {
  step: TourStep;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  canGoBack: boolean;
  isLast: boolean;
}) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [portalTarget, setPortalTarget] = useState<Element | null>(null);
  const targetElRef = useRef<HTMLElement | null>(null);

  // Si el target vive dentro de un grupo colapsable del sidebar, se le pide que se abra
  // antes de buscar el elemento (AdminSidebar escucha este evento). Y si el target vive en el
  // sidebar en general y estamos en una pantalla angosta (mobile), el sidebar completo es un
  // menú hamburguesa trasladado fuera de la pantalla por defecto — no alcanza con que esté
  // "visible" para CSS, hay que pedirle que se abra de verdad.
  useEffect(() => {
    if (step.openGroup) {
      window.dispatchEvent(new CustomEvent("pakua-tour-open-group", { detail: step.openGroup }));
    }
    if (step.inSidebar && window.innerWidth < MOBILE_BREAKPOINT) {
      window.dispatchEvent(new CustomEvent("pakua-tour-open-mobile-menu"));
    }
  }, [step.id, step.openGroup, step.inSidebar]);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    function resolvePortalTarget(): Element {
      if (!step.insideDialog) return document.body;
      // Un <dialog> abierto con showModal() vive en el "top layer" del navegador: cualquier
      // overlay nuestro montado afuera (con cualquier z-index) queda SIEMPRE por debajo. La
      // única forma de dibujar el contorno encima es montarlo adentro del propio <dialog>.
      return document.querySelector("dialog[open]") ?? document.body;
    }

    // El sidebar monta SIEMPRE las dos versiones (la contraída en íconos y la completa) y
    // oculta la que no corresponde con "visibility: hidden" en vez de sacarla del DOM — así
    // que puede haber más de un elemento con el mismo data-tour a la vez. document.querySelector
    // se queda con el primero en el DOM sin importar si es el visible, por eso acá se recorren
    // todos los matches y se elige el primero que realmente se ve (no visibility:hidden, no
    // display:none, y con tamaño real — descarta también un link todavía colapsado a alto 0
    // dentro de un grupo que recién está empezando a desplegarse).
    function findVisible(): Element | null {
      const candidates = document.querySelectorAll(step.target);
      for (const el of candidates) {
        const style = window.getComputedStyle(el);
        if (style.visibility === "hidden" || style.display === "none") continue;
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        return el;
      }
      return null;
    }

    function recalc() {
      const el = findVisible();
      if (el) {
        setRect(el.getBoundingClientRect());
        targetElRef.current = el as HTMLElement;
      }
    }

    // Una vez encontrado el target, el elemento puede seguir moviéndose un rato más (el
    // sidebar recién empezó a animar el despliegue del grupo colapsado) — se sigue
    // recalculando a cada frame durante SETTLE_MS en vez de quedarse con la primera medida,
    // que puede ser la de a mitad de esa transición (alto cero, posición vieja).
    function settle(deadline: number) {
      if (cancelled) return;
      recalc();
      if (performance.now() < deadline) {
        requestAnimationFrame(() => settle(deadline));
      }
    }

    function locate() {
      if (cancelled) return;
      const el = findVisible();
      if (el) {
        setRect(el.getBoundingClientRect());
        targetElRef.current = el as HTMLElement;
        setPortalTarget(resolvePortalTarget());
        settle(performance.now() + SETTLE_MS);
        return;
      }
      attempts += 1;
      if (attempts < LOCATE_MAX_ATTEMPTS) {
        timeoutId = setTimeout(locate, LOCATE_RETRY_MS);
      }
    }

    setRect(null);
    setPortalTarget(null);
    // Si el target vive en un grupo colapsable (transición ~200ms) o hay que abrir el menú
    // hamburguesa de mobile (transición 350ms, ver className de <aside> en AdminSidebar), se le
    // da tiempo a esa animación antes de la primera medición, para no arrancar a mitad de ella.
    // findVisible() también descarta rects de tamaño 0 así que esto es solo para no desperdiciar
    // los primeros intentos del retry — no es estrictamente necesario para que funcione.
    const needsMobileMenu = step.inSidebar && window.innerWidth < MOBILE_BREAKPOINT;
    const initialDelay = needsMobileMenu ? 380 : step.openGroup ? 260 : 0;
    timeoutId = setTimeout(locate, initialDelay);

    window.addEventListener("resize", recalc);
    window.addEventListener("scroll", recalc, true);

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
      window.removeEventListener("resize", recalc);
      window.removeEventListener("scroll", recalc, true);
    };
  }, [step.id, step.target, step.insideDialog, step.openGroup, step.inSidebar]);

  // Avanzar solo mueve el número de paso — si el paso siguiente apunta a algo que todavía no
  // existe en el DOM (una pestaña sin abrir, un modal sin abrir), hay que hacer el click real
  // antes, no alcanza con "mostrar la idea". Ver TourStep.autoClick en tour-steps.ts.
  function handleNext() {
    if (step.autoClick) targetElRef.current?.click();
    onNext();
  }

  if (!rect || !portalTarget) return null;

  const highlightStyle: CSSProperties = {
    position: "fixed",
    top: rect.top - HIGHLIGHT_PADDING,
    left: rect.left - HIGHLIGHT_PADDING,
    width: rect.width + HIGHLIGHT_PADDING * 2,
    height: rect.height + HIGHLIGHT_PADDING * 2,
    borderRadius: 12,
    boxShadow: step.insideDialog
      ? "0 0 0 3px var(--accent)"
      : "0 0 0 3px var(--accent), 0 0 0 9999px rgba(0,0,0,0.6)",
    pointerEvents: "none",
    zIndex: 60,
    transition: "top 150ms ease, left 150ms ease, width 150ms ease, height 150ms ease",
  };

  const stepNumber = TOUR_STEPS.findIndex((s) => s.id === step.id) + 1;

  return createPortal(
    <>
      <div style={highlightStyle} aria-hidden="true" />
      <TourTooltip
        step={step}
        rect={rect}
        stepNumber={stepNumber}
        totalSteps={TOUR_STEPS.length}
        canGoBack={canGoBack}
        isLast={isLast}
        onNext={handleNext}
        onBack={onBack}
        onSkip={onSkip}
      />
    </>,
    portalTarget
  );
}
