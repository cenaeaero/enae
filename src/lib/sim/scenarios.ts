import type { Scenario, SimFlight, Waypoint, Zone } from './engine';

// ═════════════════════════════════════════════════════════════════════════════
// CONDOR SIM — PROGRAMA DE 10 EJERCICIOS POR NIVELES (evaluación por competencias)
// N1 imagen de tráfico y comunicación · N2 autorización y conformidad ·
// N3 contingencias · N4 aeronaves tripuladas y NOTAM · N5 saturación y certificación.
// Para pasar de nivel hay que aprobar el ejercicio anterior.
//
// Todos los volúmenes y zonas son polígonos de 4 km de radio (28 vértices).
// La geometría se construye en km desde el centro de cada ejercicio (lugares reales
// de Chile) y los cruces se PROGRAMAN: cada conflicto, paso de aeronave tripulada y
// NOTAM se calcula para que ocurra a la hora indicada sobre una operación activa.
// Las designaciones de zonas son de entrenamiento (no reemplazan AIP/NOTAM vigentes).
//
// Curva de dificultad medida sin acciones del UTM (volúmenes · aeronaves tripuladas · NOTAM emergentes · conflictos STCA):
//   E1 2·0·0·0  E2 3·0·0·0  E3 4·1·0·1  E4 4·1·0·1  E5 5·1·0·2 (+C2)  E6 5·2·1·1 (+emergencia)
//   E7 6·2·1·3  E8 6·3·2·3  E9 8·4·2·4 (+handover)  E10 8·5·3·4 (+C2, tripulado no cooperativo)
// ═════════════════════════════════════════════════════════════════════════════

type C = [number, number]; // [lng, lat]
type XY = [number, number]; // km (este, norte) desde el centro
type K = [number, number, number]; // km este, km norte, altura m

const R_VOL = 4; // radio de volúmenes y zonas (km)
const KT = 0.514444; // m/s por nudo
const r5 = (x: number) => Math.round(x * 1e5) / 1e5;
const kLng = (c: C) => 1 / (111.32 * Math.cos((c[1] * Math.PI) / 180));
const P = (c: C, e: number, n: number, alt: number, hold?: number): Waypoint => ({
  lat: r5(c[1] + n / 111.32), lng: r5(c[0] + e * kLng(c)), alt, ...(hold ? { hold } : {}),
});
const CIRC = (c: C, at: XY, rKm = R_VOL, k = 28): [number, number][] => {
  const out: [number, number][] = [];
  for (let i = 0; i <= k; i++) {
    const a = ((i % k) / k) * 2 * Math.PI;
    const p = P(c, at[0] + rKm * Math.sin(a), at[1] + rKm * Math.cos(a), 0);
    out.push([p.lng, p.lat]);
  }
  return out;
};
const dKm = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const secs = (km: number, kt: number) => (km * 1000) / (kt * KT);
const tToIdx = (pts: K[], idx: number, kt: number) => {
  let d = 0;
  for (let i = 0; i < idx; i++) d += dKm(pts[i], pts[i + 1]);
  return secs(d, kt);
};
// posición (km) de una ruta a la hora T (vuelo AUTO a velocidad constante desde startT)
const posAt = (pts: K[], kt: number, startT: number, T: number): XY => {
  let rem = (Math.max(0, T - startT) * kt * KT) / 1000;
  for (let i = 0; i < pts.length - 1; i++) {
    const L = dKm(pts[i], pts[i + 1]);
    if (rem <= L) {
      const u = L ? rem / L : 0;
      return [pts[i][0] + u * (pts[i + 1][0] - pts[i][0]), pts[i][1] + u * (pts[i + 1][1] - pts[i][1])];
    }
    rem -= L;
  }
  const l = pts[pts.length - 1];
  return [l[0], l[1]];
};
const rot = (v: XY, deg: number): XY => {
  const a = (deg * Math.PI) / 180;
  return [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a)];
};
const unit = (v: XY): XY => { const L = Math.hypot(v[0], v[1]) || 1; return [v[0] / L, v[1] / L]; };
const add = (a: XY, b: XY, k = 1): XY => [a[0] + k * b[0], a[1] + k * b[1]];

interface Op { f: SimFlight; pts: K[] }
interface Spec { cs: string; op: 'VLOS' | 'BVLOS'; ac: string; kt: number; vol: string; vc: XY; alt: number; sector?: string; x?: Partial<SimFlight> }

const auth = (cs: string) => `AUT-UAS-26-${cs.replace(/\D/g, '').padStart(4, '0')}`;
const mkOp = (c: C, s: Spec, pts: K[], startT: number): Op => ({
  pts,
  f: {
    callsign: s.cs, acType: s.ac, op: s.op, speedKt: s.kt, batteryMin: s.op === 'BVLOS' ? 55 : 40,
    startT: Math.max(0, Math.round(startT)), authRef: auth(s.cs), zoneId: s.vol, route: pts.map((p) => P(c, p[0], p[1], p[2])),
    ...(s.sector ? { sector: s.sector } : {}), ...s.x,
  },
});
// operación sin cruce programado: circuito de radio r alrededor del centro del volumen
const missionOp = (c: C, s: Spec, r: number, startT: number, laps = 3, k = 4, a0 = 45): Op => {
  const home: XY = [s.vc[0], s.vc[1] - 0.5];
  const pts: K[] = [[home[0], home[1], 0]];
  for (let l = 0; l < laps; l++)
    for (let i = 0; i < k; i++) {
      const a = ((a0 + (i * 360) / k) * Math.PI) / 180;
      pts.push([s.vc[0] + r * Math.sin(a), s.vc[1] + r * Math.cos(a), s.alt]);
    }
  pts.push([home[0], home[1], 0]);
  return mkOp(c, s, pts, startT);
};
// operación programada para pasar por X a la hora T (base a mitad de camino entre el centro del volumen y X)
const crossOp = (c: C, s: Spec, X: XY, T: number, laps = 2): Op => {
  const u = unit([X[0] - s.vc[0], X[1] - s.vc[1]]);
  const dX = dKm(X, s.vc);
  const home = add(s.vc, u, dX * 0.5);
  const Y = add(s.vc, rot(u, 130), 2.6);
  const Z = add(s.vc, rot(u, -130), 2.6);
  const pts: K[] = [[home[0], home[1], 0], [X[0], X[1], s.alt]];
  for (let l = 0; l < laps; l++) pts.push([Y[0], Y[1], s.alt], [Z[0], Z[1], s.alt]);
  pts.push([home[0], home[1], 0]);
  return mkOp(c, s, pts, T - tToIdx(pts, 1, s.kt));
};
// dos operaciones en volúmenes superpuestos que se cruzan a la misma altura en el sector común a la hora T (STCA)
const crossPair = (c: C, a: Spec, b: Spec, T: number, laps = 2): [Op, Op] => {
  const X: XY = [(a.vc[0] + b.vc[0]) / 2, (a.vc[1] + b.vc[1]) / 2];
  return [crossOp(c, a, X, T, laps), crossOp(c, b, X, T, laps)];
};
const posOf = (o: Op, T: number) => posAt(o.pts, o.f.speedKt, o.f.startT, T);
// aeronave tripulada que pasa por la posición de una operación UAS a la hora T (rumbo brg, a baja altura)
const thru = (c: C, cs: string, ac: string, kt: number, target: Op, T: number, brg: number, alt: number, x: Partial<SimFlight> = {}, L1 = 9, L2 = 10): SimFlight => {
  const p = posOf(target, T);
  const d: XY = [Math.sin((brg * Math.PI) / 180), Math.cos((brg * Math.PI) / 180)];
  const S = add(p, d, -L1), E = add(p, d, L2);
  return {
    callsign: cs, acType: ac, manned: true, sector: 'GA', speedKt: kt, batteryMin: 999, authRef: 'VFR', zoneId: '',
    startT: Math.max(0, Math.round(T - secs(L1, kt))),
    route: [P(c, S[0], S[1], alt), P(c, p[0], p[1], alt), P(c, E[0], E[1], alt + 250)],
    ...x,
  };
};
const VOL = (c: C, id: string, name: string, at: XY, ceiling = 120): Zone => ({ id, name, ring: CIRC(c, at), floor: 0, ceiling, kind: 'SEGREGATED' });
const ZONE = (c: C, id: string, name: string, at: XY, kind: Zone['kind'], ceiling: number, appearAt?: number): Zone => ({
  id, name, ring: CIRC(c, at), floor: 0, ceiling, kind, vlimit: `SFC / ${ceiling} M AGL`, ...(appearAt != null ? { appearAt } : {}),
});
// rango inicial del scope: todo lo dibujado a la vista
const fitRange = (zones: Zone[], c: C) => {
  let m = 0;
  for (const z of zones) for (const [lng, lat] of z.ring) m = Math.max(m, Math.hypot((lng - c[0]) / kLng(c), (lat - c[1]) * 111.32));
  return Math.ceil((m / 1.852) * 1.08);
};
const build = (s: Omit<Scenario, 'rangeNm' | 'flights'> & { ops: Op[]; manned?: SimFlight[] }): Scenario => {
  const { ops, manned, ...rest } = s;
  return { ...rest, flights: [...ops.map((o) => o.f), ...(manned ?? [])], rangeNm: fitRange(s.zones, s.center) };
};

