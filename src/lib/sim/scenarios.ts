import type { Scenario, Waypoint } from './engine';

// ═════════════════════════════════════════════════════════════════════════════
// CONDOR SIM — PROGRAMA DE 10 EJERCICIOS POR NIVELES (evaluación por competencias)
// N1 imagen de tráfico y comunicación · N2 autorización y conformidad ·
// N3 contingencias · N4 tráfico tripulado y NOTAM · N5 saturación y certificación.
// Para pasar de nivel hay que aprobar el ejercicio anterior.
// Geometría construida en km desde el centro de cada ejercicio (lugares reales de Chile).
// Las designaciones de zonas son de entrenamiento (no reemplazan la AIP/NOTAM vigentes).
// ═════════════════════════════════════════════════════════════════════════════

type C = [number, number]; // [lng, lat]
const r5 = (x: number) => Math.round(x * 1e5) / 1e5;
const kLng = (c: C) => 1 / (111.32 * Math.cos((c[1] * Math.PI) / 180));
const P = (c: C, e: number, n: number, alt: number, hold?: number): Waypoint => ({
  lat: r5(c[1] + n / 111.32), lng: r5(c[0] + e * kLng(c)), alt, ...(hold ? { hold } : {}),
});
const BOX = (c: C, e1: number, n1: number, e2: number, n2: number): [number, number][] => {
  const a = P(c, e1, n1, 0), b = P(c, e2, n2, 0);
  return [[a.lng, a.lat], [b.lng, a.lat], [b.lng, b.lat], [a.lng, b.lat], [a.lng, a.lat]];
};
const CIRC = (c: C, e: number, n: number, rKm: number, k = 24): [number, number][] => {
  const out: [number, number][] = [];
  for (let i = 0; i <= k; i++) {
    const a = (i / k) * 2 * Math.PI;
    const p = P(c, e + rKm * Math.sin(a), n + rKm * Math.cos(a), 0);
    out.push([p.lng, p.lat]);
  }
  return out;
};

const CR_LOS = 'Pérdida de separación bajo mínimo (UAS–UAS 250 m / 30 m · UAS–tripulado 500 m / 60 m)';
const CR_ZONE = 'Entrada a zona prohibida o NOTAM activo';
const CR_AUTH = 'Autorizar un volumen que invade una restricción';
const CR_CONT = 'No declarar contingencia ante pérdida C2 / emergencia';
const CR_TKOF = 'Despegar sin autorización del Operador UTM';

// ───────────────────────── N1 · E1 — IMAGEN DE TRÁFICO NOMINAL (Lampa) ─────────────────────────
const C1: C = [-70.875, -33.285];
const E1: Scenario = {
  id: 'n1-e1-imagen-trafico',
  order: 1, level: 1,
  title: 'IMAGEN DE TRÁFICO NOMINAL',
  name: 'N1·E1 IMAGEN DE TRÁFICO NOMINAL — LAMPA',
  center: C1, rangeNm: 6, durationS: 420, ackFpl: true,
  briefing:
    'Dos operaciones autorizadas al norte de Santiago (Lampa). TOP11 (Piloto UAS, VLOS) realiza levantamiento topográfico ' +
    'en su volumen segregado; INS12 (Piloto RPAS, BVLOS) inspecciona el corredor de la línea eléctrica. El Operador UTM debe ' +
    'construir la imagen de tráfico: identificar cada vuelo, su autorización y volumen, y ACUSAR los FPL/DEP en la ventana AFTN. ' +
    'A los ~2 min llega una coordinación del piloto de TOP11 que se resuelve con una instrucción de altura.',
  objectives: {
    utm: ['Identificar ambos vuelos, su autorización (AUT) y su volumen', 'Acusar los mensajes FPL/DEP de cada operación (AFTN ▸ ACK)', 'Atender la coordinación de TOP11 con la instrucción de altura correcta (80 m)'],
    uas: ['Tomar el mando de TOP11 y volar el plan dentro del volumen', 'Colacionar la instrucción de altura y cumplirla', 'Respetar el techo de 120 m'],
    rpas: ['Tomar el mando de INS12 y ejecutar la misión programada', 'Mantener la conformidad del corredor', 'Colacionar cualquier instrucción UTM'],
  },
  criticals: [CR_LOS, CR_ZONE],
  zones: [
    { id: 'V11', name: 'VOL TOP11 (AUT-UAS-26-0111)', ring: BOX(C1, -2.2, -1.4, -0.1, 1.4), floor: 0, ceiling: 120, kind: 'SEGREGATED' },
    { id: 'V12', name: 'VOL INS12 CORREDOR LÍNEA 110 KV (AUT-UAS-26-0112)', ring: BOX(C1, 0.4, -0.7, 6.8, 0.7), floor: 0, ceiling: 120, kind: 'SEGREGATED' },
    { id: 'R11', name: 'RESTRINGIDA POLÍGONO DE TIRO LAMPA (ENTRENAMIENTO)', ring: BOX(C1, 2.5, 2.5, 5.0, 4.5), floor: 0, ceiling: 1500, kind: 'RESTRICTED' },
  ],
  flights: [
    {
      callsign: 'TOP11', acType: 'M300', op: 'VLOS', speedKt: 30, batteryMin: 40, startT: 10, authRef: 'AUT-UAS-26-0111', zoneId: 'V11',
      route: [P(C1, -1.9, -1.1, 0), P(C1, -1.9, 1.1, 100), P(C1, -1.2, 1.1, 100), P(C1, -1.2, -1.1, 100), P(C1, -0.5, -1.1, 100), P(C1, -0.5, 1.1, 100), P(C1, -1.9, -1.1, 0)],
    },
    {
      callsign: 'INS12', acType: 'WINGTRA', op: 'BVLOS', speedKt: 45, batteryMin: 55, startT: 30, authRef: 'AUT-UAS-26-0112', zoneId: 'V12',
      route: [P(C1, 0.8, -0.3, 0), P(C1, 1.3, -0.3, 90), P(C1, 6.3, -0.3, 90), P(C1, 6.3, 0.3, 90), P(C1, 1.3, 0.3, 90), P(C1, 0.8, -0.3, 0)],
    },
  ],
  events: [
    { t: 120, flight: 'TOP11', type: 'TASK', instr: 'ALT', value: 80, text: 'PILOTO DE TOP11 INFORMA NUBOSIDAD BAJA Y SOLICITA OPERAR A 80 M — INSTRUYA A TOP11 80 M' },
  ],
};

