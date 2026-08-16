# Protocolo de Operación UAS — Contrato técnico entre sistemas

> Contrato de comunicación de los procesos globales entre **USS** (uascontrol.io),
> **CISP · DGAC = ANSP** y **CONDOR**. Deriva de la máquina de estados del ciclo de vida
> de una operación (ver diagrama del modelo). **Borrador v0.1 — para revisión.**

## 0. Actores y alcance

| Actor | Rol | Sistema |
|---|---|---|
| **Operador / Piloto** | Crea el plan, activa despegue, marca aterrizado | Cliente de uascontrol.io |
| **USS** | *UAS Service Supplier* — **ejecuta todo** y genera los protocolos de administración | **uascontrol.io** |
| **CISP · DGAC = ANSP** | Función **indelegable**: fuente de verdad legal/admin/operacional + autoridad | DGAC (único concepto aprobado en Chile) |
| **CONDOR** | Control de sector + monitor de vigilancia en vivo | Plataforma CONDOR |
| **enae.cl** | Provee pilotos y credenciales (habilitaciones) | LMS ENAE |

> **Regla de oro:** el USS hace el trabajo; el CISP **valida y autoriza**. Ningún protocolo del
> USS sustituye la función indelegable del ANSP.

## 1. Máquina de estados canónica

Tokens de máquina (inglés) ↔ estado del diagrama (español):

| `status` | Estado | Dueño | Transiciona a |
|---|---|---|---|
| `DRAFT` | Planificación | USS | `SUBMITTED`, `CANCELLED` |
| `SUBMITTED` | Enviada | USS | `EVALUATING` |
| `EVALUATING` | Evaluación (compuerta) | USS | `AUTHORIZED`, `UNDER_REVIEW` |
| `AUTHORIZED` | Autorizada (inmediata) | USS | `ACCEPTED` |
| `UNDER_REVIEW` | En revisión | USS | `ESCALATED` |
| `ESCALATED` | Escalada al ANSP | CISP/DGAC | `PRE_APPROVED`, `REJECTED` |
| `PRE_APPROVED` | Pre-aprobada | CISP/DGAC | `SECTOR_REVIEW` |
| `SECTOR_REVIEW` | Control de Sector | CISP/DGAC | `ACCEPTED` (A), `REJECTED` (B), `NEGOTIATING` (C) |
| `NEGOTIATING` | Negocia (hora/fecha/alturas) | CISP/DGAC ⇄ USS | `SUBMITTED` (reingresa) |
| `ACCEPTED` | Aceptada | USS | `ACTIVE`, `CANCELLED` |
| `ACTIVE` | Activa (despegue notificado) | USS | `IN_FLIGHT`, `LANDED` |
| `IN_FLIGHT` | En vuelo (monitor) | USS/CONDOR | `LANDED` |
| `LANDED` | Aterrizada (cierre) | USS | — (terminal) |
| `REJECTED` | Rechazada | CISP/DGAC | — (terminal) |
| `CANCELLED` | Cancelada | USS | — (terminal) |

**Regla:** solo el dueño del estado puede emitir su transición de salida. `prioridad` (`IMMEDIATE`
| `DOT`) es un atributo asignado por el ANSP en `ESCALATED`, no un estado.

## 2. Modelo de datos: la Operación

Objeto canónico compartido (subset relevante):

```json
{
  "operation_id": "uuid",
  "uss_id": "uascontrol",
  "status": "SUBMITTED",
  "priority": "DOT",                      // IMMEDIATE | DOT
  "dof": "2026-09-14",                    // date of flight
  "operator": {
    "name": "…",
    "certificates": ["AOC-1521", "CEO", "AEBEO"]
  },
  "zones": [ { "id": "…", "geometry": { "type": "Polygon", "coordinates": [] },
              "floor_m": 0, "ceiling_m": 120 } ],
  "missions": [ { "id": "…", "type": "BVLOS|VLOS", "window": ["ISO", "ISO"] } ],
  "aircraft": [ { "reg": "…", "mtom_kg": 0, "remote_id": "…" } ],
  "pilots": [ { "id": "…", "credential": "…", "credential_source": "enae.cl" } ],
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```

Historia de estados: cada transición se registra en un `operation_events[]` inmutable
(auditoría legal — importante por la función indelegable del ANSP).

