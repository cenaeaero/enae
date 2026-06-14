-- CONDOR SIM — esquema (proyecto Supabase dedicado: condor-sim)
-- Multi-puesto: el instructor publica el estado del ejercicio; los alumnos
-- (controladores) lo reciben por Realtime y registran sus acciones para evaluación.

-- 1) Sesiones de entrenamiento (una clase / un ejercicio en curso)
create table if not exists sim_sessions (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,                  -- código corto para que el alumno se una (p.ej. CALAMA1)
  scenario_id text not null,                  -- id del escenario (bvlos-calama)
  status text not null default 'lobby',       -- lobby | running | paused | debrief | closed
  speed numeric not null default 1,
  sim_t numeric not null default 0,           -- segundos de simulación al último latido
  instructor_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) Puestos conectados (alumnos e instructor)
create table if not exists sim_positions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sim_sessions(id) on delete cascade,
  role text not null default 'controller',    -- instructor | controller | pseudopilot | observer
  student_name text not null,
  student_email text,
  connected_at timestamptz not null default now(),
  last_seen timestamptz not null default now()
);

-- 3) Estado del ejercicio (latido del instructor: tracks serializados)
--    una fila por sesión, upsert continuo; Realtime la difunde a los alumnos
create table if not exists sim_state (
  session_id uuid primary key references sim_sessions(id) on delete cascade,
  sim_t numeric not null default 0,
  paused boolean not null default true,
  speed numeric not null default 1,
  tracks jsonb not null default '[]'::jsonb,  -- [{callsign,lat,lng,alt,hdg,speedKt,batteryPct,status,alerts,inside}]
  log jsonb not null default '[]'::jsonb,     -- últimos 50 mensajes
  updated_at timestamptz not null default now()
);
-- columnas agregadas (mensajes AFTN y zonas creadas por el instructor) — idempotente
alter table sim_state add column if not exists msgs jsonb not null default '[]'::jsonb;
alter table sim_state add column if not exists zones jsonb not null default '[]'::jsonb;

-- 4) Eventos inyectados por el instructor (audit trail del guion)
create table if not exists sim_events (
  id bigint generated always as identity primary key,
  session_id uuid not null references sim_sessions(id) on delete cascade,
  sim_t numeric not null,
  flight text not null,
  event_type text not null,                   -- C2LOSS | C2RESTORE | LOWBAT | EMERG | RTH | custom
  injected_by text,
  created_at timestamptz not null default now()
);

-- 5) Acciones del alumno (para evaluación automática)
create table if not exists sim_actions (
  id bigint generated always as identity primary key,
  session_id uuid not null references sim_sessions(id) on delete cascade,
  position_id uuid references sim_positions(id) on delete set null,
  sim_t numeric not null,
  action text not null,                       -- SELECT_TRACK | ACK_ALARM | ORDER_RTH | DECLARE_CONTINGENCY | NOTE
  detail jsonb,
  created_at timestamptz not null default now()
);

-- 6) Resultados / evaluación por alumno
create table if not exists sim_results (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sim_sessions(id) on delete cascade,
  position_id uuid references sim_positions(id) on delete set null,
  student_name text not null,
  score numeric,
  competencies jsonb,                         -- {deteccion_desvio: {t: 12.5, ok: true}, rth: {...}, ...}
  passed boolean,
  certificate_folio text,
  created_at timestamptz not null default now()
);

-- Índices para los feeds
create index if not exists idx_sim_positions_session on sim_positions(session_id);
create index if not exists idx_sim_events_session on sim_events(session_id);
create index if not exists idx_sim_actions_session on sim_actions(session_id);

-- Realtime: difundir cambios de estado y eventos
alter publication supabase_realtime add table sim_state;
alter publication supabase_realtime add table sim_events;
alter publication supabase_realtime add table sim_sessions;

-- RLS: lectura/escritura abierta con publishable key SOLO en tablas sim
-- (el sim no maneja datos personales sensibles; los alumnos entran con código de sesión)
alter table sim_sessions enable row level security;
alter table sim_positions enable row level security;
alter table sim_state enable row level security;
alter table sim_events enable row level security;
alter table sim_actions enable row level security;
alter table sim_results enable row level security;

create policy sim_sessions_all on sim_sessions for all using (true) with check (true);
create policy sim_positions_all on sim_positions for all using (true) with check (true);
create policy sim_state_all on sim_state for all using (true) with check (true);
create policy sim_events_all on sim_events for all using (true) with check (true);
create policy sim_actions_all on sim_actions for all using (true) with check (true);
-- resultados: solo lectura desde el navegador; escritura vía service key (API route)
create policy sim_results_read on sim_results for select using (true);

-- 7) Tracks externos (Mission Planner / ArduPilot via condor-bridge)
create table if not exists sim_live_tracks (
  session_code text not null,
  callsign text not null,
  lat double precision not null,
  lng double precision not null,
  alt_m numeric not null default 0,
  hdg numeric not null default 0,
  speed_kt numeric not null default 0,
  battery_pct numeric not null default 100,
  updated_at timestamptz not null default now(),
  primary key (session_code, callsign)
);
alter publication supabase_realtime add table sim_live_tracks;
alter table sim_live_tracks enable row level security;
create policy sim_live_tracks_all on sim_live_tracks for all using (true) with check (true);
