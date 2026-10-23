"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TOUR_STEPS } from "@/lib/tour-steps";
import { TourStartPrompt } from "./TourStartPrompt";
import { TourSpotlight } from "./TourSpotlight";

const STORAGE_KEY = "pakua_tour_state";

type StoredState = { active: boolean; stepIndex: number };

function readStored(): StoredState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredState;
    if (typeof parsed.active !== "boolean" || typeof parsed.stepIndex !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStored(state: StoredState | null) {
  if (typeof window === "undefined") return;
  try {
    if (state === null) sessionStorage.removeItem(STORAGE_KEY);
    else sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Almacenamiento no disponible (modo privado, etc.) — el tour simplemente no persiste
    // entre navegaciones en ese caso, no es un error que frene nada.
  }
}

async function markOnboardingDone() {
  try {
    await fetch("/api/admin/onboarding", { method: "PATCH" });
  } catch {
    // Si falla la llamada, en el peor caso se le vuelve a ofrecer el tour la próxima vez —
    // no bloquea nada de lo que el usuario está haciendo ahora.
  }
}

type TourContextValue = {
  active: boolean;
  stepIndex: number;
  totalSteps: number;
  start: () => void;
  next: () => void;
  back: () => void;
  skip: () => void;
};

const TourContext = createContext<TourContextValue | null>(null);

export function useTour(): TourContextValue {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error("useTour debe usarse dentro de TourProvider");
  return ctx;
}

export function TourProvider({
  initialShowPrompt,
  children,
}: {
  initialShowPrompt: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [showPrompt, setShowPrompt] = useState(false);

  // Al montar: si había un tour en curso (sessionStorage sobrevive a la navegación entre
  // páginas), se retoma desde ahí sin volver a preguntar. Si no, y el layout dice que
  // corresponde ofrecerlo (primera vez, cuenta ya activa), se muestra el cartel de sí/no.
  useEffect(() => {
    const stored = readStored();
    // Si se guardó un tour en curso de una versión anterior con más/menos pasos, el índice
    // puede quedar fuera de rango — se descarta en vez de intentar retomarlo, para no romper
    // el panel con un paso que ya no existe.
    if (stored?.active && stored.stepIndex >= 0 && stored.stepIndex < TOUR_STEPS.length) {
      setActive(true);
      setStepIndex(stored.stepIndex);
      return;
    }
    if (stored) writeStored(null);
    if (initialShowPrompt) setShowPrompt(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goToStep = useCallback(
    (index: number) => {
      setStepIndex(index);
      writeStored({ active: true, stepIndex: index });
      const step = TOUR_STEPS[index];
      if (step && typeof window !== "undefined" && window.location.pathname !== step.route) {
        router.push(step.route);
      }
    },
    [router]
  );

  const start = useCallback(() => {
    setShowPrompt(false);
    setActive(true);
    goToStep(0);
  }, [goToStep]);

  const finishInternal = useCallback(() => {
    setActive(false);
    writeStored(null);
    void markOnboardingDone();
    // El último paso puede terminar sin navegar a otra página (route igual a la del paso
    // anterior) — en mobile eso dejaría el menú hamburguesa abierto, tapando el contenido.
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("pakua-tour-close-mobile-menu"));
    }
  }, []);

  const next = useCallback(() => {
    if (stepIndex >= TOUR_STEPS.length - 1) {
      finishInternal();
      return;
    }
    goToStep(stepIndex + 1);
  }, [stepIndex, goToStep, finishInternal]);

  const back = useCallback(() => {
    if (stepIndex <= 0) return;
    goToStep(stepIndex - 1);
  }, [stepIndex, goToStep]);

  const skip = useCallback(() => {
    finishInternal();
  }, [finishInternal]);

  function declinePrompt() {
    setShowPrompt(false);
    void markOnboardingDone();
  }

  const value = useMemo<TourContextValue>(
    () => ({ active, stepIndex, totalSteps: TOUR_STEPS.length, start, next, back, skip }),
    [active, stepIndex, start, next, back, skip]
  );

  return (
    <TourContext.Provider value={value}>
      {children}
      {showPrompt && <TourStartPrompt onAccept={start} onDecline={declinePrompt} />}
      {active && TOUR_STEPS[stepIndex] && (
        <TourSpotlight
          step={TOUR_STEPS[stepIndex]}
          onNext={next}
          onBack={back}
          onSkip={skip}
          canGoBack={stepIndex > 0}
          isLast={stepIndex === TOUR_STEPS.length - 1}
        />
      )}
    </TourContext.Provider>
  );
}
