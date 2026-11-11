"use client";

import { Button } from "@/components/ui/Button";
import { AuthIllustration } from "./AuthIllustration";

export type AuthMode = "login" | "register";

type AuthCardProps = {
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
  loginForm: React.ReactNode;
  registerForm: React.ReactNode;
  priceArs: string | null;
};

/** Tarjeta de login/registro con panel ilustrado deslizante — misma idea que los diseños de
 * referencia (ej. UI kits "Sign in / Sign up"), adaptada a los colores siempre-oscuros de
 * Pakua: en vez de un panel claro + uno oscuro, acá los dos paneles son oscuros, y lo que
 * cambia de lado es el panel con fotos (AuthIllustration). La fila interna mide el doble del
 * ancho de la tarjeta (dos "páginas" completas, una por modo) y se desliza con un solo
 * transform — así, al cambiar de modo, el panel de fotos se mueve naturalmente de un lado al
 * otro sin tener que animar cada mitad por separado. */
export function AuthCard({ mode, onModeChange, loginForm, registerForm, priceArs }: AuthCardProps) {
  return (
    <div className="relative mx-auto w-full max-w-4xl overflow-hidden rounded-2xl border border-border bg-surface shadow-drawer">
      <div
        className="flex w-[200%] transition-transform duration-700 ease-in-out"
        style={{ transform: mode === "login" ? "translateX(0%)" : "translateX(-50%)" }}
      >
        {/* Página 1: formulario de login a la izquierda, ilustración invitando a registrarse a la derecha. */}
        <div className="grid min-h-[36rem] w-1/2 shrink-0 grid-cols-1 md:grid-cols-2">
          <div className="flex items-center justify-center p-6 md:p-10">{loginForm}</div>
          <div className="hidden md:block">
            <AuthIllustration>
              <p className="text-2xl font-semibold">¡Hola de nuevo!</p>
              <p className="max-w-xs text-sm text-white/80">
                Ingresá con tu usuario y contraseña para seguir gestionando tu escuela.
              </p>
              <p className="max-w-xs text-xs text-white/60">
                ¿Todavía no tenés una cuenta? Registrá tu escuela y empezá a usar Pakua.
              </p>
              <Button
                type="button"
                variant="secondary"
                onClick={() => onModeChange("register")}
                className="mt-2 border border-white/30 bg-transparent text-white hover:bg-white/10"
              >
                Registrar mi escuela
              </Button>
            </AuthIllustration>
          </div>
        </div>

        {/* Página 2: ilustración con el valor del plan a la izquierda, formulario de registro a la derecha. */}
        <div className="grid min-h-[36rem] w-1/2 shrink-0 grid-cols-1 md:grid-cols-2">
          <div className="hidden md:block">
            <AuthIllustration>
              <p className="text-2xl font-semibold">Sumá tu escuela a Pakua</p>
              {priceArs && (
                <p className="text-3xl font-semibold">
                  ${priceArs}
                  <span className="text-sm font-normal text-white/70">/mes</span>
                </p>
              )}
              <p className="max-w-xs text-xs text-white/70">
                Pago mensual automático. Asistencia digital, alumnos, horarios y orientadores,
                todo en un solo lugar.
              </p>
              <Button
                type="button"
                variant="secondary"
                onClick={() => onModeChange("login")}
                className="mt-2 border border-white/30 bg-transparent text-white hover:bg-white/10"
              >
                Ya tengo una cuenta
              </Button>
            </AuthIllustration>
          </div>
          <div className="flex items-center justify-center p-6 md:p-10">{registerForm}</div>
        </div>
      </div>
    </div>
  );
}
