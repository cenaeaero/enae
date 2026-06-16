import type { Scenario } from './engine';

// Escenario 1 — BVLOS minero, sector Calama (entorno tipo faena)
// Tres vuelos simultáneos: inspección de línea (BVLOS largo), mapeo de rajo,
// y un vuelo que sufrirá pérdida C2 con deriva fuera de zona (ejercicio de conformance).

const Z_FAENA: [number, number][] = [
  [-68.97, -22.42],
  [-68.83, -22.42],
  [-68.83, -22.52],
  [-68.97, -22.52],
  [-68.97, -22.42],
];

const Z_LINEA: [number, number][] = [
  [-69.02, -22.36],
  [-68.78, -22.36],
  [-68.78, -22.40],
  [-69.02, -22.40],
  [-69.02, -22.36],
];

const Z_PROHIB: [number, number][] = [
  [-68.92, -22.30],
  [-68.86, -22.30],
  [-68.86, -22.34],
  [-68.92, -22.34],
  [-68.92, -22.30],
];

export const SCENARIO_BVLOS_CALAMA: Scenario = {
  id: 'bvlos-calama',
  name: 'BVLOS FAENA CALAMA — CONFORMANCE',
  center: [-68.89, -22.43],
  rangeNm: 12,
  briefing:
    'Tres operaciones UAS simultáneas en sector de faena. CND01 realiza mapeo del rajo dentro de la zona segregada SUR. ' +
    'CND02 inspecciona la línea de transmisión en la zona NORTE (BVLOS 12 NM). CND03 sufrirá pérdida de enlace C2 a los ' +
    '90 segundos y derivará fuera de su zona: el alumno debe detectar el desvío, declarar la contingencia y coordinar el RTH.',
  zones: [
    { id: 'ZS1', name: 'SEGREGADA SUR (FAENA)', ring: Z_FAENA, floor: 0, ceiling: 120, kind: 'SEGREGATED' },
    { id: 'ZS2', name: 'SEGREGADA NORTE (LÍNEA)', ring: Z_LINEA, floor: 0, ceiling: 90, kind: 'SEGREGATED' },
    { id: 'ZP1', name: 'PROHIBIDA SC P-12', ring: Z_PROHIB, floor: 0, ceiling: 999, kind: 'PROHIBITED' },
  ],
  flights: [
    {
      callsign: 'CND01',
      acType: 'M350',
      speedKt: 30,
      batteryMin: 40,
      startT: 5,
      authRef: 'UAS-26-0101',
      zoneId: 'ZS1',
      route: [
        { lat: -22.50, lng: -68.95, alt: 0 },
        { lat: -22.47, lng: -68.94, alt: 100 },
        { lat: -22.44, lng: -68.90, alt: 100 },
        { lat: -22.47, lng: -68.86, alt: 100 },
        { lat: -22.50, lng: -68.88, alt: 80 },
        { lat: -22.50, lng: -68.95, alt: 0 },
      ],
    },
    {
      callsign: 'CND02',
      acType: 'WINGTRA',
      speedKt: 45,
      batteryMin: 55,
      startT: 20,
      authRef: 'UAS-26-0102',
      zoneId: 'ZS2',
      route: [
        { lat: -22.38, lng: -69.00, alt: 0 },
        { lat: -22.38, lng: -68.90, alt: 80 },
        { lat: -22.38, lng: -68.80, alt: 80 },
        { lat: -22.385, lng: -68.90, alt: 80 },
        { lat: -22.38, lng: -69.00, alt: 0 },
      ],
    },
    {
      callsign: 'CND03',
      acType: 'M30T',
      speedKt: 35,
      batteryMin: 30,
      startT: 35,
      authRef: 'UAS-26-0103',
      zoneId: 'ZS1',
      route: [
        { lat: -22.45, lng: -68.96, alt: 0 },
        { lat: -22.43, lng: -68.92, alt: 60 },
        { lat: -22.43, lng: -68.85, alt: 60 },
        { lat: -22.45, lng: -68.96, alt: 0 },
      ],
    },
  ],
  events: [
    { t: 90, flight: 'CND03', type: 'C2LOSS', duration: 75 },
    { t: 240, flight: 'CND02', type: 'LOWBAT' },
  ],
};

