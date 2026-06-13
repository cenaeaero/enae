CONDOR BRIDGE — Mission Planner / ArduPilot -> CONDOR SIM
=========================================================
Publica la posicion de un dron en la consola del instructor de sim.enae.cl
(tabla sim_live_tracks en Supabase -> Realtime -> radar del instructor, prune 20 s).

------------------------------------------------------------------
PRUEBA RAPIDA SIN MISSION PLANNER (dron fantasma)  <-- empezar por aca
------------------------------------------------------------------
1) Instalar dependencia (una vez):
       pip install requests
2) En sim.enae.cl: entrar como INSTRUCTOR y crear sesion. Anotar el codigo SES (5 chars).
3) Correr (reemplazar ABC12 por tu codigo):
       python bridge.py --session ABC12 --callsign GHOST --fake
4) En la consola del instructor debe aparecer "GHOST" volando un circulo sobre la
   faena Calama y el log "GHOST TRACK EXTERNO CONECTADO (MISSION PLANNER)".
   Mover el centro:   --center -33.45,-70.66   |   radio:  --radius 500
   Cortar con Ctrl+C (la consola lo marca PERDIDO a los 20 s sin datos).

Esto valida todo el pipeline (Supabase + Realtime + radar) antes de tocar telemetria real.

------------------------------------------------------------------
MODO REAL — Mission Planner (mismo PC)
------------------------------------------------------------------
1) Instalar dependencias (una vez):
       pip install pymavlink requests
2) Mission Planner > Ctrl+F > boton "MAVLink" > UDP Client, host 127.0.0.1,
   puerto 14551 > Connect.   (esto crea un "mirror" de la telemetria)
3) Correr:
       python bridge.py --session ABC12 --callsign MAV01
   Espera "heartbeat OK" y luego publica 1 vez/seg.

MODO REAL — ArduPilot SITL (otro PC o el mismo)
       sim_vehicle.py -v ArduCopter --out udp:IP_DEL_PC_BRIDGE:14551
       python bridge.py --session ABC12 --callsign MAV01

------------------------------------------------------------------
OPCIONAL — reflejar tambien en uascontrol.io (mapa real)
------------------------------------------------------------------
   python bridge.py --session ABC12 --callsign MAV01 \
       --uascontrol-token TU_TOKEN --autorizacion-id 123

------------------------------------------------------------------
Notas
------------------------------------------------------------------
- El track se identifica por (session_code, callsign): reenviar la misma combinacion
  ACTUALIZA la fila (no crea duplicados).
- Si "GHOST" no aparece: revisar que el codigo SES sea el correcto y que la sesion
  del instructor siga abierta (la suscripcion filtra por session_code).
- Las 3 vars de Supabase del sim ya estan en el codigo del bridge (publishable key,
  solo escribe en sim_live_tracks con RLS abierto).
