import "dotenv/config";
import { prisma } from "../src/lib/prisma";

// Uso único, pensado para correr a mano una sola vez al desplegar la validación de mail
// duplicado (ver /api/schools/register y /api/admin/contact-email/request): esos endpoints
// ya normalizan a minúsculas en cada escritura nueva, pero no tocan las cuentas que ya
// tenían un contactEmail guardado con mayúsculas de antes de ese cambio. Sin este backfill,
// el chequeo de duplicados (comparación exacta, indexada) no detectaría un mail viejo en
// mayúsculas como igual a uno nuevo en minúsculas.
async function main(): Promise<void> {
  const admins = await prisma.admin.findMany({
    where: { contactEmail: { not: null } },
    select: { id: true, username: true, contactEmail: true },
  });

  const byNormalized = new Map<string, { id: string; username: string }[]>();
  for (const admin of admins) {
    const normalized = admin.contactEmail!.toLowerCase();
    const group = byNormalized.get(normalized) ?? [];
    group.push({ id: admin.id, username: admin.username });
    byNormalized.set(normalized, group);
  }

  let updated = 0;
  for (const admin of admins) {
    const normalized = admin.contactEmail!.toLowerCase();
    if (admin.contactEmail === normalized) continue;
    await prisma.admin.update({ where: { id: admin.id }, data: { contactEmail: normalized } });
    updated += 1;
    console.log(`normalizado: @${admin.username} — "${admin.contactEmail}" -> "${normalized}"`);
  }

  // Dos cuentas que ya compartían el mismo mail con distinta capitalización van a terminar
  // con el mismo valor exacto — no es un error del script, es una colisión real que ya
  // existía y recién ahora queda visible. No se resuelve sola: hay que revisarla a mano.
  const collisions = [...byNormalized.entries()].filter(([, group]) => group.length > 1);
  if (collisions.length > 0) {
    console.warn("\nATENCIÓN: hay cuentas distintas que comparten el mismo mail (revisar a mano):");
    for (const [normalized, group] of collisions) {
      console.warn(`  ${normalized}: ${group.map((a) => `@${a.username}`).join(", ")}`);
    }
  }

  console.log(`\nListo. ${updated} cuenta(s) normalizada(s) de ${admins.length} con mail cargado.`);
}

main()
  .catch((error) => {
    console.error("backfill-contact-email-lowercase falló:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
