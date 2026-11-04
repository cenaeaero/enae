// CONDOR SIM — motor de simulación BVLOS (corre en el navegador, sin backend)
// Coordenadas en lat/lng WGS-84; distancias en NM; velocidades en kt; alturas en m AGL.

export type TrackStatus = 'NORMAL' | 'C2LOSS' | 'LOWBAT' | 'BREACH' | 'EMERG' | 'LANDED' | 'LOST';
export type PMode = 'AUTO' | 'LOITER' | 'RTL' | 'GUIDED' | 'LAND' | 'DIVERT';
// instrucciones del Operador UTM al piloto (se colacionan y se mide su cumplimiento)
export type InstrKind = 'ALT' | 'HOLD' | 'RESUME' | 'LAND' | 'RTL' | 'TFC';
export const INSTR_TXT: Record<InstrKind, string> = {
  ALT: 'MANTENGA ALTURA', HOLD: 'ESPERA — MANTENGA POSICIÓN', RESUME: 'REANUDE MISIÓN',
  LAND: 'ATERRICE', RTL: 'REGRESE A BASE (RTL)', TFC: 'INFORMACIÓN DE TRÁFICO TRIPULADO',
};

// separación mínima (pérdida de separación = error crítico)
export const LOS_UAS = { h: 250, v: 30 }; // UAS–UAS (m)
export const LOS_MANNED = { h: 500, v: 60 }; // UAS–tripulado (m)

export interface Waypoint {
  lat: number;
  lng: number;
  alt: number; // m AGL
  hold?: number; // segundos en tierra antes de despegar (toma de helicóptero / aterrizaje y re-despegue)
}

export interface SimEvent {
  t: number; // segundos de simulación en que se dispara
  flight: string; // callsign
  type: 'C2LOSS' | 'C2RESTORE' | 'LOWBAT' | 'EMERG' | 'RTH' | 'GUST' | 'TASK';
  duration?: number; // para C2LOSS auto-restore / GUST duración de la deriva
  hdg?: number; // GUST: rumbo hacia el que empuja el viento
  clear?: string[]; // vuelos que el UTM debe despejar/instruir ante esta contingencia
  instr?: InstrKind; // TASK: instrucción que se espera del UTM
  value?: number; // TASK ALT: altura esperada
  text?: string; // TASK: mensaje de coordinación que recibe el UTM
}

// solicitud de autorización de volumen (el Operador UTM la aprueba / rechaza / modifica)
export interface AuthRequest {
  id: string; // n° de solicitud
  operator: string; // operador UAS solicitante
  purpose: string;
  ceiling: number; // techo solicitado (m AGL)
  window: string; // ventana horaria solicitada (texto)
  expect: 'APPROVE' | 'DENY' | 'MODIFY'; // decisión correcta (para la evaluación)
  reason: string; // fundamento de la decisión correcta (se muestra en el informe)
  maxCeil?: number; // MODIFY: techo máximo admisible
}

export interface SimFlight {
  callsign: string;
  acType: string; // p.ej. M350, WINGTRA
  route: Waypoint[];
  speedKt: number;
  batteryMin: number; // autonomía total en minutos
  startT: number; // segundos de sim en que despega
  authRef: string; // n° autorización
  zoneId: string; // zona segregada asignada
  sector?: string; // posición/sector de control dueño (handover); por defecto S1
  manned?: boolean; // aeronave tripulada (símbolo distinto)
  op?: 'VLOS' | 'BVLOS'; // VLOS = Piloto UAS (manual) · BVLOS = Piloto RPAS (automático)
  noncoop?: boolean; // tripulado NO cooperativo (sin transpondedor / sin plan): sólo traza primaria
  req?: AuthRequest; // requiere autorización del UTM antes de despegar
  altLand?: { lat: number; lng: number; name: string }; // sitio de aterrizaje alternativo
  rtlAlt?: number; // altura de retorno programada del failsafe RTL (m)
  // plan de vuelo (campos ICAO/EPP, informativos para el ejercicio y AFTN)
  fpl?: { rules?: string; fType?: string; wake?: string; equip?: string; ssr?: string; dep?: string; dest?: string; rfl?: string; eobt?: string };
}

export interface Zone {
  id: string;
  name: string;
  ring: [number, number][]; // [lng, lat] cerrado
  floor: number;
  ceiling: number; // m AGL
  kind: 'SEGREGATED' | 'PROHIBITED' | 'RESTRICTED' | 'DANGER' | 'MSA';
  minAlt?: number; // sólo MSA: altura mínima de operación del sector (m AGL) — bajo ella → MSAW
  vlimit?: string; // límites verticales según publicación NOTAM (texto, p.ej. "FL 90 / 3000 FT")
  appearAt?: number; // s de simulación en que la zona aparece (programada en el ejercicio); null = desde el inicio
  activated?: number; // s en que el Operador UTM activó la restricción (NOTAM)
}

export interface TrackState {
  callsign: string;
  acType: string;
  lat: number;
  lng: number;
  alt: number;
  hdg: number;
  speedKt: number;
  batteryPct: number;
  status: TrackStatus;
  alerts: string[]; // códigos activos: C2, BAT, ZB (zone breach), EM
  inside: boolean;
  wpIdx: number;
  airborne: boolean;
  manned?: boolean; // aeronave tripulada (símbolo distinto)
  authRef: string;
  zoneId?: string; // zona segregada asignada a esta operación (para conformance por asignación)
  sector?: string; // posición/sector de control dueño (handover). 'GA'/otro = no controlado por sectores UAS
  xfer?: string; // handover en curso: sector destino pendiente de aceptación (la traza parpadea)
  // ── control del piloto (Remote Pilot Station, estilo ArduPilot) ──
  pmode?: PMode; // modo de vuelo (AUTO = sigue ruta)
  holdUntil?: number; // en tierra hasta este t de sim (espera en waypoint con hold)
  vs?: number; // razón vertical (m/s): >0 subiendo, <0 bajando
  altCmd?: number; // altitud comandada (m)
  hdgCmd?: number; // rumbo comandado (°)
  spdCmd?: number; // velocidad comandada (kt)
  history: [number, number][]; // trail [lng,lat]
  live?: boolean; // track de fuente real (Remote ID / ADS-B / puente), no simulado
  tsLive?: number; // epoch ms del último dato real recibido (para edad del dato)
  source?: 'RID' | 'ADS-B' | 'MP'; // procedencia del dato real
  op?: 'VLOS' | 'BVLOS';
  noncoop?: boolean;
  auth?: 'PENDING' | 'APPROVED' | 'DENIED' | 'MODIFIED'; // estado de la solicitud de autorización
  authCeil?: number; // techo autorizado (si el UTM lo modificó)
  instr?: { id: number; txt: string; t: number; rb?: number }; // última instrucción UTM (visible al piloto)
  driftHdg?: number; // viento/ráfaga empujando la aeronave (hasta que el piloto corrige)
  driftUntil?: number;
  claimed?: boolean; // un piloto humano tomó el mando (sin piloto automático de instrucciones)
}

