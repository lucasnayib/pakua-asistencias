/**
 * Convierte un texto libre en un identificador apto para URL/nombre de archivo:
 * minúsculas, sin acentos, separado por guiones, sin caracteres repetidos al borde.
 *
 * Usado tanto para el `slug` público de cada escuela (`Admin.slug`) como para
 * nombres de archivo de exportaciones.
 */
export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

/**
 * Genera un slug único dentro de una lista de slugs ya existentes, agregando
 * un sufijo numérico (-2, -3, …) en caso de colisión.
 */
export function uniqueSlug(base: string, existing: Iterable<string>): string {
  const taken = new Set(existing);
  const root = base || "escuela";
  if (!taken.has(root)) return root;
  let n = 2;
  while (taken.has(`${root}-${n}`)) n++;
  return `${root}-${n}`;
}
