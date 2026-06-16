# CONDOR UTM — Plan de construcción del sistema de producción (Linux)

> Del sistema de **visualización** (CONDOR SIM) al sistema **operativo de producción**.
> Reutiliza casi todo lo construido. Configuración elegida: **1 servidor primario ahora**
> (2º standby especificado), **sala de 4+ puestos**, **área acotada (1 aeródromo/faena)**.

## 0. Decisiones de arquitectura
| Tema | Decisión | Motivo |
|---|---|---|
| Sistema operativo | **Rocky Linux 9** (dev/operación); **RHEL 9** para el despliegue certificado | Binario-compatible con RHEL (de los manuales), gratuito; RHEL con soporte para óptica DGAC |
| Contenedores | **Podman** (rootless) + podman-compose; k3s opcional para HA | Nativo RHEL, seguro |
| Presentación (CWP) | Consola Next.js del sim, **auto-alojada** (nginx + Node) | Reutiliza el sim; sale de Vercel a infraestructura propia |
| Bus de datos | **Supabase auto-alojado** (Postgres + Realtime, en Podman) | Cero cambio de código (el sim ya usa Supabase) |
| Servicio de track/fusión | `engine.ts` extraído a servicio Node | Reutiliza el motor; ingiere dato real |
| Ingesta | Remote ID (puente ArduPilot + sensores BLE/Wi-Fi) + ADS-B (SDR→CAT021) | `condor-bridge` ya existe |
| Núcleo UTM | UASCONTROL (Laravel): zonas, autorizaciones, NOTAM, FPL, conformance | Ya construido |
| AFTN | AFTN Station | Ya construida |
| Tiempo | NTP estrato-1 con GPS (PTP a futuro) | Crítico para fusión y timestamps RID |

## 1. Modelo de datos unificado (track)
Base **ASTM F3411 (Remote ID) ⇄ ASTERIX CAT021 (ADS-B)** → un solo `TrackState` (evolución
del de `engine.ts`) con: Basic ID, Location/Vector, Accuracy, Operator, Self-ID, Op-status,
y `source ∈ {RID-NET, RID-BCAST, ADS-B, MP}` + calidad/edad del dato (ya implementado en la consola).

## 2. Fases de software (en paralelo con la compra de hardware)
**Fase 0 — Entorno (ahora, en VM/PC de desarrollo, sin esperar hardware)**
- Instalar Rocky Linux 9 + Podman + podman-compose.
- Auto-alojar **Supabase** (stack oficial en contenedores) y migrar el esquema del sim.
- Desplegar la **consola** (Next.js) detrás de nginx con TLS.
- Repos + CI; respaldo de configuración.

**Fase 1 — Núcleo de track + ingesta**
- Extraer `engine.ts` a **servicio de track** (Node) con el modelo unificado.
- **Adaptador Remote ID**: `condor-bridge` (ArduPilot OpenDroneID) + receptor BLE/Wi-Fi → CAT021.
- **Adaptador ADS-B**: receptor SDR (dump1090) → CAT021 → servicio de track.
- Validación de datos (rangos, plausibilidad, campos de exactitud).

**Fase 2 — Núcleo UTM + AFTN + grabación**
- Integrar **UASCONTROL** (autorizaciones/zonas/NOTAM/FPL/conformance) consumiendo el track.
- **AFTN Station** integrada.
- Grabación/auditoría (ya hay `.webm` + logs); bitácora inmutable.
- **NTP estrato-1** operativo.

**Fase 3 — Endurecimiento**
- Seguridad: TLS en todo, **mTLS** USS-to-USS (F3548), RBAC (ya hay roles), **LAN aislada** de vigilancia.
- Monitoreo: Prometheus + Grafana (salud de fuentes, latencia, pérdida de track).
- Respaldos y plan de recuperación.

**Fase 4 — Integración en el servidor real (al llegar el hardware)**
- Desplegar en el servidor primario; conectar sensores reales.
- Pruebas de aceptación en sitio (SAT) en el aeródromo/faena.

**Fase 5 — Alta disponibilidad**
- Segundo servidor **N+1 hot-standby** + failover con watchdog; sincronización de estado.

## 3. Topología (área acotada, sala 4+ puestos)
```
[Sensores RID BLE/Wi-Fi] ┐
[ArduPilot/GCS (bridge)] ─┤→ LAN AISLADA VIGILANCIA → [SERVIDOR CONDOR]
[Receptor ADS-B (SDR)]   ┘                              ├ Supabase (Postgres/Realtime)
                                                        ├ Servicio de track/fusión
                                                        ├ Núcleo UTM (UASCONTROL) + AFTN
                                                        └ Consola (nginx/Node)
                          [NTP GPS estrato-1] ──────────┘
[Switch gestionable VLAN] ── [4+ PUESTOS: PC + monitor grande (navegador → consola)]
[Firewall] [UPS]  (2º servidor standby: especificado/presupuestado)
```

## 4. Qué empezar HOY
- **Software:** Fase 0 en una VM/PC (instalar Rocky+Podman, auto-alojar Supabase, desplegar la consola).
- **Hardware:** cotizar/comprar según la **lista de compras** (`CONDOR-produccion-BOM.md`).
- No hay dependencia entre ambos hasta la Fase 4 (integración).