// ───────────────────────── N1 · E2 — COMUNICACIÓN Y COLACIÓN (Isla de Maipo) ─────────────────────────
const C2: C = [-70.9, -33.75];
const E2: Scenario = {
  id: 'n1-e2-comunicacion',
  order: 2, level: 1,
  title: 'COMUNICACIÓN Y COLACIÓN',
  name: 'N1·E2 COMUNICACIÓN Y COLACIÓN — ISLA DE MAIPO',
  center: C2, rangeNm: 6, durationS: 360, ackFpl: true,
  briefing:
    'Operaciones agrícolas en Isla de Maipo. AGR21 (Piloto UAS, VLOS) fumiga cuarteles de viñedo; AGR22 (Piloto RPAS, BVLOS) ' +
    'mapea el predio vecino. Durante el ejercicio llegan TRES coordinaciones que el Operador UTM resuelve con instrucciones: ' +
    'una de ALTURA, una de ESPERA y una de REANUDAR. Los pilotos deben COLACIONAR cada instrucción y cumplirla. Se mide el tiempo ' +
    'de respuesta del UTM, la colación y el cumplimiento.',
  objectives: {
    utm: ['Emitir la instrucción de ALTURA a AGR22 (80 m)', 'Emitir ESPERA a AGR21 y luego REANUDAR cuando se despeje', 'Verificar la colación de cada instrucción', 'Acusar FPL/DEP'],
    uas: ['Colacionar ESPERA y REANUDAR de inmediato', 'Mantener posición mientras dura la espera', 'Volar dentro del volumen'],
    rpas: ['Colacionar la instrucción de altura', 'Ajustar la altura de la misión a 80 m sin abandonar la ruta', 'Mantener conformidad'],
  },
  criticals: [CR_LOS, CR_ZONE],
  zones: [
    { id: 'V21', name: 'VOL AGR21 VIÑEDO (AUT-UAS-26-0221)', ring: BOX(C2, -1.6, -1.1, 0.6, 1.1), floor: 0, ceiling: 120, kind: 'SEGREGATED' },
    { id: 'V22', name: 'VOL AGR22 MAPEO (AUT-UAS-26-0222)', ring: BOX(C2, 1.0, -1.6, 5.6, 1.6), floor: 0, ceiling: 120, kind: 'SEGREGATED' },
  ],
  flights: [
    {
      callsign: 'AGR21', acType: 'AGRAS T40', op: 'VLOS', speedKt: 20, batteryMin: 30, startT: 5, authRef: 'AUT-UAS-26-0221', zoneId: 'V21',
      route: [P(C2, -1.3, -0.8, 0), P(C2, -1.3, 0.8, 30), P(C2, -0.7, 0.8, 30), P(C2, -0.7, -0.8, 30), P(C2, -0.1, -0.8, 30), P(C2, -0.1, 0.8, 30), P(C2, 0.3, 0.8, 30), P(C2, 0.3, -0.8, 30), P(C2, -1.3, -0.8, 0)],
    },
    {
      callsign: 'AGR22', acType: 'WINGTRA', op: 'BVLOS', speedKt: 40, batteryMin: 55, startT: 15, authRef: 'AUT-UAS-26-0222', zoneId: 'V22',
      route: [P(C2, 1.4, -1.3, 0), P(C2, 1.6, -1.2, 110), P(C2, 5.2, -1.2, 110), P(C2, 5.2, -0.4, 110), P(C2, 1.6, -0.4, 110), P(C2, 1.6, 0.4, 110), P(C2, 5.2, 0.4, 110), P(C2, 5.2, 1.2, 110), P(C2, 1.6, 1.2, 110), P(C2, 1.4, -1.3, 0)],
    },
  ],
  events: [
    { t: 70, flight: 'AGR22', type: 'TASK', instr: 'ALT', value: 80, text: 'DRON DE PRENSA AUTORIZADO TRANSITARÁ A 110 M SOBRE EL PREDIO DE AGR22 — INSTRUYA A AGR22 80 M' },
    { t: 140, flight: 'AGR21', type: 'TASK', instr: 'HOLD', text: 'CUADRILLA DE RIEGO INGRESA AL CUARTEL DE AGR21 — INSTRUYA ESPERA (MANTENGA POSICIÓN)' },
    { t: 210, flight: 'AGR21', type: 'TASK', instr: 'RESUME', text: 'CUADRILLA FUERA DEL CUARTEL — INSTRUYA A AGR21 REANUDAR LA MISIÓN' },
  ],
};

// ───────────────────────── N2 · E3 — AUTORIZACIÓN DE VOLÚMENES (Valparaíso) ─────────────────────────
const C3: C = [-71.6, -33.02];
const E3: Scenario = {
  id: 'n2-e3-autorizacion',
  order: 3, level: 2,
  title: 'AUTORIZACIÓN DE VOLÚMENES',
  name: 'N2·E3 AUTORIZACIÓN DE VOLÚMENES — VALPARAÍSO',
  center: C3, rangeNm: 6, durationS: 420,
  briefing:
    'Llegan CUATRO solicitudes de operación en Valparaíso–Viña del Mar (ventana GESTIÓN UTM ▸ SOLICITUDES). El Operador UTM debe ' +
    'revisar volumen, techo y propósito contra las restricciones vigentes: APROBAR las que cumplen, RECHAZAR la que invade la zona ' +
    'prohibida naval y MODIFICAR la que solicita un techo superior al máximo admisible (120 m). Ningún vuelo puede despegar sin ' +
    'autorización: los pilotos esperan en tierra y despegan sólo con la solicitud aprobada.',
  objectives: {
    utm: ['Aprobar INS31 y TOP32 (cumplen)', 'Rechazar FIL33: su volumen invade la PROHIBIDA BASE NAVAL', 'Modificar PUB34 a techo ≤ 120 m', 'Decidir antes de la hora de despegue solicitada'],
    uas: ['No despegar mientras la solicitud esté pendiente o rechazada', 'Despegar con DESPEGAR sólo con autorización', 'Respetar el techo autorizado (modificado si corresponde)'],
    rpas: ['No despegar sin autorización', 'Verificar el techo autorizado antes del despegue', 'Ejecutar la misión en conformidad'],
  },
  criticals: [CR_AUTH, CR_TKOF, CR_ZONE, CR_LOS],
  zones: [
    { id: 'P31', name: 'PROHIBIDA BASE NAVAL / MUELLE PRAT (ENTRENAMIENTO)', ring: BOX(C3, -2.6, -1.9, -1.0, -0.6), floor: 0, ceiling: 999, kind: 'PROHIBITED' },
    { id: 'V31', name: 'VOL INS31 FACHADA VIÑA (SOL 3101)', ring: BOX(C3, 1.0, 1.0, 2.3, 2.1), floor: 0, ceiling: 90, kind: 'SEGREGATED' },
    { id: 'V32', name: 'VOL TOP32 BORDE COSTERO REÑACA (SOL 3102)', ring: BOX(C3, 2.6, 2.6, 4.6, 5.6), floor: 0, ceiling: 120, kind: 'SEGREGATED' },
    { id: 'V33', name: 'VOL FIL33 FILMACIÓN BAHÍA (SOL 3103)', ring: BOX(C3, -2.0, -1.3, -0.3, -0.1), floor: 0, ceiling: 120, kind: 'SEGREGATED' },
    { id: 'V34', name: 'VOL PUB34 EVENTO PLAYA ANCHA (SOL 3104)', ring: BOX(C3, -0.4, -3.4, 1.4, -2.0), floor: 0, ceiling: 120, kind: 'SEGREGATED' },
  ],
  flights: [
    {
      callsign: 'INS31', acType: 'M30T', op: 'VLOS', speedKt: 20, batteryMin: 35, startT: 40, authRef: 'SOL-3101', zoneId: 'V31',
      req: { id: 'SOL-3101', operator: 'INSPECCIONES COSTA SPA', purpose: 'Inspección de fachada edificio', ceiling: 80, window: '1200-1230 UTC', expect: 'APPROVE', reason: 'Volumen libre de restricciones y techo dentro del máximo' },
      route: [P(C3, 1.2, 1.2, 0), P(C3, 1.2, 1.9, 75), P(C3, 2.1, 1.9, 75), P(C3, 2.1, 1.2, 60), P(C3, 1.2, 1.2, 0)],
    },
    {
      callsign: 'TOP32', acType: 'WINGTRA', op: 'BVLOS', speedKt: 40, batteryMin: 55, startT: 60, authRef: 'SOL-3102', zoneId: 'V32',
      req: { id: 'SOL-3102', operator: 'GEOMAR TOPOGRAFÍA LTDA', purpose: 'Levantamiento borde costero (BVLOS)', ceiling: 110, window: '1200-1245 UTC', expect: 'APPROVE', reason: 'Volumen libre de restricciones y techo dentro del máximo' },
      route: [P(C3, 2.9, 2.9, 0), P(C3, 3.1, 3.0, 100), P(C3, 3.1, 5.3, 100), P(C3, 4.2, 5.3, 100), P(C3, 4.2, 3.0, 100), P(C3, 2.9, 2.9, 0)],
    },
    {
      callsign: 'FIL33', acType: 'MAVIC 3', op: 'VLOS', speedKt: 20, batteryMin: 30, startT: 50, authRef: 'SOL-3103', zoneId: 'V33',
      req: { id: 'SOL-3103', operator: 'AUDIOVISUAL PACÍFICO', purpose: 'Filmación de la bahía', ceiling: 100, window: '1200-1220 UTC', expect: 'DENY', reason: 'El volumen invade la zona PROHIBIDA BASE NAVAL' },
      route: [P(C3, -0.6, -0.4, 0), P(C3, -1.7, -0.5, 90), P(C3, -1.7, -1.1, 90), P(C3, -0.6, -1.0, 90), P(C3, -0.6, -0.4, 0)],
    },
    {
      callsign: 'PUB34', acType: 'M350', op: 'VLOS', speedKt: 20, batteryMin: 40, startT: 70, authRef: 'SOL-3104', zoneId: 'V34',
      req: { id: 'SOL-3104', operator: 'EVENTOS VALPO SPA', purpose: 'Registro aéreo de evento', ceiling: 150, window: '1205-1230 UTC', expect: 'MODIFY', maxCeil: 120, reason: 'Techo solicitado 150 m excede el máximo admisible de 120 m' },
      route: [P(C3, 0.0, -3.1, 0), P(C3, 0.0, -2.3, 140), P(C3, 1.1, -2.3, 140), P(C3, 1.1, -3.1, 140), P(C3, 0.0, -3.1, 0)],
    },
  ],
  events: [],
};