// ── registro para la evaluación ──
export interface Fact { t: number; k: string; f?: string; by?: string; d?: Record<string, unknown> }
export type OccKind = 'C2' | 'EMERG' | 'LOWBAT' | 'MANNED' | 'NOTAM' | 'CONFLICT' | 'CONF' | 'TASK';
export interface Occ {
  id: string; k: OccKind; t: number; flights: string[]; label: string;
  ref?: string; // tripulado / zona NOTAM / par en conflicto
  clear?: string[]; instr?: InstrKind; value?: number;
  sectors: string[];
}
export interface Instr { id: number; t: number; f: string; k: InstrKind; v?: number; by: string; rb?: number; rbBy?: string; done?: number; autoAt?: number }
export interface ConfStat { air: number; inside: number; maxDevM: number; maxOverCeil: number }

export interface Scenario {
  id: string;
  name: string;
  center: [number, number]; // [lng, lat]
  rangeNm: number;
  zones: Zone[];
  flights: SimFlight[];
  events: SimEvent[];
  briefing: string;
  // programa de ejercicios por niveles
  level?: number; // 1..5
  order?: number; // 1..10
  title?: string;
  objectives?: { utm: string[]; uas: string[]; rpas: string[] };
  criticals?: string[]; // errores críticos que reprueban
  minScore?: number;
  durationS?: number; // duración nominal
  ackFpl?: boolean; // se evalúa el acuse de FPL/DEP
  handover?: string[]; // vuelos que deben transferirse de sector
  sectors?: string[];
}

const R_EARTH_NM = 3440.065;
const d2r = (d: number) => (d * Math.PI) / 180;
const r2d = (r: number) => (r * 180) / Math.PI;

export function distNm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const dLat = d2r(bLat - aLat);
  const dLng = d2r(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(d2r(aLat)) * Math.cos(d2r(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R_EARTH_NM * Math.asin(Math.sqrt(h));
}

export function bearing(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const y = Math.sin(d2r(bLng - aLng)) * Math.cos(d2r(bLat));
  const x =
    Math.cos(d2r(aLat)) * Math.sin(d2r(bLat)) -
    Math.sin(d2r(aLat)) * Math.cos(d2r(bLat)) * Math.cos(d2r(bLng - aLng));
  return (r2d(Math.atan2(y, x)) + 360) % 360;
}

function stepTowards(lat: number, lng: number, brg: number, dNm: number): [number, number] {
  const dR = dNm / R_EARTH_NM;
  const lat1 = d2r(lat);
  const brgR = d2r(brg);
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(dR) + Math.cos(lat1) * Math.sin(dR) * Math.cos(brgR)
  );
  const lng2 =
    d2r(lng) +
    Math.atan2(
      Math.sin(brgR) * Math.sin(dR) * Math.cos(lat1),
      Math.cos(dR) - Math.sin(lat1) * Math.sin(lat2)
    );
  return [r2d(lat2), r2d(lng2)];
}

export function pointInRing(lng: number, lat: number, ring: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

export interface SimMsg {
  id: number;
  t: number;
  prio: 'FF' | 'GG' | 'KK';
  from: string;
  to: string;
  type: 'FPL' | 'DEP' | 'ARR' | 'ALR' | 'SVC' | 'NTM';
  flight: string;
  body: string;
  read?: boolean;
}

// ── geometría auxiliar (métrica local, suficiente para áreas de pocos km) ──
const M_DEG = 111320;
export function distM(aLat: number, aLng: number, bLat: number, bLng: number) { return distNm(aLat, aLng, bLat, bLng) * 1852; }
export function distToRingM(lng: number, lat: number, ring: [number, number][]): number {
  const k = Math.cos(d2r(lat));
  const px = lng * M_DEG * k, py = lat * M_DEG;
  let best = Infinity;
  for (let i = 0; i < ring.length - 1; i++) {
    const ax = ring[i][0] * M_DEG * k, ay = ring[i][1] * M_DEG;
    const bx = ring[i + 1][0] * M_DEG * k, by = ring[i + 1][1] * M_DEG;
    const dx = bx - ax, dy = by - ay;
    const L = dx * dx + dy * dy;
    const u = L ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / L)) : 0;
    best = Math.min(best, Math.hypot(px - (ax + u * dx), py - (ay + u * dy)));
  }
  return best;
}
function segX(a: [number, number], b: [number, number], c: [number, number], d: [number, number]) {
  const o = (p: [number, number], q: [number, number], r: [number, number]) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
  return o(a, b, c) !== o(a, b, d) && o(c, d, a) !== o(c, d, b);
}
// ¿dos polígonos se superponen? (vértice dentro del otro o bordes que se cruzan)
export function ringsOverlap(a: [number, number][], b: [number, number][]): boolean {
  if (a.some((p) => pointInRing(p[0], p[1], b)) || b.some((p) => pointInRing(p[0], p[1], a))) return true;
  for (let i = 0; i < a.length - 1; i++) for (let j = 0; j < b.length - 1; j++) if (segX(a[i], a[i + 1], b[j], b[j + 1])) return true;
  return false;
}
const VS_CMD = 5; // m/s — razón vertical ante un cambio de altura comandado
const stepAlt = (alt: number, tgt: number, max: number) => alt + Math.max(-max, Math.min(max, tgt - alt));
const isRestr = (z: Zone) => z.kind === 'PROHIBITED' || z.kind === 'RESTRICTED' || z.kind === 'DANGER';

export class SimEngine {
  scenario: Scenario;
  t = 0; // segundos de simulación
  speed = 1; // x1 x2 x4
  paused = true;
  tracks = new Map<string, TrackState>();
  log: { t: number; msg: string; level: 'INFO' | 'WARN' | 'ALARM' }[] = [];
  msgs: SimMsg[] = [];
  // registro para la evaluación por competencias
  facts: Fact[] = [];
  occs: Occ[] = [];
  instrs: Instr[] = [];
  conf = new Map<string, ConfStat>();
  private msgSeq = 0;
  private instrSeq = 0;
  private firedEvents = new Set<number>();
  private firedDyn = new Set<number>();
  private dynEvents: SimEvent[] = [];
  private zonesShown = new Set<string>();
  private zoneIn = new Set<string>();
  private zoneStay = new Set<string>();
  private atAct = new Set<string>();
  private losOn = new Set<string>();
  private pairD = new Map<string, number>();
  private conflictSeen = new Set<string>();
  private mannedOcc = new Map<string, Occ>();
  private outVol = new Set<string>();
  private authT = new Map<string, number>();
  private waitLogged = new Set<string>();

  constructor(scenario: Scenario) {
    this.scenario = scenario;
    this.reset();
  }

  reset() {
    this.t = 0;
    this.paused = true;
    this.firedEvents.clear();
    this.firedDyn.clear();
    this.dynEvents = [];
    this.log = [];
    this.msgs = [];
    this.msgSeq = 0;
    this.instrSeq = 0;
    this.facts = [];
    this.occs = [];
    this.instrs = [];
    this.conf.clear();
    for (const st of [this.zonesShown, this.zoneIn, this.zoneStay, this.atAct, this.losOn, this.conflictSeen, this.outVol, this.waitLogged]) st.clear();
    this.pairD.clear();
    this.mannedOcc.clear();
    this.authT.clear();
    for (const z of this.scenario.zones) delete z.activated;
    this.tracks.clear();
    for (const f of this.scenario.flights) {
      const wp0 = f.route[0];
      this.tracks.set(f.callsign, {
        callsign: f.callsign,
        acType: f.acType,
        lat: wp0.lat,
        lng: wp0.lng,
        alt: 0,
        hdg: 0,
        speedKt: 0,
        batteryPct: 100,
        status: 'NORMAL',
        alerts: [],
        inside: true,
        wpIdx: 0,
        airborne: false,
        authRef: f.authRef,
        zoneId: f.zoneId,
        sector: f.sector ?? 'S1',
        manned: f.manned,
        op: f.op,
        noncoop: f.noncoop,
        auth: f.req ? 'PENDING' : undefined,
        history: [],
      });
    }
    this.addLog('EJERCICIO CARGADO: ' + this.scenario.name, 'INFO');
  }

