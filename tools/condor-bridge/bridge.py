#!/usr/bin/env python3
"""
CONDOR BRIDGE — Mission Planner / ArduPilot -> CONDOR SIM (+ uascontrol.io opcional)

Lee telemetria MAVLink (Mission Planner mirror, SITL o radio telemetria) y publica
la posicion 1 vez por segundo en:
  1) CONDOR SIM (sim.enae.cl): el dron aparece como track en la consola del
     instructor y de todos los alumnos de la sesion.
  2) uascontrol.io /api/utm/track (opcional, con --uascontrol-token): el dron
     aparece en el mapa real con verificacion de conformance.

Requisitos:
  - Modo real (Mission Planner/SITL):  pip install pymavlink requests
  - Modo demo (--fake, sin telemetria): pip install requests

Uso tipico con Mission Planner en el mismo PC:
  1. Mission Planner > presione Ctrl+F > boton "MAVLink" (mirror)
     > seleccione UDP Client, host 127.0.0.1, puerto 14551 > conectar.
  2. python bridge.py --session 47RI4 --callsign MAV01

Uso con ArduPilot SITL:
  sim_vehicle.py -v ArduCopter --out udp:IP_DEL_PC_BRIDGE:14551
  python bridge.py --session 47RI4 --callsign MAV01

Prueba SIN Mission Planner (dron fantasma para verificar la consola):
  python bridge.py --session 47RI4 --callsign GHOST --fake
  (vuela un circulo alrededor del centro; usa --center LAT,LNG para moverlo)

El codigo de sesion es el que muestra la consola del instructor (SES XXXXX).
"""
import argparse
import json
import math
import time

import requests

SUPABASE_URL = 'https://kyoheutquvplhrtvlyfx.supabase.co'
SUPABASE_KEY = 'sb_publishable_AGSRkNIjNifsZ6pLaELJsQ_-jZSo9Ip'


def make_publisher(args):
    """Devuelve una funcion publish(lat,lng,alt,hdg,spd,bat) que sube el track
    a CONDOR SIM (y opcionalmente a uascontrol.io)."""
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates',
    }
    url = f'{SUPABASE_URL}/rest/v1/sim_live_tracks?on_conflict=session_code,callsign'
    cs = args.callsign.upper()
    ses = args.session.upper()

    def publish(lat, lng, alt, hdg, spd, bat):
        row = {
            'session_code': ses,
            'callsign': cs,
            'lat': lat, 'lng': lng,
            'alt_m': round(alt), 'hdg': round(hdg),
            'speed_kt': round(spd), 'battery_pct': bat,
            'updated_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
        }
        try:
            r = requests.post(url, headers=headers, data=json.dumps(row), timeout=4)
            sim_st = 'OK' if r.status_code in (200, 201, 204) else f'ERR {r.status_code} {r.text[:80]}'
        except Exception as e:
            sim_st = f'ERR {e}'

        uas_st = ''
        if args.uascontrol_token:
            body = {
                'token': args.uascontrol_token,
                'callsign': cs,
                'lat': lat, 'lng': lng, 'alt_m': round(alt),
            }
            if args.autorizacion_id:
                body['autorizacion_id'] = int(args.autorizacion_id)
            try:
                r2 = requests.post('https://uascontrol.io/api/utm/track', json=body, timeout=4)
                uas_st = f' | uascontrol {r2.status_code}'
            except Exception as e:
                uas_st = f' | uascontrol ERR {e}'

        print(f'[BRIDGE] {cs} {lat:.5f},{lng:.5f} {alt:.0f}m '
              f'{spd:.0f}kt bat {bat}% -> sim {sim_st}{uas_st}')

    return publish


