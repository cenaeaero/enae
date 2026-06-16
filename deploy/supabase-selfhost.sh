#!/usr/bin/env bash
# Levanta Supabase auto-alojado (stack oficial) para la base del SIM/CONDOR.
# Reemplaza el Supabase en la nube por uno propio, SIN cambiar el código (el sim ya usa el cliente Supabase).
set -euo pipefail

DIR="supabase"
if [ ! -d "$DIR" ]; then
  echo "==> Clonando el stack oficial de Supabase (docker)"
  git clone --depth 1 https://github.com/supabase/supabase "$DIR"
fi
cd "$DIR/docker"
[ -f .env ] || cp .env.example .env

cat <<'NOTE'
==> IMPORTANTE: edita supabase/docker/.env y cambia:
    - POSTGRES_PASSWORD, JWT_SECRET, ANON_KEY, SERVICE_ROLE_KEY  (genera nuevos)
    - SITE_URL / API_EXTERNAL_URL  a la URL de tu servidor (p.ej. https://condor.local)
    Genera claves con:  openssl rand -base64 48
    Tras editar, este script levanta el stack.
NOTE
read -r -p "¿.env ya editado y listo? [s/N] " ok
[ "${ok:-}" = "s" ] || { echo "Edita .env y vuelve a correr."; exit 1; }

echo "==> Levantando Supabase (Postgres/Realtime/Auth/Storage/Kong)"
podman-compose up -d
echo "==> Supabase arriba. Copia ANON_KEY y la URL a deploy/.env (NEXT_PUBLIC_SIM_SUPABASE_*)."
echo "==> Luego aplica el esquema del sim (tablas sim_sessions, sim_state, sim_positions, sim_actions, sim_events, sim_live_tracks, sim_bases, sim_exercises)."