  addLog(msg: string, level: 'INFO' | 'WARN' | 'ALARM' = 'INFO') {
    this.log.unshift({ t: this.t, msg, level });
    if (this.log.length > 200) this.log.pop();
  }

  private fact(k: string, f?: string, by?: string, d?: Record<string, unknown>) {
    this.facts.push({ t: Math.round(this.t * 10) / 10, k, f, by, d });
  }

  private occ(k: OccKind, flights: string[], label: string, extra: Partial<Occ> = {}): Occ {
    const o: Occ = {
      id: `${k}-${this.occs.length + 1}`, k, t: Math.round(this.t * 10) / 10, flights, label,
      sectors: [...new Set(flights.map((cs) => this.tracks.get(cs)?.sector ?? 'S1'))],
      ...extra,
    };
    this.occs.push(o);
    return o;
  }

  // hora del ejercicio en formato hhmm (el ejercicio "inicia" a las 1200 UTC)
  private hhmm(offsetS = 0): string {
    const total = 12 * 3600 + this.t + offsetS;
    const h = Math.floor(total / 3600) % 24;
    const m = Math.floor((total % 3600) / 60);
    return String(h).padStart(2, '0') + String(m).padStart(2, '0');
  }

  private addMsg(type: SimMsg['type'], flight: string, body: string, prio: SimMsg['prio'] = 'GG') {
    this.msgs.unshift({
      id: ++this.msgSeq,
      t: this.t,
      prio,
      from: 'SCUACNDX',
      to: 'SCUAUASX',
      type,
      flight,
      body,
    });
    if (this.msgs.length > 60) this.msgs.pop();
  }

  private msgsForFlight(f: SimFlight, kind: 'FPL' | 'DEP' | 'ARR' | 'ALR' | 'ALERFA') {
    const cs = f.callsign;
    const eetHHMM = '00' + String(Math.max(10, Math.round(f.batteryMin * 0.6))).padStart(2, '0');
    switch (kind) {
      case 'FPL':
        this.addMsg('FPL', cs,
          `(FPL-${cs}-VG\n-1ZZZZ/L -V/C\n-ZZZZ${this.hhmm(120)}\n-N${String(Math.round(f.speedKt)).padStart(4, '0')}VFR DCT\n-ZZZZ${eetHHMM}\n-DEP/OPERACION UAS DEST/OPERACION UAS\n TYP/UAS ${f.acType} RMK/AUT ${f.authRef} ${f.op ?? ''} EJERCICIO CONDOR SIM)`,
          'GG');
        break;
      case 'DEP':
        this.addMsg('DEP', cs, `(DEP-${cs}-ZZZZ${this.hhmm()}-ZZZZ-DOF/EJERCICIO)`, 'GG');
        break;
      case 'ARR':
        this.addMsg('ARR', cs, `(ARR-${cs}-ZZZZ-ZZZZ${this.hhmm()})`, 'GG');
        break;
      case 'ALR':
        this.addMsg('ALR', cs,
          `(ALR-INCERFA/SCUACNDX/PERDIDA ENLACE C2\n-${cs}-ZZZZ-AUT ${f.authRef}\n-ULTIMA POSICION CONOCIDA EN ZONA DE OPERACION\n-REQ VIGILAR CONFORMANCE Y CONFIRMAR RTH)`,
          'FF');
        break;
      case 'ALERFA':
        this.addMsg('ALR', cs,
          `(ALR-ALERFA/SCUACNDX/PISTA PERDIDA\n-${cs}-ZZZZ-AUT ${f.authRef}\n-AERONAVE FUERA DE ZONA / SIN ENLACE - ULTIMA POSICION CONOCIDA\n-ACTIVAR FASE DE ALERTA Y COORDINACION)`,
          'FF');
        break;
    }
  }

  injectEvent(flight: string, type: SimEvent['type']) {
    this.applyEvent({ t: this.t, flight, type, duration: type === 'C2LOSS' ? 45 : undefined });
  }

  // ───────── acciones de los puestos (UTM / piloto) — fuente única para la evaluación ─────────
  // by = id de la posición (sim_positions) o 'LOCAL'
  applyAction(action: string, detail: Record<string, unknown> | null, by: string) {
    const d = detail ?? {};
    const flight = d.flight != null ? String(d.flight) : '';
    const tr = flight ? this.tracks.get(flight) : undefined;
    switch (action) {
      case 'ACK_ALARM':
        if (!flight) return;
        this.fact('ACK', flight, by);
        this.addLog(`${flight} ALARMA RECONOCIDA POR OPERADOR UTM`, 'INFO');
        break;
      case 'DECLARE_CONTINGENCY':
        if (!flight) return;
        this.fact('CONT', flight, by);
        this.addLog(`${flight} CONTINGENCIA DECLARADA POR OPERADOR UTM`, 'WARN');
        break;
      case 'ORDER_RTH':
        if (flight) this.issueInstr(flight, 'RTL', undefined, by);
        break;
      case 'UTM_INSTR':
        if (flight && d.instr) this.issueInstr(flight, d.instr as InstrKind, d.value != null ? Number(d.value) : undefined, by);
        break;
      case 'READBACK':
        if (flight) this.readback(flight, d.id != null ? Number(d.id) : undefined, by);
        break;
      case 'AUTH_APPROVE': case 'AUTH_DENY': case 'AUTH_MODIFY':
        if (flight) this.decideAuth(flight, action === 'AUTH_APPROVE' ? 'APPROVE' : action === 'AUTH_DENY' ? 'DENY' : 'MODIFY', d.ceil != null ? Number(d.ceil) : undefined, by);
        break;
      case 'NOTAM_ACT': {
        const z = this.scenario.zones.find((x) => x.id === d.zone);
        if (!z || z.activated != null) return;
        z.activated = this.t;
        this.fact('NOTAM_ACT', undefined, by, { zone: z.id });
        this.addLog(`RESTRICCIÓN ACTIVADA POR UTM: ${z.name}`, 'WARN');
        break;
      }
      case 'HANDOVER':
        if (!tr || !d.to) return;
        this.fact('HANDOVER', flight, by, { from: tr.sector ?? 'S1', to: String(d.to) });
        this.addLog(`HANDOVER ${flight}: ${tr.sector ?? 'S1'} → ${d.to}`, 'INFO');
        tr.sector = String(d.to); tr.xfer = undefined;
        break;
      case 'PILOT_CLAIM':
        if (!tr) return;
        tr.claimed = true;
        this.fact('CLAIM', flight, by);
        this.addLog(`${flight} PILOTO AL MANDO (RPS)`, 'INFO');
        break;
      case 'PILOT_CMD':
        if (!flight) return;
        this.applyPilotCommand(flight, { mode: d.mode as PMode | undefined, dAlt: d.dAlt as number | undefined, dHdg: d.dHdg as number | undefined, dSpd: d.dSpd as number | undefined, hdg: d.hdg as number | undefined }, by);
        break;
      case 'PILOT_TAKEOFF':
        if (flight) this.pilotTakeoff(flight, by);
        break;
      case 'PILOT_REPORT':
        if (!flight) return;
        this.fact('PREPORT', flight, by, { text: d.text });
        this.addLog(`${flight} PILOTO INFORMA: ${String(d.text ?? 'CONTINGENCIA')}`, 'WARN');
        break;
      case 'ACK_MSG':
        this.fact('ACK_MSG', flight || undefined, by, { type: d.type, msgId: d.msgId });
        if (flight) this.addLog(`${flight} MENSAJE ${String(d.type ?? '')} ACUSADO`, 'INFO');
        break;
      case 'CPDLC_MSG':
        if (!flight) return;
        this.fact('CPDLC', flight, by, { text: d.text });
        this.addLog(`${flight} CPDLC DEL OPERADOR UTM: ${String(d.text ?? '')}`, 'INFO');
        break;
      case 'RELAY_ALERT':
        this.fact('RELAY', flight || undefined, by);
        if (flight) this.addLog(`${flight} OPERACIONES ALERTA AL OPERADOR UTM`, 'WARN');
        break;
    }
  }

