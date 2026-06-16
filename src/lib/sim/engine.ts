// CONDOR SIM — motor de simulación BVLOS (corre en el navegador, sin backend)
// Coordenadas en lat/lng WGS-84; distancias en NM; velocidades en kt; alturas en m AGL.

export type TrackStatus = 'NORMAL' | 'C2LOSS' | 'LOWBAT' | 'BREACH' | 'EMERG' | 'LANDED' | 'LOST';

export interface Waypoint {
  lat: number;
  lng: number;
  alt: number; // m AGL
  hold?: number; // segundos en tierra antes de despegar (toma de helicóptero / aterrizaje y re-despegue)
}

export interface SimEvent {
  t: number; // segundos de simulación en que se dispara
  flight: string; // callsign
  type: 'C2LOSS' | 'C2RESTORE' | 'LOWBAT' | 'EMERG' | 'RTH';
  duration?: number; // para C2LOSS auto-restore
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
  pmode?: 'AUTO' | 'LOITER' | 'RTL' | 'GUIDED'; // modo de vuelo (AUTO = sigue ruta)
  holdUntil?: number; // en tierra hasta este t de sim (espera en waypoint con hold)
  altCmd?: number; // altitud comandada (m)
  hdgCmd?: number; // rumbo comandado (°)
  spdCmd?: number; // velocidad comandada (kt)
  history: [number, number][]; // trail [lng,lat]
  live?: boolean; // track de fuente real (Remote ID / ADS-B / puente), no simulado
  tsLive?: number; // epoch ms del último dato real recibido (para edad del dato)
  source?: 'RID' | 'ADS-B' | 'MP'; // procedencia del dato real
}

export interface Scenario {
  id: string;
  name: string;
  center: [number, number]; // [lng, lat]
  rangeNm: number;
  zones: Zone[];
  flights: SimFlight[];
  events: SimEvent[];
  briefing: string;
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
  type: 'FPL' | 'DEP' | 'ARR' | 'ALR' | 'SVC';
  flight: string;
  body: string;
  read?: boolean;
}

export class SimEngine {
  scenario: Scenario;
  t = 0; // segundos de simulación
  speed = 1; // x1 x2 x4
  paused = true;
  tracks = new Map<string, TrackState>();
  log: { t: number; msg: string; level: 'INFO' | 'WARN' | 'ALARM' }[] = [];
  msgs: SimMsg[] = [];
  private msgSeq = 0;
  private firedEvents = new Set<number>();

  constructor(scenario: Scenario) {
    this.scenario = scenario;
    this.reset();
  }

