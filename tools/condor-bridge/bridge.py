#!/usr/bin/env python3
"""
CONDOR BRIDGE — Mission Planner / ArduPilot -> CONDOR SIM (+ uascontrol.io opcional)

Lee telemetria MAVLink (Mission Planner mirror, SITL o radio telemetria) y publica
la posicion 1 vez por segundo en:
  1) CONDOR SIM (sim.enae.cl): el dron aparece como track en la consola del
     instructor y de todos los alumnos de la sesion.
  2) uascontrol.io /api/utm/track (opcional, con --uascontrol-token): el dron
     aparece en el mapa real con verificacion de conformance.

Requisitos (una vez):  pip install pymavlink requests

Uso tipico con Mission Planner en el mismo PC:
  1. Mission Planner > presione Ctrl+F > boton "MAVLink" (mirror)
     > seleccione UDP Client, host 127.0.0.1, puerto 14551 > conectar.
  2. python bridge.py --session 47RI4 --callsign MAV01

Uso con ArduPilot SITL:
  sim_vehicle.py -v ArduCopter --out udp:IP_DEL_PC_BRIDGE:14551
  python bridge.py --session 47RI4 --callsign MAV01

El codigo de sesion es el que muestra la consola del instructor (SES XXXXX).
"""
import argparse
import json
import math
import time

import requests
from pymavlink import mavutil

SUPABASE_URL = 'https://kyoheutquvplhrtvlyfx.supabase.co'
SUPABASE_KEY = 'sb_publishable_AGSRkNIjNifsZ6pLaELJsQ_-jZSo9Ip'


def main():
    ap = argparse.ArgumentParser(description='CONDOR BRIDGE — MAVLink -> CONDOR SIM')
    ap.add_argument('--conn', default='udpin:0.0.0.0:14551',
                    help='Conexion MAVLink (default udpin:0.0.0.0:14551; tambien sirve COM5,57600 o tcp:...)')
    ap.add_argument('--session', required=True, help='Codigo de sesion CONDOR SIM (p.ej. 47RI4)')
    ap.add_argument('--callsign', default='MAV01', help='Identificativo del dron en la consola')
    ap.add_argument('--rate', type=float, default=1.0, help='Segundos entre publicaciones (default 1)')
    ap.add_argument('--uascontrol-token', default='', help='Token API de uascontrol.io (opcional)')
    ap.add_argument('--autorizacion-id', default='', help='ID de autorizacion en uascontrol.io (opcional)')
    args = ap.parse_args()

    print(f'[BRIDGE] escuchando MAVLink en {args.conn} ...')
    m = mavutil.mavlink_connection(args.conn)
    m.wait_heartbeat()
    print(f'[BRIDGE] heartbeat OK (sys {m.target_system}) — publicando como '
          f'{args.callsign.upper()} en sesion {args.session.upper()}')

    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates',
    }
    url = f'{SUPABASE_URL}/rest/v1/sim_live_tracks?on_conflict=session_code,callsign'

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

        row = {
            'session_code': args.session.upper(),
            'callsign': args.callsign.upper(),
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
                'callsign': args.callsign.upper(),
                'lat': lat, 'lng': lng, 'alt_m': round(alt),
            }
            if args.autorizacion_id:
                body['autorizacion_id'] = int(args.autorizacion_id)
            try:
                r2 = requests.post('https://uascontrol.io/api/utm/track', json=body, timeout=4)
                uas_st = f' | uascontrol {r2.status_code}'
            except Exception as e:
                uas_st = f' | uascontrol ERR {e}'

        print(f'[BRIDGE] {args.callsign.upper()} {lat:.5f},{lng:.5f} {alt:.0f}m '
              f'{spd:.0f}kt bat {bat}% -> sim {sim_st}{uas_st}')


if __name__ == '__main__':
    main()