## 3. Contrato de mensajes

### 3.1 Envelope común

Todos los mensajes usan el mismo sobre y van **firmados** (§7):

```json
{
  "event": "operation.submitted",
  "event_id": "uuid",                 // idempotencia
  "occurred_at": "ISO8601",
  "operation_id": "uuid",
  "actor": "uss:uascontrol",          // uss:* | ansp:dgac | condor | operator | pilot
  "correlation_id": "uuid",           // agrupa toda la vida de la operación
  "data": { }
}
```

### 3.2 Eventos por transición

| Evento | Emisor → Receptor | Endpoint (en receptor) | Efecto |
|---|---|---|---|
| `operation.submitted` | Operador → USS | `POST /v1/operations` | `DRAFT→SUBMITTED` |
| `cisp.validate` (req/resp) | USS → CISP | `POST /v1/cisp/validate` | consulta síncrona (§4) |
| `operation.authorized` | USS → Operador | webhook | `EVALUATING→AUTHORIZED→ACCEPTED` |
| `operation.under_review` | USS → Operador | webhook | `EVALUATING→UNDER_REVIEW` |
| `operation.escalated` | USS → CISP/ANSP | `POST /v1/ansp/escalations` | `UNDER_REVIEW→ESCALATED` |
| `ansp.priority_set` | ANSP → USS | webhook | fija `priority` (`IMMEDIATE`\|`DOT`) |
| `ansp.pre_approved` | ANSP → CONDOR | `POST /v1/condor/sector-tasks` | `ESCALATED→PRE_APPROVED→SECTOR_REVIEW` |
| `sector.decision` | CONDOR → USS + ANSP | webhook | `A→ACCEPTED` \| `B→REJECTED` \| `C→NEGOTIATING` |
| `operation.renegotiated` | USS → CISP/ANSP | `POST /v1/ansp/escalations` | `NEGOTIATING→SUBMITTED` (con propuesta nueva) |
| `coordination.requested` | USS **y** CISP → 3ros | `POST /v1/coordination` | paralelo, **no bloqueante** (§5) |
| `operation.activated` | Operador → USS → CONDOR | `POST /v1/condor/activations` | `ACCEPTED→ACTIVE` (notificación despegue) |
| `telemetry.position` | CONDOR (stream) | canal en vivo | `ACTIVE→IN_FLIGHT` mientras haya señal (§6) |
| `operation.landed` | Piloto → USS → CONDOR | webhook | `IN_FLIGHT→LANDED` (cierre) |
| `operation.cancelled` | Operador → USS | `POST /v1/operations/{id}/cancel` | `*→CANCELLED` |

### 3.3 Ejemplos de payload

**`sector.decision` (caso C — negocia):**
```json
{
  "event": "sector.decision", "actor": "condor",
  "operation_id": "…", "correlation_id": "…",
  "data": {
    "decision": "NEGOTIATE",                 // APPROVE | REJECT | NEGOTIATE
    "controller": { "role": "SUPERVISOR", "id": "…" },
    "counter_proposal": { "time": "ISO", "date": "2026-09-15", "ceiling_m": 90 },
    "reason": "conflicto con tráfico tripulado en ventana solicitada"
  }
}
```

**`operation.activated`:**
```json
{
  "event": "operation.activated", "actor": "operator",
  "operation_id": "…", "correlation_id": "…",
  "data": { "takeoff_at": "ISO8601", "telemetry_channel": "op/<id>/telemetry" }
}
```

## 4. Validación contra el CISP (síncrona)

En `EVALUATING`, el USS **consulta** al CISP antes de autorizar. Es la aplicación de la
función indelegable: el USS no decide sobre datos propios, valida contra la autoridad.

`POST /v1/cisp/validate` → request: `{ zones, missions, aircraft, pilots, window }`
respuesta:
```json
{
  "verdict": "CLEAR | REVIEW | BLOCKED",
  "checks": {
    "zones": "ok",
    "restrictions": [ { "id":"…", "type":"PROHIBIDA", "hit": true } ],
    "notam": [ "…" ],
    "traffic": "ok",
    "priority_hint": "DOT",
    "credentials": { "pilot:…": "valid" }
  },
  "requires_escalation": true
}
```
- `CLEAR` → USS puede `AUTHORIZED`.
- `REVIEW`/`requires_escalation` → USS pasa a `UNDER_REVIEW` y emite `operation.escalated`.
- `BLOCKED` → rechazo temprano (restricción dura).

