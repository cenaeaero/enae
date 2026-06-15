# CONDOR UTM — Plan de desarrollo del sistema operativo (producción)

> Sistema real de gestión de tráfico UAS (USS/UTM) basado en el proyecto CONDOR SIM.
> La presentación radar es la misma del simulador, depurada y endurecida, alimentada por
> datos de vigilancia reales y **Remote ID**.

## 0. Decisiones de arquitectura fijadas (según manuales de referencia)

| Tema | Decisión | Fuente |
|---|---|---|
| Sistema operativo del servidor | **Linux Red Hat Enterprise Linux (RHEL)** | Manual: "El Sistema Operativo usado es Linux Red Hat Enterprise Linux." |
| Formato de datos de vigilancia | **ASTERIX** (EUROCONTROL) — categorías relevantes: **CAT021 (ADS-B)**, CAT062 (track de sistema), CAT048 (mono-radar) | Manual: "Periodo … para el envío de ASTERIX Cat 21" |
| Fuentes de vigilancia | PSR / SSR / Mode S / MLAT / ADS-B / ADS-C | Manuales |
| Puente Remote ID ↔ radar | **RID (ASTM F3411) ⇄ ASTERIX CAT021** → modelo de track unificado | Diseño |
| Presentación | Consola radar Next.js del simulador (`src/app/simulador/page.tsx`), depurada | Código propio |

> **Regla de oro:** los manuales son sólo referencia funcional. **Jamás** nombrar marcas
> de proveedor (las variantes de ASTERIX específicas de fabricante se citan de forma genérica).

## 1. La idea central: "la data radar se modifica para el Remote ID"

El sistema real ingiere vigilancia vía ASTERIX. Como **CAT021 ya es el reporte ADS-B**,
el Remote ID se inyecta como un **stream tipo CAT021**:

```
Dron / GCS ──(ASTM F3411 Network RID)──┐
ArduPilot OPEN_DRONE_ID_* (MAVLink) ───┤
Sensores Broadcast BLE/Wi-Fi (OpenDroneID)─┤→ [Adaptador RID] → CAT021 → ┐
ADS-B / PSR / SSR / MLAT (ASTERIX) ─────────────────────────────────────┤→ [Núcleo de fusión / track]
                                                                         ↓
                                                              Modelo de track unificado
                                                                         ↓
                                                       Presentación radar (consola) + UTM core
```

El **modelo de track unificado** es la evolución del `TrackState` de `engine.ts`, ampliado
con los campos ASTM F3411 (Basic ID, Location/Vector, Accuracy, Operator, Self-ID, Op status).

## 2. Reutilización del código existente

| Código actual | Rol en producción |
|---|---|
| `src/lib/sim/engine.ts` (track model, física, conformance, STCA, zonas) | **Servicio de track/fusión**: el modelo de datos pasa a ser el track unificado RID/ASTERIX |
| `src/lib/sim/net.ts` (Supabase Realtime, sesiones, `publishState`, `sim_live_tracks`) | **Bus de telemetría**: se mantiene el esquema; se añade transporte MQTT/WebSocket + feed ASTERIX |
| `src/app/simulador/page.tsx` (consola radar) | **Presentación de producción**: misma UI, datos validados, indicadores de integridad |
| `src/lib/sim/scenarios.ts` + simulador | **Subsistema de entrenamiento/replay** (CONDOR SIM sigue siendo la cara simuladora del mismo motor) |
| Puente Mission Planner `tools/condor-bridge/bridge.py` | **Adaptador de ingesta RID**: lee `OPEN_DRONE_ID_*` de ArduPilot → CAT021/F3411 |
| Modelo ASTM F3411 (definido en sesión previa) | **Esquema del track unificado** |
| UTM core Laravel (zonas DGAC, conformidad, NOTAM, FPL, autorizaciones) | Se conserva tal cual; consume el track unificado |

## 3. Modelo de datos unificado (track) — base ASTM F3411 / CAT021

