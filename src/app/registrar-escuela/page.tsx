import type { Metadata } from "next";
import { RegistrarEscuelaForm } from "@/components/RegistrarEscuelaForm";

export const metadata: Metadata = {
  title: "Registrá tu escuela",
  description: "Registrá tu escuela de artes marciales en Pakua Asistencias y empezá a controlar la asistencia de tus alumnos gratis.",
};

export default function RegistrarEscuelaPage() {
  return (
    <RegistrarEscuelaForm
      priceArs={process.env.SUBSCRIPTIONS_ENABLED === "true" ? (process.env.SUBSCRIPTION_PRICE_ARS ?? null) : null}
      trialDays={process.env.SUBSCRIPTION_TRIAL_DAYS ?? "7"}
    />
  );
}