## 5. Coordinación con terceros (paralela, NO bloqueante)

Doble compuerta: **USS y CISP** pueden emitir `coordination.requested` hacia FFAA,
policías/gendarmería, CONAF, Dirección de Fronteras, municipios, zona del vuelo, otros USS.

```json
{
  "event": "coordination.requested", "actor": "uss:uascontrol | ansp:dgac",
  "operation_id": "…",
  "data": {
    "recipients": ["FFAA","CONAF","MUNI:…"],
    "channel": ["email","sms","condor"],
    "blocking": false,                       // SIEMPRE false — no frena el despegue
    "flight_snapshot": { "aircraft": ["…"], "window": ["ISO","ISO"], "zones": ["…"] }
  }
}
```
- **No** transiciona la operación. La activación (`ACTIVE`) **no espera** su respuesta.
- Las respuestas se registran como `coordination.ack` (acuse) para trazabilidad.
- Objetivo: **coordinación expedita y automatizable** (email/SMS/plataforma CONDOR con
  información de aeronaves volando en tiempo real).

## 6. Telemetría y monitoreo en vivo

Al `operation.activated`, si hay señal, la posición se transmite hasta el aterrizaje.

- **Canal:** stream por operación (WebSocket o MQTT; en el stack actual, Supabase Realtime
  es una opción para el MVP). Tema/topic: `op/<operation_id>/telemetry`.
- **Fuente de vigilancia CONDOR:** ASTERIX **CAT021** (Remote ID/ADS-B) → modelo de track
  unificado, reutilizando lo definido en `CONDOR-UTM-plan-desarrollo.md`.
- **Payload `telemetry.position`:** `{ ts, lat, lon, alt_m, gs, track, src }`.
- Pérdida de señal → estado de pista `LOST` en el monitor (no cambia el `status` de la
  operación por sí solo).

## 7. Autenticación y seguridad entre servicios

| Capa | Mecanismo |
|---|---|
| Identidad de servicio | **OAuth2 client-credentials** por sistema (`uss`, `ansp`, `condor`) → token de acceso de vida corta |
| Integridad del mensaje | **Firma HMAC-SHA256** por request (header `X-Signature: ts=…;h1=…`), igual patrón que el webhook de pagos ya implementado |
| Transporte | **TLS** obligatorio; **mTLS** recomendado en el enlace con DGAC (autoridad) |
| Idempotencia | Header `Idempotency-Key: <event_id>` — receptor descarta duplicados |
| Correlación | `correlation_id` por operación en todo su ciclo (auditoría) |
| Autorización | El receptor valida que el `actor` tenga permiso para la transición (solo el dueño del estado la emite) |

## 8. Transporte, reintentos e idempotencia

- **REST + webhooks** JSON sobre HTTPS para eventos; **stream** aparte para telemetría.
- Reintentos con backoff exponencial ante 5xx; el receptor **debe** ser idempotente por `event_id`.
- Toda transición se persiste en un log inmutable `operation_events` (fuente de auditoría legal).

## 9. Preguntas abiertas (para cerrar el contrato)

1. **Frontera exacta USS ↔ CONDOR:** ¿CONDOR es "brazo" del ANSP (recibe `pre_approved` y
   ejecuta el control de sector) o un sistema independiente que también valida contra el CISP?
2. **CISP real:** ¿la DGAC ya expone un servicio de información (API) o el CISP se modela
   inicialmente dentro de CONDOR hasta que exista el endpoint oficial?
3. **Identidad de pilotos:** ¿enae.cl expone las credenciales como servicio para el check de
   `credentials`, o se sincronizan a uascontrol.io?
4. **DOF / prioridad:** reglas de negocio de `IMMEDIATE` vs `DOT` (ventanas, plazos).
5. **Persistencia compartida:** ¿un `operation_id` único global entre los tres sistemas, o
   cada uno mantiene su id y se mapea por `correlation_id`?

---

*Borrador v0.1 · basado en el modelo de estados validado (USS ejecuta · DGAC=ANSP indelegable ·
coordinación paralela no bloqueante). Iterar antes de bajar a implementación.*