// ───────────────────────── Escenario 2 — Conflicto de tránsito ─────────────────────────
const Z_VALLE: [number, number][] = [
  [-71.0, -34.55], [-70.9, -34.55], [-70.9, -34.61], [-71.0, -34.61], [-71.0, -34.55],
];
export const SCENARIO_CONFLICTO: Scenario = {
  id: 'conflicto-valle',
  name: 'CONFLICTO DE TRÁNSITO — VALLE CENTRAL',
  center: [-70.95, -34.58],
  rangeNm: 8,
  briefing:
    'Dos operaciones agrícolas convergen a la MISMA altura (100 m) sobre el cruce del valle. El alumno debe ' +
    'detectar el conflicto (alerta STCA + línea roja + alarma), medir el acercamiento con una RBL pista-pista ' +
    'y resolver ordenando RTH o espera a una de las aeronaves. AGRO3 opera en paralelo a otra altura (sin conflicto).',
  zones: [{ id: 'ZS1', name: 'SEGREGADA VALLE', ring: Z_VALLE, floor: 0, ceiling: 120, kind: 'SEGREGATED' }],
  flights: [
    {
      callsign: 'AGRO1', acType: 'M350', speedKt: 35, batteryMin: 35, startT: 0, authRef: 'UAS-26-0201', zoneId: 'ZS1',
      route: [
        { lat: -34.58, lng: -70.98, alt: 100 }, { lat: -34.58, lng: -70.965, alt: 100 },
        { lat: -34.58, lng: -70.935, alt: 100 }, { lat: -34.58, lng: -70.915, alt: 100 },
      ],
    },
    {
      callsign: 'AGRO2', acType: 'M300', speedKt: 35, batteryMin: 35, startT: 0, authRef: 'UAS-26-0202', zoneId: 'ZS1',
      route: [
        { lat: -34.605, lng: -70.95, alt: 100 }, { lat: -34.585, lng: -70.95, alt: 100 },
        { lat: -34.575, lng: -70.95, alt: 100 }, { lat: -34.555, lng: -70.95, alt: 100 },
      ],
    },
    {
      callsign: 'AGRO3', acType: 'WINGTRA', speedKt: 40, batteryMin: 50, startT: 10, authRef: 'UAS-26-0203', zoneId: 'ZS1',
      route: [
        { lat: -34.6, lng: -70.99, alt: 0 }, { lat: -34.6, lng: -70.92, alt: 60 },
        { lat: -34.565, lng: -70.92, alt: 60 }, { lat: -34.565, lng: -70.99, alt: 60 }, { lat: -34.6, lng: -70.99, alt: 0 },
      ],
    },
  ],
  events: [],
};

// ───────────────────────── Escenario 3 — Incursión / pérdida C2 ─────────────────────────
const Z_PUERTO_SEG: [number, number][] = [
  [-71.64, -33.01], [-71.59, -33.01], [-71.59, -33.05], [-71.64, -33.05], [-71.64, -33.01],
];
const Z_PUERTO_PROH: [number, number][] = [
  [-71.59, -33.01], [-71.55, -33.01], [-71.55, -33.05], [-71.59, -33.05], [-71.59, -33.01],
];
export const SCENARIO_INCURSION: Scenario = {
  id: 'incursion-c2',
  name: 'INCURSIÓN / PÉRDIDA C2 — PUERTO',
  center: [-71.59, -33.03],
  rangeNm: 6,
  briefing:
    'PORT1 inspecciona instalaciones dentro de la zona segregada del puerto. A los 70 s sufre PÉRDIDA DE ENLACE C2 ' +
    'y deriva fuera de la zona hacia la ZONA PROHIBIDA adyacente. El alumno debe detectar “FUERA DE ZONA”, declarar ' +
    'la contingencia y coordinar el RTH. PORT2 opera normal en paralelo.',
  zones: [
    { id: 'ZS1', name: 'SEGREGADA PUERTO', ring: Z_PUERTO_SEG, floor: 0, ceiling: 100, kind: 'SEGREGATED' },
    { id: 'ZP1', name: 'PROHIBIDA TERMINAL', ring: Z_PUERTO_PROH, floor: 0, ceiling: 999, kind: 'PROHIBITED' },
  ],
  flights: [
    {
      callsign: 'PORT1', acType: 'M30T', speedKt: 25, batteryMin: 30, startT: 5, authRef: 'UAS-26-0301', zoneId: 'ZS1',
      route: [
        { lat: -33.04, lng: -71.63, alt: 0 }, { lat: -33.02, lng: -71.61, alt: 80 },
        { lat: -33.03, lng: -71.595, alt: 80 }, { lat: -33.04, lng: -71.62, alt: 60 }, { lat: -33.04, lng: -71.63, alt: 0 },
      ],
    },
    {
      callsign: 'PORT2', acType: 'M350', speedKt: 30, batteryMin: 40, startT: 15, authRef: 'UAS-26-0302', zoneId: 'ZS1',
      route: [
        { lat: -33.045, lng: -71.635, alt: 0 }, { lat: -33.015, lng: -71.625, alt: 90 },
        { lat: -33.015, lng: -71.6, alt: 90 }, { lat: -33.045, lng: -71.61, alt: 0 },
      ],
    },
  ],
  events: [{ t: 70, flight: 'PORT1', type: 'C2LOSS', duration: 120 }],
};

