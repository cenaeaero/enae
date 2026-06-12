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

type WinId = 'flights' | 'stations' | 'sectors' | 'time' | 'msg' | 'instructor' | 'zone' | 'eval' | 'aftn';

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
  }, [rangeNm, showLabels, showZones, showTrails, rings, selected, mode, sessionId]);

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
        w / 2 + (lng - clng) * nmPerDegLng * pxPerNm,
        h / 2 - (lat - clat) * nmPerDegLat * pxPerNm,
      ];
    },
    [eng, rangeNm]
  );

  const draw = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const w = cv.width;
    const h = cv.height;
    ctx.fillStyle = '#101210';
    ctx.fillRect(0, 0, w, h);

    const [cx, cy] = [w / 2, h / 2];
    const pxPerNm = Math.min(w, h) / (rangeNm * 2);

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

    for (const tr of eng.tracks.values()) {
      if (!tr.airborne && tr.status !== 'LANDED') continue;
      const [x, y] = project(tr.lng, tr.lat, w, h);
      const alarm = tr.alerts.length > 0;
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

      if (tr.speedKt > 0) {
        const vNm = tr.speedKt / 60;
        const vx = x + Math.sin((tr.hdg * Math.PI) / 180) * vNm * pxPerNm;
        const vy = y - Math.cos((tr.hdg * Math.PI) / 180) * vNm * pxPerNm;
        ctx.strokeStyle = col;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(vx, vy);
        ctx.stroke();
      }

      if (showLabels && tr.status !== 'LANDED') {
        const lx = x + 14;
        const ly = y - 22;
        ctx.strokeStyle = 'rgba(120,140,130,.5)';
        ctx.beginPath();
        ctx.moveTo(x + 6, y - 4);
        ctx.lineTo(lx - 2, ly + 10);
        ctx.stroke();
        ctx.font = 'bold 11px monospace';
        if (alarm) {
          ctx.fillStyle = RED;
          ctx.fillText(tr.alerts.join(' '), lx, ly - 12);
        }
        ctx.fillStyle = alarm ? RED : GREEN;
        ctx.fillText(`${tr.callsign}  ${String(Math.round(tr.alt)).padStart(3, '0')}M`, lx, ly);
        ctx.fillText(`${Math.round(tr.speedKt)}KT ${Math.round(tr.batteryPct)}%`, lx, ly + 12);
        ctx.fillStyle = alarm ? RED : '#1f9e5d';
        ctx.fillText(`${tr.acType} ${tr.authRef.slice(-4)}`, lx, ly + 24);
      }
    }
  }, [eng, project, rangeNm, showLabels, showZones, showTrails, rings, selected]);

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

  const onCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const cv = canvasRef.current;
    if (!cv) return;
    const rect = cv.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
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
          <TSeg label="MAP" />
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
        <canvas ref={canvasRef} className="w-full h-full cursor-crosshair" onClick={onCanvasClick} />

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
          <MB label="VIEW2" />
          <MB label="RINGS" active={rings} onClick={() => setRings(!rings)} />
          <MB label="ELW" />
          <MB label="RBL OFF" />
          <MB label="BRIGHT" />
          <MB label="METEO" />
          <MB label="MTCD" />
          <MB label="FREETEXT" />
          <MB label="FINDER" />
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
          <MB label="DEF" onClick={() => setRangeNm(12)} />
          <span className="flex-1" />
          <MB label="ACC" />
          <MB label="ATMCSUP" />
          <MB label="LOGOUT" />
        </div>
      </div>
    </div>
  );
}
