// Neutraliza la "inyección de fórmulas" en Excel/CSV (ver OWASP CSV Injection): si una celda de
// texto arranca con =, +, -, @, tab o retorno de carro, algunas versiones de Excel/Sheets la
// interpretan como fórmula al abrir el archivo en vez de mostrarla como texto. Los nombres de
// alumnos/orientadores y otros campos libres que terminan en una celda de export pasan por acá
// antes de escribirse. Anteponer un apóstrofo fuerza a que se trate siempre como texto literal.
const DANGEROUS_PREFIXES = ["=", "+", "-", "@", "\t", "\r"];

export function sanitizeExportCell(value: string): string {
  if (value.length > 0 && DANGEROUS_PREFIXES.includes(value[0])) {
    return `'${value}`;
  }
  return value;
}