// ───────────────────────── Escenario 4 — Emergencia / batería baja ─────────────────────────
const Z_FORESTAL: [number, number][] = [
  [-72.4, -37.45], [-72.3, -37.45], [-72.3, -37.53], [-72.4, -37.53], [-72.4, -37.45],
];
export const SCENARIO_EMERGENCIA: Scenario = {
  id: 'emergencia-bat',
  name: 'EMERGENCIA / BATERÍA BAJA — FORESTAL',
  center: [-72.35, -37.49],
  rangeNm: 8,
  briefing:
    'Operación de monitoreo forestal. EMERG1 reporta BATERÍA BAJA (LOWBAT) a los 90 s y declara EMERGENCIA a los ' +
    '150 s, requiriendo RTH prioritario. FOR2 continúa su tarea. El alumno debe priorizar la emergencia, ordenar el ' +
    'regreso y seguir gestionando el tráfico restante.',
  zones: [{ id: 'ZS1', name: 'SEGREGADA FORESTAL', ring: Z_FORESTAL, floor: 0, ceiling: 150, kind: 'SEGREGATED' }],
  flights: [
    {
      callsign: 'EMERG1', acType: 'M30T', speedKt: 30, batteryMin: 9, startT: 5, authRef: 'UAS-26-0401', zoneId: 'ZS1',
      route: [
        { lat: -37.52, lng: -72.38, alt: 0 }, { lat: -37.48, lng: -72.36, alt: 110 },
        { lat: -37.47, lng: -72.32, alt: 110 }, { lat: -37.5, lng: -72.33, alt: 90 }, { lat: -37.52, lng: -72.38, alt: 0 },
      ],
    },
    {
      callsign: 'FOR2', acType: 'WINGTRA', speedKt: 45, batteryMin: 55, startT: 20, authRef: 'UAS-26-0402', zoneId: 'ZS1',
      route: [
        { lat: -37.46, lng: -72.39, alt: 0 }, { lat: -37.46, lng: -72.31, alt: 120 },
        { lat: -37.49, lng: -72.31, alt: 120 }, { lat: -37.49, lng: -72.39, alt: 120 }, { lat: -37.46, lng: -72.39, alt: 0 },
      ],
    },
  ],
  events: [
    { t: 90, flight: 'EMERG1', type: 'LOWBAT' },
    { t: 150, flight: 'EMERG1', type: 'EMERG' },
  ],
};