  reset() {
    this.t = 0;
    this.paused = true;
    this.firedEvents.clear();
    this.log = [];
    this.msgs = [];
    this.msgSeq = 0;
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
        history: [],
      });
    }
    this.addLog('EJERCICIO CARGADO: ' + this.scenario.name, 'INFO');
  }

  addLog(msg: string, level: 'INFO' | 'WARN' | 'ALARM' = 'INFO') {
    this.log.unshift({ t: this.t, msg, level });
    if (this.log.length > 200) this.log.pop();
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
    const eet = Math.round((f.batteryMin * 0.8) / 60 * 100) / 100;
    const eetHHMM = '00' + String(Math.max(10, Math.round(f.batteryMin * 0.6))).padStart(2, '0');
    switch (kind) {
      case 'FPL':
        this.addMsg('FPL', cs,
          `(FPL-${cs}-VG\n-1ZZZZ/L -V/C\n-ZZZZ${this.hhmm(120)}\n-N${String(Math.round(f.speedKt)).padStart(4, '0')}VFR DCT\n-ZZZZ${eetHHMM}\n-DEP/OPERACION UAS DEST/OPERACION UAS\n TYP/UAS ${f.acType} RMK/AUT ${f.authRef} EJERCICIO CONDOR SIM)`,
          'GG');
        void eet;
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

  // comando del piloto (Remote Pilot Station): modo de vuelo o ajuste relativo de alt/rumbo/velocidad
  applyPilotCommand(flight: string, cmd: { mode?: TrackState['pmode']; dAlt?: number; dHdg?: number; dSpd?: number }) {
    const tr = this.tracks.get(flight);
    if (!tr || tr.status === 'LANDED' || tr.status === 'LOST') return;
    const guide = () => { if (tr.pmode !== 'GUIDED') tr.pmode = 'GUIDED'; tr.altCmd ??= tr.alt; tr.hdgCmd ??= tr.hdg; tr.spdCmd ??= tr.speedKt; };
    if (cmd.mode) {
      tr.pmode = cmd.mode;
      if (cmd.mode === 'GUIDED') { tr.altCmd ??= tr.alt; tr.hdgCmd ??= tr.hdg; tr.spdCmd ??= tr.speedKt; }
      if (cmd.mode === 'LOITER') { tr.altCmd ??= tr.alt; }
      if (cmd.mode === 'AUTO') { tr.altCmd = undefined; tr.hdgCmd = undefined; tr.spdCmd = undefined; }
      this.addLog(`${flight} PILOTO ▸ MODO ${cmd.mode}`, 'INFO');
      return;
    }
    if (cmd.dAlt != null) { if (tr.pmode !== 'LOITER') guide(); tr.altCmd = Math.max(0, (tr.altCmd ?? tr.alt) + cmd.dAlt); this.addLog(`${flight} PILOTO ▸ ALT ${cmd.dAlt > 0 ? '+' : ''}${cmd.dAlt} → ${Math.round(tr.altCmd)}M`, 'INFO'); }
    if (cmd.dHdg != null) { guide(); tr.hdgCmd = (((tr.hdgCmd ?? tr.hdg) + cmd.dHdg) % 360 + 360) % 360; this.addLog(`${flight} PILOTO ▸ HDG ${cmd.dHdg > 0 ? '+' : ''}${cmd.dHdg} → ${Math.round(tr.hdgCmd)}°`, 'INFO'); }
    if (cmd.dSpd != null) { guide(); tr.spdCmd = Math.max(0, (tr.spdCmd ?? tr.speedKt) + cmd.dSpd); this.addLog(`${flight} PILOTO ▸ VEL ${cmd.dSpd > 0 ? '+' : ''}${cmd.dSpd} → ${Math.round(tr.spdCmd)}KT`, 'INFO'); }
  }

  private applyEvent(ev: SimEvent) {
    const tr = this.tracks.get(ev.flight);
    if (!tr || tr.status === 'LANDED') return;
    switch (ev.type) {
      case 'C2LOSS': {
        tr.status = 'C2LOSS';
        if (!tr.alerts.includes('C2')) tr.alerts.push('C2');
        this.addLog(`${ev.flight} PÉRDIDA DE ENLACE C2`, 'ALARM');
        const fl = this.scenario.flights.find((f) => f.callsign === ev.flight);
        if (fl) this.msgsForFlight(fl, 'ALR');
        break;
      }
      case 'C2RESTORE':
        if (tr.status === 'C2LOSS') tr.status = 'NORMAL';
        tr.alerts = tr.alerts.filter((a) => a !== 'C2');
        this.addLog(`${ev.flight} ENLACE C2 RESTABLECIDO`, 'INFO');
        break;
      case 'LOWBAT':
        tr.batteryPct = Math.min(tr.batteryPct, 18);
        this.addLog(`${ev.flight} BATERÍA BAJA FORZADA (INSTRUCTOR)`, 'WARN');
        break;
      case 'EMERG':
        tr.status = 'EMERG';
        if (!tr.alerts.includes('EM')) tr.alerts.push('EM');
        this.addLog(`${ev.flight} EMERGENCIA DECLARADA`, 'ALARM');
        break;
      case 'RTH':
        tr.wpIdx = 0; // regresar al punto de despegue
        this.addLog(`${ev.flight} RETORNO A CASA (RTH) ORDENADO`, 'WARN');
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

  private step(dt: number) {
    this.t += dt;

    // eventos programados
    this.scenario.events.forEach((ev, idx) => {
      if (!this.firedEvents.has(idx) && this.t >= ev.t) {
        this.firedEvents.add(idx);
        this.applyEvent(ev);
        if (ev.type === 'C2LOSS' && ev.duration) {
          this.scenario.events.push({ t: ev.t + ev.duration, flight: ev.flight, type: 'C2RESTORE' });
        }
      }
    });

    for (const f of this.scenario.flights) {
      const tr = this.tracks.get(f.callsign)!;
      if (tr.status === 'LANDED' || tr.status === 'LOST') continue; // aterrizada o pista perdida: congelada en su última posición

      // despegue
      if (!tr.airborne) {
        if (this.t >= f.startT) {
          tr.airborne = true;
          tr.alt = f.route[0].alt;
          tr.speedKt = f.speedKt;
          tr.wpIdx = 1;
          this.addLog(`${f.callsign} DESPEGUE — AUT ${f.authRef}`, 'INFO');
          this.msgsForFlight(f, 'FPL');
          this.msgsForFlight(f, 'DEP');
        } else continue;
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
        this.addLog(`${f.callsign} ATERRIZAJE FORZOSO — BATERÍA AGOTADA`, 'ALARM');
        this.msgsForFlight(f, 'ARR');
        continue;
      }

      // ── navegación según el modo de vuelo del piloto ──
      const pmode = tr.pmode ?? 'AUTO';
      if (pmode === 'LOITER') {
        // mantener posición; sólo ajustar altitud al comando
        tr.speedKt = 0;
        if (tr.altCmd != null) tr.alt += (tr.altCmd - tr.alt) * Math.min(1, dt / 8);
      } else if (pmode === 'GUIDED') {
        // volar rumbo/velocidad/altitud comandados por el piloto
        if (tr.spdCmd != null) tr.speedKt = tr.spdCmd;
        if (tr.hdgCmd != null) tr.hdg = tr.hdgCmd;
        [tr.lat, tr.lng] = stepTowards(tr.lat, tr.lng, tr.hdg, (tr.speedKt / 3600) * dt);
        if (tr.altCmd != null) tr.alt += (tr.altCmd - tr.alt) * Math.min(1, dt / 8);
      } else if (pmode === 'RTL') {
        // retorno al punto de lanzamiento (route[0]) y aterrizaje
        const home = f.route[0];
        const dHome = distNm(tr.lat, tr.lng, home.lat, home.lng);
        const sN = (tr.speedKt / 3600) * dt;
        if (dHome <= sN) {
          tr.lat = home.lat; tr.lng = home.lng;
          tr.alt = Math.max(0, tr.alt - 25 * dt);
          if (tr.alt <= 0) {
            tr.status = 'LANDED'; tr.speedKt = 0;
            this.addLog(`${f.callsign} ATERRIZADO — RTL`, 'INFO');
            this.msgsForFlight(f, 'ARR');
            continue;
          }
        } else {
          tr.hdg = bearing(tr.lat, tr.lng, home.lat, home.lng);
          [tr.lat, tr.lng] = stepTowards(tr.lat, tr.lng, tr.hdg, sN);
        }
      } else {
      // AUTO — navegación por waypoints
      const wp = f.route[Math.min(tr.wpIdx, f.route.length - 1)];
      const dist = distNm(tr.lat, tr.lng, wp.lat, wp.lng);
      const stepNm = (tr.speedKt / 3600) * dt;
      if (dist <= stepNm) {
        tr.lat = wp.lat;
        tr.lng = wp.lng;
        tr.alt = wp.alt;
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
          const zc = this.scenario.zones.find((z) => z.id === f.zoneId);
          const insideFinal = !zc || pointInRing(tr.lng, tr.lat, zc.ring);
          if (tr.manned) {
            // tráfico tripulado: transita y sale del área (no "aterriza" en la operación UAS)
            tr.status = 'LANDED';
            tr.speedKt = 0;
            this.addLog(`${f.callsign} TRÁFICO TRIPULADO SALIÓ DEL ÁREA`, 'INFO');
          } else if (tr.status === 'NORMAL' && insideFinal) {
            tr.status = 'LANDED';
            tr.speedKt = 0;
            tr.alt = 0;
            this.addLog(`${f.callsign} ATERRIZADO — MISIÓN COMPLETA`, 'INFO');
            this.msgsForFlight(f, 'ARR');
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
        tr.alt += (wp.alt - tr.alt) * Math.min(1, dt / 20);
      }
      } // fin AUTO

      // conformance — zona segregada asignada
      const zone = this.scenario.zones.find((z) => z.id === f.zoneId);
      if (zone && tr.airborne && tr.status !== 'LANDED' && tr.status !== 'LOST') {
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

      // trail
      if (tr.airborne && tr.status !== 'LANDED' && tr.status !== 'LOST') {
        const last = tr.history[tr.history.length - 1];
        if (!last || distNm(last[1], last[0], tr.lat, tr.lng) > 0.02) {
          tr.history.push([tr.lng, tr.lat]);
          if (tr.history.length > 60) tr.history.shift();
        }
      }
    }
  }
}