  issueInstr(flight: string, k: InstrKind, v: number | undefined, by: string) {
    const tr = this.tracks.get(flight);
    if (!tr) return;
    const id = ++this.instrSeq;
    const alt = this.scenario.flights.find((x) => x.callsign === flight)?.altLand;
    const txt = k === 'ALT' ? `${(v ?? 0) > tr.alt ? 'ASCIENDA' : 'DESCIENDA'} A ${v} M` : k === 'LAND' ? (alt ? `ATERRICE EN ALTERNATIVO ${alt.name}` : 'ATERRICE') : INSTR_TXT[k];
    this.instrs.push({ id, t: this.t, f: flight, k, v, by, autoAt: tr.claimed ? undefined : this.t + 6 });
    tr.instr = { id, txt, t: this.t };
    this.fact('INSTR', flight, by, { id, k, v });
    this.addLog(`UTM ▸ ${flight}: ${txt}`, 'INFO');
  }

  readback(flight: string, id: number | undefined, by: string) {
    const ins = id != null ? this.instrs.find((x) => x.id === id) : [...this.instrs].reverse().find((x) => x.f === flight && x.rb == null);
    if (!ins || ins.rb != null) return;
    ins.rb = this.t; ins.rbBy = by;
    const tr = this.tracks.get(flight);
    if (tr?.instr && tr.instr.id === ins.id) tr.instr.rb = this.t;
    this.fact('RB', flight, by, { id: ins.id });
    this.addLog(`${flight} COLACIONA: ${tr?.instr?.id === ins.id ? tr.instr.txt : ins.k}`, 'INFO');
  }

  private zoneOf(f: SimFlight) { return this.scenario.zones.find((z) => z.id === f.zoneId); }
  private activeZone(z: Zone) { return z.appearAt == null || this.t >= z.appearAt; }

  // ¿el volumen solicitado invade una zona restringida/prohibida activa?
  volumeInvades(f: SimFlight): Zone | undefined {
    const v = this.zoneOf(f);
    if (!v) return undefined;
    return this.scenario.zones.find((z) => z.id !== v.id && isRestr(z) && this.activeZone(z) && ringsOverlap(v.ring, z.ring));
  }

  decideAuth(flight: string, decision: 'APPROVE' | 'DENY' | 'MODIFY', ceil: number | undefined, by: string) {
    const f = this.scenario.flights.find((x) => x.callsign === flight);
    const tr = this.tracks.get(flight);
    if (!f?.req || !tr || tr.airborne) return;
    const vol = this.zoneOf(f);
    const inv = this.volumeInvades(f);
    const maxCeil = f.req.maxCeil ?? vol?.ceiling ?? 120;
    const correct = decision === f.req.expect && (decision !== 'MODIFY' || (ceil != null && ceil <= maxCeil));
    tr.auth = decision === 'APPROVE' ? 'APPROVED' : decision === 'DENY' ? 'DENIED' : 'MODIFIED';
    if (decision === 'MODIFY' && ceil != null) tr.authCeil = ceil;
    this.authT.set(flight, this.t);
    this.fact('AUTH', flight, by, { decision, ceil, correct, expect: f.req.expect, invades: inv?.id ?? null });
    if (decision !== 'DENY' && inv) this.fact('AUTH_INVADE', flight, by, { zone: inv.id });
    const txt = decision === 'APPROVE' ? 'APROBADA' : decision === 'DENY' ? 'RECHAZADA' : `MODIFICADA (TECHO ${ceil} M)`;
    this.addLog(`SOLICITUD ${f.req.id} ${flight} ${txt}`, decision === 'DENY' ? 'WARN' : 'INFO');
    if (decision === 'MODIFY' && ceil != null && !tr.claimed) {
      const maxAlt = Math.max(...f.route.map((w) => w.alt));
      if (maxAlt > ceil - 5) tr.altCmd = ceil - 10; // la misión se reprograma bajo el nuevo techo
    }
  }

  pilotTakeoff(flight: string, by: string) {
    const f = this.scenario.flights.find((x) => x.callsign === flight);
    const tr = this.tracks.get(flight);
    if (!f || !tr || tr.airborne || tr.status === 'LANDED') return;
    tr.claimed = true;
    const ok = !f.req || tr.auth === 'APPROVED' || tr.auth === 'MODIFIED';
    this.doTakeoff(f, tr, ok, by);
  }

  private doTakeoff(f: SimFlight, tr: TrackState, authorized: boolean, by: string) {
    tr.airborne = true;
    tr.alt = f.route[0].alt;
    tr.speedKt = f.speedKt;
    tr.wpIdx = 1;
    this.fact('TAKEOFF', f.callsign, by, { authorized });
    if (!authorized) this.addLog(`${f.callsign} DESPEGUE SIN AUTORIZACIÓN UTM`, 'ALARM');
    else this.addLog(`${f.callsign} DESPEGUE — AUT ${f.authRef}`, 'INFO');
    if (!f.manned) {
      this.msgsForFlight(f, 'FPL');
      this.msgsForFlight(f, 'DEP');
    }
  }

