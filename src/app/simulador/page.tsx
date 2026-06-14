'use client';

// CONDOR SIM — Posición de Controlador UTM
// Réplica de la posición de control (lámina 12 deck CONDOR): ventanas grises
// arrastrables estilo consola, barra superior de estado y botonera densa inferior.

import { useEffect, useRef, useState, useCallback } from 'react';
import { SimEngine, type TrackState } from '@/lib/sim/engine';
import { SCENARIOS } from '@/lib/sim/scenarios';
import {
  simDb, createSession, joinSession, publishState, subscribeState,
  subscribeActions, logAction, logEvent, countPositions, fetchEvalData,
  subscribeLiveTracks,
} from '@/lib/sim/net';
import { certificadoPdf } from '@/lib/sim/certificado';
import { supabase as enaeAuth } from '@/lib/supabase';
import type { SimMsg } from '@/lib/sim/engine';

const GREEN = '#27e07a';
const CYAN = '#39c8d8';
const AMBER = '#e0b83a';
const RED = '#ff3b30';
const GRAY = '#6a7a72';

function fmtT(t: number) {
  const h = Math.floor(t / 3600) % 24;
  const m = Math.floor((t % 3600) / 60);
  const s = Math.floor(t % 60);
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}

// ---------- predicción / detección de conflictos (STCA + salida de zona) ----------
type LL = [number, number];
// posición extrapolada a t segundos asumiendo rumbo y velocidad actuales
function predictPos(tr: { lng: number; lat: number; hdg: number; speedKt: number }, tSec: number): LL {
  const distNm = tr.speedKt * (tSec / 3600);
  const dLat = (distNm * Math.cos((tr.hdg * Math.PI) / 180)) / 60;
  const dLng = (distNm * Math.sin((tr.hdg * Math.PI) / 180)) / (60 * Math.cos((tr.lat * Math.PI) / 180));
  return [tr.lng + dLng, tr.lat + dLat];
}
function distMeters(a: LL, b: LL): number {
  const mlat = (((a[1] + b[1]) / 2) * Math.PI) / 180;
  const north = (b[1] - a[1]) * 111320;
  const east = (b[0] - a[0]) * 111320 * Math.cos(mlat);
  return Math.hypot(north, east);
}
function pointInPoly(p: LL, ring: LL[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
    if ((yi > p[1]) !== (yj > p[1]) && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
const SEP_H_M = 150; // separación horizontal mínima (m)
const SEP_V_M = 30; // separación vertical mínima (m)
interface ConflictTrack { callsign: string; lng: number; lat: number; hdg: number; speedKt: number; alt: number; airborne: boolean; }
interface ConflictZone { id?: string; name: string; kind: string; ring: LL[]; }
// Monitoriza todos los pares de aeronaves (STCA) y la salida de zonas segregadas
// dentro del horizonte del vector de predicción (minutos). Devuelve warnings por C/S
// y las líneas rojas a dibujar entre la aeronave y el conflicto.
function computeConflicts(tracks: ConflictTrack[], zones: ConflictZone[], horizonMin: number) {
  const warnings = new Map<string, string[]>();
  const redLines: { from: LL; to: LL }[] = [];
  const add = (cs: string, m: string) => {
    const a = warnings.get(cs) ?? [];
    a.push(m);
    warnings.set(cs, a);
  };
  const flying = tracks.filter((t) => t.airborne && t.speedKt > 0);
  const H = Math.max(60, horizonMin * 60);
  const STEP = 6;
  for (let i = 0; i < flying.length; i++) {
    for (let j = i + 1; j < flying.length; j++) {
      const a = flying[i], b = flying[j];
      if (Math.abs(a.alt - b.alt) > SEP_V_M) continue;
      let minD = Infinity, tC = -1;
      for (let t = 0; t <= H; t += STEP) {
        const d = distMeters(predictPos(a, t), predictPos(b, t));
        if (d < minD) { minD = d; tC = t; }
      }
      if (minD < SEP_H_M) {
        add(a.callsign, `CONF ${b.callsign} ${tC}s`);
        add(b.callsign, `CONF ${a.callsign} ${tC}s`);
        redLines.push({ from: [a.lng, a.lat], to: [b.lng, b.lat] });
      }
    }
  }
  for (const tr of flying) {
    for (const z of zones) {
      if (z.kind !== 'SEGREGATED' || !pointInPoly([tr.lng, tr.lat], z.ring)) continue;
      for (let t = STEP; t <= H; t += STEP) {
        const p = predictPos(tr, t);
        if (!pointInPoly(p, z.ring)) {
          add(tr.callsign, `SALE ${z.id ?? z.name} ${t}s`);
          redLines.push({ from: [tr.lng, tr.lat], to: p });
          break;
        }
      }
    }
  }
  return { warnings, redLines };
}

// ---------- chrome Motif ----------
const bevelOut: React.CSSProperties = {
  background: '#c9c9c9',
  borderWidth: 2,
  borderStyle: 'solid',
  borderTopColor: '#f2f2f2',
  borderLeftColor: '#f2f2f2',
  borderBottomColor: '#5a5a5a',
  borderRightColor: '#5a5a5a',
};
const bevelIn: React.CSSProperties = {
  background: '#c0c0c0',
  borderWidth: 2,
  borderStyle: 'solid',
  borderTopColor: '#5a5a5a',
  borderLeftColor: '#5a5a5a',
  borderBottomColor: '#f2f2f2',
  borderRightColor: '#f2f2f2',
};

// botones de menú: fondo celeste
const btnOut: React.CSSProperties = {
  ...bevelOut,
  background: '#b5e3f0',
  borderTopColor: '#e8f8fd',
  borderLeftColor: '#e8f8fd',
  borderBottomColor: '#46707e',
  borderRightColor: '#46707e',
};
const btnIn: React.CSSProperties = {
  ...bevelIn,
  background: '#6fb9cf',
  borderTopColor: '#46707e',
  borderLeftColor: '#46707e',
  borderBottomColor: '#e8f8fd',
  borderRightColor: '#e8f8fd',
};

function MB({
  label,
  active,
  onClick,
  wide,
  color,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
  wide?: boolean;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      style={active ? btnIn : btnOut}
      className={`px-1.5 text-[10px] font-bold font-mono leading-4 whitespace-nowrap ${wide ? 'min-w-[64px]' : ''}`}
    >
      <span style={{ color: color ?? '#1a1a1a' }}>{label}</span>
    </button>
  );
}

// ventana gris arrastrable
function Win({
  title,
  x,
  y,
  onClose,
  onDrag,
  children,
  w,
}: {
  title: string;
  x: number;
  y: number;
  onClose: () => void;
  onDrag: (x: number, y: number) => void;
  children: React.ReactNode;
  w?: number;
}) {
  const drag = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);
  return (
    <div className="absolute z-20" style={{ left: x, top: y, width: w, ...bevelOut }}>
      <div
        className="flex items-center justify-between px-1 cursor-move select-none"
        style={{ background: '#a8a8a8', borderBottom: '1px solid #5a5a5a' }}
        onPointerDown={(e) => {
          drag.current = { sx: e.clientX, sy: e.clientY, ox: x, oy: y };
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          onDrag(drag.current.ox + e.clientX - drag.current.sx, drag.current.oy + e.clientY - drag.current.sy);
        }}
        onPointerUp={() => (drag.current = null)}
      >
        <span className="text-[11px] font-bold font-mono tracking-wider text-black mx-auto">{title}</span>
        <button onClick={onClose} style={bevelOut} className="px-1 text-[10px] font-bold leading-3">
          ×
        </button>
      </div>
      {children}
    </div>
  );
}

type WinId = 'flights' | 'stations' | 'sectors' | 'time' | 'msg' | 'instructor' | 'zone' | 'eval' | 'aftn' | 'layers';

interface EvalRow {
  position_id: string | null;
  student_name: string;
  score: number;
  passed: boolean;
  competencies: Record<string, unknown>;
  folio: string | null;
}

export default function SimuladorPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<SimEngine | null>(null);
  const [, force] = useState(0);
  const [rangeNm, setRangeNm] = useState(12);
  const [pan, setPan] = useState({ x: 0, y: 0 }); // desplazamiento de presentación (px) — descentrado/pan del mapa
  const [showVectors, setShowVectors] = useState(true); // vector de predicción de velocidad
  const [vectorMin, setVectorMin] = useState(1); // minutos del vector de predicción
  const [showGrid, setShowGrid] = useState(false); // grilla geográfica (graticula)
  const [altFilter, setAltFilter] = useState({ on: false, min: 0, max: 150 }); // filtro de banda de altitud (M AGL)
  const [rblMode, setRblMode] = useState(false); // modo medición rango/marcación (clic-clic)
  const [rbls, setRbls] = useState<{ a: [number, number]; b: [number, number] }[]>([]); // mediciones [lng,lat]
  const rblPend = useRef<[number, number] | null>(null); // primer punto pendiente
  const [cursorLL, setCursorLL] = useState<[number, number] | null>(null); // cursor para línea viva
  const [bright, setBright] = useState(0); // 0=día 1=crepúsculo 2=noche
  const [labelMode, setLabelMode] = useState(1); // 0 compacta, 1 estándar, 2 completa
  const [labelFont, setLabelFont] = useState(11); // px etiqueta de pista
  const [finder, setFinder] = useState(''); // buscador de pista por C/S
  const [paused, setPaused] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [showLabels, setShowLabels] = useState(true);
  const [showZones, setShowZones] = useState(true);
  const [showTrails, setShowTrails] = useState(true);
  const [rings, setRings] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [clock, setClock] = useState('--:--:--');
  const [wins, setWins] = useState<Record<WinId, { x: number; y: number; open: boolean }>>({
    flights: { x: 150, y: 60, open: true },
    stations: { x: 980, y: 50, open: true },
    sectors: { x: 60, y: 420, open: true },
    time: { x: 1180, y: 560, open: true },
    msg: { x: 560, y: 40, open: true },
    instructor: { x: 900, y: 420, open: false },
    zone: { x: 600, y: 560, open: false },
    eval: { x: 380, y: 200, open: false },
    aftn: { x: 420, y: 120, open: false },
    layers: { x: 1120, y: 120, open: false },
  });
  const [evalRows, setEvalRows] = useState<EvalRow[]>([]);
  const [evalBusy, setEvalBusy] = useState(false);
  const [evalSaved, setEvalSaved] = useState(false);

  // autenticación (cuentas del portal ENAE)
  const [auth, setAuth] = useState<'checking' | 'login' | 'ok'>('checking');
  const [authRole, setAuthRole] = useState<string>('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginErr, setLoginErr] = useState('');
  const [loginBusy, setLoginBusy] = useState(false);

  // multi-puesto
  const [mode, setMode] = useState<'lobby' | 'local' | 'instructor' | 'student'>('lobby');
  const [posRole, setPosRole] = useState<'controller' | 'aftn'>('controller');
  const [selMsg, setSelMsg] = useState<number | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionCode, setSessionCode] = useState('');
  const [positionId, setPositionId] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [lobbyErr, setLobbyErr] = useState('');
  const [lobbyBusy, setLobbyBusy] = useState(false);
  const [peers, setPeers] = useState(1);
  const lastPubRef = useRef(0);

  if (!engineRef.current) engineRef.current = new SimEngine(SCENARIOS[0]);
  const eng = engineRef.current;

  const setWin = (id: WinId, p: Partial<{ x: number; y: number; open: boolean }>) =>
    setWins((w) => ({ ...w, [id]: { ...w[id], ...p } }));

  // sesión del portal ENAE al cargar
  useEffect(() => {
    (async () => {
      const { data: { user } } = await enaeAuth.auth.getUser();
      if (!user?.email) {
        setAuth('login');
        return;
      }
      const { data: prof } = await enaeAuth
        .from('profiles')
        .select('role, first_name, last_name')
        .eq('email', user.email)
        .maybeSingle();
      if (!prof) {
        setAuth('login');
        setLoginErr('Cuenta sin perfil habilitado en ENAE.');
        return;
      }
      setAuthRole(prof.role ?? 'student');
      setUserName(`${prof.first_name ?? ''} ${prof.last_name ?? ''}`.trim().toUpperCase() || user.email.toUpperCase());
      setAuth('ok');
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doLogin = async () => {
    setLoginBusy(true);
    setLoginErr('');
    try {
      const { error } = await enaeAuth.auth.signInWithPassword({ email: loginEmail.trim(), password: loginPass });
      if (error) {
        setLoginErr('Credenciales inválidas.');
        return;
      }
      const { data: prof } = await enaeAuth
        .from('profiles')
        .select('role, first_name, last_name')
        .eq('email', loginEmail.trim().toLowerCase())
        .maybeSingle();
      if (!prof) {
        setLoginErr('Cuenta sin perfil habilitado en ENAE.');
        await enaeAuth.auth.signOut();
        return;
      }
      setAuthRole(prof.role ?? 'student');
      setUserName(`${prof.first_name ?? ''} ${prof.last_name ?? ''}`.trim().toUpperCase() || loginEmail.toUpperCase());
      setAuth('ok');
    } finally {
      setLoginBusy(false);
    }
  };

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      draw();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    let last = performance.now();
    const phys = setInterval(() => {
      const now = performance.now();
      const dt = (now - last) / 1000;
      last = now;
      if (mode !== 'student') eng.tick(dt);
      // instructor: publicar estado ~1 Hz
      if (mode === 'instructor' && sessionId && now - lastPubRef.current > 1000) {
        lastPubRef.current = now;
        publishState(sessionId, {
          sim_t: eng.t,
          paused: eng.paused,
          speed: eng.speed,
          tracks: Array.from(eng.tracks.values()),
          log: eng.log,
          msgs: eng.msgs,
        }).catch(() => {});
      }
    }, 100);
    const iv = setInterval(() => {
      setClock(new Date().toISOString().slice(11, 19));
      force((x) => x + 1);
      draw();
    }, 500);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(phys);
      clearInterval(iv);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeNm, pan, showLabels, showZones, showTrails, rings, selected, mode, sessionId, showVectors, vectorMin, showGrid, altFilter, rbls, cursorLL, labelMode, labelFont]);

  // alumno: recibir estado por Realtime
  useEffect(() => {
    if (mode !== 'student' || !sessionId) return;
    eng.paused = true; // el motor local no avanza; solo refleja la red
    const ch = subscribeState(sessionId, (st) => {
      eng.t = st.sim_t;
      eng.speed = st.speed;
      eng.log = st.log ?? [];
      eng.msgs = st.msgs ?? [];
      for (const tr of st.tracks ?? []) eng.tracks.set(tr.callsign, tr);
      setPaused(st.paused);
      setSpeed(st.speed);
    });
    return () => {
      simDb().removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, sessionId]);

  // instructor: tracks externos del puente Mission Planner/ArduPilot
  const extRef = useRef(new Map<string, number>());
  useEffect(() => {
    if (mode !== 'instructor' || !sessionCode) return;
    const ch = subscribeLiveTracks(sessionCode, (t) => {
      const prev = eng.tracks.get(t.callsign);
      const tr: TrackState = prev ?? {
        callsign: t.callsign,
        acType: 'MAV',
        lat: t.lat, lng: t.lng, alt: t.alt_m, hdg: t.hdg,
        speedKt: t.speed_kt, batteryPct: t.battery_pct,
        status: 'NORMAL', alerts: [], inside: true, wpIdx: 0,
        airborne: true, authRef: 'EXT-MP', history: [],
      };
      if (!prev) eng.addLog(`${t.callsign} TRACK EXTERNO CONECTADO (MISSION PLANNER)`, 'INFO');
      tr.lat = t.lat; tr.lng = t.lng; tr.alt = t.alt_m; tr.hdg = t.hdg;
      tr.speedKt = t.speed_kt; tr.batteryPct = t.battery_pct; tr.airborne = true;
      const last = tr.history[tr.history.length - 1];
      if (!last || last[0] !== t.lng || last[1] !== t.lat) {
        tr.history.push([t.lng, t.lat]);
        if (tr.history.length > 60) tr.history.shift();
      }
      eng.tracks.set(t.callsign, tr);
      extRef.current.set(t.callsign, Date.now());
    });
    const prune = setInterval(() => {
      for (const [cs, ts] of extRef.current) {
        if (Date.now() - ts > 20000) {
          eng.tracks.delete(cs);
          extRef.current.delete(cs);
          eng.addLog(`${cs} TRACK EXTERNO PERDIDO (SIN DATOS 20 S)`, 'WARN');
        }
      }
    }, 5000);
    return () => {
      simDb().removeChannel(ch);
      clearInterval(prune);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, sessionCode]);

  // instructor: aplicar órdenes de los controladores + conteo de puestos
  useEffect(() => {
    if (mode !== 'instructor' || !sessionId) return;
    const ch = subscribeActions(sessionId, (a) => {
      const flight = a.detail ? String((a.detail as { flight?: string }).flight ?? '') : '';
      if (a.action === 'ORDER_RTH' && flight) eng.injectEvent(flight, 'RTH');
      if (a.action === 'DECLARE_CONTINGENCY' && flight)
        eng.addLog(`${flight} CONTINGENCIA DECLARADA POR CONTROLADOR`, 'WARN');
      if (a.action === 'ACK_ALARM' && flight) eng.addLog(`${flight} ALARMA RECONOCIDA POR CONTROLADOR`, 'INFO');
      if (a.action === 'ACK_MSG' && flight) eng.addLog(`${flight} MENSAJE ACUSADO POR OPERACIONES`, 'INFO');
      if (a.action === 'RELAY_ALERT' && flight) eng.addLog(`${flight} OPERACIONES ALERTA AL CONTROLADOR`, 'WARN');
    });
    const iv = setInterval(() => countPositions(sessionId).then(setPeers).catch(() => {}), 8000);
    return () => {
      simDb().removeChannel(ch);
      clearInterval(iv);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, sessionId]);

  const project = useCallback(
    (lng: number, lat: number, w: number, h: number): [number, number] => {
      const [clng, clat] = eng.scenario.center;
      const nmPerDegLat = 60;
      const nmPerDegLng = 60 * Math.cos((clat * Math.PI) / 180);
      const pxPerNm = Math.min(w, h) / (rangeNm * 2);
      return [
        w / 2 + pan.x + (lng - clng) * nmPerDegLng * pxPerNm,
        h / 2 + pan.y - (lat - clat) * nmPerDegLat * pxPerNm,
      ];
    },
    [eng, rangeNm, pan]
  );

  // inverso de project: pixel de pantalla -> [lng, lat]
  const unproject = useCallback(
    (px: number, py: number, w: number, h: number): [number, number] => {
      const [clng, clat] = eng.scenario.center;
      const nmPerDegLat = 60;
      const nmPerDegLng = 60 * Math.cos((clat * Math.PI) / 180);
      const pxPerNm = Math.min(w, h) / (rangeNm * 2);
      return [
        clng + (px - w / 2 - pan.x) / (nmPerDegLng * pxPerNm),
        clat - (py - h / 2 - pan.y) / (nmPerDegLat * pxPerNm),
      ];
    },
    [eng, rangeNm, pan]
  );

  // distancia (NM) y marcación verdadera (°) entre dos puntos [lng,lat]
  const distBearing = (a: [number, number], b: [number, number]): { nm: number; brg: number } => {
    const mlat = ((a[1] + b[1]) / 2) * (Math.PI / 180);
    const north = (b[1] - a[1]) * 60;
    const east = (b[0] - a[0]) * 60 * Math.cos(mlat);
    const nm = Math.hypot(north, east);
    const brg = (Math.atan2(east, north) * 180) / Math.PI;
    return { nm, brg: (brg + 360) % 360 };
  };

  const draw = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const w = cv.width;
    const h = cv.height;
    ctx.fillStyle = '#101210';
    ctx.fillRect(0, 0, w, h);

    const [cx, cy] = [w / 2 + pan.x, h / 2 + pan.y];
    const pxPerNm = Math.min(w, h) / (rangeNm * 2);

    // grilla geográfica (meridianos/paralelos) — capa cartográfica
    if (showGrid) {
      const [gclng, gclat] = eng.scenario.center;
      const nmLat = 60;
      const nmLng = 60 * Math.cos((gclat * Math.PI) / 180);
      const invLng = (px: number) => gclng + (px - cx) / (nmLng * pxPerNm);
      const invLat = (py: number) => gclat - (py - cy) / (nmLat * pxPerNm);
      const spanDeg = h / pxPerNm / nmLat; // grados visibles en vertical
      const nice = [0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5];
      const step = nice.find((s) => spanDeg / s <= 8) ?? 5;
      const lngMin = invLng(0);
      const lngMax = invLng(w);
      const latMin = invLat(h);
      const latMax = invLat(0);
      ctx.strokeStyle = 'rgba(70,110,90,.28)';
      ctx.fillStyle = 'rgba(110,150,130,.55)';
      ctx.lineWidth = 1;
      ctx.font = '9px monospace';
      for (let lng = Math.ceil(lngMin / step) * step; lng <= lngMax; lng += step) {
        const [px] = project(lng, gclat, w, h);
        ctx.beginPath();
        ctx.moveTo(px, 0);
        ctx.lineTo(px, h);
        ctx.stroke();
        ctx.fillText(`${lng.toFixed(2)}°`, px + 2, 10);
      }
      for (let lat = Math.ceil(latMin / step) * step; lat <= latMax; lat += step) {
        const [, py] = project(gclng, lat, w, h);
        ctx.beginPath();
        ctx.moveTo(0, py);
        ctx.lineTo(w, py);
        ctx.stroke();
        ctx.fillText(`${lat.toFixed(2)}°`, 2, py - 2);
      }
    }

    if (rings) {
      ctx.strokeStyle = '#1c2a20';
      ctx.fillStyle = '#2a4a36';
      ctx.font = '10px monospace';
      for (let r = 5; r <= rangeNm * 2; r += 5) {
        ctx.beginPath();
        ctx.arc(cx, cy, r * pxPerNm, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillText(`${r}`, cx + r * pxPerNm + 3, cy - 3);
      }
      ctx.beginPath();
      ctx.moveTo(cx - 8, cy);
      ctx.lineTo(cx + 8, cy);
      ctx.moveTo(cx, cy - 8);
      ctx.lineTo(cx, cy + 8);
      ctx.stroke();
    }

    if (showZones) {
      for (const z of eng.scenario.zones) {
        const col = z.kind === 'PROHIBITED' ? RED : z.kind === 'SEGREGATED' ? CYAN : AMBER;
        ctx.strokeStyle = col;
        ctx.setLineDash(z.kind === 'SEGREGATED' ? [] : [6, 4]);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        z.ring.forEach(([lng, lat], i) => {
          const [px, py] = project(lng, lat, w, h);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.stroke();
        ctx.setLineDash([]);
        const [lx, ly] = project(z.ring[0][0], z.ring[0][1], w, h);
        ctx.fillStyle = col;
        ctx.font = '10px monospace';
        ctx.fillText(`${z.name} ${z.floor}-${z.ceiling}M`, lx + 4, ly - 4);
      }
    }

    // detección de conflictos (STCA + salida de zona) en el horizonte del vector
    const { warnings: cfWarn, redLines: cfLines } = computeConflicts(
      Array.from(eng.tracks.values()),
      eng.scenario.zones as unknown as ConflictZone[],
      vectorMin
    );
    ctx.save();
    ctx.strokeStyle = RED;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 4]);
    for (const ln of cfLines) {
      const [ax, ay] = project(ln.from[0], ln.from[1], w, h);
      const [bx, by] = project(ln.to[0], ln.to[1], w, h);
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.restore();

    for (const tr of eng.tracks.values()) {
      if (!tr.airborne && tr.status !== 'LANDED') continue;
      if (altFilter.on && (tr.alt < altFilter.min || tr.alt > altFilter.max)) continue; // filtro de banda de altitud
      const [x, y] = project(tr.lng, tr.lat, w, h);
      const conflict = cfWarn.has(tr.callsign);
      const alarm = tr.alerts.length > 0 || conflict;
      const col = tr.status === 'LANDED' ? GRAY : alarm ? RED : GREEN;

      if (showTrails && tr.history.length > 1) {
        ctx.strokeStyle = alarm ? 'rgba(255,59,48,.35)' : 'rgba(39,224,122,.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        tr.history.forEach(([lng, lat], i) => {
          const [tx, ty] = project(lng, lat, w, h);
          if (i === 0) ctx.moveTo(tx, ty);
          else ctx.lineTo(tx, ty);
        });
        ctx.stroke();
      }

      ctx.strokeStyle = col;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x, y - 6);
      ctx.lineTo(x - 6, y + 5);
      ctx.lineTo(x + 6, y + 5);
      ctx.closePath();
      ctx.stroke();
      if (selected === tr.callsign) {
        ctx.strokeStyle = AMBER;
        ctx.strokeRect(x - 10, y - 10, 20, 20);
      }

      if (showVectors && tr.speedKt > 0) {
        // vector segmentado: un trazo por minuto (contar trazos = minutos de predicción)
        const dirx = Math.sin((tr.hdg * Math.PI) / 180);
        const diry = -Math.cos((tr.hdg * Math.PI) / 180);
        const minPx = (tr.speedKt / 60) * pxPerNm; // px por minuto
        ctx.strokeStyle = col;
        ctx.lineWidth = 1.4;
        for (let mn = 0; mn < vectorMin; mn++) {
          const d0 = (mn + 0.06) * minPx;
          const d1 = (mn + 0.94) * minPx;
          ctx.beginPath();
          ctx.moveTo(x + dirx * d0, y + diry * d0);
          ctx.lineTo(x + dirx * d1, y + diry * d1);
          ctx.stroke();
        }
      }

      if (showLabels && tr.status !== 'LANDED') {
        const fp = labelFont;
        const lh = fp + 1;
        const lx = x + 14;
        const ly = y - 22;
        ctx.strokeStyle = 'rgba(120,140,130,.5)';
        ctx.beginPath();
        ctx.moveTo(x + 6, y - 4);
        ctx.lineTo(lx - 2, ly + 10);
        ctx.stroke();
        ctx.font = `bold ${fp}px monospace`;
        let yy = ly;
        // warnings (conflictos de predicción + alertas del motor) en rojo sobre el C/S
        const warnLines = [...(cfWarn.get(tr.callsign) ?? [])];
        if (tr.alerts.length) warnLines.unshift(tr.alerts.join(' '));
        if (warnLines.length) {
          ctx.fillStyle = RED;
          warnLines.forEach((wl, wi) => ctx.fillText(wl, lx, yy - lh * (warnLines.length - wi)));
        }
        ctx.fillStyle = alarm ? RED : GREEN;
        ctx.fillText(`${tr.callsign}  ${String(Math.round(tr.alt)).padStart(3, '0')}M`, lx, yy);
        if (labelMode >= 1) {
          yy += lh;
          ctx.fillText(`${Math.round(tr.speedKt)}KT ${Math.round(tr.batteryPct)}%`, lx, yy);
        }
        if (labelMode >= 2) {
          yy += lh;
          ctx.fillStyle = alarm ? RED : '#1f9e5d';
          ctx.fillText(`${tr.acType} ${tr.authRef.slice(-4)} HDG${String(Math.round(tr.hdg)).padStart(3, '0')}`, lx, yy);
        }
      }
    }

    // RBL — líneas rango/marcación (medición distancia/rumbo)
    const drawRbl = (a: [number, number], b: [number, number], live: boolean) => {
      const [ax, ay] = project(a[0], a[1], w, h);
      const [bx, by] = project(b[0], b[1], w, h);
      const { nm, brg } = distBearing(a, b);
      ctx.strokeStyle = live ? 'rgba(255,209,102,.7)' : AMBER;
      ctx.setLineDash(live ? [4, 3] : []);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(ax, ay, 3, 0, Math.PI * 2);
      ctx.moveTo(bx + 3, by);
      ctx.arc(bx, by, 3, 0, Math.PI * 2);
      ctx.stroke();
      const mx = (ax + bx) / 2;
      const my = (ay + by) / 2;
      ctx.fillStyle = AMBER;
      ctx.font = 'bold 11px monospace';
      ctx.fillText(`${nm.toFixed(1)}NM / ${String(Math.round(brg)).padStart(3, '0')}°`, mx + 6, my - 4);
    };
    for (const r of rbls) drawRbl(r.a, r.b, false);
    if (rblPend.current && cursorLL) drawRbl(rblPend.current, cursorLL, true);
  }, [eng, project, rangeNm, pan, showLabels, showZones, showTrails, rings, selected, showVectors, vectorMin, showGrid, altFilter, rbls, cursorLL, labelMode, labelFont]);

  // re-vincular cuando el canvas aparece tras login/lobby (auth y mode cambian el árbol)
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    cv.width = cv.clientWidth;
    cv.height = cv.clientHeight;
    const ro = new ResizeObserver(() => {
      cv.width = cv.clientWidth;
      cv.height = cv.clientHeight;
    });
    ro.observe(cv);
    return () => ro.disconnect();
  }, [auth, mode]);

  // selección de pista por cercanía al pixel (mx,my en coords de canvas)
  const selectAt = (mx: number, my: number) => {
    const cv = canvasRef.current;
    if (!cv) return;
    let best: string | null = null;
    let bestD = 18;
    for (const tr of eng.tracks.values()) {
      const [x, y] = project(tr.lng, tr.lat, cv.width, cv.height);
      const d = Math.hypot(mx - x, my - y);
      if (d < bestD) {
        bestD = d;
        best = tr.callsign;
      }
    }
    setSelected(best);
  };

  // arrastre del mapa (descentrado/pan). Distingue click (seleccionar) de arrastre.
  const panDrag = useRef<{ sx: number; sy: number; ox: number; oy: number; moved: boolean } | null>(null);
  const onCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    panDrag.current = { sx: e.clientX, sy: e.clientY, ox: pan.x, oy: pan.y, moved: false };
  };
  const onCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const cv = canvasRef.current;
    const d = panDrag.current;
    if (d) {
      const dx = e.clientX - d.sx;
      const dy = e.clientY - d.sy;
      if (!d.moved && Math.abs(dx) + Math.abs(dy) > 3) d.moved = true;
      if (d.moved) setPan({ x: d.ox + dx, y: d.oy + dy });
      return;
    }
    // sin arrastre: línea viva del RBL pendiente
    if (rblMode && rblPend.current && cv) {
      const rect = cv.getBoundingClientRect();
      setCursorLL(unproject(e.clientX - rect.left, e.clientY - rect.top, cv.width, cv.height));
    }
  };
  const onCanvasPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = panDrag.current;
    panDrag.current = null;
    if (!d || d.moved) return; // fue arrastre = pan
    const cv = canvasRef.current;
    if (!cv) return;
    const rect = cv.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    if (rblMode) {
      const ll = unproject(mx, my, cv.width, cv.height);
      if (!rblPend.current) {
        rblPend.current = ll;
        setCursorLL(ll);
      } else {
        const a = rblPend.current;
        setRbls((rs) => [...rs, { a, b: ll }]);
        rblPend.current = null;
        setCursorLL(null);
      }
      return;
    }
    selectAt(mx, my);
  };

  // zoom con rueda, manteniendo fijo el punto bajo el cursor (estilo EXP+/EXP-)
  const onCanvasWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    const cv = canvasRef.current;
    if (!cv) return;
    const rect = cv.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const r0 = rangeNm;
    const r1 =
      e.deltaY < 0 ? Math.max(3, Math.round(r0 * 0.8)) : Math.min(96, Math.round(r0 * 1.25));
    if (r1 === r0) return;
    const k = r0 / r1; // razón de escala (scale' = scale * r0/r1)
    setPan((p) => ({
      x: mx - cv.width / 2 - (mx - cv.width / 2 - p.x) * k,
      y: my - cv.height / 2 - (my - cv.height / 2 - p.y) * k,
    }));
    setRangeNm(r1);
  };

  // CEN: re-centra la presentación (pan a 0). CSEL: centra en la pista seleccionada.
  const centerView = () => setPan({ x: 0, y: 0 });
  const centerOn = (tr: { lng: number; lat: number }) => {
    const cv = canvasRef.current;
    if (!cv) return;
    const [clng, clat] = eng.scenario.center;
    const nmPerDegLat = 60;
    const nmPerDegLng = 60 * Math.cos((clat * Math.PI) / 180);
    const pxPerNm = Math.min(cv.width, cv.height) / (rangeNm * 2);
    setPan({
      x: -(tr.lng - clng) * nmPerDegLng * pxPerNm,
      y: (tr.lat - clat) * nmPerDegLat * pxPerNm,
    });
  };
  const centerSelected = () => {
    if (!selected) return;
    const tr = eng.tracks.get(selected);
    if (tr) centerOn(tr);
  };
  // FINDER: busca una pista por C/S, la selecciona y la centra
  const doFinder = () => {
    const q = finder.trim().toUpperCase();
    if (!q) return;
    const hit = Array.from(eng.tracks.values()).find((t) => t.callsign.toUpperCase().includes(q));
    if (!hit) {
      eng.addLog(`BUSCADOR: SIN COINCIDENCIA "${q}"`, 'WARN');
      return;
    }
    setSelected(hit.callsign);
    centerOn(hit);
  };

  // lobby
  const startLocal = () => setMode('local');
  const startInstructor = async () => {
    setLobbyBusy(true);
    setLobbyErr('');
    try {
      const r = await createSession(eng.scenario.id, userName || 'INSTRUCTOR');
      setSessionId(r.sessionId);
      setSessionCode(r.code);
      setPositionId(r.positionId);
      setWin('instructor', { open: true });
      setMode('instructor');
    } catch (e) {
      setLobbyErr((e as Error).message || 'Error creando sesión');
    } finally {
      setLobbyBusy(false);
    }
  };
  const joinStudent = async () => {
    setLobbyBusy(true);
    setLobbyErr('');
    try {
      const r = await joinSession(joinCode, userName || 'ALUMNO', posRole);
      setSessionId(r.sessionId);
      setSessionCode(r.code);
      setPositionId(r.positionId);
      if (posRole === 'aftn') setWin('aftn', { open: true });
      setMode('student');
    } catch (e) {
      setLobbyErr((e as Error).message || 'Error uniéndose a la sesión');
    } finally {
      setLobbyBusy(false);
    }
  };

  // instructor: inyectar evento + auditoría
  const inject = (cs: string, ev: 'C2LOSS' | 'C2RESTORE' | 'LOWBAT' | 'EMERG' | 'RTH') => {
    eng.injectEvent(cs, ev);
    if (mode === 'instructor' && sessionId) logEvent(sessionId, eng.t, cs, ev, userName || 'INSTRUCTOR').catch(() => {});
  };

  // alumno-controlador: órdenes registradas para evaluación
  const studentAction = (action: string) => {
    if (!selected || !sessionId) return;
    logAction(sessionId, positionId, eng.t, action, { flight: selected }).catch(() => {});
    eng.addLog(`${selected} ${action} TRANSMITIDA`, 'INFO');
  };

  // evaluación: rúbrica transparente sobre sim_actions vs sim_events
  //  - detectar y reconocer la alarma (ACK): 40 pts (pleno ≤30 s tras el evento)
  //  - ordenar RTH al vuelo afectado: 30 pts
  //  - declarar la contingencia: 30 pts · aprueba con ≥70
  const runEval = async () => {
    if (mode !== 'instructor' || !sessionId) return;
    setEvalBusy(true);
    try {
      const { positions, actions, events } = await fetchEvalData(sessionId);
      const alarm = events.find((e) => e.event_type === 'C2LOSS' || e.event_type === 'EMERG');
      const t0 = alarm ? Number(alarm.sim_t) : null;
      const rows: EvalRow[] = positions.map((p) => {
        const mine = actions.filter((a) => a.position_id === p.id);
        const ack = mine.find((a) => a.action === 'ACK_ALARM' && (t0 === null || Number(a.sim_t) >= t0));
        const rth = mine.find((a) => a.action === 'ORDER_RTH');
        const cont = mine.find((a) => a.action === 'DECLARE_CONTINGENCY');
        let score = 0;
        if (ack && t0 !== null) {
          const dt = Number(ack.sim_t) - t0;
          score += dt <= 30 ? 40 : Math.max(10, Math.round(40 - (dt - 30) / 3));
        } else if (ack) score += 30;
        if (rth) score += 30;
        if (cont) score += 30;
        score = Math.min(100, score);
        return {
          position_id: p.id,
          student_name: p.student_name,
          score,
          passed: score >= 70,
          competencies: {
            deteccion_s: ack && t0 !== null ? Math.round(Number(ack.sim_t) - t0) : null,
            rth: !!rth,
            contingencia: !!cont,
          },
          folio: null,
        };
      });
      setEvalRows(rows);
      setEvalSaved(false);
      setWin('eval', { open: true });
    } finally {
      setEvalBusy(false);
    }
  };

  const saveEval = async () => {
    if (!sessionId || evalRows.length === 0) return;
    setEvalBusy(true);
    try {
      const res = await fetch('/api/sim/evaluar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          results: evalRows.map(({ folio: _f, ...r }) => r),
        }),
      });
      const j = await res.json();
      if (j.results) {
        setEvalRows(
          j.results.map((r: EvalRow & { certificate_folio: string | null }) => ({
            ...r,
            folio: r.certificate_folio,
          }))
        );
        setEvalSaved(true);
      }
    } finally {
      setEvalBusy(false);
    }
  };

  // velocidades estilo replay: S 0 ½ 1 3 5 8
  const setSpd = (s: number) => {
    if (mode === 'student') return; // el alumno no controla el reloj
    if (s === 0) {
      eng.paused = true;
      setPaused(true);
    } else {
      eng.speed = s;
      eng.paused = false;
      setSpeed(s);
      setPaused(false);
    }
  };
  const resetEx = () => {
    if (mode === 'student') return;
    eng.reset();
    setPaused(true);
    setSelected(null);
  };

  const tracks: TrackState[] = Array.from(eng.tracks.values());
  const anyAlarm = tracks.some((t) => t.alerts.length > 0);
  const selZone = eng.scenario.zones.find(
    (z) => z.id === eng.scenario.flights.find((f) => f.callsign === selected)?.zoneId
  );

  const TSeg = ({ label, color, bg }: { label: string; color?: string; bg?: string }) => (
    <span
      className="px-1.5 text-[10px] font-bold font-mono border-r border-[#5a5a5a] leading-5"
      style={{ color: color ?? '#d6d6d6', background: bg }}
    >
      {label}
    </span>
  );

  if (auth !== 'ok') {
    return (
      <div className="h-screen w-screen flex items-center justify-center" style={{ background: '#101210' }}>
        <div style={{ ...bevelOut, width: 420 }} className="font-mono">
          <div className="px-1 py-0.5 text-center text-[12px] font-bold tracking-widest text-black"
            style={{ background: '#a8a8a8', borderBottom: '1px solid #5a5a5a' }}>
            CONDOR SIM — ACCESO RESTRINGIDO
          </div>
          <div className="p-3 space-y-2" style={{ background: '#c9c9c9' }}>
            {auth === 'checking' ? (
              <div className="text-[11px] text-black text-center py-4">VERIFICANDO SESIÓN…</div>
            ) : (
              <>
                <div className="text-[9px] text-[#444]">
                  Ingrese con su cuenta del portal ENAE. El acceso queda registrado.
                </div>
                <div>
                  <div className="text-[10px] font-bold text-black mb-0.5">CORREO</div>
                  <input value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} type="email"
                    autoComplete="username" style={{ ...bevelIn, background: '#fff' }}
                    className="w-full px-2 py-1 text-[12px] font-mono outline-none text-black" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-black mb-0.5">CONTRASEÑA</div>
                  <input value={loginPass} onChange={(e) => setLoginPass(e.target.value)} type="password"
                    autoComplete="current-password" style={{ ...bevelIn, background: '#fff' }}
                    onKeyDown={(e) => e.key === 'Enter' && doLogin()}
                    className="w-full px-2 py-1 text-[12px] font-mono outline-none text-black" />
                </div>
                {loginErr && <div className="text-[10px] font-bold" style={{ color: '#a00' }}>{loginErr}</div>}
                <button onClick={doLogin} disabled={loginBusy || !loginEmail || !loginPass} style={bevelOut}
                  className="w-full py-2 text-[12px] font-bold disabled:opacity-50">
                  {loginBusy ? 'VERIFICANDO…' : 'INGRESAR'}
                </button>
              </>
            )}
            <div className="text-center text-[9px] text-[#555] border-t border-[#999] pt-1">
              ENAE · ESCUELA DE NAVEGACIÓN AÉREA — ENTRENAMIENTO UTM
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'lobby') {
    const isInstructor = authRole === 'instructor' || authRole === 'admin';
    return (
      <div className="h-screen w-screen flex items-center justify-center" style={{ background: '#101210' }}>
        <div style={{ ...bevelOut, width: 460 }} className="font-mono">
          <div className="px-1 py-0.5 text-center text-[12px] font-bold tracking-widest text-black"
            style={{ background: '#a8a8a8', borderBottom: '1px solid #5a5a5a' }}>
            CONDOR SIM — LOGIN DE POSICIÓN
          </div>
          <div className="p-3 space-y-3" style={{ background: '#c9c9c9' }}>
            <div className="text-[10px] text-black">
              USUARIO: <b>{userName}</b> · ROL: <b>{authRole.toUpperCase()}</b>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {isInstructor && (
                <button onClick={startInstructor} disabled={lobbyBusy} style={bevelOut}
                  className="py-2 text-[11px] font-bold disabled:opacity-50">
                  INSTRUCTOR<br /><span className="font-normal text-[9px]">CREAR SESIÓN</span>
                </button>
              )}
              <button onClick={startLocal} style={bevelOut} className="py-2 text-[11px] font-bold">
                MODO LOCAL<br /><span className="font-normal text-[9px]">PRÁCTICA INDIVIDUAL</span>
              </button>
            </div>
            <div style={bevelIn} className="p-2">
              <div className="text-[10px] font-bold text-black mb-1">UNIRSE A SESIÓN — POSICIÓN</div>
              <div className="flex gap-1 mb-2">
                <MB label="CONTROLADOR (RADAR)" active={posRole === 'controller'} onClick={() => setPosRole('controller')} />
                <MB label="OPERACIONES (AFTN)" active={posRole === 'aftn'} onClick={() => setPosRole('aftn')} />
              </div>
              <div className="flex gap-2">
                <input value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="CÓDIGO" maxLength={5} style={{ ...bevelIn, background: '#fff' }}
                  className="flex-1 px-2 py-1 text-[14px] font-mono font-bold tracking-[6px] text-center outline-none text-black" />
                <button onClick={joinStudent} disabled={lobbyBusy || joinCode.length < 5} style={bevelOut}
                  className="px-4 text-[11px] font-bold disabled:opacity-50">
                  UNIRSE
                </button>
              </div>
            </div>
            {lobbyErr && <div className="text-[10px] font-bold" style={{ color: '#a00' }}>{lobbyErr}</div>}
            <div className="text-center text-[9px] text-[#555] border-t border-[#999] pt-1">
              ENAE · ESCUELA DE NAVEGACIÓN AÉREA — ENTRENAMIENTO UTM · {eng.scenario.name}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden select-none" style={{ background: '#9c9c9c' }}>
      {/* ===== barra superior de estado ===== */}
      <div className="flex items-center justify-between" style={{ background: '#2b2b2b', borderBottom: '2px solid #5a5a5a' }}>
        <div className="flex items-center">
          <TSeg label="ST" />
          <TSeg label="MSAW" color={GREEN} />
          <TSeg label="CONF" color={GREEN} />
          <TSeg label="APW" color={anyAlarm ? RED : GREEN} />
          <TSeg label="C2" color={tracks.some((t) => t.alerts.includes('C2')) ? RED : GREEN} />
          <TSeg label="PSR T" />
          <TSeg label="OPTIONS" />
          <TSeg label={`RANGE: ${rangeNm} NM`} />
          <TSeg label="SIM" color={AMBER} />
          <TSeg label={paused ? 'HOLD' : `RUN x${speed}`} color={paused ? AMBER : GREEN} />
          {(mode === 'instructor' || mode === 'student') && (
            <TSeg
              label={mode === 'instructor' ? `SES ${sessionCode} · ${peers}P · INSTRUCTOR` : `SES ${sessionCode} · ${userName || 'ALUMNO'}`}
              color={CYAN}
            />
          )}
          <TSeg label={`Wx: CAVOK`} />
        </div>
        <div className="text-[11px] font-bold font-mono" style={{ color: GREEN }}>
          CONDOR UTM — POSICIÓN CONTROLADOR · {eng.scenario.name}
        </div>
        <div className="flex items-center">
          <TSeg label="Q" />
          <TSeg label="EST" />
          <TSeg label="FPL" />
          <button onClick={() => setWin('layers', { open: !wins.layers.open })}>
            <TSeg label="MAP" bg={wins.layers.open ? '#4a4a4a' : undefined} />
          </button>
          <TSeg label="CONFIG" />
          <button onClick={() => setWin('msg', { open: !wins.msg.open })}>
            <TSeg label="SYS MSG" bg={wins.msg.open ? '#4a4a4a' : undefined} color={anyAlarm ? RED : '#d6d6d6'} />
          </button>
          <button onClick={() => setWin('time', { open: !wins.time.open })}>
            <TSeg label="CLOCK" bg={wins.time.open ? '#4a4a4a' : undefined} />
          </button>
          <TSeg label="MENU" color={AMBER} />
        </div>
      </div>

      {/* ===== pantalla radar + ventanas ===== */}
      <div className="flex-1 relative" style={{ background: '#101210' }}>
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-crosshair touch-none"
          style={{ filter: bright === 1 ? 'brightness(.78)' : bright === 2 ? 'brightness(.55)' : 'none' }}
          onPointerDown={onCanvasPointerDown}
          onPointerMove={onCanvasPointerMove}
          onPointerUp={onCanvasPointerUp}
          onPointerCancel={() => (panDrag.current = null)}
          onWheel={onCanvasWheel}
        />

        {wins.flights.open && (
          <Win title="VUELOS" x={wins.flights.x} y={wins.flights.y} w={430}
            onClose={() => setWin('flights', { open: false })}
            onDrag={(x, y) => setWin('flights', { x, y })}>
            <div style={{ background: '#000' }} className="font-mono text-[11px] p-0.5">
              <div className="grid grid-cols-7 text-[#bdbdbd] px-1" style={{ background: '#3a3a3a' }}>
                <span>C/S</span><span>TYPE</span><span>AUT</span><span>ALT</span><span>SPD</span><span>BAT</span><span>EST</span>
              </div>
              {tracks.map((t) => (
                <div key={t.callsign} onClick={() => setSelected(t.callsign)}
                  className={`grid grid-cols-7 px-1 cursor-pointer ${selected === t.callsign ? 'bg-[#2a2a2a]' : ''}`}
                  style={{ color: t.alerts.length ? RED : t.status === 'LANDED' ? '#777' : GREEN }}>
                  <span>{t.callsign}</span>
                  <span>{t.acType}</span>
                  <span>{t.authRef.slice(-4)}</span>
                  <span>{Math.round(t.alt)}M</span>
                  <span>{Math.round(t.speedKt)}KT</span>
                  <span>{Math.round(t.batteryPct)}%</span>
                  <span>{t.status === 'NORMAL' && t.airborne ? 'VUELO' : t.status === 'LANDED' ? 'TIERRA' : t.airborne ? t.status : 'ESPERA'}</span>
                </div>
              ))}
            </div>
          </Win>
        )}

        {wins.stations.open && (
          <Win title="ESTACIONES GCS" x={wins.stations.x} y={wins.stations.y} w={260}
            onClose={() => setWin('stations', { open: false })}
            onDrag={(x, y) => setWin('stations', { x, y })}>
            <div className="font-mono text-[10px] p-1" style={{ background: '#c0c0c0' }}>
              <div className="grid grid-cols-3 font-bold text-black mb-0.5">
                <span>GCS</span><span>SUP STATUS</span><span>RX STATUS</span>
              </div>
              {tracks.map((t) => {
                const rx = t.alerts.includes('C2') ? 'NO DATA' : t.airborne && t.status !== 'LANDED' ? 'DATA' : 'STBY';
                return (
                  <div key={t.callsign} className="grid grid-cols-3 mb-0.5 items-center">
                    <span className="font-bold text-black">{t.callsign}</span>
                    <span className="text-center font-bold" style={{ background: '#19c25a', color: '#063' }}>ON</span>
                    <span className="text-center font-bold"
                      style={rx === 'NO DATA' ? { background: '#e03a30', color: '#fff' } : rx === 'DATA' ? { background: '#19c25a', color: '#063' } : { background: '#999', color: '#222' }}>
                      {rx}
                    </span>
                  </div>
                );
              })}
            </div>
          </Win>
        )}

        {wins.sectors.open && (
          <Win title="SECTORES / ZONAS" x={wins.sectors.x} y={wins.sectors.y} w={300}
            onClose={() => setWin('sectors', { open: false })}
            onDrag={(x, y) => setWin('sectors', { x, y })}>
            <div style={{ background: '#000' }} className="font-mono text-[11px] p-1 text-[#b9e8c9]">
              {eng.scenario.zones.map((z, i) => (
                <div key={z.id} style={{ color: z.kind === 'PROHIBITED' ? RED : CYAN }}>
                  UCS {i + 1}  {z.id}  {z.name}  {z.floor}-{z.ceiling}M
                </div>
              ))}
            </div>
          </Win>
        )}

        {wins.time.open && (
          <Win title="SYSTEM TIME" x={wins.time.x} y={wins.time.y} w={230}
            onClose={() => setWin('time', { open: false })}
            onDrag={(x, y) => setWin('time', { x, y })}>
            <div style={{ background: '#000' }} className="px-2 py-1 text-center">
              <div className="font-mono font-bold text-[26px] leading-7" style={{ color: GREEN }}>{clock}</div>
              <div className="font-mono text-[11px]" style={{ color: AMBER }}>SIM {fmtT(eng.t)}</div>
            </div>
          </Win>
        )}

        {wins.msg.open && (
          <Win title="SYS MSG" x={wins.msg.x} y={wins.msg.y} w={400}
            onClose={() => setWin('msg', { open: false })}
            onDrag={(x, y) => setWin('msg', { x, y })}>
            <div style={{ background: '#000' }} className="font-mono text-[10px] p-1 max-h-[150px] overflow-y-auto">
              {eng.log.slice(0, 30).map((l, i) => (
                <div key={i} style={{ color: l.level === 'ALARM' ? RED : l.level === 'WARN' ? AMBER : GREEN }}>
                  {fmtT(l.t)} {l.msg}
                </div>
              ))}
            </div>
          </Win>
        )}

        {wins.zone.open && selZone && (
          <Win title={`ZONA ${selZone.id}`} x={wins.zone.x} y={wins.zone.y} w={300}
            onClose={() => setWin('zone', { open: false })}
            onDrag={(x, y) => setWin('zone', { x, y })}>
            <div style={{ background: '#000' }} className="font-mono text-[10px] p-1">
              <div><span style={{ color: AMBER }}>Status: </span><span style={{ color: GREEN }}>ACTIVA</span></div>
              <div><span style={{ color: AMBER }}>Lower limit: </span><span style={{ color: GREEN }}>{selZone.floor}M AGL</span></div>
              <div><span style={{ color: AMBER }}>Upper limit: </span><span style={{ color: GREEN }}>{selZone.ceiling}M AGL</span></div>
              <div><span style={{ color: AMBER }}>Nombre: </span><span style={{ color: GREEN }}>{selZone.name}</span></div>
              <div className="flex gap-1 mt-1">
                <MB label="MSAW" /><MB label="APW" active /><MB label="CONF" active />
              </div>
            </div>
          </Win>
        )}

        {wins.layers.open && (
          <Win title="CAPAS / PRESENTACIÓN" x={wins.layers.x} y={wins.layers.y} w={252}
            onClose={() => setWin('layers', { open: false })}
            onDrag={(x, y) => setWin('layers', { x, y })}>
            <div style={{ background: '#000' }} className="font-mono text-[10px] p-1.5 space-y-1">
              <div className="text-[#7aa] tracking-wider">CARTOGRAFÍA</div>
              <div className="flex flex-wrap gap-1">
                <MB label="GRILLA" active={showGrid} onClick={() => setShowGrid(!showGrid)} />
                <MB label="ZONAS" active={showZones} onClick={() => setShowZones(!showZones)} />
                <MB label="ANILLOS" active={rings} onClick={() => setRings(!rings)} />
              </div>
              <div className="text-[#7aa] tracking-wider pt-1">PISTAS</div>
              <div className="flex flex-wrap gap-1 items-center">
                <MB label="ETIQUETA" active={showLabels} onClick={() => setShowLabels(!showLabels)} />
                <MB label="ESTELA" active={showTrails} onClick={() => setShowTrails(!showTrails)} />
                <MB label="VECTOR" active={showVectors} onClick={() => setShowVectors(!showVectors)} />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[#888]">VEC PRED:</span>
                {[1, 2, 4].map((m) => (
                  <MB key={m} label={`${m}m`} active={showVectors && vectorMin === m}
                    onClick={() => { setShowVectors(true); setVectorMin(m); }} />
                ))}
              </div>
              <div className="text-[#7aa] tracking-wider pt-1">FILTRO ALTITUD (M AGL)</div>
              <div className="flex items-center gap-1">
                <MB label={altFilter.on ? 'ON' : 'OFF'} active={altFilter.on}
                  onClick={() => setAltFilter((f) => ({ ...f, on: !f.on }))} />
                <span className="text-[#888]">MIN</span>
                <input type="number" value={altFilter.min}
                  onChange={(e) => setAltFilter((f) => ({ ...f, min: +e.target.value }))}
                  style={{ ...bevelIn, background: '#000', color: GREEN, width: 46 }} className="px-1 text-[10px]" />
                <span className="text-[#888]">MAX</span>
                <input type="number" value={altFilter.max}
                  onChange={(e) => setAltFilter((f) => ({ ...f, max: +e.target.value }))}
                  style={{ ...bevelIn, background: '#000', color: GREEN, width: 46 }} className="px-1 text-[10px]" />
              </div>
              <div className="text-[#7aa] tracking-wider pt-1">ETIQUETA PISTA</div>
              <div className="flex items-center gap-1 flex-wrap">
                {['COMPACTA', 'STD', 'FULL'].map((l, i) => (
                  <MB key={l} label={l} active={labelMode === i} onClick={() => setLabelMode(i)} />
                ))}
                <span className="text-[#888] ml-1">FUENTE</span>
                {([[10, 'S'], [11, 'M'], [13, 'L']] as [number, string][]).map(([px, l]) => (
                  <MB key={l} label={l} active={labelFont === px} onClick={() => setLabelFont(px)} />
                ))}
              </div>
              <div className="text-[#7aa] tracking-wider pt-1">BUSCAR PISTA</div>
              <div className="flex items-center gap-1">
                <input value={finder}
                  onChange={(e) => setFinder(e.target.value.toUpperCase())}
                  onKeyDown={(e) => { if (e.key === 'Enter') doFinder(); }}
                  placeholder="C/S" style={{ ...bevelIn, background: '#000', color: GREEN, width: 96 }}
                  className="px-1 text-[10px] uppercase" />
                <MB label="IR" onClick={doFinder} />
              </div>
            </div>
          </Win>
        )}

        {wins.aftn.open && (
          <Win title="TERMINAL AFTN — EJERCICIO" x={wins.aftn.x} y={wins.aftn.y} w={460}
            onClose={() => setWin('aftn', { open: false })}
            onDrag={(x, y) => setWin('aftn', { x, y })}>
            <div style={{ background: '#000' }} className="font-mono text-[10px]">
              <div className="max-h-[120px] overflow-y-auto border-b border-[#444]">
                {eng.msgs.length === 0 && <div className="text-[#666] p-1">SIN MENSAJES — INICIE EL EJERCICIO</div>}
                {eng.msgs.map((m: SimMsg) => (
                  <div key={m.id} onClick={() => setSelMsg(m.id)}
                    className={`px-1 cursor-pointer flex gap-2 ${selMsg === m.id ? 'bg-[#2a2a2a]' : ''}`}
                    style={{ color: m.prio === 'FF' ? RED : GREEN }}>
                    <span className="font-bold">{m.prio}</span>
                    <span>{m.type}</span>
                    <span>{m.flight}</span>
                    <span className="text-[#888]">{fmtT(m.t)}</span>
                    <span className="text-[#888]">{m.from}→{m.to}</span>
                  </div>
                ))}
              </div>
              <div className="p-1 min-h-[100px] max-h-[180px] overflow-y-auto whitespace-pre-wrap"
                style={{ color: CYAN }}>
                {(() => {
                  const m = eng.msgs.find((x: SimMsg) => x.id === selMsg);
                  return m
                    ? `${m.prio} ${m.to}\n${fmtT(m.t).replace(/:/g, '').slice(0, 6)} ${m.from}\n${m.body}`
                    : '— SELECCIONE UN MENSAJE —';
                })()}
              </div>
              {mode === 'student' && posRole === 'aftn' && (
                <div className="flex gap-1 p-1 border-t border-[#444]" style={{ background: '#c0c0c0' }}>
                  <MB label="ACUSAR RECIBO" onClick={() => {
                    const m = eng.msgs.find((x: SimMsg) => x.id === selMsg);
                    if (m && sessionId) {
                      logAction(sessionId, positionId, eng.t, 'ACK_MSG', { msgId: m.id, type: m.type, flight: m.flight }).catch(() => {});
                      m.read = true;
                    }
                  }} />
                  <MB label="ALERTAR CONTROLADOR" onClick={() => {
                    const m = eng.msgs.find((x: SimMsg) => x.id === selMsg);
                    if (m && sessionId) {
                      logAction(sessionId, positionId, eng.t, 'RELAY_ALERT', { msgId: m.id, flight: m.flight }).catch(() => {});
                    }
                  }} />
                </div>
              )}
            </div>
          </Win>
        )}

        {wins.eval.open && mode === 'instructor' && (
          <Win title="EVALUACIÓN DEL EJERCICIO" x={wins.eval.x} y={wins.eval.y} w={560}
            onClose={() => setWin('eval', { open: false })}
            onDrag={(x, y) => setWin('eval', { x, y })}>
            <div className="p-2 font-mono text-[10px]" style={{ background: '#c9c9c9' }}>
              {evalRows.length === 0 ? (
                <div className="text-black">Sin controladores en la sesión.</div>
              ) : (
                <table className="w-full text-black">
                  <thead>
                    <tr className="font-bold text-left border-b border-[#888]">
                      <th>ALUMNO</th><th>DETECCIÓN</th><th>RTH</th><th>CONT</th><th>NOTA</th><th>RESULTADO</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {evalRows.map((r, i) => (
                      <tr key={i} className="border-b border-[#aaa]">
                        <td className="font-bold">{r.student_name}</td>
                        <td>{r.competencies.deteccion_s != null ? `${r.competencies.deteccion_s} s` : '—'}</td>
                        <td>{r.competencies.rth ? 'SÍ' : 'NO'}</td>
                        <td>{r.competencies.contingencia ? 'SÍ' : 'NO'}</td>
                        <td className="font-bold">{r.score}</td>
                        <td className="font-bold" style={{ color: r.passed ? '#0a7a3a' : '#a00' }}>
                          {r.passed ? 'APTO' : 'NO APTO'}
                        </td>
                        <td>
                          {r.passed && r.folio && (
                            <MB label="CERT PDF" onClick={() =>
                              certificadoPdf({
                                studentName: r.student_name,
                                folio: r.folio!,
                                score: r.score,
                                scenarioName: eng.scenario.name,
                                instructorName: userName || 'INSTRUCTOR',
                              })
                            } />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <div className="flex gap-2 mt-2 items-center">
                <MB label={evalBusy ? '…' : 'RECALCULAR'} onClick={runEval} />
                <MB label={evalSaved ? 'GUARDADO ✓' : 'GUARDAR Y EMITIR FOLIOS'} active={evalSaved}
                  onClick={evalSaved ? undefined : saveEval} />
                <span className="text-[9px] text-[#444]">
                  Rúbrica: ACK ≤30 s = 40 pts · RTH = 30 · Contingencia = 30 · Aprueba ≥70
                </span>
              </div>
            </div>
          </Win>
        )}

        {wins.instructor.open && mode === 'student' && (
          <Win title="CONTROLADOR — ÓRDENES" x={wins.instructor.x} y={wins.instructor.y} w={300}
            onClose={() => setWin('instructor', { open: false })}
            onDrag={(x, y) => setWin('instructor', { x, y })}>
            <div className="p-1 font-mono text-[10px]" style={{ background: '#c0c0c0' }}>
              <div className="text-black mb-1">VUELO: <b>{selected ?? '— seleccione vuelo —'}</b></div>
              <div className="flex flex-wrap gap-1">
                <MB label="ACK ALARMA" onClick={() => studentAction('ACK_ALARM')} />
                <MB label="ORDENAR RTH" onClick={() => studentAction('ORDER_RTH')} />
                <MB label="CONTINGENCIA" onClick={() => studentAction('DECLARE_CONTINGENCY')} />
              </div>
              <div className="text-[9px] text-[#333] border-t border-[#888] pt-1 mt-1">
                Sus órdenes se transmiten al instructor y quedan registradas para la evaluación.
              </div>
            </div>
          </Win>
        )}

        {wins.instructor.open && mode !== 'student' && (
          <Win title="INSTRUCTOR — PSEUDO PILOTO" x={wins.instructor.x} y={wins.instructor.y} w={320}
            onClose={() => setWin('instructor', { open: false })}
            onDrag={(x, y) => setWin('instructor', { x, y })}>
            <div className="p-1 font-mono text-[10px]" style={{ background: '#c0c0c0' }}>
              <div className="text-black mb-1">OBJETIVO: <b>{selected ?? '— seleccione vuelo —'}</b></div>
              <div className="flex flex-wrap gap-1 mb-1">
                {(['C2LOSS', 'C2RESTORE', 'LOWBAT', 'EMERG', 'RTH'] as const).map((ev) => (
                  <MB key={ev} label={ev} onClick={() => selected && inject(selected, ev)} />
                ))}
              </div>
              <div className="text-[9px] text-[#333] border-t border-[#888] pt-1">{eng.scenario.briefing}</div>
            </div>
          </Win>
        )}
      </div>

      {/* ===== botonera inferior (doble fila estilo consola) ===== */}
      <div style={{ background: '#b0b0b0', borderTop: '2px solid #f0f0f0' }} className="px-0.5 py-0.5">
        <div className="flex items-center gap-0.5 flex-wrap">
          <MB label="EXECUTIVE" wide active />
          <MB label="TWR" />
          <MB label="CPDLC" />
          <MB label="VIEW1" />
          <MB label="LMG" />
          <MB label="ZONBLK" active={showZones} onClick={() => setShowZones(!showZones)} />
          <MB label="RTE OFF" />
          <MB label="DATBLK" active={showLabels} onClick={() => setShowLabels(!showLabels)} />
          <MB label="QNH" />
          <MB label="RBL ALM" color={anyAlarm ? RED : undefined} />
          <MB label="OVERLAP" />
          <MB label="LAST POS" active={showTrails} onClick={() => setShowTrails(!showTrails)} />
          <MB label="USERS" onClick={() => setWin('flights', { open: !wins.flights.open })} active={wins.flights.open} />
          <span className="mx-0.5 font-mono text-[10px] font-bold">{rangeNm} NM</span>
          <MB label="−" onClick={() => setRangeNm(Math.min(96, rangeNm * 2))} />
          <MB label="+" onClick={() => setRangeNm(Math.max(3, Math.round(rangeNm / 2)))} />
          <MB label="EXP+" onClick={() => setRangeNm(Math.max(3, rangeNm - 3))} />
          <MB label="EXP−" onClick={() => setRangeNm(Math.min(96, rangeNm + 3))} />
          <MB label="CEN" onClick={centerView} active={pan.x === 0 && pan.y === 0} />
          <MB label="CSEL" onClick={centerSelected} active={!!selected} />
          <span className="flex-1" />
          {/* velocidades estilo replay */}
          <span style={bevelIn} className="flex items-center gap-0.5 px-0.5">
            <MB label="S" onClick={resetEx} />
            <MB label="0" active={paused} onClick={() => setSpd(0)} />
            <MB label="½" active={!paused && speed === 0.5} onClick={() => setSpd(0.5)} />
            <MB label="1" active={!paused && speed === 1} onClick={() => setSpd(1)} />
            <MB label="3" active={!paused && speed === 3} onClick={() => setSpd(3)} />
            <MB label="5" active={!paused && speed === 5} onClick={() => setSpd(5)} />
            <MB label="8" active={!paused && speed === 8} onClick={() => setSpd(8)} />
          </span>
          <span className="flex-1" />
          <MB label="SUT" />
          <MB label="STE" />
          <MB label="PRINT LISTS" />
          <MB label="LOGIN" />
        </div>
        <div className="flex items-center gap-0.5 flex-wrap mt-0.5">
          <MB label="PLANNER" wide />
          <MB label="ARR" />
          <MB label="ADS AIR" />
          <MB label="CAPAS" active={wins.layers.open} onClick={() => setWin('layers', { open: !wins.layers.open })} />
          <MB label="GRID" active={showGrid} onClick={() => setShowGrid(!showGrid)} />
          <MB label="RINGS" active={rings} onClick={() => setRings(!rings)} />
          <MB label="ELW" />
          <MB label="RBL" active={rblMode} onClick={() => setRblMode((v) => !v)} />
          <MB label="RBL OFF" onClick={() => { setRbls([]); rblPend.current = null; setCursorLL(null); setRblMode(false); }} />
          <MB label={['BRIGHT', 'DUSK', 'NIGHT'][bright]} active={bright > 0} onClick={() => setBright((b) => (b + 1) % 3)} />
          <MB label="METEO" />
          <MB label="MTCD" />
          <MB label="FREETEXT" />
          <MB label="FINDER" active={wins.layers.open} onClick={() => setWin('layers', { open: true })} />
          <MB label="RADAR" onClick={() => setWin('stations', { open: !wins.stations.open })} active={wins.stations.open} />
          <MB label="SECTORS" active={wins.sectors.open} onClick={() => setWin('sectors', { open: !wins.sectors.open })} />
          <MB label="ZONE INFO" active={wins.zone.open} onClick={() => setWin('zone', { open: !wins.zone.open })} />
          <MB label={mode === 'student' ? 'ÓRDENES' : 'INSTRUCTOR'} active={wins.instructor.open} onClick={() => setWin('instructor', { open: !wins.instructor.open })} />
          {mode === 'instructor' && <MB label="EVAL" active={wins.eval.open} onClick={runEval} />}
          <MB label="AFTN" active={wins.aftn.open} onClick={() => setWin('aftn', { open: !wins.aftn.open })}
            color={eng.msgs.some((m: SimMsg) => m.prio === 'FF' && !m.read) ? RED : undefined} />
          <span className="flex-1" />
          {[6, 12, 24, 48].map((r) => (
            <MB key={r} label={String(r)} active={rangeNm === r} onClick={() => setRangeNm(r)} />
          ))}
          <MB label="DEF" onClick={() => { setRangeNm(12); centerView(); }} />
          <span className="flex-1" />
          <MB label="ACC" />
          <MB label="ATMCSUP" />
          <MB label="LOGOUT" />
        </div>
      </div>
    </div>
  );
}