const CR_LOS = 'Pérdida de separación bajo mínimo (UAS–UAS 250 m / 30 m · UAS–aeronave tripulada 500 m / 60 m)';
const CR_ZONE = 'Entrada a zona prohibida o NOTAM activo';
const CR_AUTH = 'Autorizar un volumen que invade una restricción';
const CR_CONT = 'No declarar contingencia ante pérdida C2 / emergencia';
const CR_TKOF = 'Despegar sin autorización del Operador UTM';

// ───────────────────────── N1 · E1 — IMAGEN DE TRÁFICO NOMINAL (Lampa) ─────────────────────────
const C1: C = [-70.875, -33.285];
const E1 = (() => {
  const top = missionOp(C1, { cs: 'TOP11', op: 'VLOS', ac: 'M300', kt: 30, vol: 'V11', vc: [-4.6, 0], alt: 100 }, 2.6, 10, 3);
  const ins = missionOp(C1, { cs: 'INS12', op: 'BVLOS', ac: 'WINGTRA', kt: 45, vol: 'V12', vc: [4.6, 0], alt: 90 }, 3.2, 30, 3, 4, 0);
  return build({
    id: 'n1-e1-imagen-trafico', order: 1, level: 1, title: 'IMAGEN DE TRÁFICO NOMINAL',
    name: 'N1·E1 IMAGEN DE TRÁFICO NOMINAL — LAMPA', center: C1, durationS: 420, ackFpl: true,
    briefing:
      'Dos operaciones autorizadas al norte de Santiago (Lampa), cada una en su volumen de 4 km de radio, sin conflictos. TOP11 ' +
      '(Piloto UAS, VLOS) realiza levantamiento topográfico; INS12 (Piloto RPAS, BVLOS) inspecciona la línea eléctrica. El ' +
      'Operador UTM construye la imagen de tráfico: identifica cada vuelo, su autorización y volumen, y ACUSA los FPL/DEP en la ' +
      'ventana AFTN. A los 2 min llega una coordinación del piloto de TOP11 que se resuelve con una instrucción de altura.',
    objectives: {
      utm: ['Identificar ambos vuelos, su autorización (AUT) y su volumen', 'Acusar los mensajes FPL/DEP de cada operación (AFTN ▸ ACUSAR RECIBO)', 'Atender la coordinación de TOP11 con la instrucción de altura correcta (80 m)'],
      uas: ['Tomar el mando de TOP11 y volar el plan dentro del volumen', 'Colacionar la instrucción de altura y cumplirla', 'Respetar el techo de 120 m'],
      rpas: ['Tomar el mando de INS12 y ejecutar la misión programada', 'Mantener la conformidad del volumen', 'Colacionar cualquier instrucción UTM'],
    },
    criticals: [CR_LOS, CR_ZONE],
    zones: [
      VOL(C1, 'V11', 'VOL TOP11 (AUT-UAS-26-0011)', [-4.6, 0]),
      VOL(C1, 'V12', 'VOL INS12 LÍNEA 110 KV (AUT-UAS-26-0012)', [4.6, 0]),
      ZONE(C1, 'R11', 'RESTRINGIDA POLÍGONO DE TIRO LAMPA (ENTRENAMIENTO)', [0, 9.5], 'RESTRICTED', 1500),
    ],
    ops: [top, ins],
    events: [{ t: 120, flight: 'TOP11', type: 'TASK', instr: 'ALT', value: 80, text: 'PILOTO DE TOP11 INFORMA NUBOSIDAD BAJA Y SOLICITA OPERAR A 80 M — INSTRUYA A TOP11 80 M' }],
  });
})();

