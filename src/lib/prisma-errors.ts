/**
 * Extrae los nombres de columna involucrados en un error P2002 (unique constraint) de Prisma.
 *
 * El adapter `@prisma/adapter-better-sqlite3` no rellena `error.meta.target` como el motor
 * clásico: en su lugar anida el detalle en `error.meta.driverAdapterError.cause.constraint.fields`.
 * Esta función revisa ambas formas para no depender de cuál esté disponible.
 */
export function p2002Fields(error: unknown): string[] {
  if (!error || typeof error !== "object" || !("meta" in error)) return [];
  const meta = (error as { meta?: unknown }).meta;
  if (!meta || typeof meta !== "object") return [];

  const target = (meta as { target?: string[] | string }).target;
  if (Array.isArray(target)) return target;
  if (typeof target === "string") return [target];

  const driverFields = (
    meta as {
      driverAdapterError?: { cause?: { constraint?: { fields?: string[] } } };
    }
  ).driverAdapterError?.cause?.constraint?.fields;
  if (Array.isArray(driverFields)) return driverFields;

  return [];
}

export function isP2002(error: unknown): boolean {
  return Boolean(
    error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "P2002"
  );
}
