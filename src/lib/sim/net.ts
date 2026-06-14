// CONDOR SIM — capa de red multi-puesto (Supabase condor-sim)
// El instructor corre el motor y publica el estado ~1 Hz; los alumnos lo
// reciben por Realtime. Las órdenes del alumno (RTH, contingencia) se insertan
// en sim_actions y el puesto instructor las aplica al motor.

import { createClient, type SupabaseClient, type RealtimeChannel } from '@supabase/supabase-js';
import type { TrackState, SimMsg, Zone } from './engine';

let _client: SupabaseClient | null = null;

export function simDb(): SupabaseClient {
  if (!_client) {
    _client = createClient(
      process.env.NEXT_PUBLIC_SIM_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SIM_SUPABASE_KEY!,
      { auth: { persistSession: false } }
    );
  }
  return _client;
}

export interface NetState {
  sim_t: number;
  paused: boolean;
  speed: number;
  tracks: TrackState[];
  log: { t: number; msg: string; level: 'INFO' | 'WARN' | 'ALARM' }[];
  msgs?: SimMsg[];
  zones?: Zone[];
}

export async function createSession(scenarioId: string, instructorName: string) {
  const code = Math.random().toString(36).slice(2, 7).toUpperCase();
  const db = simDb();
  const { data, error } = await db
    .from('sim_sessions')
    .insert({ code, scenario_id: scenarioId, status: 'running', instructor_name: instructorName })
    .select()
    .single();
  if (error) throw error;
  await db.from('sim_state').insert({ session_id: data.id });
  const pos = await db
    .from('sim_positions')
    .insert({ session_id: data.id, role: 'instructor', student_name: instructorName })
    .select()
    .single();
  return { sessionId: data.id as string, code, positionId: pos.data?.id as string };
}

export async function joinSession(code: string, studentName: string, role: 'controller' | 'aftn' = 'controller') {
  const db = simDb();
  const { data: ses, error } = await db
    .from('sim_sessions')
    .select()
    .eq('code', code.toUpperCase().trim())
    .neq('status', 'closed')
    .single();
  if (error || !ses) throw new Error('Sesión no encontrada. Verifique el código.');
  const { data: pos, error: e2 } = await db
    .from('sim_positions')
    .insert({ session_id: ses.id, role, student_name: studentName })
    .select()
    .single();
  if (e2) throw e2;
  return { sessionId: ses.id as string, code: ses.code as string, scenarioId: ses.scenario_id as string, positionId: pos.id as string };
}

let msgsColumnOk = true;
let zonesColumnOk = true;

export async function publishState(sessionId: string, st: NetState) {
  const base = {
    session_id: sessionId,
    sim_t: st.sim_t,
    paused: st.paused,
    speed: st.speed,
    tracks: st.tracks,
    log: st.log.slice(0, 50),
    updated_at: new Date().toISOString(),
  };
  const db = simDb();
  const build = (): Record<string, unknown> => {
    const p: Record<string, unknown> = { ...base };
    if (msgsColumnOk) p.msgs = st.msgs ?? [];
    if (zonesColumnOk && st.zones) p.zones = st.zones;
    return p;
  };
  const { error } = await db.from('sim_state').upsert(build());
  if (!error) return;
  // columna aún no migrada: degradar sin perder el resto del estado
  let degraded = false;
  if (/msgs/.test(error.message)) { msgsColumnOk = false; degraded = true; }
  if (/zones/.test(error.message)) { zonesColumnOk = false; degraded = true; }
  if (degraded) await db.from('sim_state').upsert(build());
}

export function subscribeState(sessionId: string, cb: (st: NetState) => void): RealtimeChannel {
  const db = simDb();
  // estado inicial
  db.from('sim_state')
    .select()
    .eq('session_id', sessionId)
    .single()
    .then(({ data }) => {
      if (data) cb(data as unknown as NetState);
    });
  return db
    .channel(`sim_state_${sessionId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'sim_state', filter: `session_id=eq.${sessionId}` },
      (payload) => cb(payload.new as unknown as NetState)
    )
    .subscribe();
}

export async function logAction(
  sessionId: string,
  positionId: string | null,
  simT: number,
  action: string,
  detail?: Record<string, unknown>
) {
  await simDb().from('sim_actions').insert({
    session_id: sessionId,
    position_id: positionId,
    sim_t: simT,
    action,
    detail: detail ?? null,
  });
}

export function subscribeActions(
  sessionId: string,
  cb: (a: { sim_t: number; action: string; detail: Record<string, unknown> | null }) => void
): RealtimeChannel {
  return simDb()
    .channel(`sim_actions_${sessionId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'sim_actions', filter: `session_id=eq.${sessionId}` },
      (payload) => cb(payload.new as { sim_t: number; action: string; detail: Record<string, unknown> | null })
    )
    .subscribe();
}

export async function logEvent(sessionId: string, simT: number, flight: string, eventType: string, by: string) {
  await simDb().from('sim_events').insert({
    session_id: sessionId,
    sim_t: simT,
    flight,
    event_type: eventType,
    injected_by: by,
  });
}

// tracks externos (Mission Planner / ArduPilot vía condor-bridge)
export interface LiveTrack {
  session_code: string;
  callsign: string;
  lat: number;
  lng: number;
  alt_m: number;
  hdg: number;
  speed_kt: number;
  battery_pct: number;
  updated_at: string;
}

export function subscribeLiveTracks(code: string, cb: (t: LiveTrack) => void): RealtimeChannel {
  const db = simDb();
  db.from('sim_live_tracks')
    .select()
    .eq('session_code', code)
    .then(({ data }) => (data ?? []).forEach((r) => cb(r as LiveTrack)));
  return db
    .channel(`sim_live_${code}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'sim_live_tracks', filter: `session_code=eq.${code}` },
      (payload) => {
        if (payload.new) cb(payload.new as LiveTrack);
      }
    )
    .subscribe();
}

export interface EvalPosition { id: string; student_name: string; role: string }
export interface EvalAction { position_id: string | null; sim_t: number; action: string; detail: { flight?: string } | null }
export interface EvalEvent { sim_t: number; flight: string; event_type: string }

export async function fetchEvalData(sessionId: string) {
  const db = simDb();
  const [pos, act, ev] = await Promise.all([
    db.from('sim_positions').select('id,student_name,role').eq('session_id', sessionId).eq('role', 'controller'),
    db.from('sim_actions').select('position_id,sim_t,action,detail').eq('session_id', sessionId).order('sim_t'),
    db.from('sim_events').select('sim_t,flight,event_type').eq('session_id', sessionId).order('sim_t'),
  ]);
  return {
    positions: (pos.data ?? []) as EvalPosition[],
    actions: (act.data ?? []) as EvalAction[],
    events: (ev.data ?? []) as EvalEvent[],
  };
}

export async function countPositions(sessionId: string): Promise<number> {
  const { count } = await simDb()
    .from('sim_positions')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', sessionId);
  return count ?? 0;
}