// ───────────────────────── N1 · E2 — COMUNICACIÓN Y COLACIÓN (Isla de Maipo) ─────────────────────────
const C2: C = [-70.9, -33.75];
const E2 = (() => {
  const a21 = missionOp(C2, { cs: 'AGR21', op: 'VLOS', ac: 'AGRAS T40', kt: 20, vol: 'V21', vc: [-5, -2], alt: 30 }, 2.2, 5, 3, 6);
  const a22 = missionOp(C2, { cs: 'AGR22', op: 'BVLOS', ac: 'WINGTRA', kt: 40, vol: 'V22', vc: [4.2, -2], alt: 110 }, 3, 15, 3, 4, 0);
  const a23 = missionOp(C2, { cs: 'AGR23', op: 'VLOS', ac: 'M350', kt: 25, vol: 'V23', vc: [0, 6.5], alt: 60 }, 2.4, 25, 3, 6, 30);
  return build({
    id: 'n1-e2-comunicacion', order: 2, level: 1, title: 'COMUNICACIÓN Y COLACIÓN',
    name: 'N1·E2 COMUNICACIÓN Y COLACIÓN — ISLA DE MAIPO', center: C2, durationS: 360, ackFpl: true,
    briefing:
      'Tres operaciones agrícolas en Isla de Maipo, en volúmenes separados (sin conflictos). AGR21 (Piloto UAS, VLOS) fumiga ' +
      'viñedos, AGR22 (Piloto RPAS, BVLOS) mapea el predio vecino y AGR23 (UAS) monitorea cultivos. Llegan TRES coordinaciones que ' +
      'el Operador UTM resuelve con instrucciones: ALTURA, ESPERA y REANUDAR. Los pilotos COLACIONAN cada instrucción y la cumplen. ' +
      'Se mide el tiempo de respuesta del UTM, la colación y el cumplimiento.',
    objectives: {
      utm: ['Emitir la instrucción de ALTURA a AGR22 (80 m)', 'Emitir ESPERA a AGR21 y luego REANUDAR cuando se despeje', 'Verificar la colación de cada instrucción', 'Acusar FPL/DEP'],
      uas: ['Colacionar ESPERA y REANUDAR de inmediato', 'Mantener posición mientras dura la espera', 'Volar dentro del volumen'],
      rpas: ['Colacionar la instrucción de altura', 'Ajustar la altura de la misión a 80 m sin abandonar la ruta', 'Mantener conformidad'],
    },
    criticals: [CR_LOS, CR_ZONE],
    zones: [
      VOL(C2, 'V21', 'VOL AGR21 VIÑEDO (AUT-UAS-26-0021)', [-5, -2]),
      VOL(C2, 'V22', 'VOL AGR22 MAPEO (AUT-UAS-26-0022)', [4.2, -2]),
      VOL(C2, 'V23', 'VOL AGR23 CULTIVOS (AUT-UAS-26-0023)', [0, 6.5]),
    ],
    ops: [a21, a22, a23],
    events: [
      { t: 70, flight: 'AGR22', type: 'TASK', instr: 'ALT', value: 80, text: 'DRON DE PRENSA AUTORIZADO TRANSITARÁ A 110 M SOBRE EL PREDIO DE AGR22 — INSTRUYA A AGR22 80 M' },
      { t: 140, flight: 'AGR21', type: 'TASK', instr: 'HOLD', text: 'CUADRILLA DE RIEGO INGRESA AL CUARTEL DE AGR21 — INSTRUYA ESPERA (MANTENGA POSICIÓN)' },
      { t: 210, flight: 'AGR21', type: 'TASK', instr: 'RESUME', text: 'CUADRILLA FUERA DEL CUARTEL — INSTRUYA A AGR21 REANUDAR LA MISIÓN' },
    ],
  });
})();

// ───────────────────────── N2 · E3 — AUTORIZACIÓN DE VOLÚMENES (Valparaíso) ─────────────────────────
const C3: C = [-71.6, -33.02];
const E3 = (() => {
  // INS31 y TOP32: volúmenes que se superponen; si ambos se aprueban a tiempo se cruzan (conflicto leve)
  const [ins, top] = crossPair(C3,
    { cs: 'INS31', op: 'VLOS', ac: 'M30T', kt: 30, vol: 'V31', vc: [2.5, 2.5], alt: 80, x: { req: { id: 'SOL-3101', operator: 'INSPECCIONES COSTA SPA', purpose: 'Inspección de fachadas en Viña del Mar', ceiling: 80, window: '1200-1230 UTC', expect: 'APPROVE', reason: 'Volumen libre de restricciones y techo dentro del máximo' } } },
    { cs: 'TOP32', op: 'BVLOS', ac: 'WINGTRA', kt: 40, vol: 'V32', vc: [8, 6.5], alt: 100, x: { req: { id: 'SOL-3102', operator: 'GEOMAR TOPOGRAFÍA LTDA', purpose: 'Levantamiento borde costero Reñaca (BVLOS)', ceiling: 110, window: '1200-1245 UTC', expect: 'APPROVE', reason: 'Volumen libre de restricciones y techo dentro del máximo' } } },
    250);
  const fil: Op = mkOp(C3, { cs: 'FIL33', op: 'VLOS', ac: 'MAVIC 3', kt: 20, vol: 'V33', vc: [-3, -1], alt: 90, x: { req: { id: 'SOL-3103', operator: 'AUDIOVISUAL PACÍFICO', purpose: 'Filmación de la bahía', ceiling: 100, window: '1200-1220 UTC', expect: 'DENY', reason: 'El volumen invade la zona PROHIBIDA BASE NAVAL' } } },
    [[-2.5, -0.5, 0], [-5, -2.8, 90], [-3, -4, 90], [-1, -1.5, 90], [-2.5, -0.5, 0]], 60);
  const pub = missionOp(C3, { cs: 'PUB34', op: 'VLOS', ac: 'M350', kt: 20, vol: 'V34', vc: [5.5, -6.5], alt: 140, x: { req: { id: 'SOL-3104', operator: 'EVENTOS VALPO SPA', purpose: 'Registro aéreo de evento en Playa Ancha', ceiling: 150, window: '1205-1230 UTC', expect: 'MODIFY', maxCeil: 120, reason: 'Techo solicitado 150 m excede el máximo admisible de 120 m' } } }, 2.2, 90, 3);
  // aeronave tripulada lejana y alta (sólo imagen de tráfico)
  const lvp: SimFlight = { callsign: 'CC-LVP', acType: 'C172', manned: true, sector: 'GA', speedKt: 100, batteryMin: 999, startT: 90, authRef: 'VFR', zoneId: '', route: [P(C3, -16, 14, 450), P(C3, 18, 13, 450)] };
  return build({
    id: 'n2-e3-autorizacion', order: 3, level: 2, title: 'AUTORIZACIÓN DE VOLÚMENES',
    name: 'N2·E3 AUTORIZACIÓN DE VOLÚMENES — VALPARAÍSO', center: C3, durationS: 420,
    briefing:
      'Llegan CUATRO solicitudes de operación en Valparaíso–Viña del Mar (GESTIÓN UTM ▸ SOLICITUDES). El Operador UTM revisa ' +
      'volumen, techo y propósito contra las restricciones vigentes: APRUEBA las que cumplen, RECHAZA la que invade la zona ' +
      'prohibida naval y MODIFICA la que pide un techo superior al máximo (120 m). Ningún vuelo despega sin autorización. Los ' +
      'volúmenes de INS31 y TOP32 se superponen: una vez aprobados se cruzan en el sector común (primer conflicto, leve) y el UTM ' +
      'lo resuelve con una instrucción. Una aeronave tripulada transita lejos y alta al norte.',
    objectives: {
      utm: ['Aprobar INS31 y TOP32, rechazar FIL33 (invade la PROHIBIDA BASE NAVAL) y modificar PUB34 a techo ≤ 120 m', 'Decidir antes de la hora de despegue solicitada', 'Resolver el cruce INS31 / TOP32 en el sector común (espera o cambio de altura)'],
      uas: ['No despegar mientras la solicitud esté pendiente o rechazada (DESPEGAR sólo con autorización)', 'Respetar el techo autorizado', 'Cumplir la resolución del cruce'],
      rpas: ['No despegar sin autorización', 'Verificar el techo autorizado antes del despegue', 'Cumplir la resolución del cruce y colacionar'],
    },
    criticals: [CR_AUTH, CR_TKOF, CR_ZONE, CR_LOS],
    zones: [
      ZONE(C3, 'P31', 'PROHIBIDA BASE NAVAL / MUELLE PRAT (ENTRENAMIENTO)', [-7.5, -5.5], 'PROHIBITED', 999),
      VOL(C3, 'V31', 'VOL INS31 FACHADAS VIÑA (SOL 3101)', [2.5, 2.5], 90),
      VOL(C3, 'V32', 'VOL TOP32 BORDE COSTERO REÑACA (SOL 3102)', [8, 6.5]),
      VOL(C3, 'V33', 'VOL FIL33 FILMACIÓN BAHÍA (SOL 3103)', [-3, -1]),
      VOL(C3, 'V34', 'VOL PUB34 EVENTO PLAYA ANCHA (SOL 3104)', [5.5, -6.5]),
    ],
    ops: [ins, top, fil, pub],
    manned: [lvp],
    events: [],
  });
})();