// ───────────────────────── N2 · E4 — CONFORMIDAD (Doñihue / Rancagua) ─────────────────────────
const C4: C = [-70.96, -34.22];
const E4: Scenario = {
  id: 'n2-e4-conformidad',
  order: 4, level: 2,
  title: 'CONFORMIDAD',
  name: 'N2·E4 CONFORMIDAD — DOÑIHUE (VALLE DEL CACHAPOAL)',
  center: C4, rangeNm: 10, durationS: 420,
  briefing:
    'AGR41 (Piloto UAS, VLOS) aplica en viñedos de Doñihue con viento cruzado: una ráfaga lo empuja hacia el borde de su volumen y ' +
    'el piloto debe corregir. INS42 (Piloto RPAS, BVLOS) tiene programado un tramo que ROZA EL TECHO autorizado (120 m): debe ' +
    'corregir la altura de la misión. El Operador UTM vigila la conformidad, detecta los desvíos y ordena la corrección. Aparece la ' +
    'primera AVIONETA de paso (CC-KQR desde Rancagua), lejana: identificarla y mantenerla vigilada.',
  objectives: {
    utm: ['Detectar el desvío lateral de AGR41 y ordenar corrección', 'Detectar a INS42 sobre el techo y ordenar altura ≤ 110 m', 'Identificar el tránsito tripulado CC-KQR y vigilar su trayectoria'],
    uas: ['Corregir la deriva por viento y volver al volumen (≥ 90 % del tiempo dentro)', 'Colacionar y cumplir las instrucciones', 'Desvío máximo < 100 m'],
    rpas: ['Detectar el tramo de la misión sobre el techo y corregir (▼ BAJAR) antes de excederlo', 'Colacionar la instrucción de altura', 'Techo respetado'],
  },
  criticals: [CR_LOS, CR_ZONE],
  zones: [
    { id: 'V41', name: 'VOL AGR41 VIÑEDO (AUT-UAS-26-0441)', ring: BOX(C4, -1.6, -1.0, 0.0, 1.0), floor: 0, ceiling: 120, kind: 'SEGREGATED' },
    { id: 'V42', name: 'VOL INS42 CANAL DE REGADÍO (AUT-UAS-26-0442)', ring: BOX(C4, 0.5, -2.0, 5.2, 2.0), floor: 0, ceiling: 120, kind: 'SEGREGATED' },
    { id: 'P41', name: 'PROHIBIDA SUBESTACIÓN ELÉCTRICA (ENTRENAMIENTO)', ring: BOX(C4, -3.2, -0.5, -2.4, 0.5), floor: 0, ceiling: 300, kind: 'PROHIBITED' },
  ],
  flights: [
    {
      callsign: 'AGR41', acType: 'AGRAS T40', op: 'VLOS', speedKt: 20, batteryMin: 30, startT: 5, authRef: 'AUT-UAS-26-0441', zoneId: 'V41',
      route: [P(C4, -1.3, -0.8, 0), P(C4, -1.3, 0.8, 40), P(C4, -0.8, 0.8, 40), P(C4, -0.8, -0.8, 40), P(C4, -0.3, -0.8, 40), P(C4, -0.3, 0.8, 40), P(C4, -1.3, -0.8, 0)],
    },
    {
      callsign: 'INS42', acType: 'WINGTRA', op: 'BVLOS', speedKt: 40, batteryMin: 55, startT: 15, authRef: 'AUT-UAS-26-0442', zoneId: 'V42',
      route: [P(C4, 0.9, -1.7, 0), P(C4, 1.0, -1.5, 100), P(C4, 1.0, 1.6, 100), P(C4, 2.6, 1.6, 132), P(C4, 4.8, 1.6, 132), P(C4, 4.8, -1.6, 100), P(C4, 0.9, -1.7, 0)],
    },
    {
      callsign: 'CC-KQR', acType: 'C172', manned: true, sector: 'GA', speedKt: 100, batteryMin: 999, startT: 150, authRef: 'VFR', zoneId: '',
      route: [P(C4, 16, 6.5, 350), P(C4, 4, 5.5, 300), P(C4, -10, 4.8, 300), P(C4, -18, 4.5, 350)],
    },
  ],
  events: [
    { t: 100, flight: 'AGR41', type: 'GUST', hdg: 265, duration: 80 },
  ],
};

