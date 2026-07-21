// Formato ENAE-CHL-N1: Formato Cumplimiento de Ejercicios Prácticos
// (Programa de capacitación para la obtención de la credencial de Operador RPAS)
// Compartido por el formulario del instructor y la vista del alumno.

// kind:
//   "check" → ítem de preparación (SÍ / NO / N-A), no lleva nota
//   "grade" → maniobra evaluada con nota parcial en porcentaje (promedia la nota práctica)
//   "exam"  → examen NIST, nota aparte (no entra al promedio de maniobras)
export type ItemKind = "check" | "grade" | "exam";
export type ItemDef = { key: string; label: string; detail?: string; kind: ItemKind };
export type Phase = { title: string; items: ItemDef[] };

// done: SÍ/NO/null (solo ítems "check")
// grade: nota parcial en porcentaje 0–100 (ítems "grade"/"exam")
// na: No Aplica → se excluye del promedio
export type ItemState = { done?: boolean | null; grade?: number | null; na?: boolean };

// Escala de notas en porcentaje; aprobación con 80% del promedio de ejercicios
export const GRADE_MIN = 0;
export const GRADE_MAX = 100;
export const GRADE_PASS = 80;

export const PHASES: Phase[] = [
  {
    title: "FASE PRE-SOLO (BÁSICO)",
    items: [
      { key: "talleres", kind: "check", label: "Talleres", detail: "Partes y piezas · Software-Telemetría · Armado-Baterías · Aplicaciones utilizadas para el vuelo · Mantenimiento preventivo · Vuelo seguro" },
      { key: "prevuelo", kind: "check", label: "Pre-Vuelo", detail: "Condiciones meteorológicas · Identificación de obstáculos · Condiciones humanas · Verificación visual 360° equipos · Armado de zona de despegue" },
      { key: "m1", kind: "grade", label: "Maniobra 1 — Cuadrados sin cambio de rumbo" },
      { key: "m2", kind: "grade", label: "Maniobra 2 — Cuadrados con cambio de rumbo" },
      { key: "m3", kind: "grade", label: "Maniobra 3 — Cuadrado en trayectoria" },
    ],
  },
  {
    title: "FASE PROGRESO (INTERMEDIA)",
    items: [
      { key: "m4", kind: "grade", label: "Maniobra 4 — Círculos sin cambio de rumbo" },
      { key: "m5", kind: "grade", label: "Maniobra 5 — Ocho sin cambio de rumbo" },
      { key: "m6", kind: "grade", label: "Maniobra 6 — Círculo en punto de interés" },
      { key: "m7", kind: "grade", label: "Maniobra 7 — Círculo en trayectoria" },
      { key: "m8", kind: "grade", label: "Maniobra 8 — Desplazamientos y aterrizajes en invertido" },
    ],
  },
  {
    title: "FASE FINAL (AVANZADA)",
    items: [
      { key: "m9", kind: "grade", label: "Maniobra 9 — Vuelo por instrumentos FPV, punto de interés y vuelos inteligentes" },
      { key: "m10", kind: "grade", label: "Maniobra 10 — Aterrizajes en emergencia y asistidos por observador" },
      { key: "m11", kind: "grade", label: "Maniobra 11 — Aterrizaje en modo ATTI" },
    ],
  },
  {
    title: "EXAMEN NIST (indicar en observaciones el nivel del ejercicio)",
    items: [
      { key: "chequeo_final", kind: "exam", label: "Examen NIST" },
    ],
  },
];

export const ALL_KEYS = PHASES.flatMap((p) => p.items.map((i) => i.key));
export const GRADE_KEYS = PHASES.flatMap((p) => p.items.filter((i) => i.kind === "grade").map((i) => i.key));
export const EXAM_KEY = "chequeo_final";

export function emptyItems(): Record<string, ItemState> {
  const m: Record<string, ItemState> = {};
  for (const ph of PHASES) for (const it of ph.items) {
    m[it.key] = it.kind === "check" ? { done: null, na: false } : { grade: null, na: false };
  }
  return m;
}

// Nota práctica = promedio (%) de las notas de las maniobras 1–11 con nota
// ingresada (los ítems "No Aplica" o sin nota se excluyen). Redondeado a entero.
// Aprobación con un promedio ≥ 80% (GRADE_PASS).
export function computePracticalScore(items: Record<string, ItemState>): number | null {
  const notas: number[] = [];
  for (const key of GRADE_KEYS) {
    const st = items[key];
    if (!st || st.na) continue;                 // No Aplica → fuera del promedio
    if (typeof st.grade === "number" && !isNaN(st.grade)) notas.push(st.grade);
  }
  if (notas.length === 0) return null;
  return Math.round(notas.reduce((a, b) => a + b, 0) / notas.length);
}

// Nota del examen final (aparte del promedio de maniobras).
export function getExamScore(items: Record<string, ItemState>): number | null {
  const st = items[EXAM_KEY];
  if (!st || st.na) return null;
  return typeof st.grade === "number" && !isNaN(st.grade) ? st.grade : null;
}
