"use client";

const STORAGE_KEY = "cookie-consent";

/** Cualquier script que dependa del consentimiento (ej. GA4) puede escuchar este evento
 * para reaccionar sin recargar la página cuando el usuario elige en el banner. */
export const COOKIE_CONSENT_EVENT = "cookie-consent-change";

export type CookieConsent = "accepted" | "rejected";

export function getCookieConsent(): CookieConsent | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "accepted" || value === "rejected" ? value : null;
  } catch {
    return null;
  }
}

export function setCookieConsent(consent: CookieConsent): void {
  try {
    localStorage.setItem(STORAGE_KEY, consent);
  } catch {
    // Si el navegador bloquea localStorage (modo privado estricto), la elección no persiste
    // entre visitas y el banner vuelve a aparecer — no rompe el resto del sitio.
  }
  window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_EVENT, { detail: consent }));
}