// ───────────────────────── N3 · E5 — PÉRDIDA C2 RPAS (Mejillones) ─────────────────────────
const C5: C = [-70.4, -23.15];
const E5: Scenario = {
  id: 'n3-e5-perdida-c2',
  order: 5, level: 3,
  title: 'PÉRDIDA C2 DE RPAS',
  name: 'N3·E5 PÉRDIDA DE ENLACE C2 RPAS — MEJILLONES',
  center: C5, rangeNm: 6, durationS: 420,
  briefing:
    'INS51 (Piloto RPAS, BVLOS) inspecciona la línea de transmisión Mejillones–Antofagasta. En el tramo bajo (60 m) de regreso ' +
    'PIERDE EL ENLACE C2 y su failsafe ejecuta RTL automático en línea recta hacia la base, a 60 m, atravesando el volumen donde ' +
    'TOP52 (Piloto UAS, VLOS) trabaja a la misma altura. El Operador UTM debe reconocer la alarma, DECLARAR LA CONTINGENCIA y ' +
    'DESPEJAR la trayectoria de RTL (instruir a TOP52) antes de que se pierda la separación.',
  objectives: {
    utm: ['Reconocer la pérdida C2 de INS51 (≤ 20 s)', 'Declarar la contingencia de INS51', 'Despejar la trayectoria de RTL: instruir a TOP52 (descenso / aterrizaje)', 'Mantener la separación'],
    uas: ['Colacionar y cumplir de inmediato la instrucción para despejar el RTL', 'Mantener conformidad del volumen'],
    rpas: ['Informar al UTM la pérdida de enlace (INFORMAR CONTINGENCIA)', 'Confirmar el RTL automático y el aterrizaje en base', 'Mantener la conformidad hasta la pérdida'],
  },
  criticals: [CR_CONT, CR_LOS, CR_ZONE],
  zones: [
    { id: 'V51', name: 'VOL INS51 LÍNEA 220 KV (AUT-UAS-26-0551)', ring: BOX(C5, -1.0, -0.7, 4.2, 0.9), floor: 0, ceiling: 120, kind: 'SEGREGATED' },
    { id: 'V52', name: 'VOL TOP52 SUBESTACIÓN (AUT-UAS-26-0552)', ring: BOX(C5, 0.3, -0.5, 1.6, 0.6), floor: 0, ceiling: 120, kind: 'SEGREGATED' },
  ],
  flights: [
    {
      callsign: 'INS51', acType: 'WINGTRA', op: 'BVLOS', speedKt: 45, batteryMin: 55, startT: 8, authRef: 'AUT-UAS-26-0551', zoneId: 'V51',
      route: [P(C5, -0.6, 0.0, 0), P(C5, -0.3, -0.3, 110), P(C5, 3.8, -0.3, 110), P(C5, 3.8, 0.4, 60), P(C5, 2.4, 0.4, 60), P(C5, 2.0, 0.4, 110), P(C5, -0.6, 0.0, 0)],
    },
    {
      callsign: 'TOP52', acType: 'M300', op: 'VLOS', speedKt: 12, batteryMin: 40, startT: 45, authRef: 'AUT-UAS-26-0552', zoneId: 'V52',
      route: [P(C5, 0.5, -0.3, 0), P(C5, 0.5, 0.2, 60), P(C5, 1.4, 0.2, 60), P(C5, 1.4, 0.05, 60), P(C5, 0.5, 0.05, 60), P(C5, 0.5, 0.2, 60), P(C5, 1.4, 0.2, 60), P(C5, 1.4, 0.05, 60), P(C5, 0.5, 0.05, 60), P(C5, 0.5, -0.3, 0)],
    },
    {
      callsign: 'CC-PAN', acType: 'C208', manned: true, sector: 'GA', speedKt: 150, batteryMin: 999, startT: 60, authRef: 'VFR', zoneId: '',
      route: [P(C5, -14, -4.5, 600), P(C5, 14, -3.5, 600)],
    },
  ],
  events: [
    { t: 240, flight: 'INS51', type: 'C2LOSS', clear: ['TOP52'] },
  ],
};

// ───────────────────────── N3 · E6 — BATERÍA BAJA / EMERGENCIA UAS (Arauco) ─────────────────────────
const C6: C = [-73.32, -37.27];
const E6: Scenario = {
  id: 'n3-e6-bateria-emergencia',
  order: 6, level: 3,
  title: 'BATERÍA BAJA / EMERGENCIA UAS',
  name: 'N3·E6 BATERÍA BAJA / EMERGENCIA — ARAUCO (FORESTAL)',
  center: C6, rangeNm: 6, durationS: 360,
  briefing:
    'FOR61 (Piloto UAS, VLOS) vigila un rodal forestal en Arauco. A los 2,5 min reporta BATERÍA BAJA y luego declara EMERGENCIA: ' +
    'la autonomía NO alcanza para volver a la base; debe aterrizar en el SITIO ALTERNATIVO (claro forestal km 14). FOR62 ' +
    '(Piloto RPAS, BVLOS) tiene programado un tramo a 60 m justo sobre ese claro. El Operador UTM da PRIORIDAD a la emergencia: ' +
    'declara la contingencia, ordena el aterrizaje en el alternativo y despeja a FOR62.',
  objectives: {
    utm: ['Reconocer batería baja y emergencia de FOR61', 'Declarar la contingencia', 'Instruir ATERRIZAJE EN ALTERNATIVO a FOR61', 'Dar prioridad: despejar a FOR62 del sitio alternativo'],
    uas: ['Informar la contingencia al UTM', 'Aterrizar en el sitio ALTERNATIVO antes de agotar la batería (botón ALTERNATIVO)', 'Colacionar las instrucciones'],
    rpas: ['Colacionar y cumplir la instrucción de despeje (espera / RTL / altura)', 'No interferir con la emergencia', 'Mantener conformidad'],
  },
  criticals: [CR_CONT, CR_LOS, CR_ZONE],
  zones: [
    { id: 'V61', name: 'VOL FOR61 RODAL HORCONES (AUT-UAS-26-0661)', ring: BOX(C6, -1.1, -1.1, 1.6, 1.6), floor: 0, ceiling: 120, kind: 'SEGREGATED' },
    { id: 'V62', name: 'VOL FOR62 MAPEO FORESTAL (AUT-UAS-26-0662)', ring: BOX(C6, 0.4, -0.6, 4.2, 2.6), floor: 0, ceiling: 120, kind: 'SEGREGATED' },
  ],
  flights: [
    {
      callsign: 'FOR61', acType: 'M30T', op: 'VLOS', speedKt: 30, batteryMin: 9, startT: 5, authRef: 'AUT-UAS-26-0661', zoneId: 'V61',
      altLand: { ...P(C6, 1.0, 0.5, 0), name: 'CLARO FORESTAL KM 14' },
      route: [P(C6, -0.8, -0.8, 0), P(C6, 1.3, 1.3, 100), P(C6, 1.3, -0.7, 100), P(C6, -0.8, -0.8, 0)],
    },
    {
      callsign: 'FOR62', acType: 'WINGTRA', op: 'BVLOS', speedKt: 45, batteryMin: 55, startT: 40, authRef: 'AUT-UAS-26-0662', zoneId: 'V62',
      route: [P(C6, 3.8, -0.3, 0), P(C6, 3.8, 0.5, 60), P(C6, 0.6, 0.5, 60), P(C6, 0.6, 2.3, 60), P(C6, 3.8, 2.3, 60), P(C6, 3.8, -0.3, 0)],
    },
  ],
  events: [
    { t: 150, flight: 'FOR61', type: 'LOWBAT', clear: ['FOR62'] },
    { t: 165, flight: 'FOR61', type: 'EMERG', clear: ['FOR62'] },
  ],
};