- **Basic ID:** `id_type` (Serial / CAA / UTM / Session ID), `ua_type`, `uas_id`
- **Location/Vector:** `lat`, `lng`, `geodetic_alt`, `height_agl`, `height_type`, `track_deg`, `speed`, `vspeed`, `timestamp`
- **Accuracy/Quality:** `h_accuracy`, `v_accuracy`, `speed_accuracy`, `ts_accuracy` (↔ campos de calidad ASTERIX)
- **Operator:** `operator_id`, `operator_lat`, `operator_lng`, `area_count`, `area_radius`
- **Self-ID / System / Operational status:** Ground / Airborne / Emergency
- **Procedencia (fusión):** `source` ∈ {ADS-B, PSR, SSR, MLAT, RID-NET, RID-BCAST}, `source_quality`

## 4. Protocolos de integridad y confiabilidad (mandatorio)

1. **Redundancia N+1** de servidores RHEL (hot/standby) + failover con watchdog.
2. **Sincronización de tiempo NTP/PTP** — crítica para fusión de tracks y precisión del timestamp RID.
3. **Validación de datos** en ingesta: rangos, plausibilidad cinemática, campos de exactitud obligatorios; descarte/flag de tracks fuera de tolerancia.
4. **Registro y auditoría**: grabación de presentación (ya existe `.webm` + logs), bitácora inmutable de eventos y comandos para investigación.
5. **Seguridad**: TLS en todos los enlaces; **mTLS** para USS-to-USS (F3548); RBAC (ya hay roles); LAN aislada (según manuales).
6. **Monitoreo de salud**: estado de fuentes, latencia, cobertura, pérdida de track (ya hay "TRACK EXTERNO PERDIDO").
7. **Determinismo de presentación**: sin datos simulados en producción; banderas de calidad/edad de dato visibles en pantalla.

## 5. Fases de desarrollo (hacia la puesta en marcha)

### Fase 0 — Definición y entorno (ahora, sin hardware)
- Cerrar arquitectura y **especificación de mapeo CAT021 ⇄ F3411**.
- Plan de aprovisionamiento RHEL (contenedores Podman), repos y CI.

### Fase 1 — Núcleo de track/fusión
- Extraer `engine.ts` a un **servicio de track autónomo** con el modelo unificado.
- Pruebas unitarias de fusión, conformance, STCA con el nuevo modelo.

### Fase 2 — Adaptadores de ingesta
- **Parser/emisor ASTERIX CAT021** (y CAT062/CAT048 lectura).
- **Ingesta RID**: F3411 Network + ArduPilot OpenDroneID vía el puente.
- Validación y campos de exactitud.

### Fase 3 — Bus de telemetría + persistencia
- Transporte MQTT/WebSocket; sincronización de tiempo; grabación y auditoría.

### Fase 4 — Endurecimiento de la presentación
- Consola radar depurada alimentada por el servicio de track real.
- Indicadores de integridad, STCA, conformance, edad/calidad de dato.

### Fase 5 — Confiabilidad
- Redundancia, failover, NTP/PTP, monitoreo y endurecimiento de seguridad en RHEL.

### Fase 6 — Integración en equipos (al llegar el hardware)
- Despliegue en servidores RHEL, conexión de fuentes/sensores reales.
- Pruebas de aceptación en sitio (SAT) y puesta en marcha.

## 6. Checklist para cuando lleguen los equipos
- [ ] RHEL instalado y endurecido (par N+1)
- [ ] NTP/PTP operativo y verificado
- [ ] LAN aislada de vigilancia/UTM
- [ ] Servicio de track desplegado (contenedor)
- [ ] Adaptador ASTERIX CAT021 conectado a fuente real
- [ ] Adaptador RID (F3411 + OpenDroneID) probado con dron real
- [ ] Consola radar validada contra datos reales
- [ ] Grabación/auditoría y monitoreo activos
- [ ] SAT firmado