// ───────────────────────── N2 · E4 — CONFORMIDAD (Doñihue / Rancagua) ─────────────────────────
const C4: C = [-70.96, -34.22];
const E4 = (() => {
  // AGR41: tramo pegado al borde oeste; una ráfaga lo saca del volumen si el piloto no corrige
  const agr = mkOp(C4, { cs: 'AGR41', op: 'VLOS', ac: 'AGRAS T40', kt: 25, vol: 'V41', vc: [-4.5, 0], alt: 40 },
    [[-6.5, -1.5, 0], [-8.0, -1.5, 40], [-8.0, 1.8, 40], [-5.5, 2.5, 40], [-3, 0, 40], [-5.5, -2.5, 40], [-8.0, -1.5, 40], [-8.0, 1.8, 40], [-6.5, -1.5, 0]], 5);
  // INS42 (RPAS) y TOP43 (UAS) se cruzan en el sector común; después INS42 tiene un tramo que roza el techo (132 m)
  const [ins, top] = crossPair(C4,
    { cs: 'INS42', op: 'BVLOS', ac: 'WINGTRA', kt: 40, vol: 'V42', vc: [4.5, 0], alt: 100 },
    { cs: 'TOP43', op: 'VLOS', ac: 'M300', kt: 25, vol: 'V43', vc: [2, 6.5], alt: 100 }, 210);
  ins.pts = ins.pts.map((p, i) => (i === 2 || i === 3 ? [p[0], p[1], 132] : p) as K);
  ins.f.route = ins.pts.map((p) => P(C4, p[0], p[1], p[2]));
  const agr44 = missionOp(C4, { cs: 'AGR44', op: 'VLOS', ac: 'M350', kt: 25, vol: 'V44', vc: [1, -8], alt: 60 }, 2.4, 20, 3);
  const kqr: SimFlight = { callsign: 'CC-KQR', acType: 'C172', manned: true, sector: 'GA', speedKt: 100, batteryMin: 999, startT: 120, authRef: 'VFR', zoneId: '', route: [P(C4, -16, -4, 380), P(C4, 18, -10, 380)] };
  return build({
    id: 'n2-e4-conformidad', order: 4, level: 2, title: 'CONFORMIDAD',
    name: 'N2·E4 CONFORMIDAD — DOÑIHUE (VALLE DEL CACHAPOAL)', center: C4, durationS: 420,
    briefing:
      'Cuatro operaciones en el valle del Cachapoal. AGR41 (Piloto UAS, VLOS) aplica junto al borde oeste de su volumen con viento ' +
      'cruzado: una ráfaga lo empuja fuera y el piloto debe corregir. INS42 (Piloto RPAS, BVLOS) y TOP43 (UAS) tienen volúmenes que ' +
      'se superponen y se cruzan a la misma altura (conflicto leve que resuelve el UTM); después INS42 tiene programado un tramo que ' +
      'ROZA EL TECHO (132 m > 120 m). Aparece el primer avión de paso (CC-KQR desde Rancagua), alto y lejano: identificarlo y vigilarlo.',
    objectives: {
      utm: ['Detectar el desvío lateral de AGR41 y ordenar corrección', 'Resolver el cruce INS42 / TOP43', 'Detectar a INS42 sobre el techo y ordenar altura ≤ 110 m', 'Identificar la aeronave tripulada CC-KQR y vigilar su trayectoria'],
      uas: ['Corregir la deriva por viento y volver al volumen (≥ 90 % del tiempo dentro)', 'Colacionar y cumplir las instrucciones', 'Desvío máximo < 100 m'],
      rpas: ['Detectar el tramo de la misión sobre el techo y corregir (▼ BAJAR) antes de excederlo', 'Cumplir la resolución del cruce', 'Techo respetado'],
    },
    criticals: [CR_LOS, CR_ZONE],
    zones: [
      VOL(C4, 'V41', 'VOL AGR41 VIÑEDO (AUT-UAS-26-0041)', [-4.5, 0]),
      VOL(C4, 'V42', 'VOL INS42 CANAL DE REGADÍO (AUT-UAS-26-0042)', [4.5, 0]),
      VOL(C4, 'V43', 'VOL TOP43 LOTEO (AUT-UAS-26-0043)', [2, 6.5]),
      VOL(C4, 'V44', 'VOL AGR44 HUERTO (AUT-UAS-26-0044)', [1, -8]),
    ],
    ops: [agr, ins, top, agr44],
    manned: [kqr],
    events: [{ t: 150, flight: 'AGR41', type: 'GUST', hdg: 265, duration: 80 }],
  });
})();

// ───────────────────────── N3 · E5 — PÉRDIDA C2 RPAS (Mejillones) ─────────────────────────
const C5: C = [-70.4, -23.15];
const E5 = (() => {
  // INS51: tramo de ida a 110 m sobre TOP52; ante pérdida C2 el failsafe vuelve a la base a 60 m (RTL_ALT) cruzando a TOP52
  const ins = mkOp(C5, { cs: 'INS51', op: 'BVLOS', ac: 'WINGTRA', kt: 45, vol: 'V51', vc: [3, 0], alt: 110, x: { rtlAlt: 60 } },
    [[0, 0, 0], [1, 0, 110], [6.5, 0, 110], [6.5, 1.5, 110], [1, 1.5, 110], [1, -1.5, 110], [6.5, -1.5, 110], [0, 0, 0]], 8);
  const topPts: K[] = [[1.5, -0.9, 0]];
  for (let l = 0; l < 4; l++) topPts.push([1.2, 0.12, 60], [2.8, 0.12, 60], [2.8, -0.12, 60], [1.2, -0.12, 60]);
  topPts.push([1.5, -0.9, 0]);
  const top = mkOp(C5, { cs: 'TOP52', op: 'VLOS', ac: 'M300', kt: 15, vol: 'V52', vc: [0, 0], alt: 60 }, topPts, 70);
  const [agr, i54] = crossPair(C5,
    { cs: 'AGR53', op: 'VLOS', ac: 'M350', kt: 30, vol: 'V53', vc: [-6, 7], alt: 100 },
    { cs: 'INS54', op: 'BVLOS', ac: 'WINGTRA', kt: 40, vol: 'V54', vc: [-1, 9], alt: 100 }, 150);
  const vig = missionOp(C5, { cs: 'VIG55', op: 'VLOS', ac: 'MAVIC 3T', kt: 20, vol: 'V55', vc: [9, -7], alt: 50 }, 2.4, 20, 3);
  const pan: SimFlight = { callsign: 'CC-PAN', acType: 'C208', manned: true, sector: 'GA', speedKt: 150, batteryMin: 999, startT: 60, authRef: 'VFR', zoneId: '', route: [P(C5, -16, -12, 600), P(C5, 18, -11, 600)] };
  return build({
    id: 'n3-e5-perdida-c2', order: 5, level: 3, title: 'PÉRDIDA C2 DE RPAS',
    name: 'N3·E5 PÉRDIDA DE ENLACE C2 RPAS — MEJILLONES', center: C5, durationS: 420,
    briefing:
      'Cinco operaciones en Mejillones. Primero AGR53 e INS54 se cruzan en su sector común (conflicto STCA a resolver). INS51 ' +
      '(Piloto RPAS, BVLOS) inspecciona la línea de transmisión a 110 m y a los 3 min 20 s PIERDE EL ENLACE C2: su failsafe vuelve ' +
      'en línea recta a la base DESCENDIENDO A 60 m (RTL), justo sobre TOP52 (Piloto UAS, VLOS) que trabaja a 60 m en la ' +
      'subestación. El Operador UTM reconoce la alarma, DECLARA LA CONTINGENCIA y DESPEJA la trayectoria de RTL. Un avión de ' +
      'transporte (CC-PAN) cruza alto al sur.',
    objectives: {
      utm: ['Resolver el cruce AGR53 / INS54', 'Reconocer la pérdida C2 de INS51 (≤ 20 s) y declarar la contingencia', 'Despejar la trayectoria de RTL: instruir a TOP52 (descenso / aterrizaje)', 'Mantener la separación'],
      uas: ['Colacionar y cumplir de inmediato la instrucción para despejar el RTL', 'Mantener conformidad del volumen'],
      rpas: ['Informar al UTM la pérdida de enlace (INFORMAR CONTINGENCIA)', 'Confirmar el RTL automático y el aterrizaje en base', 'Cumplir la resolución del cruce'],
    },
    criticals: [CR_CONT, CR_LOS, CR_ZONE],
    zones: [
      VOL(C5, 'V51', 'VOL INS51 LÍNEA 220 KV (AUT-UAS-26-0051)', [3, 0]),
      VOL(C5, 'V52', 'VOL TOP52 SUBESTACIÓN (AUT-UAS-26-0052)', [0, 0]),
      VOL(C5, 'V53', 'VOL AGR53 (AUT-UAS-26-0053)', [-6, 7]),
      VOL(C5, 'V54', 'VOL INS54 ACUEDUCTO (AUT-UAS-26-0054)', [-1, 9]),
      VOL(C5, 'V55', 'VOL VIG55 PUERTO (AUT-UAS-26-0055)', [9, -7]),
    ],
    ops: [ins, top, agr, i54, vig],
    manned: [pan],
    events: [{ t: 200, flight: 'INS51', type: 'C2LOSS', clear: ['TOP52'] }],
  });
})();

