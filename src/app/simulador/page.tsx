'use client';

// CONDOR SIM — Posición de Controlador UTM (réplica estilo display radar ATC)
// Pantalla negra, símbolos de pista, etiquetas, ventanas flotantes y menús inferiores.

import { useEffect, useRef, useState, useCallback } from 'react';
import { SimEngine, type TrackState } from '@/lib/sim/engine';
import { SCENARIOS } from '@/lib/sim/scenarios';

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
  const [showFlights, setShowFlights] = useState(true);
  const [showLog, setShowLog] = useState(true);
  const [showInstructor, setShowInstructor] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [clock, setClock] = useState('--:--:--');

  // motor
  if (!engineRef.current) {
    engineRef.current = new SimEngine(SCENARIOS[0]);
  }
  const eng = engineRef.current;

  // bucle de simulación + render
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      draw();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    // física desacoplada del render: avanza aunque el navegador limite RAF
    let last = performance.now();
    const phys = setInterval(() => {
      const now = performance.now();
      const dt = (now - last) / 1000;
      last = now;
      eng.tick(dt);
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
  }, [rangeNm, showLabels, showZones, showTrails, selected]);

  // proyección simple lat/lng → px centrada en el escenario
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
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);

    // anillos de rango cada 5 NM
    const [cx, cy] = [w / 2, h / 2];
    const pxPerNm = Math.min(w, h) / (rangeNm * 2);
    ctx.strokeStyle = '#10241a';
    ctx.fillStyle = '#1d4030';
    ctx.font = '10px monospace';
    for (let r = 5; r <= rangeNm * 2; r += 5) {
      ctx.beginPath();
      ctx.arc(cx, cy, r * pxPerNm, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillText(`${r}`, cx + r * pxPerNm + 3, cy - 3);
    }
    // cruz central
    ctx.strokeStyle = '#1d4030';
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy);
    ctx.lineTo(cx + 8, cy);
    ctx.moveTo(cx, cy - 8);
    ctx.lineTo(cx, cy + 8);
    ctx.stroke();

    // zonas
    if (showZones) {
      for (const z of eng.scenario.zones) {
        const col = z.kind === 'PROHIBITED' ? RED : z.kind === 'SEGREGATED' ? CYAN : AMBER;
        ctx.strokeStyle = col;
        ctx.setLineDash(z.kind === 'SEGREGATED' ? [] : [6, 4]);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        z.ring.forEach(([lng, lat], i) => {
          const [x, y] = project(lng, lat, w, h);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
        ctx.setLineDash([]);
        const [lx, ly] = project(z.ring[0][0], z.ring[0][1], w, h);
        ctx.fillStyle = col;
        ctx.font = '10px monospace';
        ctx.fillText(`${z.name} ${z.floor}-${z.ceiling}M`, lx + 4, ly - 4);
      }
    }

    // tracks
    for (const tr of eng.tracks.values()) {
      if (!tr.airborne && tr.status !== 'LANDED') continue;
      const [x, y] = project(tr.lng, tr.lat, w, h);
      const alarm = tr.alerts.length > 0;
      const col = tr.status === 'LANDED' ? GRAY : alarm ? RED : GREEN;

      // trail (historia)
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

      // símbolo: triángulo ADS-B (como tabla de símbolos del sistema)
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

      // vector de velocidad (1 min)
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

      // etiqueta
      if (showLabels && tr.status !== 'LANDED') {
        const lx = x + 14;
        const ly = y - 22;
        ctx.strokeStyle = 'rgba(120,140,130,.5)';
        ctx.beginPath();
        ctx.moveTo(x + 6, y - 4);
        ctx.lineTo(lx - 2, ly + 10);
        ctx.stroke();
        ctx.font = 'bold 11px monospace';
        // línea de alarma (roja, sobre la etiqueta) — como las "pistas en peligro"
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
  }, [eng, project, rangeNm, showLabels, showZones, showTrails, selected]);

  // resize canvas
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ro = new ResizeObserver(() => {
      cv.width = cv.clientWidth;
      cv.height = cv.clientHeight;
    });
    ro.observe(cv);
    return () => ro.disconnect();
  }, []);

  // click para seleccionar track
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

  const togglePause = () => {
    eng.paused = !eng.paused;
    setPaused(eng.paused);
  };
  const setSpd = (s: number) => {
    eng.speed = s;
    setSpeed(s);
  };
  const resetEx = () => {
    eng.reset();
    setPaused(true);
    setSelected(null);
  };

  const MBtn = ({
    label,
    active,
    danger,
    onClick,
  }: {
    label: string;
    active?: boolean;
    danger?: boolean;
    onClick?: () => void;
  }) => (
    <button
      onClick={onClick}
      className={`px-2 py-0.5 text-[11px] font-mono border ${
        danger
          ? 'border-red-700 text-red-400 bg-red-950/40'
          : active
          ? 'border-emerald-500 text-black bg-emerald-400'
          : 'border-zinc-600 text-zinc-300 bg-zinc-800 hover:bg-zinc-700'
      }`}
    >
      {label}
    </button>
  );

  const tracks: TrackState[] = Array.from(eng.tracks.values());
  const anyAlarm = tracks.some((t) => t.alerts.length > 0);

  return (
    <div className="h-screen w-screen bg-black flex flex-col overflow-hidden select-none">
      {/* barra superior mínima */}
      <div className="flex items-center justify-between px-2 py-0.5 bg-zinc-900 border-b border-zinc-700 font-mono text-[11px]">
        <div className="flex gap-3">
          <span className="text-emerald-400 font-bold">CONDOR SIM</span>
          <span className="text-zinc-400">POSICIÓN: CONTROLADOR UTM</span>
          <span className="text-cyan-400">{eng.scenario.name}</span>
        </div>
        <div className="flex gap-3 items-center">
          {anyAlarm && <span className="text-red-500 font-bold animate-pulse">⚠ ALARMA</span>}
          <span className="text-zinc-400">SIM {fmtT(eng.t)}</span>
          <span className="bg-black border border-emerald-700 text-emerald-400 px-2 font-bold">
            {clock} UTC
          </span>
        </div>
      </div>

      {/* pantalla radar */}
      <div className="flex-1 relative">
        <canvas ref={canvasRef} className="w-full h-full cursor-crosshair" onClick={onCanvasClick} />

        {/* ventana: lista de vuelos */}
        {showFlights && (
          <div className="absolute top-2 left-2 w-[300px] border border-zinc-600 bg-black/90 font-mono text-[11px]">
            <div className="bg-zinc-800 text-zinc-200 px-2 py-0.5 flex justify-between">
              <span>VUELOS</span>
              <button onClick={() => setShowFlights(false)} className="text-zinc-400">×</button>
            </div>
            <table className="w-full">
              <thead>
                <tr className="text-zinc-500">
                  <th className="text-left px-2">C/S</th>
                  <th className="text-left">TIPO</th>
                  <th className="text-left">AUT</th>
                  <th className="text-right px-2">BAT</th>
                  <th className="text-right px-2">EST</th>
                </tr>
              </thead>
              <tbody>
                {tracks.map((t) => (
                  <tr
                    key={t.callsign}
                    onClick={() => setSelected(t.callsign)}
                    className={`cursor-pointer ${
                      selected === t.callsign ? 'bg-zinc-800' : ''
                    } ${t.alerts.length ? 'text-red-400' : t.status === 'LANDED' ? 'text-zinc-500' : 'text-emerald-400'}`}
                  >
                    <td className="px-2">{t.callsign}</td>
                    <td>{t.acType}</td>
                    <td>{t.authRef.slice(-4)}</td>
                    <td className="text-right px-2">{Math.round(t.batteryPct)}%</td>
                    <td className="text-right px-2">
                      {t.status === 'NORMAL' && t.airborne ? 'VUELO' : t.status === 'LANDED' ? 'TIERRA' : t.airborne ? t.status : 'ESPERA'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ventana: log del sistema */}
        {showLog && (
          <div className="absolute top-2 right-2 w-[360px] max-h-[40%] border border-zinc-600 bg-black/90 font-mono text-[11px] flex flex-col">
            <div className="bg-zinc-800 text-zinc-200 px-2 py-0.5 flex justify-between">
              <span>MENSAJES DEL SISTEMA</span>
              <button onClick={() => setShowLog(false)} className="text-zinc-400">×</button>
            </div>
            <div className="overflow-y-auto p-1 space-y-0.5">
              {eng.log.slice(0, 30).map((l, i) => (
                <div
                  key={i}
                  className={
                    l.level === 'ALARM' ? 'text-red-400' : l.level === 'WARN' ? 'text-amber-400' : 'text-emerald-500'
                  }
                >
                  {fmtT(l.t)} {l.msg}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ventana: instructor / pseudo-piloto */}
        {showInstructor && (
          <div className="absolute bottom-4 right-2 w-[300px] border border-amber-700 bg-black/95 font-mono text-[11px]">
            <div className="bg-amber-900/60 text-amber-200 px-2 py-0.5 flex justify-between">
              <span>INSTRUCTOR — INYECCIÓN DE EVENTOS</span>
              <button onClick={() => setShowInstructor(false)} className="text-amber-300">×</button>
            </div>
            <div className="p-2 space-y-1">
              <div className="text-zinc-400">
                Objetivo: {selected ?? '— seleccione un vuelo —'}
              </div>
              <div className="flex flex-wrap gap-1">
                {(['C2LOSS', 'C2RESTORE', 'LOWBAT', 'EMERG', 'RTH'] as const).map((ev) => (
                  <button
                    key={ev}
                    disabled={!selected}
                    onClick={() => selected && eng.injectEvent(selected, ev)}
                    className="px-2 py-0.5 border border-amber-700 text-amber-300 disabled:opacity-30 hover:bg-amber-900/40"
                  >
                    {ev}
                  </button>
                ))}
              </div>
              <div className="text-zinc-500 pt-1 border-t border-zinc-800">
                {eng.scenario.briefing}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ===== MENÚS INFERIORES (estilo display ATC) ===== */}
      <div className="bg-zinc-900 border-t border-zinc-700 px-1 py-1 flex flex-wrap items-center gap-1 font-mono">
        <span className="text-zinc-500 text-[10px] px-1">EJECUTIVO</span>
        <MBtn label={paused ? 'INICIAR' : 'PAUSA'} active={!paused} onClick={togglePause} />
        <MBtn label="RESET" onClick={resetEx} />
        <span className="w-px h-5 bg-zinc-700 mx-1" />
        <span className="text-zinc-500 text-[10px]">VEL</span>
        {[1, 2, 4].map((s) => (
          <MBtn key={s} label={`x${s}`} active={speed === s} onClick={() => setSpd(s)} />
        ))}
        <span className="w-px h-5 bg-zinc-700 mx-1" />
        <span className="text-zinc-500 text-[10px]">RANGO</span>
        {[6, 12, 24, 48].map((r) => (
          <MBtn key={r} label={`${r}NM`} active={rangeNm === r} onClick={() => setRangeNm(r)} />
        ))}
        <span className="w-px h-5 bg-zinc-700 mx-1" />
        <MBtn label="ETIQ" active={showLabels} onClick={() => setShowLabels(!showLabels)} />
        <MBtn label="ZONAS" active={showZones} onClick={() => setShowZones(!showZones)} />
        <MBtn label="HIST" active={showTrails} onClick={() => setShowTrails(!showTrails)} />
        <span className="w-px h-5 bg-zinc-700 mx-1" />
        <MBtn label="VUELOS" active={showFlights} onClick={() => setShowFlights(!showFlights)} />
        <MBtn label="MSG" active={showLog} onClick={() => setShowLog(!showLog)} />
        <MBtn label="INSTRUCTOR" active={showInstructor} onClick={() => setShowInstructor(!showInstructor)} />
        <div className="flex-1" />
        <span className="text-zinc-500 text-[10px] px-2">ENAE · ESCUELA DE NAVEGACIÓN AÉREA — ENTRENAMIENTO UTM</span>
      </div>
    </div>
  );
}