// ───────────────────────── Escenario 5 — Saturación (varias ops) ─────────────────────────
const Z_SAT_N: [number, number][] = [
  [-70.78, -33.42], [-70.66, -33.42], [-70.66, -33.48], [-70.78, -33.48], [-70.78, -33.42],
];
const Z_SAT_S: [number, number][] = [
  [-70.74, -33.54], [-70.62, -33.54], [-70.62, -33.6], [-70.74, -33.6], [-70.74, -33.54],
];
const Z_SAT_R: [number, number][] = [
  [-70.7, -33.49], [-70.66, -33.49], [-70.66, -33.52], [-70.7, -33.52], [-70.7, -33.49],
];
export const SCENARIO_SATURACION: Scenario = {
  id: 'saturacion',
  name: 'SATURACIÓN — MÚLTIPLES OPERACIONES',
  center: [-70.7, -33.5],
  rangeNm: 14,
  briefing:
    'Cinco operaciones UAS simultáneas en sectores distintos (segregadas NORTE y SUR, con una zona RESTRINGIDA central). ' +
    'Los despegues están escalonados. El alumno debe mantener la imagen de tráfico, barrer la pantalla con etiquetas/vectores ' +
    'y atender el conflicto que se desarrolle. OPS4 sufre pérdida C2 a los 120 s.',
  zones: [
    { id: 'ZN', name: 'SEGREGADA NORTE', ring: Z_SAT_N, floor: 0, ceiling: 120, kind: 'SEGREGATED' },
    { id: 'ZS', name: 'SEGREGADA SUR', ring: Z_SAT_S, floor: 0, ceiling: 120, kind: 'SEGREGATED' },
    { id: 'ZR', name: 'RESTRINGIDA CENTRO', ring: Z_SAT_R, floor: 0, ceiling: 200, kind: 'RESTRICTED' },
  ],
  flights: [
    {
      callsign: 'OPS1', acType: 'M350', speedKt: 32, batteryMin: 40, startT: 0, authRef: 'UAS-26-0501', zoneId: 'ZN',
      route: [
        { lat: -33.47, lng: -70.76, alt: 0 }, { lat: -33.44, lng: -70.74, alt: 100 },
        { lat: -33.44, lng: -70.68, alt: 100 }, { lat: -33.47, lng: -70.68, alt: 0 },
      ],
    },
    {
      callsign: 'OPS2', acType: 'WINGTRA', speedKt: 45, batteryMin: 55, startT: 12, authRef: 'UAS-26-0502', zoneId: 'ZN',
      route: [
        { lat: -33.43, lng: -70.77, alt: 0 }, { lat: -33.43, lng: -70.67, alt: 80 },
        { lat: -33.475, lng: -70.67, alt: 80 }, { lat: -33.475, lng: -70.77, alt: 0 },
      ],
    },
    {
      callsign: 'OPS3', acType: 'M300', speedKt: 30, batteryMin: 38, startT: 25, authRef: 'UAS-26-0503', zoneId: 'ZS',
      route: [
        { lat: -33.59, lng: -70.72, alt: 0 }, { lat: -33.56, lng: -70.7, alt: 90 },
        { lat: -33.56, lng: -70.64, alt: 90 }, { lat: -33.59, lng: -70.64, alt: 0 },
      ],
    },
    {
      callsign: 'OPS4', acType: 'M30T', speedKt: 28, batteryMin: 30, startT: 40, authRef: 'UAS-26-0504', zoneId: 'ZS',
      route: [
        { lat: -33.55, lng: -70.73, alt: 0 }, { lat: -33.58, lng: -70.71, alt: 70 },
        { lat: -33.585, lng: -70.66, alt: 70 }, { lat: -33.55, lng: -70.66, alt: 0 },
      ],
    },
    {
      callsign: 'OPS5', acType: 'M350', speedKt: 38, batteryMin: 45, startT: 60, authRef: 'UAS-26-0505', zoneId: 'ZN',
      route: [
        { lat: -33.46, lng: -70.75, alt: 0 }, { lat: -33.45, lng: -70.72, alt: 110 },
        { lat: -33.46, lng: -70.69, alt: 110 }, { lat: -33.46, lng: -70.75, alt: 0 },
      ],
    },
  ],
  events: [{ t: 120, flight: 'OPS4', type: 'C2LOSS', duration: 90 }],
};

