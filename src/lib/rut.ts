// ============================================================================
// Validación y normalización de identificadores de alumno (RUT / DNI / Pasaporte)
//
// Regla de negocio (acordada): si el dato parece un RUT chileno se valida su
// dígito verificador (módulo 11); si es un pasaporte/DNI extranjero se acepta
// como texto con un mínimo de caracteres. Así no se bloquea a extranjeros.
//
// `normalizeId` produce la CLAVE de unicidad (sin puntos, guiones ni espacios,
// en minúscula). Úsala siempre para comparar/buscar duplicados.
// ============================================================================

/** Clave canónica para comparar identificadores: sin separadores, en minúscula. */
export function normalizeId(raw: string | null | undefined): string {
  return (raw || "").replace(/[.\-\s]/g, "").toLowerCase();
}

/** ¿El valor tiene forma de RUT chileno? (7-8 dígitos de cuerpo + DV dígito o K) */
export function looksLikeChileanRut(raw: string | null | undefined): boolean {
  const n = normalizeId(raw);
  return /^[0-9]{7,8}[0-9k]$/.test(n);
}

/** Valida el dígito verificador de un RUT chileno (módulo 11). */
export function isValidChileanRut(raw: string | null | undefined): boolean {
  const n = normalizeId(raw);
  if (!/^[0-9]{7,8}[0-9k]$/.test(n)) return false;
  const body = n.slice(0, -1);
  const dv = n.slice(-1);
  let sum = 0;
  let mul = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i], 10) * mul;
    mul = mul === 7 ? 2 : mul + 1;
  }
  const res = 11 - (sum % 11);
  const expected = res === 11 ? "0" : res === 10 ? "k" : String(res);
  return dv === expected;
}

/** Formatea un RUT chileno para mostrar: 12.345.678-9 (devuelve el original si no es RUT). */
export function formatRut(raw: string | null | undefined): string {
  if (!looksLikeChileanRut(raw)) return (raw || "").trim();
  const n = normalizeId(raw);
  const body = n.slice(0, -1);
  const dv = n.slice(-1).toUpperCase();
  const withDots = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${withDots}-${dv}`;
}

/**
 * Variantes de un RUT tal como pudo guardarse históricamente, para buscar
 * duplicados con `.in("rut", variants)` sin depender de un formato exacto:
 *   "12345678k", "12345678-k", "12.345.678-K", "12.345.678-k"
 */
export function rutVariants(raw: string | null | undefined): string[] {
  const n = normalizeId(raw);
  if (!n) return [];
  const set = new Set<string>([n, raw?.trim() || n]);
  if (looksLikeChileanRut(n)) {
    const body = n.slice(0, -1);
    const dvLower = n.slice(-1);
    const dvUpper = dvLower.toUpperCase();
    const dots = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    set.add(`${body}-${dvLower}`);
    set.add(`${body}-${dvUpper}`);
    set.add(`${dots}-${dvLower}`);
    set.add(`${dots}-${dvUpper}`);
  }
  return Array.from(set).filter(Boolean);
}

export type IdValidation = {
  valid: boolean;
  normalized: string;
  error?: string;
};

/**
 * Valida un identificador obligatorio de alumno.
 * - Vacío → inválido (es obligatorio).
 * - Con forma de RUT chileno → se exige DV correcto.
 * - Si no → se acepta como pasaporte/DNI extranjero (mínimo 5 caracteres).
 */
export function validateId(raw: string | null | undefined): IdValidation {
  const trimmed = (raw || "").trim();
  const normalized = normalizeId(trimmed);
  if (!normalized) {
    return { valid: false, normalized: "", error: "El RUT / DNI / Pasaporte es obligatorio" };
  }
  if (looksLikeChileanRut(trimmed)) {
    if (!isValidChileanRut(trimmed)) {
      return { valid: false, normalized, error: "RUT chileno inválido (revisa el dígito verificador)" };
    }
    return { valid: true, normalized };
  }
  // Pasaporte / DNI extranjero
  if (normalized.length < 5) {
    return { valid: false, normalized, error: "Identificador demasiado corto (mínimo 5 caracteres)" };
  }
  return { valid: true, normalized };
}
