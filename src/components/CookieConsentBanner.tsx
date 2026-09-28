"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { getCookieConsent, setCookieConsent } from "@/lib/cookie-consent";

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(getCookieConsent() === null);
  }, []);

  if (!visible) return null;

  function respond(consent: "accepted" | "rejected") {
    setCookieConsent(consent);
    setVisible(false);
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface p-4 shadow-drawer">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-3 sm:flex-row sm:justify-between">
        <p className="text-center text-sm text-muted-foreground sm:text-left">
          Usamos cookies técnicas necesarias para el funcionamiento del sitio y, si lo aceptás,
          cookies de análisis para entender el uso de la plataforma. Más info en la{" "}
          <a href="/privacidad" className="text-accent hover:underline">
            Política de privacidad
          </a>
          .
        </p>
        <div className="flex shrink-0 gap-2">
          <Button variant="secondary" size="sm" onClick={() => respond("rejected")}>
            Rechazar
          </Button>
          <Button size="sm" onClick={() => respond("accepted")}>
            Aceptar
          </Button>
        </div>
      </div>
    </div>
  );
}