  // comando del piloto (Remote Pilot Station): modo de vuelo o ajuste relativo de alt/rumbo/velocidad
  applyPilotCommand(flight: string, cmd: { mode?: PMode; dAlt?: number; dHdg?: number; dSpd?: number; hdg?: number }, by = 'LOCAL') {
    const tr = this.tracks.get(flight);
    if (!tr || tr.status === 'LANDED' || tr.status === 'LOST') return;
    if (by !== 'AUTO') tr.claimed = true;
    if (tr.status === 'C2LOSS') { this.addLog(`${flight} SIN ENLACE C2 — COMANDO NO RECIBIDO`, 'WARN'); return; }
    this.fact('PCMD', flight, by, { ...cmd });
    tr.driftUntil = undefined; tr.driftHdg = undefined; // el piloto corrige la deriva
    const guide = () => { if (tr.pmode !== 'GUIDED') tr.pmode = 'GUIDED'; tr.altCmd ??= tr.alt; tr.hdgCmd ??= tr.hdg; tr.spdCmd ??= tr.speedKt; };
    if (cmd.hdg != null) { guide(); tr.hdgCmd = ((cmd.hdg % 360) + 360) % 360; this.addLog(`${flight} PILOTO ▸ RUMBO ${String(Math.round(tr.hdgCmd)).padStart(3, '0')}°`, 'INFO'); }
    if (cmd.mode) {
      tr.pmode = cmd.mode;
      if (cmd.mode === 'GUIDED') { tr.altCmd ??= tr.alt; tr.hdgCmd ??= tr.hdg; tr.spdCmd ??= tr.speedKt; }
      if (cmd.mode === 'LOITER') { tr.altCmd ??= tr.alt; }
      if (cmd.mode === 'AUTO') { tr.altCmd = undefined; tr.hdgCmd = undefined; tr.spdCmd = undefined; this.capForAuth(tr); }
      this.addLog(`${flight} PILOTO ▸ MODO ${cmd.mode}`, 'INFO');
      return;
    }
    if (cmd.dAlt != null) {
      // en AUTO el ajuste de altura no abandona la ruta (techo de la misión)
      if (tr.pmode !== 'LOITER' && tr.pmode !== 'AUTO' && tr.pmode != null) guide();
      tr.altCmd = Math.max(0, (tr.altCmd ?? tr.alt) + cmd.dAlt);
      this.addLog(`${flight} PILOTO ▸ ALT ${cmd.dAlt > 0 ? '+' : ''}${cmd.dAlt} → ${Math.round(tr.altCmd)}M`, 'INFO');
    }
    if (cmd.dHdg != null) { guide(); tr.hdgCmd = (((tr.hdgCmd ?? tr.hdg) + cmd.dHdg) % 360 + 360) % 360; this.addLog(`${flight} PILOTO ▸ HDG ${cmd.dHdg > 0 ? '+' : ''}${cmd.dHdg} → ${Math.round(tr.hdgCmd)}°`, 'INFO'); }
    if (cmd.dSpd != null) { guide(); tr.spdCmd = Math.max(0, (tr.spdCmd ?? tr.speedKt) + cmd.dSpd); this.addLog(`${flight} PILOTO ▸ VEL ${cmd.dSpd > 0 ? '+' : ''}${cmd.dSpd} → ${Math.round(tr.spdCmd)}KT`, 'INFO'); }
  }

  private capForAuth(tr: TrackState) {
    if (tr.authCeil != null && !tr.claimed) tr.altCmd = tr.authCeil - 10;
  }

  // piloto automático de instrucciones (vuelo sin piloto humano): colaciona y cumple
  private autoExecute(ins: Instr) {
    const tr = this.tracks.get(ins.f);
    if (!tr || tr.status === 'LANDED' || tr.status === 'LOST') return;
    if (ins.rb == null) this.readback(ins.f, ins.id, 'AUTO');
    if (tr.status === 'C2LOSS') return; // sin enlace: el piloto colaciona por teléfono pero no puede comandar
    tr.driftUntil = undefined; tr.driftHdg = undefined;
    const f = this.scenario.flights.find((x) => x.callsign === ins.f);
    switch (ins.k) {
      case 'ALT': if (ins.v != null) tr.altCmd = ins.v; break;
      case 'HOLD': tr.pmode = 'LOITER'; tr.altCmd ??= tr.alt; break;
      case 'RESUME': tr.pmode = 'AUTO'; tr.altCmd = undefined; tr.hdgCmd = undefined; tr.spdCmd = undefined; this.capForAuth(tr); break;
      case 'LAND': tr.pmode = f?.altLand ? 'DIVERT' : 'LAND'; break;
      case 'RTL': tr.pmode = 'RTL'; break;
      case 'TFC': break;
    }
  }

  private complied(ins: Instr, tr: TrackState): boolean {
    if (tr.status === 'LANDED') return ins.k === 'LAND' || ins.k === 'RTL' || ins.k === 'HOLD';
    switch (ins.k) {
      case 'ALT': return ins.v != null && Math.abs(tr.alt - ins.v) <= 10;
      case 'HOLD': return tr.pmode === 'LOITER' || !tr.airborne;
      case 'RESUME': return (tr.pmode ?? 'AUTO') === 'AUTO' && tr.airborne;
      case 'LAND': return tr.pmode === 'LAND' || tr.pmode === 'DIVERT';
      case 'RTL': return tr.pmode === 'RTL';
      case 'TFC': return ins.rb != null;
    }
  }

  private applyEvent(ev: SimEvent) {
    const tr = this.tracks.get(ev.flight);
    if (ev.type === 'TASK') {
      this.addLog(`COORDINACIÓN ▸ ${ev.text ?? ''}`, 'WARN');
      this.addMsg('SVC', ev.flight, `(SVC-COORDINACION ${ev.flight}\n-${ev.text ?? ''})`, 'GG');
      this.occ('TASK', [ev.flight], ev.text ?? `TAREA ${ev.flight}`, { instr: ev.instr, value: ev.value });
      return;
    }
    if (!tr || tr.status === 'LANDED') return;
    const fl = this.scenario.flights.find((f) => f.callsign === ev.flight);
    switch (ev.type) {
      case 'C2LOSS': {
        tr.status = 'C2LOSS';
        if (!tr.alerts.includes('C2')) tr.alerts.push('C2');
        this.addLog(`${ev.flight} PÉRDIDA DE ENLACE C2`, 'ALARM');
        if (fl) this.msgsForFlight(fl, 'ALR');
        if (tr.op === 'BVLOS') {
          tr.pmode = 'RTL'; // failsafe programado del RPAS
          if (tr.speedKt < 1) tr.speedKt = fl?.speedKt ?? 30;
          this.addLog(`${ev.flight} FAILSAFE — RTL AUTOMÁTICO HACIA BASE`, 'ALARM');
        }
        this.occ('C2', [ev.flight], `PÉRDIDA C2 ${ev.flight}${tr.op === 'BVLOS' ? ' — RTL AUTOMÁTICO' : ''}`, { clear: ev.clear });
        if (ev.duration) this.dynEvents.push({ t: this.t + ev.duration, flight: ev.flight, type: 'C2RESTORE' });
        break;
      }
      case 'C2RESTORE':
        if (tr.status === 'C2LOSS') tr.status = 'NORMAL';
        tr.alerts = tr.alerts.filter((a) => a !== 'C2');
        this.addLog(`${ev.flight} ENLACE C2 RESTABLECIDO`, 'INFO');
        break;
      case 'LOWBAT':
        tr.batteryPct = Math.min(tr.batteryPct, 18);
        if (!tr.alerts.includes('BAT')) tr.alerts.push('BAT');
        this.addLog(`${ev.flight} BATERÍA BAJA ${Math.round(tr.batteryPct)}%`, 'ALARM');
        this.occ('LOWBAT', [ev.flight], `BATERÍA BAJA ${ev.flight}`, { clear: ev.clear });
        break;
      case 'EMERG':
        tr.status = 'EMERG';
        if (!tr.alerts.includes('EM')) tr.alerts.push('EM');
        this.addLog(`${ev.flight} EMERGENCIA DECLARADA`, 'ALARM');
        this.occ('EMERG', [ev.flight], `EMERGENCIA ${ev.flight}`, { clear: ev.clear });
        break;
      case 'RTH':
        tr.pmode = 'RTL';
        if (tr.speedKt < 1) tr.speedKt = fl?.speedKt ?? 30;
        this.addLog(`${ev.flight} RETORNO A CASA (RTH) ORDENADO`, 'WARN');
        break;
      case 'GUST':
        tr.driftHdg = ev.hdg ?? 90;
        tr.driftUntil = this.t + (ev.duration ?? 60);
        this.addLog(`METEO: RÁFAGAS DE VIENTO CRUZADO DESDE ${String(Math.round(((ev.hdg ?? 90) + 180) % 360)).padStart(3, '0')}° EN EL SECTOR`, 'WARN');
        break;
    }
  }