// ───────────────────────── N4 · E7 — CONFLICTO UAS–RPAS + AVIONETA VFR (Los Andes) ─────────────────────────
const C7: C = [-70.62, -32.79];
const E7: Scenario = {
  id: 'n4-e7-conflicto-avioneta',
  order: 7, level: 4,
  title: 'CONFLICTO UAS–RPAS (STCA) + AVIONETA VFR',
  name: 'N4·E7 CONFLICTO STCA + AVIONETA VFR BAJA — LOS ANDES',
  center: C7, rangeNm: 8, durationS: 360,
  briefing:
    'Viñedos de San Esteban (Los Andes). AGR71 (Piloto UAS, VLOS) y INS72 (Piloto RPAS, BVLOS) convergen a 100 m sobre el cruce de ' +
    'sus volúmenes: se dispara STCA y el Operador UTM debe resolver con instrucciones. Inmediatamente después, la avioneta VFR ' +
    'CC-PZT (PA-28) cruza BAJO (140 m) sobre las operaciones en ruta hacia el aeródromo de Los Andes: el UTM debe dar información ' +
    'de tráfico y hacer DESCENDER / ESPERAR / ATERRIZAR a los UAS afectados (≥ 60 m de separación vertical o 500 m lateral).',
  objectives: {
    utm: ['Detectar el conflicto STCA AGR71 / INS72 y resolverlo (espera o cambio de altura)', 'Detectar a CC-PZT antes de que llegue y ordenar descenso ≤ 70 m o aterrizaje a los UAS en su trayectoria', 'Mantener separación con el tripulado (500 m / 60 m)'],
    uas: ['Cumplir la instrucción de resolución en < 30 s', 'Descender / aterrizar ante el tripulado', 'Colacionar'],
    rpas: ['Cumplir la resolución STCA', 'Ajustar altura sin abandonar la ruta', 'Colacionar'],
  },
  criticals: [CR_LOS, CR_ZONE],
  zones: [
    { id: 'V71', name: 'VOL AGR71 VIÑEDO SAN ESTEBAN (AUT-UAS-26-0771)', ring: BOX(C7, -2.0, -0.6, 1.1, 1.0), floor: 0, ceiling: 120, kind: 'SEGREGATED' },
    { id: 'V72', name: 'VOL INS72 CANAL (AUT-UAS-26-0772)', ring: BOX(C7, -0.4, -3.0, 0.8, 3.0), floor: 0, ceiling: 120, kind: 'SEGREGATED' },
  ],
  flights: [
    {
      callsign: 'AGR71', acType: 'M350', op: 'VLOS', speedKt: 30, batteryMin: 40, startT: 10, authRef: 'AUT-UAS-26-0771', zoneId: 'V71',
      route: [P(C7, -1.8, 0.0, 0), P(C7, -1.5, 0.0, 100), P(C7, 0.9, 0.0, 100), P(C7, 0.9, 0.6, 100), P(C7, -1.8, 0.6, 100), P(C7, -1.8, 0.0, 0)],
    },
    {
      callsign: 'INS72', acType: 'WINGTRA', op: 'BVLOS', speedKt: 45, batteryMin: 55, startT: 6, authRef: 'AUT-UAS-26-0772', zoneId: 'V72',
      route: [P(C7, 0.0, -2.8, 0), P(C7, 0.0, -2.5, 100), P(C7, 0.0, 2.6, 100), P(C7, 0.5, 2.6, 100), P(C7, 0.5, -2.6, 100), P(C7, 0.0, -2.8, 0)],
    },
    {
      callsign: 'CC-PZT', acType: 'PA28', manned: true, sector: 'GA', speedKt: 95, batteryMin: 999, startT: 90, authRef: 'VFR', zoneId: '',
      route: [P(C7, -9, 3.2, 300), P(C7, -3, 1.4, 140), P(C7, 0.0, 0.6, 140), P(C7, 6, -1.2, 140), P(C7, 12, -3, 300)],
    },
  ],
  events: [],
};

