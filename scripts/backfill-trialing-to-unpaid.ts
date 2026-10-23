import "dotenv/config";
import { prisma } from "../src/lib/prisma";

// Uso único, pensado para correr a mano UNA sola vez, justo antes de prender
// SUBSCRIPTIONS_ENABLED=true en el entorno real: ninguna cuenta nueva nace más en TRIALING
// (el default pasó a UNPAID), pero las que ya estaban en período de prueba en la base real
// siguen con ese estado viejo hasta que este script las pase a UNPAID — decisión confirmada
// con el dueño del producto: se bloquean ya mismo, igual que una cuenta nueva, sin dejarles
// un tiempo de gracia extra.
async function main(): Promise<void> {
  const trialing = await prisma.admin.findMany({
    where: { role: "ADMIN", subscriptionStatus: "TRIALING" },
    select: { id: true, username: true, displayName: true },
  });

  if (trialing.length === 0) {
    console.log("No hay ninguna cuenta en TRIALING. Nada para hacer.");
    return;
  }

  for (const admin of trialing) {
    await prisma.admin.update({
      where: { id: admin.id },
      data: { subscriptionStatus: "UNPAID" },
    });
    console.log(`UNPAID: ${admin.displayName} (@${admin.username})`);
  }

  console.log(`\nListo. ${trialing.length} cuenta(s) pasada(s) de TRIALING a UNPAID.`);
}

main()
  .catch((error) => {
    console.error("backfill-trialing-to-unpaid falló:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