  tick(dtReal: number) {
    if (this.paused) return;
    // sub-pasos de 0.25 s: la física es correcta aunque el navegador
    // limite los timers (pestaña en segundo plano) y entregue dt grandes
    let rem = Math.min(120, dtReal * this.speed);
    while (rem > 0) {
      const dt = Math.min(0.25, rem);
      rem -= dt;
      this.step(dt);
    }
  }

  private land(f: SimFlight, tr: TrackState, how: string) {
    tr.status = 'LANDED'; tr.speedKt = 0; tr.alt = 0;
    const a = f.altLand;
    this.fact('LANDED', f.callsign, undefined, { how, batt: Math.round(tr.batteryPct), dAlt: a ? Math.round(distM(tr.lat, tr.lng, a.lat, a.lng)) : null, dHome: Math.round(distM(tr.lat, tr.lng, f.route[0].lat, f.route[0].lng)) });
    this.addLog(`${f.callsign} ATERRIZADO — ${how}`, 'INFO');
    this.msgsForFlight(f, 'ARR');
  }

  private step(dt: number) {
    this.t += dt;

    // eventos programados
    this.scenario.events.forEach((ev, idx) => {
      if (!this.firedEvents.has(idx) && this.t >= ev.t) {
        this.firedEvents.add(idx);
        this.applyEvent(ev);
      }
    });
    this.dynEvents.forEach((ev, idx) => {
      if (!this.firedDyn.has(idx) && this.t >= ev.t) { this.firedDyn.add(idx); this.applyEvent(ev); }
    });

    // zonas NOTAM que aparecen a mitad del ejercicio
    for (const z of this.scenario.zones) {
      if (z.appearAt == null || this.zonesShown.has(z.id) || this.t < z.appearAt) continue;
      this.zonesShown.add(z.id);
      const zn = /^NOTAM/.test(z.name) ? z.name : `NOTAM ${z.name}`;
      this.addLog(`NUEVO ${zn} ${z.floor}-${z.ceiling} M — ACTIVO`, 'ALARM');
      this.addMsg('NTM', '', `(NOTAMN ${z.name}\nQ) SCEZ/QRTCA/IV/BO/W\nE) ${z.name} SFC-${z.ceiling}M AGL ACTIVA DESDE ${this.hhmm()}\nF) SFC G) ${z.ceiling}M AGL)`, 'FF');
      const aff: string[] = [];
      for (const f of this.scenario.flights) {
        const tr = this.tracks.get(f.callsign)!;
        if (f.manned || tr.status === 'LANDED' || tr.status === 'LOST') continue;
        const pts: [number, number][] = [[tr.lng, tr.lat]];
        for (let i = Math.max(0, tr.wpIdx - 1); i < f.route.length - 1; i++) {
          const a = f.route[i], b = f.route[i + 1];
          for (let s = 0; s <= 10; s++) pts.push([a.lng + ((b.lng - a.lng) * s) / 10, a.lat + ((b.lat - a.lat) * s) / 10]);
        }
        if (pts.some((p) => pointInRing(p[0], p[1], z.ring))) aff.push(f.callsign);
      }
      this.occ('NOTAM', aff, zn, { ref: z.id });
    }

    for (const f of this.scenario.flights) {
      const tr = this.tracks.get(f.callsign)!;
      if (tr.status === 'LANDED' || tr.status === 'LOST') continue; // aterrizada o pista perdida: congelada en su última posición
      const altBefore = tr.alt; // para calcular la razón vertical (subiendo/bajando)

      // despegue (con autorización UTM si la operación la requiere)
      if (!tr.airborne) {
        if (this.t < f.startT) continue;
        // suspendida en tierra por instrucción UTM (espera / aterrice / RTL antes del despegue)
        if (tr.pmode === 'LOITER' || tr.pmode === 'LAND' || tr.pmode === 'RTL' || tr.pmode === 'DIVERT') {
          if (!this.waitLogged.has(f.callsign + '#S')) { this.waitLogged.add(f.callsign + '#S'); this.addLog(`${f.callsign} EN TIERRA — OPERACIÓN SUSPENDIDA POR UTM`, 'INFO'); }
          continue;
        }
        if (f.req) {
          const ok = tr.auth === 'APPROVED' || tr.auth === 'MODIFIED';
          if (!ok) {
            if (!this.waitLogged.has(f.callsign)) { this.waitLogged.add(f.callsign); this.addLog(`${f.callsign} EN TIERRA — ESPERA AUTORIZACIÓN ${f.req.id}`, 'INFO'); }
            continue;
          }
          if (tr.claimed) continue; // piloto humano: despega con DESPEGAR
          if (this.t < (this.authT.get(f.callsign) ?? 0) + 10) continue;
        }
        this.doTakeoff(f, tr, true, 'AUTO');
      }

      // batería — sólo aplica a UAS; el tráfico tripulado (GA) no usa batería
      if (!tr.manned) {
        tr.batteryPct = Math.max(0, tr.batteryPct - (dt / 60 / f.batteryMin) * 100);
        if (tr.batteryPct <= 20 && !tr.alerts.includes('BAT')) {
          tr.alerts.push('BAT');
          this.addLog(`${f.callsign} BATERÍA ${Math.round(tr.batteryPct)}%`, 'WARN');
        }
      }
      if (!tr.manned && tr.batteryPct <= 0) {
        tr.status = 'LANDED';
        tr.speedKt = 0;
        tr.alt = 0;
        this.fact('BAT_OUT', f.callsign);
        this.addLog(`${f.callsign} ATERRIZAJE FORZOSO — BATERÍA AGOTADA`, 'ALARM');
        this.msgsForFlight(f, 'ARR');
        continue;
      }

      // ── navegación según el modo de vuelo del piloto ──
      const pmode = tr.pmode ?? 'AUTO';
      const cruise = () => { if (tr.speedKt < 1) tr.speedKt = tr.spdCmd ?? f.speedKt; };
      if (pmode === 'LOITER') {
        // mantener posición; sólo ajustar altitud al comando
        tr.speedKt = 0;
        if (tr.altCmd != null) tr.alt = stepAlt(tr.alt, tr.altCmd, VS_CMD * dt);
      } else if (pmode === 'GUIDED') {
        // volar rumbo/velocidad/altitud comandados por el piloto
        if (tr.spdCmd != null) tr.speedKt = tr.spdCmd;
        if (tr.hdgCmd != null) tr.hdg = tr.hdgCmd;
        [tr.lat, tr.lng] = stepTowards(tr.lat, tr.lng, tr.hdg, (tr.speedKt / 3600) * dt);
        if (tr.altCmd != null) tr.alt = stepAlt(tr.alt, tr.altCmd, VS_CMD * dt);
      } else if (pmode === 'LAND') {
        tr.speedKt = 0;
        tr.alt = Math.max(0, tr.alt - 4 * dt);
        if (tr.alt <= 0) { this.land(f, tr, 'ATERRIZAJE EN EL LUGAR'); continue; }
      } else if (pmode === 'RTL' || pmode === 'DIVERT') {
        // RTL: retorno al punto de lanzamiento · DIVERT: al sitio alternativo
        cruise();
        const tgt = pmode === 'DIVERT' && f.altLand ? f.altLand : f.route[0];
        const dT = distNm(tr.lat, tr.lng, tgt.lat, tgt.lng);
        const sN = (tr.speedKt / 3600) * dt;
        if (dT <= sN) {
          tr.lat = tgt.lat; tr.lng = tgt.lng;
          tr.alt = Math.max(0, tr.alt - 8 * dt);
          if (tr.alt <= 0) { this.land(f, tr, pmode === 'DIVERT' ? 'SITIO ALTERNATIVO' : 'RTL'); continue; }
        } else {
          tr.hdg = bearing(tr.lat, tr.lng, tgt.lat, tgt.lng);
          [tr.lat, tr.lng] = stepTowards(tr.lat, tr.lng, tr.hdg, sN);
          if (tr.altCmd != null) tr.alt = stepAlt(tr.alt, tr.altCmd, VS_CMD * dt);
          else if (pmode === 'RTL' && f.rtlAlt != null) tr.alt = stepAlt(tr.alt, f.rtlAlt, 3 * dt); // altura de RTL programada
        }
      } else {
      // AUTO — navegación por waypoints
      if (tr.holdUntil == null) cruise();
      const last = tr.wpIdx >= f.route.length - 1;
      const wp = f.route[Math.min(tr.wpIdx, f.route.length - 1)];
      const dist = distNm(tr.lat, tr.lng, wp.lat, wp.lng);
      const stepNm = (tr.speedKt / 3600) * dt;
      const tgtAlt = tr.altCmd != null && !last ? tr.altCmd : wp.alt;
      if (tr.driftUntil != null && this.t < tr.driftUntil) {
        // ráfaga / viento cruzado: la aeronave deriva hasta que el piloto corrige
        tr.hdg = tr.driftHdg ?? tr.hdg;
        [tr.lat, tr.lng] = stepTowards(tr.lat, tr.lng, tr.hdg, stepNm * 0.8);
      } else if (dist <= stepNm) {
        if (tr.driftUntil != null) { tr.driftUntil = undefined; tr.driftHdg = undefined; }
        tr.lat = wp.lat;
        tr.lng = wp.lng;
        tr.alt = tgtAlt;
        // espera en tierra (helicóptero que aterriza y vuelve a despegar)
        if (wp.hold && tr.holdUntil == null && tr.wpIdx < f.route.length - 1) {
          tr.holdUntil = this.t + wp.hold;
          tr.speedKt = 0;
          this.addLog(`${f.callsign} EN TIERRA — ${wp.hold}s`, 'INFO');
        }
        if (tr.holdUntil != null) {
          if (this.t >= tr.holdUntil) {
            tr.holdUntil = undefined;
            tr.speedKt = f.speedKt;
            tr.wpIdx++;
            this.addLog(`${f.callsign} DESPEGUE`, 'INFO');
          }
          // mientras espera en tierra, no avanza ni evalúa fin de ruta
        } else if (tr.wpIdx >= f.route.length - 1) {
          // sólo "arriba" si mantiene control positivo Y termina DENTRO de su zona;
          // si cruzó el límite o está en contingencia → PISTA PERDIDA (sin confirmación de aterrizaje)
          const zc = this.zoneOf(f);
          const insideFinal = !zc || pointInRing(tr.lng, tr.lat, zc.ring);
          if (tr.manned) {
            // tráfico tripulado: transita y sale del área (no "aterriza" en la operación UAS)
            tr.status = 'LANDED';
            tr.speedKt = 0;
            this.addLog(`${f.callsign} TRÁFICO TRIPULADO SALIÓ DEL ÁREA`, 'INFO');
          } else if ((tr.status === 'NORMAL' || tr.status === 'EMERG') && insideFinal) {
            this.land(f, tr, 'MISIÓN COMPLETA');
          } else {
            tr.status = 'LOST';
            tr.speedKt = 0;
            if (!tr.alerts.includes('LOST')) tr.alerts.push('LOST');
            this.addLog(`${f.callsign} PISTA PERDIDA — ${insideFinal ? 'SIN ENLACE AL FINALIZAR' : 'FUERA DE ZONA'}`, 'ALARM');
            this.msgsForFlight(f, 'ALERFA');
          }
        } else {
          tr.wpIdx++;
        }
      } else {
        tr.hdg = bearing(tr.lat, tr.lng, wp.lat, wp.lng);
        // deriva con C2 perdido: el dron sigue su último rumbo con error creciente
        const hdgUse = tr.status === 'C2LOSS' ? tr.hdg + 25 : tr.hdg;
        [tr.lat, tr.lng] = stepTowards(tr.lat, tr.lng, hdgUse, stepNm);
        if (tr.altCmd != null && !last) tr.alt = stepAlt(tr.alt, tgtAlt, VS_CMD * dt);
        else tr.alt += (tgtAlt - tr.alt) * Math.min(1, dt / 20);
      }
      } // fin AUTO
      if (tr.status === 'LANDED' || tr.status === 'LOST') continue;

      // conformance — zona segregada asignada
      const zone = this.zoneOf(f);
      if (zone && tr.airborne) {
        const inside = pointInRing(tr.lng, tr.lat, zone.ring);
        if (!inside && tr.inside) {
          tr.inside = false;
          if (!tr.alerts.includes('ZB')) tr.alerts.push('ZB');
          if (tr.status === 'NORMAL') tr.status = 'BREACH';
          this.addLog(`${f.callsign} DESVÍO — FUERA DE ZONA ${zone.name}`, 'ALARM');
        } else if (inside && !tr.inside) {
          tr.inside = true;
          tr.alerts = tr.alerts.filter((a) => a !== 'ZB');
          if (tr.status === 'BREACH') tr.status = 'NORMAL';
          this.addLog(`${f.callsign} REINGRESO A ZONA ${zone.name}`, 'INFO');
        }
        // fuera de su zona Y sin enlace de comando → PISTA PERDIDA (no "arriba")
        if (!inside && tr.status === 'C2LOSS' && !tr.alerts.includes('LOST')) {
          tr.status = 'LOST';
          tr.speedKt = 0;
          tr.alerts.push('LOST');
          this.addLog(`${f.callsign} PISTA PERDIDA — FUERA DE ZONA SIN ENLACE C2`, 'ALARM');
          this.msgsForFlight(f, 'ALERFA');
        }
      }

      // razón vertical (suavizada): para indicar subiendo/bajando
      const vsNow = dt > 0 ? (tr.alt - altBefore) / dt : 0;
      tr.vs = (tr.vs ?? 0) * 0.6 + vsNow * 0.4;

      // trail
      if (tr.airborne) {
        const lastH = tr.history[tr.history.length - 1];
        if (!lastH || distNm(lastH[1], lastH[0], tr.lat, tr.lng) > 0.02) {
          tr.history.push([tr.lng, tr.lat]);
          if (tr.history.length > 60) tr.history.shift();
        }
      }
    }

    this.monitor(dt);
  }

