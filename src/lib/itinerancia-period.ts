const MONTH_NAMES_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

/**
 * "Itinerancias {Mes} {Año}" a partir del mes/año de `date` (día ignorado). Este archivo no
 * importa nada de servidor (a diferencia de @/lib/itinerancias, que arrastra Prisma) para poder
 * usarse también desde componentes cliente.
 */
export function formatItineranciaPeriodLabel(date: Date): string {
  return `Itinerancias ${MONTH_NAMES_ES[date.getMonth()]} ${date.getFullYear()}`;
}
