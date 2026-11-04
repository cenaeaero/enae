// CONDOR SIM — evaluación por competencias, POR EJERCICIO y POR ROL.
// Entrada: el registro del motor (hechos, ocurrencias, instrucciones, conformidad)
// que el puesto supervisor acumula durante el ejercicio. Salida: un informe por alumno.

import type { Scenario, Fact, Occ, Instr, ConfStat, InstrKind, OccKind } from './engine';

export type EvalRole = 'UTM' | 'UAS' | 'RPAS';
export type CompKey = 'situacional' | 'comunicacion' | 'decisiones' | 'procedimientos' | 'conformidad' | 'carga';
export const COMP_LABEL: Record<CompKey, string> = {
  situacional: 'Conciencia situacional',
  comunicacion: 'Comunicación',
  decisiones: 'Toma de decisiones',
  procedimientos: 'Aplicación de procedimientos',
  conformidad: 'Conformidad',
  carga: 'Gestión de carga',
};
export const COMP_SHORT: Record<CompKey, string> = {
  situacional: 'SIT', comunicacion: 'COM', decisiones: 'DEC', procedimientos: 'PRO', conformidad: 'CNF', carga: 'CAR',
};

export interface EvalPos { id: string; name: string; role: string } // role de sim_positions: controller | pilot
export interface CompScore { key: CompKey; label: string; score: number; detail: string }
export interface Report {
  positionId: string;
  studentName: string;
  role: EvalRole;
  flights: string[];
  score: number;
  minScore: number;
  passed: boolean;
  criticals: string[];
  comps: CompScore[];
  notes: string[];
}

export const MIN_BY_LEVEL: Record<number, number> = { 1: 70, 2: 70, 3: 75, 4: 80, 5: 85 };
export const minScoreFor = (s: Scenario) => s.minScore ?? MIN_BY_LEVEL[s.level ?? 1] ?? 70;

export interface EvalInput {
  scenario: Scenario;
  facts: Fact[];
  occs: Occ[];
  instrs: Instr[];
  conf: Map<string, ConfStat>;
  sectorOf: (cs: string) => string;
  positions: EvalPos[];
}

// ventana de respuesta esperada por tipo de ocurrencia (s)
const WIN: Record<OccKind, number> = { TASK: 45, CONFLICT: 60, CONF: 60, MANNED: 75, NOTAM: 90, C2: 90, EMERG: 75, LOWBAT: 75 };
const EFFECTIVE: InstrKind[] = ['HOLD', 'ALT', 'LAND', 'RTL'];
const OCC_TXT: Record<OccKind, string> = {
  TASK: 'coordinación', CONFLICT: 'conflicto UAS', CONF: 'desvío de volumen', MANNED: 'tráfico tripulado',
  NOTAM: 'NOTAM nuevo', C2: 'pérdida C2', EMERG: 'emergencia', LOWBAT: 'batería baja',
};

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const pct = (x: number) => Math.round(Math.max(0, Math.min(1, x)) * 100);
const detScore = (dt: number | null) => (dt == null ? 0 : dt <= 20 ? 1 : dt <= 120 ? 1 - ((dt - 20) / 100) * 0.8 : 0.1);
const resScore = (dt: number | null, w: number) =>
  dt == null ? 0 : dt <= w / 2 ? 1 : dt <= w ? 1 - ((dt - w / 2) / (w / 2)) * 0.4 : dt <= 2 * w ? 0.3 : 0.1;

export function evaluate(inp: EvalInput): Report[] {
  const { scenario, positions } = inp;
  const out: Report[] = [];
  for (const p of positions) {
    if (p.role === 'controller') out.push(evalUtm(inp, p));
    else if (p.role === 'pilot') out.push(evalPilot(inp, p));
  }
  void scenario;
  return out;
}

function finish(inp: EvalInput, p: EvalPos, role: EvalRole, flights: string[], parts: { key: CompKey; w: number; v: number | null; detail: string }[], criticals: string[], notes: string[]): Report {
  const avail = parts.filter((x) => x.v != null);
  const W = avail.reduce((a, x) => a + x.w, 0);
  const score = W ? Math.round(avail.reduce((a, x) => a + x.w * (x.v as number), 0) / W * 100) : 0;
  const minScore = minScoreFor(inp.scenario);
  return {
    positionId: p.id, studentName: p.name, role, flights, score, minScore,
    passed: score >= minScore && criticals.length === 0,
    criticals: [...new Set(criticals)],
    comps: avail.map((x) => ({ key: x.key, label: COMP_LABEL[x.key], score: pct(x.v as number), detail: x.detail })),
    notes,
  };
}