// ───────────────────────── N3 · E6 — BATERÍA BAJA / EMERGENCIA UAS (Arauco) ─────────────────────────
const C6: C = [-73.32, -37.27];
const E6 = (() => {
  const alt: XY = [2.9, 1.0]; // claro forestal (sitio alternativo de FOR61)
  const f61 = mkOp(C6, { cs: 'FOR61', op: 'VLOS', ac: 'M30T', kt: 30, vol: 'V61', vc: [0, 0], alt: 100, x: { batteryMin: 12, altLand: { ...P(C6, alt[0], alt[1], 0), name: 'CLARO FORESTAL KM 14' } } },
    [[0, 0, 0], [2.8, 2.2, 100], [2.8, -2.2, 100], [-2, -2, 100], [0, 0, 0]], 5);
  // FOR62 (RPAS multirrotor) mapea el claro en órbita estrecha a 60 m: el UTM debe despejarlo
  const orb: K[] = [[5, 2, 0]];
  for (let l = 0; l < 12; l++) for (let i = 0; i < 6; i++) { const a = (i * Math.PI) / 3; orb.push([alt[0] + 0.15 * Math.sin(a), alt[1] + 0.15 * Math.cos(a), 60]); }
  orb.push([5, 2, 0]);
  const f62 = mkOp(C6, { cs: 'FOR62', op: 'BVLOS', ac: 'M300', kt: 20, vol: 'V62', vc: [5, 3], alt: 60 }, orb, 120);
  const [f63, f64] = crossPair(C6,
    { cs: 'FOR63', op: 'VLOS', ac: 'M350', kt: 30, vol: 'V63', vc: [-8, 6], alt: 100 },
    { cs: 'FOR64', op: 'BVLOS', ac: 'WINGTRA', kt: 40, vol: 'V64', vc: [-3, 9], alt: 100 }, 170);
  const f65 = missionOp(C6, { cs: 'FOR65', op: 'VLOS', ac: 'MAVIC 3T', kt: 25, vol: 'V65', vc: [3, -9], alt: 100 }, 2.5, 10, 3);
  return build({
    id: 'n3-e6-bateria-emergencia', order: 6, level: 3, title: 'BATERÍA BAJA / EMERGENCIA UAS',
    name: 'N3·E6 BATERÍA BAJA / EMERGENCIA — ARAUCO (FORESTAL)', center: C6, durationS: 420,
    briefing:
      'Cinco operaciones forestales en Arauco. FOR63 y FOR64 se cruzan en su sector común (conflicto STCA). Un avión de instrucción ' +
      '(CC-PRI) cruza bajo sobre FOR65. A los 3 min 20 s FOR61 (Piloto UAS, VLOS) reporta BATERÍA BAJA y luego EMERGENCIA: no ' +
      'alcanza la base y debe aterrizar en el SITIO ALTERNATIVO (claro forestal km 14), donde FOR62 (Piloto RPAS) mapea en órbita a ' +
      '60 m. El UTM da PRIORIDAD: contingencia, aterrizaje en alternativo y despeje de FOR62. Se publica un NOTAM por INCENDIO ' +
      'FORESTAL sobre FOR63/FOR64 y el helicóptero de brigada CC-ABR entra a la zona.',
    objectives: {
      utm: ['Resolver el cruce FOR63 / FOR64', 'Emergencia de FOR61: contingencia, ATERRIZAJE EN ALTERNATIVO y despeje de FOR62', 'Separar a FOR65 del avión CC-PRI', 'Activar el NOTAM de incendio y sacar las operaciones afectadas; separar al helicóptero CC-ABR'],
      uas: ['Informar la contingencia al UTM', 'Aterrizar en el sitio ALTERNATIVO antes de agotar la batería (botón ALTERNATIVO)', 'Colacionar y cumplir'],
      rpas: ['Cumplir la instrucción de despeje (espera / RTL / altura)', 'No ingresar a la zona NOTAM', 'Colacionar'],
    },
    criticals: [CR_CONT, CR_LOS, CR_ZONE],
    zones: [
      VOL(C6, 'V61', 'VOL FOR61 RODAL HORCONES (AUT-UAS-26-0061)', [0, 0]),
      VOL(C6, 'V62', 'VOL FOR62 MAPEO CLARO (AUT-UAS-26-0062)', [5, 3]),
      VOL(C6, 'V63', 'VOL FOR63 (AUT-UAS-26-0063)', [-8, 6]),
      VOL(C6, 'V64', 'VOL FOR64 (AUT-UAS-26-0064)', [-3, 9]),
      VOL(C6, 'V65', 'VOL FOR65 (AUT-UAS-26-0065)', [3, -9]),
      ZONE(C6, 'N61', 'NOTAM C0610/26 RESTRINGIDA INCENDIO FORESTAL', posOf(f64, 250), 'RESTRICTED', 600, 250),
    ],
    ops: [f61, f62, f63, f64, f65],
    manned: [
      thru(C6, 'CC-PRI', 'C172', 95, f65, 140, 70, 150),
      thru(C6, 'CC-ABR', 'B407', 110, f63, 320, 200, 120, { authRef: 'BRIGADA' }),
    ],
    events: [
      { t: 200, flight: 'FOR61', type: 'LOWBAT', clear: ['FOR62'] },
      { t: 215, flight: 'FOR61', type: 'EMERG', clear: ['FOR62'] },
    ],
  });
})();

