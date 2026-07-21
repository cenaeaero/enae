// Formato ENAE-CHL-N1: Formato Cumplimiento de Ejercicios Prácticos
// (Programa de capacitación para la obtención de la credencial de Operador RPAS)
// Compartido por el formulario del instructor y la vista del alumno.

export type ItemDef = { key: string; label: string; detail?: string; hours: string };
export type Phase = { title: string; items: ItemDef[] };
export type ItemState = { done: boolean | null; hours: string; ops: string };

export const PHASES: Phase[] = [
  {
    title: "FASE PRE-SOLO (BÁSICO)",
    items: [
      { key: "talleres", label: "Talleres", hours: "01:00", detail: "Partes y piezas · Software-Telemetría · Armado-Baterías · Aplicaciones utilizadas para el vuelo · Mantenimiento preventivo · Vuelo seguro" },
      { key: "prevuelo", label: "Pre-Vuelo", hours: "01:00", detail: "Condiciones meteorológicas · Identificación de obstáculos · Condiciones humanas · Verificación visual 360° equipos · Armado de zona de despegue" },
      { key: "m1", label: "Maniobra 1 — Cuadrados sin cambio de rumbo", hours: "20 min" },
      { key: "m2", label: "Maniobra 2 — Cuadrados con cambio de rumbo", hours: "20 min" },
      { key: "m3", label: "Maniobra 3 — Cuadrado en trayectoria", hours: "20 min" },
    ],
  },
  {
    title: "FASE PROGRESO (INTERMEDIA)",
    items: [
      { key: "m4", label: "Maniobra 4 — Círculos sin cambio de rumbo", hours: "01:00" },
      { key: "m5", label: "Maniobra 5 — Ocho sin cambio de rumbo", hours: "01:00" },
      { key: "m6", label: "Maniobra 6 — Círculo en punto de interés", hours: "01:00" },
      { key: "m7", label: "Maniobra 7 — Círculo en trayectoria", hours: "01:00" },
      { key: "m8", label: "Maniobra 8 — Desplazamientos y aterrizajes en invertido", hours: "01:00" },
    ],
  },
  {
    title: "FASE FINAL (AVANZADA)",
    items: [
      { key: "m9", label: "Maniobra 9 — Vuelo por instrumentos FPV, punto de interés y vuelos inteligentes", hours: "01:00" },
      { key: "m10", label: "Maniobra 10 — Aterrizajes en emergencia y asistidos por observador", hours: "01:00" },
      { key: "m11", label: "Maniobra 11 — Aterrizaje en modo ATTI", hours: "01:00" },
    ],
  },
  {
    title: "EXAMEN FINAL",
    items: [
      { key: "chequeo_final", label: "Examen — Chequeo Final", hours: "01:00" },
    ],
  },
];

export const ALL_KEYS = PHASES.flatMap((p) => p.items.map((i) => i.key));

export function emptyItems(): Record<string, ItemState> {
  const m: Record<string, ItemState> = {};
  for (const ph of PHASES) for (const it of ph.items) m[it.key] = { done: null, hours: it.hours, ops: "" };
  return m;
}
