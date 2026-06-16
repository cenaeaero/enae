# CONDOR — Despliegue Fase 0 (auto-alojado en Rocky Linux 9)

Pone la **consola CONDOR** (Next.js) y **Supabase** corriendo en tu propio servidor/VM,
fuera de Vercel/nube — primer paso del sistema de producción. Reutiliza el código tal cual.

## Requisitos
- Rocky Linux 9 (o RHEL 9) — una **VM o PC** sirve para empezar (no necesitas el servidor final).
- 4+ GB RAM para la consola; +8 GB si corres Supabase en la misma máquina.

## Pasos
```bash
# 1) Preparar el sistema (Podman, NTP, firewall)
sudo bash install-rocky.sh

# 2) Certificado TLS para arrancar (luego reemplazar por CA interna/Let's Encrypt)
bash gen-cert.sh

# 3) Supabase auto-alojado (stack oficial). Editar su .env (claves/URLs) cuando lo pida.
bash supabase-selfhost.sh
#    -> copiar ANON_KEY y URL del Supabase a deploy/.env

# 4) Variables de la consola
cp .env.example .env && nano .env     # completar NEXT_PUBLIC_SIM_SUPABASE_* y los de auth

# 5) Construir y levantar consola + nginx (TLS)
podman-compose up -d --build
#    consola disponible en https://<ip-del-servidor>/simulador
```

## Notas
- **Esquema del SIM:** tras levantar Supabase, crear las tablas que usa el sim
  (`sim_sessions`, `sim_state`, `sim_positions`, `sim_actions`, `sim_events`,
  `sim_live_tracks`, `sim_bases`, `sim_exercises`). Se pueden exportar del proyecto
  actual o recrear con SQL.
- **Auth:** para arrancar, `NEXT_PUBLIC_SUPABASE_*` puede apuntar al portal ENAE existente;
  en producción, migrar a usuarios/operadores del Supabase propio.
- **Producción:** reemplazar el certificado autofirmado, aislar la LAN de vigilancia,
  añadir monitoreo (Prometheus/Grafana) y, en la fase de habilitación, el 2º servidor N+1.
- Ver el plan completo en `../docs/CONDOR-produccion-plan-construccion.md` y la
  lista de compras en `../docs/CONDOR-produccion-BOM.md`.