// ───────────────────────── N4 · E7 — CONFLICTOS STCA + AERONAVES TRIPULADAS BAJAS (Los Andes) ─────────────────────────
const C7: C = [-70.62, -32.79];
const E7 = (() => {
  const [a71, i72] = crossPair(C7,
    { cs: 'AGR71', op: 'VLOS', ac: 'M350', kt: 30, vol: 'V71', vc: [-6, 2], alt: 100 },
    { cs: 'INS72', op: 'BVLOS', ac: 'WINGTRA', kt: 45, vol: 'V72', vc: [-1, 5.5], alt: 100 }, 130);
  const [t73, f74] = crossPair(C7,
    { cs: 'TOP73', op: 'VLOS', ac: 'M300', kt: 25, vol: 'V73', vc: [5.5, 2], alt: 90 },
    { cs: 'FUM74', op: 'VLOS', ac: 'AGRAS T40', kt: 25, vol: 'V74', vc: [2, -4], alt: 90 }, 190);
  const [v75, m76] = crossPair(C7,
    { cs: 'VIG75', op: 'VLOS', ac: 'MAVIC 3T', kt: 25, vol: 'V75', vc: [-7, -6.5], alt: 80 },
    { cs: 'MAP76', op: 'BVLOS', ac: 'WINGTRA', kt: 40, vol: 'V76', vc: [-2, -9], alt: 80 }, 250);
  return build({
    id: 'n4-e7-conflictos-tripulados', order: 7, level: 4, title: 'CONFLICTOS STCA + AERONAVES TRIPULADAS',
    name: 'N4·E7 CONFLICTOS STCA + AERONAVES TRIPULADAS BAJAS — LOS ANDES', center: C7, durationS: 420,
    briefing:
      'Seis operaciones en el valle de Aconcagua (San Esteban – Los Andes) en tres pares de volúmenes superpuestos: cada par se ' +
      'cruza a la misma altura (tres conflictos STCA escalonados a los ~2, 3 y 4 min). Mientras tanto el avión VFR CC-PZT (PA-28) ' +
      'cruza BAJO (140 m) sobre las operaciones hacia el aeródromo de Los Andes y el helicóptero policial CC-HCP patrulla a 120 m. ' +
      'Se publica un NOTAM de rescate en montaña sobre el sector sur. El UTM resuelve cada conflicto con instrucciones, da ' +
      'información de tráfico y hace DESCENDER / ESPERAR / ATERRIZAR a los UAS ante cada aeronave tripulada.',
    objectives: {
      utm: ['Detectar y resolver los 3 conflictos STCA (espera o cambio de altura)', 'Detectar a CC-PZT y CC-HCP antes de que lleguen y ordenar descenso ≤ 60 m o aterrizaje a los UAS en su trayectoria', 'Activar el NOTAM y sacar a las operaciones afectadas', 'Separación con aeronaves tripuladas 500 m / 60 m'],
      uas: ['Cumplir la instrucción de resolución en < 30 s', 'Descender / aterrizar ante aeronaves tripuladas', 'Colacionar'],
      rpas: ['Cumplir la resolución STCA', 'Ajustar altura sin abandonar la ruta', 'No ingresar al NOTAM'],
    },
    criticals: [CR_LOS, CR_ZONE],
    zones: [
      VOL(C7, 'V71', 'VOL AGR71 VIÑEDO SAN ESTEBAN', [-6, 2]),
      VOL(C7, 'V72', 'VOL INS72 CANAL (BVLOS)', [-1, 5.5]),
      VOL(C7, 'V73', 'VOL TOP73 LOTEO', [5.5, 2]),
      VOL(C7, 'V74', 'VOL FUM74 PARRONALES', [2, -4]),
      VOL(C7, 'V75', 'VOL VIG75 TRANQUE', [-7, -6.5]),
      VOL(C7, 'V76', 'VOL MAP76 LADERA (BVLOS)', [-2, -9]),
      ZONE(C7, 'N71', 'NOTAM C0702/26 RESTRINGIDA RESCATE EN MONTAÑA', posOf(m76, 300), 'RESTRICTED', 900, 300),
    ],
    ops: [a71, i72, t73, f74, v75, m76],
    manned: [
      thru(C7, 'CC-PZT', 'PA28', 95, a71, 230, 110, 140),
      thru(C7, 'CC-HCP', 'H125', 100, t73, 290, 250, 120, { authRef: 'POLICIAL' }),
    ],
    events: [],
  });
})();

// ───────────────────────── N4 · E8 — HELICÓPTERO EMS + 2 NOTAM EMERGENTES (Curacaví) ─────────────────────────
const C8: C = [-71.15, -33.4];
const E8 = (() => {
  const [t81, a82] = crossPair(C8,
    { cs: 'TOP81', op: 'VLOS', ac: 'M300', kt: 25, vol: 'V81', vc: [-7, 3], alt: 90 },
    { cs: 'AGR82', op: 'VLOS', ac: 'AGRAS T40', kt: 25, vol: 'V82', vc: [-2, 6], alt: 90 }, 150);
  const [i83, l84] = crossPair(C8,
    { cs: 'INS83', op: 'BVLOS', ac: 'WINGTRA', kt: 40, vol: 'V83', vc: [4, 2], alt: 100 },
    { cs: 'LIN84', op: 'BVLOS', ac: 'WINGTRA', kt: 40, vol: 'V84', vc: [1, -4], alt: 100 }, 220);
  const [v85, m86] = crossPair(C8,
    { cs: 'VIG85', op: 'VLOS', ac: 'MAVIC 3T', kt: 25, vol: 'V85', vc: [9, -5], alt: 80 },
    { cs: 'MAP86', op: 'BVLOS', ac: 'WINGTRA', kt: 40, vol: 'V86', vc: [5, -10], alt: 80 }, 280);
  const acc = posOf(l84, 175); // accidente en Ruta 68: sitio de aterrizaje del EMS (sobre LIN84 ya en vuelo)
  const ems: SimFlight = {
    callsign: 'CC-AMH', acType: 'H125', manned: true, sector: 'GA', speedKt: 110, batteryMin: 999, startT: 60, authRef: 'EMS', zoneId: '',
    route: [P(C8, 14, 2, 150), P(C8, acc[0] + 2, acc[1] + 0.5, 100), P(C8, acc[0], acc[1], 0, 150), P(C8, 20, 4, 450)],
  };
  return build({
    id: 'n4-e8-ems-notam', order: 8, level: 4, title: 'HELICÓPTERO EMS + NOTAM EMERGENTES',
    name: 'N4·E8 HELICÓPTERO EMS + NOTAM EMERGENTES — CURACAVÍ / RUTA 68', center: C8, durationS: 450,
    briefing:
      'Accidente en Ruta 68 (Curacaví). A los 2 min 50 s se publica un NOTAM de zona restringida para la operación aeromédica, que corta ' +
      'las operaciones INS83 y LIN84, y el helicóptero EMS CC-AMH (H125) llega desde Santiago a baja altura para aterrizar en el ' +
      'sitio. Seis operaciones en tres pares de volúmenes superpuestos generan tres conflictos STCA escalonados. A los 5 min un ' +
      'segundo NOTAM (incendio de pastizales) corta el sector oeste; el helicóptero policial CC-HCP y el avión CC-KMN cruzan bajo. ' +
      'El UTM ACTIVA cada restricción, ordena SUSPENDER (RTL / aterrizaje / espera fuera) y separa a todas las aeronaves tripuladas.',
    objectives: {
      utm: ['Activar ambos NOTAM (≤ 60 s) y sacar a las operaciones afectadas', 'Separar al EMS CC-AMH, al helicóptero CC-HCP y al avión CC-KMN de los UAS', 'Resolver los 3 conflictos STCA', 'Ninguna operación dentro de un NOTAM tras 120 s'],
      uas: ['Colacionar y cumplir en < 30 s', 'No ingresar a zonas NOTAM', 'Aterrizar si se ordena'],
      rpas: ['Suspender la misión según instrucción (RTL / espera)', 'No ingresar a zonas NOTAM', 'Colacionar'],
    },
    criticals: [CR_ZONE, CR_LOS],
    zones: [
      VOL(C8, 'V81', 'VOL TOP81 LOTEO', [-7, 3]),
      VOL(C8, 'V82', 'VOL AGR82 PARRONALES', [-2, 6]),
      VOL(C8, 'V83', 'VOL INS83 LÍNEA (BVLOS)', [4, 2]),
      VOL(C8, 'V84', 'VOL LIN84 RUTA 68 (BVLOS)', [1, -4]),
      VOL(C8, 'V85', 'VOL VIG85 TÚNEL LO PRADO', [9, -5]),
      VOL(C8, 'V86', 'VOL MAP86 CUESTA (BVLOS)', [5, -10]),
      ZONE(C8, 'N81', 'NOTAM C0412/26 RESTRINGIDA ACCIDENTE RUTA 68', acc, 'RESTRICTED', 300, 170),
      ZONE(C8, 'N82', 'NOTAM C0418/26 RESTRINGIDA INCENDIO PASTIZALES', posOf(a82, 300), 'RESTRICTED', 600, 300),
    ],
    ops: [t81, a82, i83, l84, v85, m86],
    manned: [ems, thru(C8, 'CC-HCP', 'H125', 100, v85, 250, 290, 110, { authRef: 'POLICIAL' }), thru(C8, 'CC-KMN', 'C172', 95, t81, 330, 80, 140)],
    events: [],
  });
})();