  // ───────── medición automática: conformidad, zonas, separación, ocurrencias ─────────
  private monitor(dt: number) {
    const fl = new Map(this.scenario.flights.map((f) => [f.callsign, f]));
    const air: TrackState[] = [];
    for (const tr of this.tracks.values()) {
      if (!tr.airborne || tr.status === 'LANDED' || tr.status === 'LOST' || tr.holdUntil != null) continue;
      air.push(tr);
      const f = fl.get(tr.callsign);
      if (!f || tr.manned) continue;
      // conformidad con el volumen autorizado
      const zone = this.zoneOf(f);
      const ceil = tr.authCeil ?? zone?.ceiling ?? 120;
      const st = this.conf.get(tr.callsign) ?? { air: 0, inside: 0, maxDevM: 0, maxOverCeil: 0 };
      const inRing = zone ? pointInRing(tr.lng, tr.lat, zone.ring) : true;
      const over = tr.alt - ceil;
      const dev = inRing ? 0 : distToRingM(tr.lng, tr.lat, zone!.ring);
      const inside = dev <= 30 && over <= 5;
      st.air += dt;
      if (inside) st.inside += dt;
      st.maxDevM = Math.max(st.maxDevM, Math.round(dev));
      st.maxOverCeil = Math.max(st.maxOverCeil, Math.round(over));
      this.conf.set(tr.callsign, st);
      if (!inside && !this.outVol.has(tr.callsign) && tr.status !== 'C2LOSS' && tr.pmode !== 'RTL' && tr.pmode !== 'DIVERT') {
        this.outVol.add(tr.callsign);
        this.fact(dev > 30 ? 'VOL_OUT' : 'CEIL', tr.callsign, undefined, { dev: Math.round(dev), over: Math.round(over) });
        if (over > 5 && dev <= 30) this.addLog(`${tr.callsign} SOBRE TECHO AUTORIZADO ${ceil} M`, 'ALARM');
        this.occ('CONF', [tr.callsign], `${tr.callsign} ${dev > 30 ? 'FUERA DEL VOLUMEN' : `SOBRE TECHO ${ceil} M`}`);
      } else if (inside && this.outVol.has(tr.callsign)) this.outVol.delete(tr.callsign);

      // ingreso a zonas prohibidas / restringidas / NOTAM
      for (const z of this.scenario.zones) {
        if (!isRestr(z) || !this.activeZone(z)) continue;
        const key = `${tr.callsign}|${z.id}`;
        const inZ = pointInRing(tr.lng, tr.lat, z.ring) && tr.alt >= z.floor && tr.alt <= z.ceiling;
        const was = this.zoneIn.has(key);
        if (inZ && !was) {
          this.zoneIn.add(key);
          const atAct = z.appearAt != null && this.t - z.appearAt < 1;
          if (atAct) this.atAct.add(key);
          this.fact(atAct ? 'ZONE_AT_ACT' : 'ZONE_IN', tr.callsign, undefined, { zone: z.id, name: z.name, notam: z.appearAt != null });
          if (!atAct) this.addLog(`${tr.callsign} INGRESA A ZONA ${z.name}`, 'ALARM');
        } else if (!inZ && was) {
          this.zoneIn.delete(key);
          this.fact('ZONE_OUT', tr.callsign, undefined, { zone: z.id });
        }
        if (inZ && this.atAct.has(key) && this.t - (z.appearAt ?? 0) > 120 && !this.zoneStay.has(key)) {
          this.zoneStay.add(key);
          this.fact('ZONE_STAY', tr.callsign, undefined, { zone: z.id, name: z.name });
          this.addLog(`${tr.callsign} PERMANECE EN ${z.name} (>120 S)`, 'ALARM');
        }
      }
    }

    // separación entre aeronaves (pérdida bajo mínimo) + conflictos + tráfico tripulado
    for (let i = 0; i < air.length; i++) {
      for (let j = i + 1; j < air.length; j++) {
        const a = air[i], b = air[j];
        if (a.manned && b.manned) continue;
        if ((!a.manned && a.alt < 3) || (!b.manned && b.alt < 3)) continue;
        const dH = distM(a.lat, a.lng, b.lat, b.lng);
        const dV = Math.abs(a.alt - b.alt);
        const key = [a.callsign, b.callsign].sort().join('|');
        const man = a.manned || b.manned;
        const lim = man ? LOS_MANNED : LOS_UAS;
        if (dH < lim.h && dV < lim.v) {
          if (!this.losOn.has(key)) {
            this.losOn.add(key);
            this.fact('LOS', undefined, undefined, { a: a.callsign, b: b.callsign, dH: Math.round(dH), dV: Math.round(dV), manned: !!man });
            this.addLog(`PÉRDIDA DE SEPARACIÓN ${a.callsign} / ${b.callsign} — ${Math.round(dH)} M / ${Math.round(dV)} M`, 'ALARM');
          }
        } else if (this.losOn.has(key) && (dH > lim.h * 1.5 || dV > lim.v * 1.5)) this.losOn.delete(key);
        // conflicto UAS–UAS en desarrollo (acercamiento a la misma altura)
        if (!man) {
          const prev = this.pairD.get(key);
          this.pairD.set(key, dH);
          if (this.conflictSeen.has(key) && dH > 4000) this.conflictSeen.delete(key); // el par se separó: puede volver a entrar en conflicto
          if (prev != null && dH < prev && dH < 2500 && dV < 30 && !this.conflictSeen.has(key)) {
            this.conflictSeen.add(key);
            this.occ('CONFLICT', [a.callsign, b.callsign], `CONFLICTO ${a.callsign} / ${b.callsign}`, { ref: key });
          }
        } else {
          // tráfico tripulado próximo a una operación UAS
          const m = a.manned ? a : b, u = a.manned ? b : a;
          if (dH < 1852 && dV < 150) {
            const o = this.mannedOcc.get(m.callsign);
            if (!o) {
              this.mannedOcc.set(m.callsign, this.occ('MANNED', [u.callsign], `TRÁFICO TRIPULADO ${m.noncoop ? 'NO COOPERATIVO ' : ''}${m.callsign} (${m.acType})`, { ref: m.callsign }));
              this.addLog(`TRÁFICO TRIPULADO ${m.noncoop ? 'NO COOPERATIVO ' : ''}${m.callsign} ${Math.round(m.alt)} M PRÓXIMO A ${u.callsign}`, 'ALARM');
            } else if (!o.flights.includes(u.callsign)) {
              if (this.t - o.t < 60) {
                o.flights.push(u.callsign);
                const sec = u.sector ?? 'S1';
                if (!o.sectors.includes(sec)) o.sectors.push(sec);
              } else if (!this.occs.some((x) => x.k === 'MANNED' && x.ref === m.callsign && x.flights.includes(u.callsign))) {
                // el mismo tripulado alcanza otra operación más tarde: nueva ocurrencia
                this.mannedOcc.set(m.callsign, this.occ('MANNED', [u.callsign], `TRÁFICO TRIPULADO ${m.noncoop ? 'NO COOPERATIVO ' : ''}${m.callsign} (${m.acType})`, { ref: m.callsign }));
                this.addLog(`TRÁFICO TRIPULADO ${m.callsign} ${Math.round(m.alt)} M PRÓXIMO A ${u.callsign}`, 'ALARM');
              }
            }
          }
        }
      }
    }

    // instrucciones: piloto automático (vuelos sin piloto humano) y cumplimiento
    for (const ins of this.instrs) {
      if (ins.done != null) continue;
      const tr = this.tracks.get(ins.f);
      if (!tr) continue;
      if (ins.autoAt != null && this.t >= ins.autoAt) { ins.autoAt = undefined; if (!tr.claimed) this.autoExecute(ins); }
      if (this.t - ins.t < 600 && this.complied(ins, tr)) {
        ins.done = this.t;
        this.fact('COMPLY', ins.f, undefined, { id: ins.id, dt: Math.round(this.t - ins.t) });
      }
    }
  }
}