// ───────────────────────── Operador UTM ─────────────────────────
function evalUtm(inp: EvalInput, p: EvalPos): Report {
  const { scenario, facts, instrs, sectorOf } = inp;
  const mine = facts.filter((f) => f.by === p.id);
  const myIns = instrs.filter((i) => i.by === p.id);
  const notes: string[] = [];
  const criticals: string[] = [];

  // sector del alumno (ejercicios con 2 sectores): el de los vuelos que instruyó
  let occs = inp.occs;
  if ((scenario.sectors?.length ?? 0) > 1 && myIns.length) {
    const mySec = new Set(myIns.map((i) => sectorOf(i.f)));
    occs = occs.filter((o) => o.k === 'NOTAM' || o.sectors.some((s) => mySec.has(s)));
    notes.push(`Sector evaluado: ${[...mySec].join(', ')}`);
  }

  const insTo = (cs: string, from: number, kinds?: InstrKind[]) =>
    myIns.filter((i) => i.f === cs && i.t >= from && (!kinds || kinds.includes(i.k)));
  const firstT = (xs: { t: number }[]) => (xs.length ? Math.min(...xs.map((x) => x.t)) : null);

  const detS: number[] = [], resS: number[] = [], kindS: number[] = [], procS: number[] = [];
  const resolvedAt = new Map<string, number | null>();
  let detSum = 0, detN = 0;
  for (const o of occs) {
    const w = WIN[o.k];
    const pre = o.k === 'MANNED' || o.k === 'CONFLICT' || o.k === 'NOTAM' ? 60 : 0; // anticipación válida
    const refs = new Set([...o.flights, ...(o.clear ?? []), ...(o.ref ? [o.ref] : [])]);
    const rel = mine.filter((f) => f.t >= o.t - pre && ['ACK', 'CONT', 'INSTR', 'CPDLC', 'NOTAM_ACT'].includes(f.k) &&
      ((f.f && refs.has(f.f)) || (f.k === 'NOTAM_ACT' && f.d?.zone === o.ref)));
    const tDet = firstT(rel);
    const dDet = tDet == null ? null : Math.max(0, tDet - o.t);
    detS.push(detScore(dDet));
    if (dDet != null) { detSum += dDet; detN++; }

    // resolución
    let tRes: number | null = null;
    let kindOk: number | null = null;
    const allTo = (list: string[], kinds: InstrKind[] | undefined, from: number) => {
      let tMax = o.t;
      for (const cs of list) {
        const t = firstT([...insTo(cs, from, kinds), ...mine.filter((f) => f.k === 'CPDLC' && f.f === cs && f.t >= from && !kinds)]);
        if (t == null) return null;
        tMax = Math.max(tMax, t);
      }
      return tMax;
    };
    switch (o.k) {
      case 'TASK': {
        const hit = myIns.filter((i) => i.f === o.flights[0] && i.t >= o.t && i.k === o.instr && (o.instr !== 'ALT' || Math.abs((i.v ?? -999) - (o.value ?? 0)) <= 10));
        tRes = firstT(hit);
        kindOk = tRes != null ? 1 : insTo(o.flights[0], o.t).length ? 0.3 : 0;
        break;
      }
      case 'CONF': tRes = allTo(o.flights, undefined, o.t); break;
      case 'CONFLICT': {
        const ts = o.flights.map((cs) => firstT(insTo(cs, o.t - pre, EFFECTIVE))).filter((x): x is number => x != null);
        tRes = ts.length ? Math.min(...ts) : null;
        kindOk = tRes != null ? 1 : o.flights.some((cs) => insTo(cs, o.t - pre).length) ? 0.4 : 0;
        break;
      }
      case 'MANNED': {
        tRes = o.flights.length ? allTo(o.flights, [...EFFECTIVE, 'TFC'], o.t - pre) : (tDet ?? null);
        const eff = o.flights.filter((cs) => insTo(cs, o.t - pre, EFFECTIVE).length).length;
        kindOk = o.flights.length ? (eff + 0.5 * o.flights.filter((cs) => !insTo(cs, o.t - pre, EFFECTIVE).length && insTo(cs, o.t - pre, ['TFC']).length).length) / o.flights.length : null;
        break;
      }
      case 'NOTAM': {
        const act = firstT(mine.filter((f) => f.k === 'NOTAM_ACT' && f.d?.zone === o.ref));
        procS.push(act == null ? 0 : resScore(act - o.t, w));
        if (act == null) notes.push(`No activó la restricción ${o.label}`);
        const tf = o.flights.length ? allTo(o.flights, ['HOLD', 'LAND', 'RTL'], o.t - pre) : o.t;
        tRes = act != null && tf != null ? Math.max(act, tf) : null;
        kindOk = o.flights.length ? o.flights.filter((cs) => insTo(cs, o.t - pre, ['HOLD', 'LAND', 'RTL']).length).length / o.flights.length : null;
        break;
      }
      case 'C2': case 'EMERG': case 'LOWBAT': {
        const cs = o.flights[0];
        const cont = firstT(mine.filter((f) => f.k === 'CONT' && f.f === cs && f.t >= o.t - 60));
        const ack = firstT(mine.filter((f) => (f.k === 'ACK' || f.k === 'CONT') && f.f === cs && f.t >= o.t - 30));
        if (o.k !== 'LOWBAT') {
          procS.push(cont == null ? 0 : resScore(cont - o.t, w));
          if (cont == null) criticals.push(`No declaró contingencia ante ${o.label}`);
        } else procS.push(ack != null || insTo(cs, o.t, ['LAND', 'RTL']).length ? 1 : 0);
        const tc = o.clear?.length ? allTo(o.clear, EFFECTIVE, o.t - 60) : o.t;
        const base = o.k === 'LOWBAT' ? firstT([...(ack != null ? [{ t: ack }] : []), ...insTo(cs, o.t - 30, ['LAND', 'RTL'])]) : cont;
        tRes = base != null && tc != null ? Math.max(base, tc) : null;
        if (o.clear?.length) kindOk = o.clear.filter((c) => insTo(c, o.t - 60, EFFECTIVE).length).length / o.clear.length;
        if (o.clear?.length && tc == null) notes.push(`No despejó/instruyó a ${o.clear.join(', ')} ante ${o.label}`);
        break;
      }
    }
    const dRes = tRes == null ? null : Math.max(0, tRes - o.t);
    resolvedAt.set(o.id, dRes);
    resS.push(resScore(dRes, w));
    if (kindOk != null) kindS.push(kindOk);
    if (dRes == null) notes.push(`Sin resolver: ${o.label} (T+${Math.round(o.t)} s)`);
  }

  // autorizaciones de volumen
  const reqs = scenario.flights.filter((f) => f.req);
  const authS: number[] = [];
  for (const f of reqs) {
    const dec = [...mine].reverse().find((x) => x.k === 'AUTH' && x.f === f.callsign);
    if (!dec) { authS.push(0); notes.push(`Solicitud ${f.req!.id} (${f.callsign}) sin resolver`); continue; }
    authS.push(dec.d?.correct ? 1 : 0);
    if (!dec.d?.correct) notes.push(`Solicitud ${f.req!.id} (${f.callsign}): decidió ${dec.d?.decision}, correcto ${f.req!.expect} — ${f.req!.reason}`);
  }
  for (const x of mine.filter((x) => x.k === 'AUTH_INVADE')) criticals.push(`Autorizó el volumen de ${x.f} que invade la zona ${String(x.d?.zone)}`);

  // acuse de FPL/DEP
  if (scenario.ackFpl) {
    const deps = facts.filter((f) => f.k === 'TAKEOFF' && f.f && !scenario.flights.find((x) => x.callsign === f.f)?.manned).map((f) => f.f!);
    const acked = new Set(mine.filter((f) => f.k === 'ACK_MSG' && f.f).map((f) => f.f!));
    if (deps.length) {
      procS.push(deps.filter((cs) => acked.has(cs)).length / deps.length);
      const miss = deps.filter((cs) => !acked.has(cs));
      if (miss.length) notes.push(`FPL/DEP sin acusar: ${miss.join(', ')}`);
    }
  }
  // handover de sectores
  for (const cs of scenario.handover ?? []) {
    const ok = facts.some((f) => f.k === 'HANDOVER' && f.f === cs && f.by === p.id);
    procS.push(ok ? 1 : 0);
    if (!ok) notes.push(`Handover no efectuado: ${cs}`);
  }
  // colación obtenida para sus instrucciones
  const rbRate = myIns.length ? myIns.filter((i) => i.rb != null).length / myIns.length : null;

  // errores críticos: pérdida de separación / ingreso a zona
  const humanAt = (cs: string, t: number) => facts.some((f) => f.f === cs && f.t <= t && !!f.by && f.by !== 'AUTO' && ['CLAIM', 'PCMD', 'RB', 'TAKEOFF'].includes(f.k));
  const effBefore = (cs: string, t: number) => instrs.filter((i) => i.by === p.id && i.f === cs && i.t <= t - 10 && i.t >= t - 240 && EFFECTIVE.includes(i.k));
  const inMySector = (cs: string) => !((scenario.sectors?.length ?? 0) > 1 && myIns.length) || myIns.some((i) => sectorOf(i.f) === sectorOf(cs));
  for (const l of facts.filter((f) => f.k === 'LOS')) {
    const a = String(l.d?.a), b = String(l.d?.b);
    const uas = [a, b].filter((cs) => !scenario.flights.find((x) => x.callsign === cs)?.manned);
    if (!uas.some(inMySector)) continue;
    const given = uas.flatMap((cs) => effBefore(cs, l.t));
    const pilotFault = given.some((i) => (i.done == null || i.done > l.t) && humanAt(i.f, l.t));
    if (!pilotFault) criticals.push(`Pérdida de separación ${a}/${b} (${l.d?.dH} m / ${l.d?.dV} m) en T+${Math.round(l.t)} s`);
  }
  for (const z of facts.filter((f) => f.k === 'ZONE_IN' && f.f)) {
    if (!inMySector(z.f!)) continue;
    const zone = scenario.zones.find((x) => x.id === z.d?.zone);
    if (zone?.appearAt != null && z.t - zone.appearAt < 30) continue; // sin tiempo material de reacción
    const given = instrs.filter((i) => i.by === p.id && i.f === z.f && i.t <= z.t - 5 && ['HOLD', 'LAND', 'RTL'].includes(i.k));
    const pilotFault = given.some((i) => (i.done == null || i.done > z.t) && humanAt(i.f, z.t));
    if (!pilotFault) criticals.push(`${z.f} ingresó a ${String(z.d?.name)} en T+${Math.round(z.t)} s sin instrucción del UTM`);
  }
  const stays = facts.filter((f) => f.k === 'ZONE_STAY' && f.f && inMySector(f.f));
  if (stays.length) { procS.push(0); notes.push(`Operaciones que permanecieron >120 s en NOTAM: ${stays.map((s) => s.f).join(', ')}`); }

  // gestión de carga (N4–N5): resolución en plazo, con más peso a ocurrencias simultáneas
  let carga: number | null = null;
  if ((scenario.level ?? 1) >= 4 && occs.length) {
    let num = 0, den = 0;
    for (const o of occs) {
      const sim = occs.some((x) => x.id !== o.id && Math.abs(x.t - o.t) <= 90);
      const wgt = sim ? 2 : 1;
      const d = resolvedAt.get(o.id);
      num += wgt * (d != null && d <= WIN[o.k] ? 1 : d != null ? 0.4 : 0);
      den += wgt;
    }
    carga = num / den;
  }

  const decisiones = mean([...(authS.length ? [mean(authS)!] : []), ...(kindS.length ? [mean(kindS)!] : [])]);
  const comunic = resS.length ? (rbRate != null ? 0.35 * rbRate + 0.65 * mean(resS)! : mean(resS)!) : rbRate;
  const parts = [
    { key: 'situacional' as const, w: 25, v: mean(detS), detail: detN ? `${detS.length} ocurrencias · detección media ${Math.round(detSum / detN)} s` : detS.length ? 'sin detecciones' : '—' },
    { key: 'comunicacion' as const, w: 20, v: comunic, detail: `${myIns.length} instrucciones · colación ${rbRate == null ? '—' : pct(rbRate) + '%'} · respuesta en plazo ${resS.length ? pct(mean(resS)!) + '%' : '—'}` },
    { key: 'decisiones' as const, w: reqs.length ? 35 : 20, v: decisiones, detail: `${authS.length ? `autorizaciones correctas ${authS.filter((x) => x === 1).length}/${authS.length} · ` : ''}acciones adecuadas ${kindS.length ? pct(mean(kindS)!) + '%' : '—'}` },
    { key: 'procedimientos' as const, w: 20, v: mean(procS), detail: procS.length ? `${procS.filter((x) => x >= 0.6).length}/${procS.length} procedimientos aplicados` : '—' },
    { key: 'carga' as const, w: 15, v: carga, detail: carga == null ? '—' : `${occs.length} ocurrencias · resueltas en plazo ${pct(carga)}% (ponderado)` },
  ];
  if (occs.length) notes.unshift(`Ocurrencias: ${occs.map((o) => `${OCC_TXT[o.k]} T+${Math.round(o.t)}`).join(' · ')}`);
  return finish(inp, p, 'UTM', [], parts, criticals, notes);
}