// ───────────────────────── N5 · E9 — SATURACIÓN, 2 SECTORES Y HANDOVER (Gran Concepción) ─────────────────────────
const C9: C = [-73.06, -36.8];
const E9 = (() => {
  const N = 'S1', S = 'S2';
  const [t91, p92] = crossPair(C9,
    { cs: 'TAL91', op: 'VLOS', ac: 'M30T', kt: 25, vol: 'V91', vc: [-7, 8], alt: 80, sector: N },
    { cs: 'PEN92', op: 'BVLOS', ac: 'WINGTRA', kt: 40, vol: 'V92', vc: [-2, 11], alt: 80, sector: N }, 140);
  const [h93, u94] = crossPair(C9,
    { cs: 'HUA93', op: 'VLOS', ac: 'M300', kt: 25, vol: 'V93', vc: [5, 6], alt: 100, sector: N },
    { cs: 'UDC94', op: 'BVLOS', ac: 'WINGTRA', kt: 40, vol: 'V94', vc: [7, 0.8], alt: 100, sector: N }, 210);
  const [s95, c96] = crossPair(C9,
    { cs: 'SPP95', op: 'VLOS', ac: 'MAVIC 3E', kt: 25, vol: 'V95', vc: [-7, -4], alt: 70, sector: S },
    { cs: 'COR96', op: 'BVLOS', ac: 'WINGTRA', kt: 40, vol: 'V96', vc: [-3, -9], alt: 70, sector: S }, 280);
  const [b97, l98] = crossPair(C9,
    { cs: 'BIO97', op: 'VLOS', ac: 'M350', kt: 25, vol: 'V97', vc: [2, -5], alt: 90, sector: S },
    { cs: 'LAG98', op: 'BVLOS', ac: 'WINGTRA', kt: 40, vol: 'V98', vc: [7, -9], alt: 90, sector: S }, 350);
  return build({
    id: 'n5-e9-saturacion', order: 9, level: 5, title: 'SATURACIÓN · 2 SECTORES · HANDOVER',
    name: 'N5·E9 SATURACIÓN 2 SECTORES — GRAN CONCEPCIÓN', center: C9, durationS: 540, sectors: ['S1', 'S2'], handover: ['UDC94'],
    briefing:
      'Ocho operaciones simultáneas en el Gran Concepción, divididas en S1 NORTE (Talcahuano–Penco–Hualpén) y S2 SUR (San Pedro–' +
      'Biobío–Coronel), en cuatro pares de volúmenes superpuestos: cuatro conflictos STCA escalonados. UDC94 (RPAS) opera sobre el ' +
      'límite y su circuito entra en S2: HANDOVER obligatorio. Cuatro aeronaves tripuladas a baja altura: el C172 de instrucción ' +
      'CC-ACV saliendo de Carriel Sur, el helicóptero policial CC-AHP sobre el Biobío, el helicóptero de brigada CC-AFB rumbo al ' +
      'incendio y el avión CC-PFX. Dos NOTAM aparecen escalonados: zona peligrosa por ejercicio naval (T+3 min) y restringida por ' +
      'incendio forestal (T+5,5 min). Gestión de carga: priorizar, instruir y transferir sin perder la imagen.',
    objectives: {
      utm: ['Mantener la imagen de 8 operaciones y 4 aeronaves tripuladas', 'Resolver los 4 conflictos STCA', 'Separar cada operación del tránsito tripulado (instrucción antes del cruce)', 'Activar ambos NOTAM y sacar a las operaciones afectadas', 'Handover de UDC94 a S2'],
      uas: ['Cumplir instrucciones en < 30 s con colación', 'Conformidad ≥ 90 %', 'No ingresar a zonas NOTAM'],
      rpas: ['Suspender / reprogramar la misión según NOTAM', 'Colacionar', 'Conformidad y techo'],
    },
    criticals: [CR_LOS, CR_ZONE, CR_CONT],
    zones: [
      VOL(C9, 'V91', 'VOL TAL91 PUERTO TALCAHUANO', [-7, 8]),
      VOL(C9, 'V92', 'VOL PEN92 COSTA PENCO (BVLOS)', [-2, 11]),
      VOL(C9, 'V93', 'VOL HUA93 HUALPÉN', [5, 6]),
      VOL(C9, 'V94', 'VOL UDC94 LÍMITE S1-S2 (BVLOS)', [7, 0.8]),
      VOL(C9, 'V95', 'VOL SPP95 SAN PEDRO', [-7, -4]),
      VOL(C9, 'V96', 'VOL COR96 CORONEL (BVLOS)', [-3, -9]),
      VOL(C9, 'V97', 'VOL BIO97 RÍO BIOBÍO', [2, -5]),
      VOL(C9, 'V98', 'VOL LAG98 LAGUNA CHICA (BVLOS)', [7, -9]),
      ZONE(C9, 'N91', 'NOTAM C0731/26 PELIGROSA EJERCICIO NAVAL BAHÍA', posOf(t91, 180), 'DANGER', 1000, 180),
      ZONE(C9, 'N92', 'NOTAM C0735/26 RESTRINGIDA INCENDIO FORESTAL', posOf(b97, 330), 'RESTRICTED', 600, 330),
    ],
    ops: [t91, p92, h93, u94, s95, c96, b97, l98],
    manned: [
      thru(C9, 'CC-ACV', 'C172', 90, h93, 170, 280, 140),
      thru(C9, 'CC-AHP', 'H125', 90, s95, 240, 80, 120, { authRef: 'POLICIAL' }),
      thru(C9, 'CC-AFB', 'B407', 110, b97, 360, 200, 120, { authRef: 'BRIGADA' }),
      thru(C9, 'CC-PFX', 'C182', 110, p92, 430, 120, 150),
    ],
    events: [],
  });
})();