// ───────────────────────── N4 · E8 — HELICÓPTERO EMS + NOTAM EMERGENTE (Curacaví) ─────────────────────────
const C8: C = [-71.15, -33.4];
const E8: Scenario = {
  id: 'n4-e8-ems-notam',
  order: 8, level: 4,
  title: 'HELICÓPTERO EMS + NOTAM EMERGENTE',
  name: 'N4·E8 HELICÓPTERO EMS + NOTAM EMERGENTE — CURACAVÍ / RUTA 68',
  center: C8, rangeNm: 10, durationS: 420,
  briefing:
    'Accidente en Ruta 68 (km 40, Curacaví). Se emite un NOTAM de zona restringida temporal de 1 NM para la operación aeromédica y ' +
    'el helicóptero EMS CC-AMH (H125) viene desde Santiago a baja altura para aterrizar en el sitio. Hay tres operaciones UAS ' +
    'activas: INS82 (RPAS, BVLOS) inspecciona la línea junto a la ruta, TOP81 (UAS, VLOS) hace topografía y AGR83 (UAS, VLOS) ' +
    'opera al norte. El Operador UTM debe ACTIVAR la restricción, ordenar SUSPENDER (espera fuera / aterrizaje / RTL) a las ' +
    'operaciones afectadas y separar al helicóptero.',
  objectives: {
    utm: ['Activar la restricción del NOTAM (≤ 60 s)', 'Ordenar RTL / aterrizaje / espera fuera de la zona a INS82 y TOP81', 'Información de tráfico y separación con el EMS CC-AMH', 'Ninguna operación dentro de la zona tras 120 s'],
    uas: ['Colacionar y cumplir en tiempo (< 30 s)', 'No ingresar a la zona NOTAM', 'Aterrizar si se ordena'],
    rpas: ['Suspender la misión según instrucción (RTL / espera)', 'No ingresar a la zona NOTAM', 'Colacionar'],
  },
  criticals: [CR_ZONE, CR_LOS],
  zones: [
    { id: 'V81', name: 'VOL TOP81 LOTEO (AUT-UAS-26-0881)', ring: BOX(C8, -1.6, -1.2, 0.6, 1.0), floor: 0, ceiling: 120, kind: 'SEGREGATED' },
    { id: 'V82', name: 'VOL INS82 LÍNEA RUTA 68 (AUT-UAS-26-0882)', ring: BOX(C8, 0.9, -2.6, 6.0, -0.4), floor: 0, ceiling: 120, kind: 'SEGREGATED' },
    { id: 'V83', name: 'VOL AGR83 PARRONALES (AUT-UAS-26-0883)', ring: BOX(C8, -4.2, 1.6, -2.0, 3.2), floor: 0, ceiling: 120, kind: 'SEGREGATED' },
    { id: 'N81', name: 'NOTAM C0412/26 RESTRINGIDA ACCIDENTE R68 KM40', ring: CIRC(C8, 2.0, -1.0, 1.85), floor: 0, ceiling: 300, kind: 'RESTRICTED', vlimit: 'SFC / 300 M AGL', appearAt: 120 },
  ],
  flights: [
    {
      callsign: 'INS82', acType: 'WINGTRA', op: 'BVLOS', speedKt: 40, batteryMin: 55, startT: 10, authRef: 'AUT-UAS-26-0882', zoneId: 'V82',
      route: [P(C8, 5.6, -2.3, 0), P(C8, 5.4, -2.2, 100), P(C8, 5.4, -0.7, 100), P(C8, 4.4, -0.7, 100), P(C8, 4.4, -2.2, 100), P(C8, 3.4, -2.2, 100), P(C8, 3.4, -0.7, 100), P(C8, 2.2, -0.7, 100), P(C8, 2.2, -2.2, 100), P(C8, 1.2, -2.2, 100), P(C8, 1.2, -0.7, 100), P(C8, 5.6, -2.3, 0)],
    },
    {
      callsign: 'TOP81', acType: 'M300', op: 'VLOS', speedKt: 20, batteryMin: 40, startT: 5, authRef: 'AUT-UAS-26-0881', zoneId: 'V81',
      route: [P(C8, -1.3, -0.9, 0), P(C8, -1.3, 0.7, 90), P(C8, -0.6, 0.7, 90), P(C8, -0.6, -0.9, 90), P(C8, 0.3, -0.9, 90), P(C8, 0.3, 0.7, 90), P(C8, -1.3, -0.9, 0)],
    },
    {
      callsign: 'AGR83', acType: 'AGRAS T40', op: 'VLOS', speedKt: 20, batteryMin: 30, startT: 20, authRef: 'AUT-UAS-26-0883', zoneId: 'V83',
      route: [P(C8, -3.9, 1.9, 0), P(C8, -3.9, 2.9, 40), P(C8, -2.3, 2.9, 40), P(C8, -2.3, 1.9, 40), P(C8, -3.9, 1.9, 0)],
    },
    {
      callsign: 'CC-AMH', acType: 'H125', manned: true, sector: 'GA', speedKt: 110, batteryMin: 999, startT: 40, authRef: 'EMS', zoneId: '',
      route: [P(C8, 18, 1.0, 450), P(C8, 6, -0.4, 200), P(C8, 3.2, -0.8, 100), P(C8, 2.0, -1.0, 0, 150), P(C8, 18, 1.5, 450)],
    },
  ],
  events: [],
};

