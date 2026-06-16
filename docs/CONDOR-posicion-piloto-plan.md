# CONDOR SIM — Posición de PILOTO (Remote Pilot Station) · Plan de desarrollo

> Nueva posición operativa: el **piloto remoto** comanda su(s) UAS, cerrando el
> lazo con la posición de CONTROL (radar) y AFTN. Hoy el sim tiene roles
> instructor / controlador / AFTN; el piloto es el rol que falta para un ejercicio
> completo de gestión de tránsito.

## 0. Por qué
En un ejercicio realista el **controlador** vigila/coordina pero **no vuela** el dron;
quien sube/baja/mueve la aeronave es el **piloto remoto**. Sin esta posición, las
instrucciones del controlador (CPDLC: "CLIMB 120M", "HOLD", "RTH") no tienen quién
las ejecute. La posición de piloto cierra el lazo CONTROL ⇄ PILOTO.

## 1. Comandos de control del UAS (base funcional)
Comandos estándar de una estación de pilotaje remoto (C2):

| Grupo | Comando | Efecto en la aeronave |
|---|---|---|
| **Vertical** | SUBIR / BAJAR (a nivel, o ± pasos) | cambia altitud objetivo |
| **Lateral** | VIRAR IZQ / DER, FIJAR RUMBO, DIRECTO A WP | cambia rumbo/curso |
| **Velocidad** | AUMENTAR / REDUCIR | cambia velocidad objetivo |
| **Modo de vuelo** | HOLD/LOITER, REANUDAR (seguir ruta), RTH, ATERRIZAR, DESPEGAR | modo de navegación |
| **Contingencia** | DECLARAR EMERGENCIA, REPORTAR BAJA BATERÍA, (simular) PÉRDIDA C2 | inyecta estado |
| **Coordinación** | ACUSAR INSTRUCCIÓN (CPDLC), REPORTAR POSICIÓN | mensajería con control |

## 2. Arquitectura (reutiliza lo existente)
- **Rol nuevo `pilot`** en el lobby (junto a `controller` y `aftn`). El piloto se
  une a la sesión y se le asigna una o más aeronaves (su operación).
- **Flujo de comandos** (igual que `studentAction`): el piloto inserta el comando en
  `sim_actions` (Supabase) → el puesto **instructor** (que corre el motor) lo aplica
  a la aeronave → el estado se publica → todas las posiciones ven el resultado.
- **Motor**: hoy cada dron sigue una ruta fija de waypoints. Para pilotaje se añade un
  estado de comando por traza:
  `cmd?: { mode: 'ROUTE'|'HOLD'|'MANUAL'|'RTH'; hdgTgt?; altTgt?; spdTgt? }`.
  `step()` honra `cmd` antes que la ruta (MANUAL/HOLD/RTH sobre-escriben la navegación).
- **Pantalla del piloto**: vista simplificada centrada en su(s) dron(es) — mapa con su
  aeronave + panel de comandos grande (botonera). Puede reusar el canvas del radar en
  modo "piloto" (zoom a su dron, CSEL/seguir) + un panel lateral de comandos.

## 3. Lazo CONTROL ⇄ PILOTO (el valor del ejercicio)
1. El **controlador** envía instrucción por **CPDLC** (ya existe el uplink): "CLIMB 120M".
2. El **piloto** la recibe en su bandeja → **ACUSA** y **EJECUTA** (toca SUBIR a 120 m).
3. El motor cambia la altitud → el controlador ve el cumplimiento en la etiqueta.
4. Si el piloto no cumple en X s → el controlador puede reiterar / declarar contingencia.

## 4. Fases de implementación
- **P1 — Rol y pantalla:** agregar rol `pilot` al lobby; pantalla con el/los dron(es)
  asignados y la botonera de comandos (sin efecto aún). *(≈1 bloque)*
- **P2 — Comandos al motor:** estado `cmd` en el motor + `applyPilotCommand`
  (SET_ALT / SET_HDG / SET_SPD / HOLD / RESUME / RTH / LAND); el piloto los emite por
  `sim_actions` y el instructor los aplica. *(núcleo)*
- **P3 — Lazo CPDLC:** el piloto recibe las instrucciones del controlador, las acusa y
  ejecuta; el controlador ve el cumplimiento. *(cierra el lazo)*
- **P4 — Contingencias desde el piloto:** declarar emergencia / baja batería / pérdida
  C2 simulada desde la posición de piloto.
- **P5 — Avanzado:** múltiples drones por piloto, autonomía/batería real por aeronave,
  telemetría enriquecida, integración con el puente Remote ID (un piloto real con
  Mission Planner publica como una posición de piloto).

## 5. Evaluación (integra con la rúbrica existente)
Las acciones del piloto quedan en `sim_actions` → se pueden evaluar: tiempo de
respuesta a instrucciones, cumplimiento de niveles, gestión de contingencia.

## 6. Decisiones a confirmar antes de P1
- ¿El piloto controla **un** dron (más simple) o **varios** desde el inicio?
- ¿Pantalla del piloto = radar reusado en modo piloto, o panel dedicado más simple?
- ¿Los comandos son **directos** (toca SUBIR y sube) o requieren **clearance** del
  controlador (más realista, más fricción)?