// ───────────────────────── N5 · E10 — CERTIFICACIÓN (Antofagasta / La Negra) ─────────────────────────
const C10: C = [-70.32, -23.75];
const E10 = (() => {
  const [d101, t102] = crossPair(C10,
    { cs: 'DUC101', op: 'BVLOS', ac: 'WINGTRA', kt: 45, vol: 'VA1', vc: [-6, 1], alt: 110, x: { rtlAlt: 70 } },
    { cs: 'TOP102', op: 'VLOS', ac: 'M300', kt: 25, vol: 'VA2', vc: [-2, 5], alt: 70 }, 150);
  const [i103, v104] = crossPair(C10,
    { cs: 'INS103', op: 'BVLOS', ac: 'WINGTRA', kt: 40, vol: 'VA3', vc: [5, 2], alt: 100 },
    { cs: 'VIG104', op: 'VLOS', ac: 'MAVIC 3T', kt: 25, vol: 'VA4', vc: [8, 7], alt: 100 }, 190);
  const [a105, m106] = crossPair(C10,
    { cs: 'AGR105', op: 'VLOS', ac: 'M350', kt: 25, vol: 'VA5', vc: [-5, -6], alt: 80 },
    { cs: 'MAP106', op: 'BVLOS', ac: 'WINGTRA', kt: 40, vol: 'VA6', vc: [0, -9], alt: 80 }, 240);
  const [p107, s108] = crossPair(C10,
    { cs: 'PRT107', op: 'VLOS', ac: 'M30T', kt: 25, vol: 'VA7', vc: [6, -4], alt: 90 },
    { cs: 'SEG108', op: 'VLOS', ac: 'MAVIC 3T', kt: 25, vol: 'VA8', vc: [10, -8], alt: 90 }, 290);
  return build({
    id: 'n5-e10-certificacion', order: 10, level: 5, title: 'CERTIFICACIÓN',
    name: 'N5·E10 CERTIFICACIÓN — ANTOFAGASTA / LA NEGRA', center: C10, durationS: 480,
    briefing:
      'Ejercicio de CERTIFICACIÓN con la máxima densidad: ocho operaciones en cuatro pares de volúmenes superpuestos (cuatro ' +
      'conflictos STCA escalonados). DUC101 (RPAS) PIERDE EL ENLACE C2 y su failsafe vuelve a la base descendiendo a 70 m. Cinco ' +
      'aeronaves tripuladas a baja altura: un HELICÓPTERO NO COOPERATIVO (NC-01, sin transpondedor ni plan), el avión CC-CPL ' +
      '(aerofotogrametría), el helicóptero minero CC-HMN, el avión CC-LTA y el helicóptero de rescate CC-RSC. Tres NOTAM nuevos: ' +
      'TRONADURA en la cantera La Negra (corta la operación BVLOS de INS103), ejercicio militar y faena de voladura en el sector sur. ' +
      'Se evalúa todo: detección, contingencia, despeje, NOTAM, separación con aeronaves tripuladas y gestión de carga.',
    objectives: {
      utm: ['Contingencia C2 de DUC101: reconocer, declarar y despejar su trayectoria de regreso', 'Resolver los 4 conflictos STCA', 'Separar a los UAS de las 5 aeronaves tripuladas (incluida la NO COOPERATIVA)', 'Activar los 3 NOTAM y suspender las operaciones afectadas antes de que ingresen', 'Sin errores críticos — nota mínima 85'],
      uas: ['Cumplir las instrucciones de despeje en < 30 s', 'Descender / aterrizar ante aeronaves tripuladas', 'Conformidad ≥ 90 %'],
      rpas: ['Informar la pérdida C2 (DUC101) / suspender la misión por NOTAM (INS103, MAP106)', 'No ingresar a zonas NOTAM', 'Colacionar'],
    },
    criticals: [CR_CONT, CR_LOS, CR_ZONE],
    zones: [
      VOL(C10, 'VA1', 'VOL DUC101 DUCTO MINERO (BVLOS)', [-6, 1]),
      VOL(C10, 'VA2', 'VOL TOP102 PLANTA', [-2, 5]),
      VOL(C10, 'VA3', 'VOL INS103 ACUEDUCTO (BVLOS)', [5, 2]),
      VOL(C10, 'VA4', 'VOL VIG104 BODEGAS', [8, 7]),
      VOL(C10, 'VA5', 'VOL AGR105 PARQUE SOLAR', [-5, -6]),
      VOL(C10, 'VA6', 'VOL MAP106 RELAVE (BVLOS)', [0, -9]),
      VOL(C10, 'VA7', 'VOL PRT107 COLOSO', [6, -4]),
      VOL(C10, 'VA8', 'VOL SEG108 PERÍMETRO', [10, -8]),
      ZONE(C10, 'PA1', 'PROHIBIDA PLANTA DE EXPLOSIVOS (ENTRENAMIENTO)', [-6, 12], 'PROHIBITED', 999),
      ZONE(C10, 'NA1', 'NOTAM C1120/26 RESTRINGIDA TRONADURA CANTERA LA NEGRA', posOf(i103, 150), 'RESTRICTED', 600, 150),
      ZONE(C10, 'NA2', 'NOTAM C1124/26 PELIGROSA EJERCICIO MILITAR', posOf(m106, 270), 'DANGER', 1500, 270),
      ZONE(C10, 'NA3', 'NOTAM C1127/26 RESTRINGIDA FAENA DE VOLADURA', posOf(s108, 360), 'RESTRICTED', 600, 360),
    ],
    ops: [d101, t102, i103, v104, a105, m106, p107, s108],
    manned: [
      thru(C10, 'NC-01', 'HELI?', 100, t102, 120, 200, 90, { noncoop: true, authRef: 'SIN PLAN' }),
      thru(C10, 'CC-CPL', 'C206', 120, v104, 200, 250, 150),
      thru(C10, 'CC-HMN', 'AS350', 100, a105, 260, 60, 110, { authRef: 'MINERO' }),
      thru(C10, 'CC-LTA', 'PA34', 130, p107, 320, 300, 150),
      thru(C10, 'CC-RSC', 'B412', 110, s108, 410, 160, 120, { authRef: 'RESCATE' }),
    ],
    events: [{ t: 110, flight: 'DUC101', type: 'C2LOSS', clear: ['TOP102'] }],
  });
})();

export const SCENARIOS: Scenario[] = [E1, E2, E3, E4, E5, E6, E7, E8, E9, E10];

// ejercicio previo que hay que aprobar para habilitar éste (el 1 no tiene prerrequisito)
export function prerequisiteOf(id: string): Scenario | undefined {
  const s = SCENARIOS.find((x) => x.id === id);
  if (!s?.order || s.order <= 1) return undefined;
  return SCENARIOS.find((x) => x.order === (s.order ?? 0) - 1);
}