// ───────────────────────── Escenario DEMO — Presentación DGAC ─────────────────────────
// Secuencia guionada para una demostración formal: imagen de tráfico ordenada →
// conflicto de tránsito (STCA) → pérdida de enlace C2 con desvío de zona segregada →
// generación automática de mensaje AFTN de alerta (ALR/INCERFA). Sector Colina/Lampa,
// al norte de Santiago (región de la autoridad). ~4 min de duración.
const Z_DEMO_SEG: [number, number][] = [
  [-70.74, -33.18], [-70.62, -33.18], [-70.62, -33.27], [-70.74, -33.27], [-70.74, -33.18],
];
const Z_DEMO_PROH: [number, number][] = [
  [-70.62, -33.18], [-70.575, -33.18], [-70.575, -33.27], [-70.62, -33.27], [-70.62, -33.18],
];
export const SCENARIO_DEMO_DGAC: Scenario = {
  id: 'demo-dgac',
  name: 'DEMO DGAC — IMAGEN DE TRÁFICO USS/UTM',
  center: [-70.68, -33.225],
  rangeNm: 10,
  briefing:
    'Demostración guionada (≈4 min). DEMO1 realiza un mapeo ordenado, holgado dentro de la zona segregada (operación nominal, ' +
    'verde). A ~70 s DEMO2 (E-O) y DEMO3 (N-S) convergen a la misma altura sobre el centro: se dispara la alerta de conflicto ' +
    'STCA (línea roja + alarma) — medir con RBL y resolver; ambas continúan dentro de su zona. A ~110 s DEMO4 sufre PÉRDIDA ' +
    'DE ENLACE C2 y deriva fuera de su zona hacia la PROHIBIDA: el sistema la marca PISTA PERDIDA (LOST) y emite un AFTN ALERFA. ' +
    'Secuencia para mostrar imagen de tráfico nominal, conformance, safety nets (STCA) y gestión de contingencia.',
  zones: [
    { id: 'ZS1', name: 'SEGREGADA COLINA (UAS-26-9001)', ring: Z_DEMO_SEG, floor: 0, ceiling: 120, kind: 'SEGREGATED' },
    { id: 'ZP1', name: 'PROHIBIDA SCUA (NOTAM)', ring: Z_DEMO_PROH, floor: 0, ceiling: 999, kind: 'PROHIBITED' },
  ],
  flights: [
    {
      // nominal: mapeo en bucle, bien al interior de la zona (no roza el borde) → opera verde y arriba
      callsign: 'DEMO1', acType: 'M350', speedKt: 30, batteryMin: 60, startT: 5, authRef: 'UAS-26-9001', zoneId: 'ZS1',
      route: [
        { lat: -33.245, lng: -70.705, alt: 0 }, { lat: -33.205, lng: -70.705, alt: 100 },
        { lat: -33.205, lng: -70.675, alt: 100 }, { lat: -33.245, lng: -70.675, alt: 100 },
        { lat: -33.245, lng: -70.705, alt: 60 }, { lat: -33.245, lng: -70.705, alt: 0 },
      ],
    },
    {
      // conflicto E-O: cruza el centro a 100 m; permanece dentro de la zona y arriba
      callsign: 'DEMO2', acType: 'M300', speedKt: 35, batteryMin: 50, startT: 12, authRef: 'UAS-26-9002', zoneId: 'ZS1',
      route: [
        { lat: -33.225, lng: -70.705, alt: 100 }, { lat: -33.225, lng: -70.68, alt: 100 },
        { lat: -33.225, lng: -70.655, alt: 100 }, { lat: -33.225, lng: -70.705, alt: 0 },
      ],
    },
    {
      // conflicto N-S: cruza el centro a 100 m a la misma hora que DEMO2 → STCA; dentro de la zona y arriba
      callsign: 'DEMO3', acType: 'WINGTRA', speedKt: 35, batteryMin: 50, startT: 12, authRef: 'UAS-26-9003', zoneId: 'ZS1',
      route: [
        { lat: -33.252, lng: -70.68, alt: 100 }, { lat: -33.225, lng: -70.68, alt: 100 },
        { lat: -33.198, lng: -70.68, alt: 100 }, { lat: -33.252, lng: -70.68, alt: 0 },
      ],
    },
    {
      // contingencia: vuela cerca del borde este; al perder C2 la deriva la saca de la zona → PISTA PERDIDA
      callsign: 'DEMO4', acType: 'M30T', speedKt: 28, batteryMin: 40, startT: 30, authRef: 'UAS-26-9004', zoneId: 'ZS1',
      route: [
        { lat: -33.255, lng: -70.64, alt: 0 }, { lat: -33.225, lng: -70.635, alt: 70 },
        { lat: -33.20, lng: -70.63, alt: 70 }, { lat: -33.255, lng: -70.64, alt: 0 },
      ],
    },
    {
      // tráfico TRIPULADO (GA): tránsito E-O a 150 m, por encima del techo de la zona UAS (120 m).
      // Símbolo cuadrado, sin batería, sin conformance de zona. Demuestra coexistencia manned/UAS.
      callsign: 'CC-ABC', acType: 'C172', speedKt: 90, batteryMin: 999, startT: 40, authRef: 'GA VFR', zoneId: '', sector: 'GA', manned: true,
      route: [
        { lat: -33.212, lng: -70.78, alt: 150 }, { lat: -33.212, lng: -70.58, alt: 150 },
      ],
    },
  ],
  events: [
    { t: 110, flight: 'DEMO4', type: 'C2LOSS', duration: 120 },
  ],
};

export const SCENARIOS: Scenario[] = [
  SCENARIO_BVLOS_CALAMA,
  SCENARIO_CONFLICTO,
  SCENARIO_INCURSION,
  SCENARIO_EMERGENCIA,
  SCENARIO_SATURACION,
  SCENARIO_DEMO_DGAC,
];