// ───────────────────────── N5 · E9 — SATURACIÓN, 2 SECTORES Y HANDOVER (Gran Concepción) ─────────────────────────
const C9: C = [-73.06, -36.8];
const E9: Scenario = {
  id: 'n5-e9-saturacion',
  order: 9, level: 5,
  title: 'SATURACIÓN · 2 SECTORES · HANDOVER',
  name: 'N5·E9 SATURACIÓN 2 SECTORES — GRAN CONCEPCIÓN',
  center: C9, rangeNm: 12, durationS: 540, sectors: ['S1', 'S2'], handover: ['UDC94'],
  briefing:
    'Ocho operaciones UAS simultáneas en el Gran Concepción, divididas en S1 NORTE (Talcahuano–Penco–Hualpén) y S2 SUR (San Pedro–' +
    'río Biobío–Coronel). UDC94 (RPAS) cruza de S1 a S2: HANDOVER obligatorio. Tránsito tripulado: CC-ACV (C172 de instrucción ' +
    'saliendo bajo de Carriel Sur), el helicóptero policial CC-AHP patrullando el Biobío y el helicóptero de brigada CC-AFB rumbo ' +
    'al incendio. Dos NOTAM aparecen escalonados: zona peligrosa del ejercicio naval en la bahía (T+3 min) y restringida por ' +
    'incendio forestal en Hualpén (T+5,5 min). Gestión de carga: priorizar, instruir y transferir sin perder la imagen.',
  objectives: {
    utm: ['Mantener la imagen de 8 operaciones y 3 tripulados', 'Separar cada operación del tránsito tripulado (instrucción antes del cruce)', 'Activar ambos NOTAM y sacar a las operaciones afectadas', 'Handover de UDC94 a S2', 'Sin pérdidas de separación ni ingresos a zona'],
    uas: ['Cumplir instrucciones en < 30 s con colación', 'Conformidad ≥ 90 %', 'No ingresar a zonas NOTAM'],
    rpas: ['Suspender / reprogramar la misión según NOTAM', 'Colacionar', 'Conformidad y techo'],
  },
  criticals: [CR_LOS, CR_ZONE, CR_CONT],
  zones: [
    { id: 'V91', name: 'VOL TAL91 PUERTO TALCAHUANO', ring: BOX(C9, -6.8, 6.0, -4.6, 7.8), floor: 0, ceiling: 120, kind: 'SEGREGATED' },
    { id: 'V92', name: 'VOL PEN92 COSTA PENCO (BVLOS)', ring: BOX(C9, 2.0, 5.0, 7.5, 8.0), floor: 0, ceiling: 120, kind: 'SEGREGATED' },
    { id: 'V93', name: 'VOL HUA93 HUALPÉN', ring: BOX(C9, -6.0, 1.8, -3.8, 3.8), floor: 0, ceiling: 120, kind: 'SEGREGATED' },
    { id: 'V94', name: 'VOL UDC94 CORREDOR S1-S2 (BVLOS)', ring: BOX(C9, 3.0, -4.0, 4.4, 4.0), floor: 0, ceiling: 120, kind: 'SEGREGATED' },
    { id: 'V95', name: 'VOL SPP95 SAN PEDRO', ring: BOX(C9, -3.4, -4.2, -1.4, -2.2), floor: 0, ceiling: 120, kind: 'SEGREGATED' },
    { id: 'V96', name: 'VOL COR96 CORONEL COSTA (BVLOS)', ring: BOX(C9, -9.0, -10.5, -5.0, -6.5), floor: 0, ceiling: 120, kind: 'SEGREGATED' },
    { id: 'V97', name: 'VOL BIO97 RÍO BIOBÍO', ring: BOX(C9, 5.0, -3.2, 7.0, -1.2), floor: 0, ceiling: 120, kind: 'SEGREGATED' },
    { id: 'V98', name: 'VOL LAG98 LAGUNA CHICA (BVLOS)', ring: BOX(C9, -2.4, -8.6, 1.4, -6.2), floor: 0, ceiling: 120, kind: 'SEGREGATED' },
    { id: 'N91', name: 'NOTAM C0731/26 PELIGROSA EJERCICIO NAVAL BAHÍA', ring: BOX(C9, -7.5, 5.2, 0.5, 9.5), floor: 0, ceiling: 1000, kind: 'DANGER', vlimit: 'SFC / 1000 M', appearAt: 180 },
    { id: 'N92', name: 'NOTAM C0735/26 RESTRINGIDA INCENDIO HUALPÉN', ring: CIRC(C9, -4.6, 2.6, 1.6), floor: 0, ceiling: 600, kind: 'RESTRICTED', vlimit: 'SFC / 600 M', appearAt: 330 },
  ],
  flights: [
    { callsign: 'TAL91', acType: 'M30T', op: 'VLOS', speedKt: 20, batteryMin: 40, startT: 10, authRef: 'AUT-UAS-26-0991', zoneId: 'V91', sector: 'S1',
      route: [P(C9, -6.5, 6.3, 0), P(C9, -6.5, 7.5, 80), P(C9, -4.9, 7.5, 80), P(C9, -4.9, 6.3, 80), P(C9, -6.5, 6.3, 80), P(C9, -6.5, 7.5, 80), P(C9, -4.9, 7.5, 80), P(C9, -6.5, 6.3, 0)] },
    { callsign: 'PEN92', acType: 'WINGTRA', op: 'BVLOS', speedKt: 40, batteryMin: 55, startT: 20, authRef: 'AUT-UAS-26-0992', zoneId: 'V92', sector: 'S1',
      route: [P(C9, 7.0, 5.3, 0), P(C9, 6.8, 5.5, 100), P(C9, 2.4, 5.5, 100), P(C9, 2.4, 6.5, 100), P(C9, 6.8, 6.5, 100), P(C9, 6.8, 7.5, 100), P(C9, 2.4, 7.5, 100), P(C9, 7.0, 5.3, 0)] },
    { callsign: 'HUA93', acType: 'M300', op: 'VLOS', speedKt: 20, batteryMin: 40, startT: 15, authRef: 'AUT-UAS-26-0993', zoneId: 'V93', sector: 'S1',
      route: [P(C9, -5.7, 2.1, 0), P(C9, -5.7, 3.5, 90), P(C9, -5.0, 3.5, 90), P(C9, -5.0, 2.1, 90), P(C9, -4.3, 2.1, 90), P(C9, -4.3, 3.5, 90), P(C9, -5.7, 3.5, 90), P(C9, -5.7, 2.1, 90), P(C9, -4.3, 2.1, 90), P(C9, -5.7, 2.1, 0)] },
    { callsign: 'UDC94', acType: 'WINGTRA', op: 'BVLOS', speedKt: 40, batteryMin: 55, startT: 30, authRef: 'AUT-UAS-26-0994', zoneId: 'V94', sector: 'S1',
      route: [P(C9, 3.7, 3.7, 0), P(C9, 3.4, 3.4, 110), P(C9, 3.4, -3.6, 110), P(C9, 4.0, -3.6, 110), P(C9, 4.0, 3.4, 110), P(C9, 3.7, 3.7, 0)] },
    { callsign: 'SPP95', acType: 'MAVIC 3E', op: 'VLOS', speedKt: 20, batteryMin: 35, startT: 25, authRef: 'AUT-UAS-26-0995', zoneId: 'V95', sector: 'S2',
      route: [P(C9, -3.1, -3.9, 0), P(C9, -3.1, -2.5, 70), P(C9, -2.4, -2.5, 70), P(C9, -2.4, -3.9, 70), P(C9, -1.7, -3.9, 70), P(C9, -1.7, -2.5, 70), P(C9, -3.1, -2.5, 70), P(C9, -3.1, -3.9, 70), P(C9, -1.7, -3.9, 70), P(C9, -3.1, -3.9, 0)] },
    { callsign: 'COR96', acType: 'WINGTRA', op: 'BVLOS', speedKt: 40, batteryMin: 55, startT: 40, authRef: 'AUT-UAS-26-0996', zoneId: 'V96', sector: 'S2',
      route: [P(C9, -5.4, -6.9, 0), P(C9, -5.6, -7.1, 100), P(C9, -8.6, -7.1, 100), P(C9, -8.6, -8.5, 100), P(C9, -5.6, -8.5, 100), P(C9, -5.6, -9.9, 100), P(C9, -8.6, -9.9, 100), P(C9, -5.4, -6.9, 0)] },
    { callsign: 'BIO97', acType: 'M350', op: 'VLOS', speedKt: 20, batteryMin: 40, startT: 35, authRef: 'AUT-UAS-26-0997', zoneId: 'V97', sector: 'S2',
      route: [P(C9, 5.3, -2.9, 0), P(C9, 5.3, -1.5, 80), P(C9, 6.0, -1.5, 80), P(C9, 6.0, -2.9, 80), P(C9, 6.7, -2.9, 80), P(C9, 6.7, -1.5, 80), P(C9, 5.3, -1.5, 80), P(C9, 5.3, -2.9, 80), P(C9, 6.7, -2.9, 80), P(C9, 5.3, -2.9, 0)] },
    { callsign: 'LAG98', acType: 'WINGTRA', op: 'BVLOS', speedKt: 40, batteryMin: 55, startT: 50, authRef: 'AUT-UAS-26-0998', zoneId: 'V98', sector: 'S2',
      route: [P(C9, -2.1, -6.5, 0), P(C9, -2.0, -6.7, 100), P(C9, 1.0, -6.7, 100), P(C9, 1.0, -7.5, 100), P(C9, -2.0, -7.5, 100), P(C9, -2.0, -8.3, 100), P(C9, 1.0, -8.3, 100), P(C9, -2.1, -6.5, 0)] },
    { callsign: 'CC-ACV', acType: 'C172', manned: true, sector: 'GA', speedKt: 90, batteryMin: 999, startT: 90, authRef: 'VFR', zoneId: '',
      route: [P(C9, 0.3, 3.1, 50), P(C9, -2.0, 3.0, 140), P(C9, -5.0, 2.7, 140), P(C9, -9.0, 2.5, 300), P(C9, -16, 2.5, 450)] },
    { callsign: 'CC-AHP', acType: 'H125', manned: true, sector: 'GA', speedKt: 90, batteryMin: 999, startT: 160, authRef: 'POLICIAL', zoneId: '',
      route: [P(C9, 14, -2.0, 200), P(C9, 6.0, -2.2, 120), P(C9, 1.0, -2.6, 120), P(C9, -2.4, -3.2, 120), P(C9, -10, -4.0, 200)] },
    { callsign: 'CC-AFB', acType: 'B407', manned: true, sector: 'GA', speedKt: 110, batteryMin: 999, startT: 300, authRef: 'BRIGADA', zoneId: '',
      route: [P(C9, 12, 10, 400), P(C9, 1.5, 4.2, 200), P(C9, -4.6, 2.6, 120, 120), P(C9, 12, 10, 400)] },
  ],
  events: [],
};

