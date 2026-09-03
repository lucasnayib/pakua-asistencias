import { RegistrarEscuelaForm } from "@/components/RegistrarEscuelaForm";

export default function RegistrarEscuelaPage() {
  return (
    <RegistrarEscuelaForm
      priceArs={process.env.SUBSCRIPTIONS_ENABLED === "true" ? (process.env.SUBSCRIPTION_PRICE_ARS ?? null) : null}
      trialDays={process.env.SUBSCRIPTION_TRIAL_DAYS ?? "7"}
    />
  );
}