// ───────────────────────── Piloto UAS (VLOS manual) / RPAS (BVLOS) ─────────────────────────
function evalPilot(inp: EvalInput, p: EvalPos): Report {
  const { scenario, facts, instrs, conf } = inp;
  const mine = facts.filter((f) => f.by === p.id);
  const flights = [...new Set(mine.filter((f) => f.f && ['CLAIM', 'PCMD', 'RB', 'TAKEOFF', 'PREPORT'].includes(f.k)).map((f) => f.f!))];
  const notes: string[] = [];
  const criticals: string[] = [];
  const def = (cs: string) => scenario.flights.find((f) => f.callsign === cs);
  const role: EvalRole = flights.some((cs) => def(cs)?.op === 'BVLOS') ? 'RPAS' : 'UAS';
  if (!flights.length) {
    notes.push('El piloto no tomó el mando de ninguna aeronave (TOMAR MANDO en la estación RPS).');
    return finish(inp, p, role, [], [{ key: 'conformidad', w: 1, v: 0, detail: 'sin aeronave' }], criticals, notes);
  }
  const claimT = (cs: string) => Math.min(...mine.filter((f) => f.f === cs).map((f) => f.t));

  // conformidad
  const cS: number[] = [];
  const cDet: string[] = [];
  for (const cs of flights) {
    const st = conf.get(cs);
    if (!st || st.air < 5) continue;
    const pIn = st.inside / st.air;
    const v = 0.6 * pIn + 0.2 * Math.max(0, 1 - st.maxDevM / 300) + 0.2 * (st.maxOverCeil <= 5 ? 1 : Math.max(0, 1 - st.maxOverCeil / 30));
    cS.push(v);
    cDet.push(`${cs}: ${pct(pIn)}% en volumen · desvío máx ${st.maxDevM} m · techo ${st.maxOverCeil <= 5 ? 'respetado' : `+${st.maxOverCeil} m`}`);
  }

  // instrucciones a mis aeronaves (desde que tomé el mando)
  const ins = instrs.filter((i) => flights.includes(i.f) && i.t >= claimT(i.f) - 1);
  const rbMine = ins.filter((i) => i.rbBy === p.id);
  const rbS = ins.map((i) => (i.rbBy === p.id && i.rb != null ? (i.rb - i.t <= 10 ? 1 : i.rb - i.t <= 60 ? 1 - ((i.rb - i.t - 10) / 50) * 0.7 : 0.2) : 0));
  const execIns = ins.filter((i) => i.k !== 'TFC');
  const compS = execIns.map((i) => (i.done != null && i.done - i.t <= 40 ? 1 : i.done != null ? 0.5 : 0));
  const missed = execIns.filter((i) => i.done == null);
  if (missed.length) notes.push(`Instrucciones no cumplidas: ${missed.map((i) => `${i.f} ${i.k}${i.v != null ? ' ' + i.v : ''}`).join(', ')}`);

  // ocurrencias de mis aeronaves
  const sitS: number[] = [], procS: number[] = [...compS], decS: number[] = [];
  for (const o of inp.occs) {
    const my = o.flights.filter((cs) => flights.includes(cs));
    if (!my.length) continue;
    const react = mine.filter((f) => f.t >= o.t && my.includes(f.f ?? '') && ['PCMD', 'RB', 'PREPORT', 'TAKEOFF'].includes(f.k));
    if (o.k === 'CONF' || o.k === 'MANNED' || o.k === 'CONFLICT') {
      const t = react.length ? react[0].t - o.t : null;
      sitS.push(t == null ? 0 : t <= 15 ? 1 : t <= 90 ? 1 - ((t - 15) / 75) * 0.8 : 0.2);
    }
    if (o.k === 'C2' || o.k === 'EMERG' || o.k === 'LOWBAT') {
      const rep = mine.some((f) => f.k === 'PREPORT' && my.includes(f.f ?? '') && f.t >= o.t - 30 && f.t - o.t <= 90);
      procS.push(rep ? 1 : 0);
      if (!rep) notes.push(`No informó al UTM la contingencia ${o.label}`);
    }
    if (o.k === 'LOWBAT' || o.k === 'EMERG') {
      const cs = my[0];
      const landed = facts.find((f) => f.k === 'LANDED' && f.f === cs);
      const out = facts.some((f) => f.k === 'BAT_OUT' && f.f === cs);
      const dA = landed?.d?.dAlt as number | null | undefined, dH = landed?.d?.dHome as number | undefined;
      const good = !!landed && !out && (dA == null || dA <= 300 || (dH ?? 9e9) <= 300);
      decS.push(out ? 0 : good ? 1 : 0.5);
      if (out) notes.push(`${cs}: aterrizaje forzoso por batería agotada`);
    }
  }
  // despegue con autorización
  for (const cs of flights) {
    const f = def(cs);
    const to = facts.find((x) => x.k === 'TAKEOFF' && x.f === cs);
    if (f?.req && to) {
      if (to.d?.authorized) decS.push(1);
      else if (to.by === p.id) { decS.push(0); criticals.push(`${cs} despegó sin autorización del UTM (T+${Math.round(to.t)} s)`); }
    } else if (f?.req && !to) decS.push(1); // no despegó (solicitud rechazada/pendiente): correcto
  }
  // ingreso a zonas prohibidas / NOTAM con mando propio
  for (const z of facts.filter((x) => x.k === 'ZONE_IN' && flights.includes(x.f ?? ''))) {
    if (z.t < claimT(z.f!)) continue;
    const zone = scenario.zones.find((x) => x.id === z.d?.zone);
    if (zone?.appearAt != null && z.t - zone.appearAt < 30) continue;
    criticals.push(`${z.f} ingresó a ${String(z.d?.name)} en T+${Math.round(z.t)} s`);
  }
  // pérdida de separación con instrucción UTM no cumplida
  for (const l of facts.filter((x) => x.k === 'LOS')) {
    for (const cs of [String(l.d?.a), String(l.d?.b)].filter((c) => flights.includes(c))) {
      const pend = instrs.filter((i) => i.f === cs && i.t <= l.t - 10 && i.t >= l.t - 240 && EFFECTIVE.includes(i.k) && (i.done == null || i.done > l.t));
      if (pend.length) criticals.push(`Pérdida de separación ${l.d?.a}/${l.d?.b} sin cumplir la instrucción UTM (${pend.map((i) => i.k).join(', ')})`);
    }
  }

  const parts = [
    { key: 'conformidad' as const, w: 35, v: mean(cS), detail: cDet.join(' | ') || '—' },
    { key: 'comunicacion' as const, w: 20, v: ins.length ? mean(rbS) : null, detail: `${ins.length} instrucciones recibidas · colacionadas ${rbMine.length}` },
    { key: 'procedimientos' as const, w: 20, v: mean(procS), detail: `cumplimiento ${execIns.length ? pct(mean(compS) ?? 0) + '%' : '—'}` },
    { key: 'decisiones' as const, w: 15, v: mean(decS), detail: decS.length ? `${decS.filter((x) => x === 1).length}/${decS.length} decisiones correctas` : '—' },
    { key: 'situacional' as const, w: 10, v: mean(sitS), detail: sitS.length ? `${sitS.length} situaciones propias` : '—' },
  ];
  return finish(inp, p, role, flights, parts, criticals, notes);
}