// ───────────────────────── N5 · E10 — CERTIFICACIÓN (Antofagasta / La Negra) ─────────────────────────
const C10: C = [-70.32, -23.75];
const E10: Scenario = {
  id: 'n5-e10-certificacion',
  order: 10, level: 5,
  title: 'CERTIFICACIÓN',
  name: 'N5·E10 CERTIFICACIÓN — ANTOFAGASTA / LA NEGRA',
  center: C10, rangeNm: 10, durationS: 420,
  briefing:
    'Ejercicio de CERTIFICACIÓN con eventos simultáneos y presión de tiempo en el sector industrial La Negra (Antofagasta). ' +
    'DUC101 (RPAS, BVLOS) inspecciona el ducto minero y PIERDE EL ENLACE C2: su failsafe vuelve a la base descendiendo a 70 m (RTL) sobre el volumen de TOP102 (UAS, 70 m). ' +
    'Al mismo tiempo cruza a baja altura un HELICÓPTERO NO COOPERATIVO (NC-01, sin transpondedor ni plan), luego la avioneta ' +
    'CC-CPL (C206 de aerofotogrametría) y se publica un NOTAM de TRONADURA en la cantera que CORTA la operación BVLOS de INS103. ' +
    'Se evalúa todo: detección, contingencia, despeje, NOTAM, separación con tripulados y gestión de carga.',
  objectives: {
    utm: ['Contingencia C2 de DUC101: reconocer, declarar y despejar a TOP102', 'Separar a los UAS del helicóptero no cooperativo NC-01 y de CC-CPL', 'Activar el NOTAM de tronadura y suspender INS103 antes de que ingrese', 'Sin errores críticos — nota mínima 85'],
    uas: ['Cumplir las instrucciones de despeje en < 30 s', 'Descender / aterrizar ante tripulados', 'Conformidad ≥ 90 %'],
    rpas: ['Informar la pérdida C2 (DUC101) / suspender la misión por NOTAM (INS103)', 'No ingresar a la zona de tronadura', 'Colacionar'],
  },
  criticals: [CR_CONT, CR_LOS, CR_ZONE],
  zones: [
    { id: 'VA1', name: 'VOL DUC101 DUCTO MINERO (AUT-UAS-26-1101)', ring: BOX(C10, -5.5, -0.8, 1.0, 0.8), floor: 0, ceiling: 120, kind: 'SEGREGATED' },
    { id: 'VA2', name: 'VOL TOP102 PLANTA (AUT-UAS-26-1102)', ring: BOX(C10, -4.6, -1.6, -2.8, 0.6), floor: 0, ceiling: 120, kind: 'SEGREGATED' },
    { id: 'VA3', name: 'VOL INS103 ACUEDUCTO (AUT-UAS-26-1103)', ring: BOX(C10, 1.2, -0.8, 8.5, 0.8), floor: 0, ceiling: 120, kind: 'SEGREGATED' },
    { id: 'VA4', name: 'VOL VIG104 PERÍMETRO BODEGAS (AUT-UAS-26-1104)', ring: BOX(C10, -1.0, 2.0, 1.4, 3.8), floor: 0, ceiling: 120, kind: 'SEGREGATED' },
    { id: 'PA1', name: 'PROHIBIDA PLANTA DE EXPLOSIVOS (ENTRENAMIENTO)', ring: BOX(C10, 3.0, 2.0, 5.0, 3.6), floor: 0, ceiling: 999, kind: 'PROHIBITED' },
    { id: 'NA1', name: 'NOTAM C1120/26 RESTRINGIDA TRONADURA CANTERA LA NEGRA', ring: BOX(C10, 4.2, -2.2, 6.4, 1.6), floor: 0, ceiling: 600, kind: 'RESTRICTED', vlimit: 'SFC / 600 M', appearAt: 150 },
  ],
  flights: [
    { callsign: 'DUC101', acType: 'WINGTRA', op: 'BVLOS', speedKt: 45, batteryMin: 55, startT: 5, authRef: 'AUT-UAS-26-1101', zoneId: 'VA1', rtlAlt: 70,
      route: [P(C10, -5.2, 0.0, 0), P(C10, -4.9, 0.3, 110), P(C10, 0.6, 0.3, 110), P(C10, 0.6, -0.4, 110), P(C10, -4.9, -0.4, 110), P(C10, -5.2, 0.0, 0)] },
    { callsign: 'TOP102', acType: 'M300', op: 'VLOS', speedKt: 15, batteryMin: 40, startT: 5, authRef: 'AUT-UAS-26-1102', zoneId: 'VA2',
      route: [P(C10, -4.3, -1.3, 0), P(C10, -4.3, 0.3, 70), P(C10, -3.7, 0.3, 70), P(C10, -3.7, -1.3, 70), P(C10, -3.1, -1.3, 70), P(C10, -3.1, 0.3, 70), P(C10, -4.3, 0.3, 70), P(C10, -4.3, -1.3, 0)] },
    { callsign: 'INS103', acType: 'WINGTRA', op: 'BVLOS', speedKt: 40, batteryMin: 55, startT: 60, authRef: 'AUT-UAS-26-1103', zoneId: 'VA3',
      route: [P(C10, 1.6, 0.0, 0), P(C10, 1.9, 0.2, 100), P(C10, 8.2, 0.2, 100), P(C10, 8.2, -0.4, 100), P(C10, 1.9, -0.4, 100), P(C10, 1.6, 0.0, 0)] },
    { callsign: 'VIG104', acType: 'MAVIC 3T', op: 'VLOS', speedKt: 20, batteryMin: 35, startT: 15, authRef: 'AUT-UAS-26-1104', zoneId: 'VA4',
      route: [P(C10, -0.7, 2.3, 0), P(C10, -0.7, 3.5, 60), P(C10, 1.1, 3.5, 60), P(C10, 1.1, 2.3, 60), P(C10, -0.7, 2.3, 60), P(C10, -0.7, 3.5, 60), P(C10, 1.1, 3.5, 60), P(C10, -0.7, 2.3, 0)] },
    { callsign: 'NC-01', acType: 'HELI?', manned: true, noncoop: true, sector: 'GA', speedKt: 100, batteryMin: 999, startT: 20, authRef: 'SIN PLAN', zoneId: '',
      route: [P(C10, -1.5, 10, 300), P(C10, -0.1, 3.2, 90), P(C10, -1.5, -1.0, 90), P(C10, -3.0, -12, 300)] },
    { callsign: 'CC-CPL', acType: 'C206', manned: true, sector: 'GA', speedKt: 120, batteryMin: 999, startT: 60, authRef: 'VFR', zoneId: '',
      route: [P(C10, 16, 1.5, 400), P(C10, 3.0, 0.2, 150), P(C10, -16, -1.5, 400)] },
  ],
  events: [
    { t: 110, flight: 'DUC101', type: 'C2LOSS', clear: ['TOP102'] },
  ],
};

export const SCENARIOS: Scenario[] = [E1, E2, E3, E4, E5, E6, E7, E8, E9, E10];

// ejercicio previo que hay que aprobar para habilitar éste (el 1 no tiene prerrequisito)
export function prerequisiteOf(id: string): Scenario | undefined {
  const s = SCENARIOS.find((x) => x.id === id);
  if (!s?.order || s.order <= 1) return undefined;
  return SCENARIOS.find((x) => x.order === (s.order ?? 0) - 1);
}
