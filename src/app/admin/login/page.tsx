import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AuthPageClient } from "@/components/auth/AuthPageClient";

export default async function AdminLoginPage() {
  const session = await getSession();
  if (session) {
    redirect(session.role === "SUPER_ADMIN" ? "/admin/admins" : "/admin");
  }

  const priceArs =
    process.env.SUBSCRIPTIONS_ENABLED === "true" ? (process.env.SUBSCRIPTION_PRICE_ARS ?? null) : null;

  return (
    <Suspense>
      <AuthPageClient priceArs={priceArs} />
    </Suspense>
  );
}