def run_fake(args, publish):
    """Dron sintetico: vuela un circulo alrededor de --center, sin MAVLink.
    Sirve para verificar que la consola del instructor recibe y dibuja el track."""
    try:
        clat, clng = (float(x) for x in args.center.split(','))
    except Exception:
        raise SystemExit('--center debe ser LAT,LNG (p.ej. -22.4727,-68.8809)')

    radius_m = max(50.0, args.radius)
    # metros -> grados (aprox): 1 grado lat ~ 111320 m; lng escala por cos(lat)
    dlat = radius_m / 111320.0
    dlng = radius_m / (111320.0 * math.cos(math.radians(clat)) or 1e-6)
    alt = 80.0          # m AGL
    bat = 100           # %
    period_s = 120.0    # da una vuelta cada 2 min
    t0 = time.time()
    print(f'[BRIDGE] MODO FAKE: dron "{args.callsign.upper()}" volando circulo '
          f'r={radius_m:.0f} m sobre {clat:.4f},{clng:.4f} en sesion {args.session.upper()}')
    while True:
        t = time.time() - t0
        ang = 2 * math.pi * (t / period_s)
        lat = clat + dlat * math.cos(ang)
        lng = clng + dlng * math.sin(ang)
        # rumbo = tangente al circulo (sentido horario), en grados 0-360
        hdg = (math.degrees(ang) + 90) % 360
        spd = 2 * math.pi * radius_m / period_s * 1.94384  # m/s -> kt
        bat = max(15, 100 - int(t / 30))  # baja ~1% cada 30 s, piso 15
        publish(lat, lng, alt, hdg, spd, bat)
        time.sleep(max(0.2, args.rate))


def run_mavlink(args, publish):
    from pymavlink import mavutil  # import diferido: el modo fake no lo necesita
    print(f'[BRIDGE] escuchando MAVLink en {args.conn} ...')
    m = mavutil.mavlink_connection(args.conn)
    m.wait_heartbeat()
    print(f'[BRIDGE] heartbeat OK (sys {m.target_system}) — publicando como '
          f'{args.callsign.upper()} en sesion {args.session.upper()}')

    lat = lng = None
    alt = hdg = spd = 0.0
    bat = 100
    last_pub = 0.0

    while True:
        msg = m.recv_match(blocking=True, timeout=5)
        if msg is None:
            continue
        t = msg.get_type()
        if t == 'GLOBAL_POSITION_INT':
            lat = msg.lat / 1e7
            lng = msg.lon / 1e7
            alt = msg.relative_alt / 1000.0
            hdg = msg.hdg / 100.0 if msg.hdg != 65535 else hdg
            spd = math.hypot(msg.vx, msg.vy) / 100.0 * 1.94384  # m/s -> kt
        elif t == 'SYS_STATUS' and getattr(msg, 'battery_remaining', -1) >= 0:
            bat = msg.battery_remaining

        now = time.time()
        if lat is None or now - last_pub < args.rate:
            continue
        last_pub = now
        publish(lat, lng, alt, hdg, spd, bat)


def main():
    ap = argparse.ArgumentParser(description='CONDOR BRIDGE — MAVLink -> CONDOR SIM')
    ap.add_argument('--conn', default='udpin:0.0.0.0:14551',
                    help='Conexion MAVLink (default udpin:0.0.0.0:14551; tambien sirve COM5,57600 o tcp:...)')
    ap.add_argument('--session', required=True, help='Codigo de sesion CONDOR SIM (p.ej. 47RI4)')
    ap.add_argument('--callsign', default='MAV01', help='Identificativo del dron en la consola')
    ap.add_argument('--rate', type=float, default=1.0, help='Segundos entre publicaciones (default 1)')
    ap.add_argument('--uascontrol-token', default='', help='Token API de uascontrol.io (opcional)')
    ap.add_argument('--autorizacion-id', default='', help='ID de autorizacion en uascontrol.io (opcional)')
    # modo demo sin telemetria
    ap.add_argument('--fake', action='store_true',
                    help='Demo: genera un dron sintetico en movimiento (sin MAVLink/Mission Planner)')
    ap.add_argument('--center', default='-22.4727,-68.8809',
                    help='Centro LAT,LNG para --fake (default: faena Calama)')
    ap.add_argument('--radius', type=float, default=300.0, help='Radio del circulo en metros para --fake')
    args = ap.parse_args()

    publish = make_publisher(args)
    try:
        if args.fake:
            run_fake(args, publish)
        else:
            run_mavlink(args, publish)
    except KeyboardInterrupt:
        print('\n[BRIDGE] detenido')


if __name__ == '__main__':
    main()
