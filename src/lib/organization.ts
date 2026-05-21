/**
 * Normaliza el nombre de una empresa/organización para guardarlo en BD.
 * - Trim de espacios al inicio/fin y colapso de espacios internos múltiples
 * - Convierte a MAYÚSCULAS, así "Elecnor", "elecnor" y "ELECNOR" quedan iguales
 * - Devuelve null para entradas vacías
 */
export function normalizeOrganization(
  value: string | null | undefined
): string | null {
  if (value == null) return null;
  const cleaned = String(value).trim().replace(/\s+/g, " ");
  if (cleaned === "") return null;
  return cleaned.toUpperCase();
}
