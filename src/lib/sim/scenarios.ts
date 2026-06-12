import type { Scenario } from './engine';

// Escenario 1 — BVLOS minero, sector Calama (entorno tipo faena)
// Tres vuelos simultáneos: inspección de línea (BVLOS largo), mapeo de rajo,
// y un vuelo que sufrirá pérdida C2 con deriva fuera de zona (ejercicio de conformance).

const Z_FAENA: [number, number][] = [
  [-68.97, -22.42],
  [-68.83, -22.42],
  [-68.83, -22.52],
  [-68.97, -22.52],
  [-68.97, -22.42],
];

const Z_LINEA: [number, number][] = [
  [-69.02, -22.36],
  [-68.78, -22.36],
  [-68.78, -22.40],
  [-69.02, -22.40],
  [-69.02, -22.36],
];

const Z_PROHIB: [number, number][] = [
  [-68.92, -22.30],
  [-68.86, -22.30],
  [-68.86, -22.34],
  [-68.92, -22.34],
  [-68.92, -22.30],
];

export const SCENARIO_BVLOS_CALAMA: Scenario = {
  id: 'bvlos-calama',
  name: 'BVLOS FAENA CALAMA — CONFORMANCE',
  center: [-68.89, -22.43],
  rangeNm: 12,
  briefing:
    'Tres operaciones UAS simultáneas en sector de faena. CND01 realiza mapeo del rajo dentro de la zona segregada SUR. ' +
    'CND02 inspecciona la línea de transmisión en la zona NORTE (BVLOS 12 NM). CND03 sufrirá pérdida de enlace C2 a los ' +
    '90 segundos y derivará fuera de su zona: el alumno debe detectar el desvío, declarar la contingencia y coordinar el RTH.',
  zones: [
    { id: 'ZS1', name: 'SEGREGADA SUR (FAENA)', ring: Z_FAENA, floor: 0, ceiling: 120, kind: 'SEGREGATED' },
    { id: 'ZS2', name: 'SEGREGADA NORTE (LÍNEA)', ring: Z_LINEA, floor: 0, ceiling: 90, kind: 'SEGREGATED' },
    { id: 'ZP1', name: 'PROHIBIDA SC P-12', ring: Z_PROHIB, floor: 0, ceiling: 999, kind: 'PROHIBITED' },
  ],
  flights: [
    {
      callsign: 'CND01',
      acType: 'M350',
      speedKt: 30,
      batteryMin: 40,
      startT: 5,
      authRef: 'UAS-26-0101',
      zoneId: 'ZS1',
      route: [
        { lat: -22.50, lng: -68.95, alt: 0 },
        { lat: -22.47, lng: -68.94, alt: 100 },
        { lat: -22.44, lng: -68.90, alt: 100 },
        { lat: -22.47, lng: -68.86, alt: 100 },
        { lat: -22.50, lng: -68.88, alt: 80 },
        { lat: -22.50, lng: -68.95, alt: 0 },
      ],
    },
    {
      callsign: 'CND02',
      acType: 'WINGTRA',
      speedKt: 45,
      batteryMin: 55,
      startT: 20,
      authRef: 'UAS-26-0102',
      zoneId: 'ZS2',
      route: [
        { lat: -22.38, lng: -69.00, alt: 0 },
        { lat: -22.38, lng: -68.90, alt: 80 },
        { lat: -22.38, lng: -68.80, alt: 80 },
        { lat: -22.385, lng: -68.90, alt: 80 },
        { lat: -22.38, lng: -69.00, alt: 0 },
      ],
    },
    {
      callsign: 'CND03',
      acType: 'M30T',
      speedKt: 35,
      batteryMin: 30,
      startT: 35,
      authRef: 'UAS-26-0103',
      zoneId: 'ZS1',
      route: [
        { lat: -22.45, lng: -68.96, alt: 0 },
        { lat: -22.43, lng: -68.92, alt: 60 },
        { lat: -22.43, lng: -68.85, alt: 60 },
        { lat: -22.45, lng: -68.96, alt: 0 },
      ],
    },
  ],
  events: [
    { t: 90, flight: 'CND03', type: 'C2LOSS', duration: 75 },
    { t: 240, flight: 'CND02', type: 'LOWBAT' },
  ],
};

export const SCENARIOS: Scenario[] = [SCENARIO_BVLOS_CALAMA];
