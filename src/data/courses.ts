export type Session = {
  dates: string;
  location: string;
  modality: string;
  fee?: string;
};

export type Course = {
  id: string;
  code?: string;
  title: string;
  description: string;
  area: string;
  areaSlug: string;
  subarea?: string;
  level: string;
  duration: string;
  modality: "Presencial" | "Híbrido" | "Online";
  locations: string[];
  dates: string[];
  image?: string;
  goal?: string;
  objectives?: string[];
  modules?: string[];
  targetAudience?: string[];
  prerequisites?: string[];
  language?: string;
  sessions?: Session[];
};

export const areas = [
  { name: "Todos", slug: "todos" },
  { name: "ATM & Navegación", slug: "atm-navegacion" },
  { name: "UAS/RPAS", slug: "uas-rpas" },
  { name: "Seguridad/AVSEC", slug: "seguridad-avsec" },
  { name: "Simuladores", slug: "simuladores" },
  { name: "Safety & Factores Humanos", slug: "safety-ffhh" },
  { name: "Gestión Aeronáutica", slug: "gestion-aeronautica" },
];

export const courses: Course[] = [
  {
    id: "uas-basico",
    code: "ENAE/UAS/001",
    title: "Operador UAS Nivel 1 - Básico",
    description:
      "Certificación como operador de sistemas de aeronaves no tripuladas. Fundamentos de vuelo, regulación DGAC y operación segura de RPAS.",
    area: "UAS/RPAS",
    areaSlug: "uas-rpas",
    subarea: "Operaciones RPAS",
    level: "Básico",
    duration: "40 horas",
    modality: "Presencial",
    language: "Español",
    locations: ["Santiago, Chile"],
    dates: ["14 Abr - 25 Abr 2026", "16 Jun - 27 Jun 2026"],
    goal: "Preparar al participante para obtener la certificación como operador de sistemas de aeronaves no tripuladas (UAS) según la normativa vigente de la DGAC Chile, capacitándolo para realizar operaciones VLOS de manera segura y eficiente.",
    objectives: [
      "Comprender los principios fundamentales de la aeronáutica aplicados a sistemas no tripulados",
      "Conocer y aplicar la regulación DGAC vigente para operaciones UAS en Chile",
      "Interpretar información meteorológica relevante para operaciones RPAS",
      "Ejecutar maniobras básicas de vuelo de forma segura y controlada",
      "Gestionar el mantenimiento preventivo de baterías y componentes del sistema",
      "Aprobar la evaluación práctica de vuelo según estándares DGAC",
    ],
    modules: [
      "Fundamentos de aeronáutica",
      "Regulación DGAC para UAS (DAN 151)",
      "Meteorología operacional",
      "Principios de navegación aérea",
      "Operación y maniobras básicas",
      "Gestión de baterías y mantenimiento",
      "Procedimientos de emergencia",
      "Evaluación práctica de vuelo",
    ],
    targetAudience: [
      "Personas interesadas en obtener certificación como operador RPAS",
      "Profesionales que requieran incorporar tecnología de drones en su actividad laboral",
      "Pilotos que deseen ampliar sus competencias al ámbito no tripulado",
    ],
    prerequisites: [
      "Mayor de 18 años",
      "Educación media completa",
      "Certificado médico clase 2 o superior vigente",
      "No se requiere experiencia previa en aviación",
    ],
    sessions: [
      { dates: "14 Abr - 25 Abr 2026", location: "Santiago, Chile", modality: "Presencial", fee: "CLP $850.000" },
      { dates: "16 Jun - 27 Jun 2026", location: "Santiago, Chile", modality: "Presencial", fee: "CLP $850.000" },
    ],
  },
  {
    id: "uas-industrial",
    title: "Operador UAS Nivel 2 - Industrial",
    description:
      "Operaciones industriales con drones: fotogrametría, inspección de infraestructura, agricultura de precisión y mapeo aéreo.",
    area: "UAS/RPAS",
    areaSlug: "uas-rpas",
    level: "Intermedio",
    duration: "60 horas",
    modality: "Presencial",
    locations: ["Santiago, Chile"],
    dates: ["05 May - 23 May 2026", "04 Ago - 22 Ago 2026"],
  },
  {
    id: "uas-profesional",
    title: "Operador UAS Nivel 3 - Profesional",
    description:
      "Certificación avanzada: operaciones BVLOS, vuelo nocturno, gestión de flota y planificación de misiones complejas.",
    area: "UAS/RPAS",
    areaSlug: "uas-rpas",
    level: "Avanzado",
    duration: "80 horas",
    modality: "Presencial",
    locations: ["Santiago, Chile"],
    dates: ["01 Jun - 26 Jun 2026", "01 Sep - 26 Sep 2026"],
  },
  {
    id: "vuelo-nocturno",
    title: "Operaciones Nocturnas UAS",
    description:
      "Habilitación para operaciones con drones en horario nocturno. Protocolos de seguridad, iluminación y coordinación con ATC.",
    area: "UAS/RPAS",
    areaSlug: "uas-rpas",
    level: "Especialización",
    duration: "24 horas",
    modality: "Híbrido",
    locations: ["Santiago, Chile"],
    dates: ["20 Abr - 24 Abr 2026"],
  },
  {
    id: "bvlos",
    title: "Operaciones BVLOS",
    description:
      "Operaciones más allá de la línea visual. Planificación, gestión de riesgos, sistemas de detección y evasión (DAA).",
    area: "UAS/RPAS",
    areaSlug: "uas-rpas",
    level: "Especialización",
    duration: "32 horas",
    modality: "Híbrido",
    locations: ["Santiago, Chile", "Bogotá, Colombia"],
    dates: ["11 May - 16 May 2026"],
  },
  {
    id: "instructor-rpas",
    title: "Instructor / Examinador RPAS",
    description:
      "Formación de instructores y examinadores de sistemas RPAS. Metodología de enseñanza, evaluación de competencias y estándares DGAC.",
    area: "UAS/RPAS",
    areaSlug: "uas-rpas",
    level: "Avanzado",
    duration: "48 horas",
    modality: "Presencial",
    locations: ["Santiago, Chile"],
    dates: ["06 Jul - 18 Jul 2026"],
  },
  {
    id: "evtol",
    title: "Sistemas eVTOL",
    description:
      "Introducción a aeronaves de despegue y aterrizaje vertical eléctrico. Tecnología, regulación y futuro de la movilidad aérea urbana.",
    area: "UAS/RPAS",
    areaSlug: "uas-rpas",
    level: "Especialización",
    duration: "20 horas",
    modality: "Online",
    locations: ["Online"],
    dates: ["15 Jun - 19 Jun 2026"],
  },
  {
    id: "mantenimiento-uas",
    title: "Gestión de Mantenimiento UAS",
    description:
      "Planificación y ejecución de mantenimiento preventivo y correctivo de sistemas RPAS. Documentación técnica y aeronavegabilidad.",
    area: "UAS/RPAS",
    areaSlug: "uas-rpas",
    level: "Intermedio",
    duration: "30 horas",
    modality: "Híbrido",
    locations: ["Santiago, Chile"],
    dates: ["03 Ago - 09 Ago 2026"],
  },
  {
    id: "radiotelefonia",
    title: "Radiotelefonía Aeronáutica",
    description:
      "Comunicaciones aeronáuticas en banda VHF. Fraseología estándar OACI, procedimientos de comunicación y coordinación con ATC.",
    area: "ATM & Navegación",
    areaSlug: "atm-navegacion",
    level: "Básico",
    duration: "24 horas",
    modality: "Presencial",
    locations: ["Santiago, Chile", "Madrid, España"],
    dates: ["07 Abr - 11 Abr 2026", "08 Sep - 12 Sep 2026"],
  },
  {
    id: "planificacion-vuelo",
    title: "Planificación de Vuelo",
    description:
      "Planificación operacional de vuelos: meteorología, NOTAMs, espacio aéreo, performance y documentación de vuelo.",
    area: "ATM & Navegación",
    areaSlug: "atm-navegacion",
    level: "Intermedio",
    duration: "36 horas",
    modality: "Híbrido",
    locations: ["Santiago, Chile"],
    dates: ["18 May - 29 May 2026"],
  },
  {
    id: "avsec-basico",
    title: "Seguridad de la Aviación (AVSEC)",
    description:
      "Fundamentos de seguridad aeroportuaria según Anexo 17 OACI. Control de acceso, inspección de pasajeros y gestión de amenazas.",
    area: "Seguridad/AVSEC",
    areaSlug: "seguridad-avsec",
    level: "Básico",
    duration: "40 horas",
    modality: "Presencial",
    locations: ["Santiago, Chile", "Bogotá, Colombia"],
    dates: ["21 Abr - 02 May 2026", "13 Oct - 24 Oct 2026"],
  },
  {
    id: "mercancias-peligrosas",
    title: "Mercancías Peligrosas por Vía Aérea",
    description:
      "Regulación OACI/IATA para transporte de mercancías peligrosas. Clasificación, embalaje, etiquetado y documentación DGR.",
    area: "Seguridad/AVSEC",
    areaSlug: "seguridad-avsec",
    level: "Especialización",
    duration: "32 horas",
    modality: "Híbrido",
    locations: ["Santiago, Chile"],
    dates: ["08 Jun - 13 Jun 2026"],
  },
  {
    id: "sms",
    title: "Sistema de Gestión de Seguridad Operacional (SMS)",
    description:
      "Implementación de SMS según Doc 9859 OACI. Identificación de peligros, gestión de riesgos, aseguramiento y promoción de la seguridad.",
    area: "Safety & Factores Humanos",
    areaSlug: "safety-ffhh",
    level: "Intermedio",
    duration: "40 horas",
    modality: "Híbrido",
    locations: ["Santiago, Chile", "Bogotá, Colombia", "Madrid, España"],
    dates: ["04 May - 15 May 2026", "07 Sep - 18 Sep 2026"],
  },
  {
    id: "factores-humanos",
    title: "Factores Humanos en Aviación",
    description:
      "Estudio del factor humano en operaciones aeronáuticas. CRM, fatiga, toma de decisiones, error humano y cultura de seguridad.",
    area: "Safety & Factores Humanos",
    areaSlug: "safety-ffhh",
    level: "Básico",
    duration: "24 horas",
    modality: "Online",
    locations: ["Online"],
    dates: ["22 Jun - 26 Jun 2026", "19 Oct - 23 Oct 2026"],
  },
  {
    id: "investigacion-accidentes",
    title: "Investigación de Accidentes Aéreos",
    description:
      "Metodología de investigación de accidentes e incidentes según Anexo 13 OACI. Recolección de evidencia, análisis y recomendaciones.",
    area: "Safety & Factores Humanos",
    areaSlug: "safety-ffhh",
    level: "Avanzado",
    duration: "48 horas",
    modality: "Presencial",
    locations: ["Santiago, Chile"],
    dates: ["13 Jul - 25 Jul 2026"],
  },
  {
    id: "auditor-calidad",
    title: "Auditor de Calidad Aeronáutica",
    description:
      "Formación de auditores internos de calidad para organizaciones aeronáuticas. Normas ISO 9001 aplicadas a la aviación.",
    area: "Gestión Aeronáutica",
    areaSlug: "gestion-aeronautica",
    level: "Especialización",
    duration: "36 horas",
    modality: "Híbrido",
    locations: ["Santiago, Chile"],
    dates: ["01 Jun - 12 Jun 2026"],
  },
  {
    id: "gestion-proyectos",
    title: "Gestión de Proyectos Aeronáuticos",
    description:
      "Planificación, ejecución y control de proyectos en el sector aeronáutico. Metodologías ágiles y PMI aplicadas a la aviación.",
    area: "Gestión Aeronáutica",
    areaSlug: "gestion-aeronautica",
    level: "Intermedio",
    duration: "30 horas",
    modality: "Online",
    locations: ["Online"],
    dates: ["20 Jul - 31 Jul 2026"],
  },
  {
    id: "entrega-medica",
    title: "Operaciones de Entrega Médica con UAS",
    description:
      "Uso de drones para entrega de suministros médicos. Protocolos de emergencia, cadena de frío y coordinación sanitaria.",
    area: "UAS/RPAS",
    areaSlug: "uas-rpas",
    level: "Especialización",
    duration: "28 horas",
    modality: "Presencial",
    locations: ["Santiago, Chile"],
    dates: ["17 Ago - 22 Ago 2026"],
  },
  {
    id: "simulador-atc",
    title: "Simulador de Control de Tránsito Aéreo",
    description:
      "Prácticas en simulador de torre de control y aproximación. Gestión de tráfico, separación de aeronaves y procedimientos de emergencia.",
    area: "Simuladores",
    areaSlug: "simuladores",
    level: "Intermedio",
    duration: "60 horas",
    modality: "Presencial",
    locations: ["Santiago, Chile"],
    dates: ["06 Abr - 01 May 2026", "05 Oct - 30 Oct 2026"],
  },
  {
    id: "simulador-rpas",
    title: "Simulador de Operaciones RPAS",
    description:
      "Entrenamiento en simulador de vuelo RPAS. Escenarios de emergencia, operaciones multi-drone y misiones complejas.",
    area: "Simuladores",
    areaSlug: "simuladores",
    level: "Básico",
    duration: "20 horas",
    modality: "Presencial",
    locations: ["Santiago, Chile"],
    dates: ["27 Abr - 01 May 2026", "12 Oct - 16 Oct 2026"],
  },
];
