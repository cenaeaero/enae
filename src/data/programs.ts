export type Program = {
  id: string;
  title: string;
  area: string;
  areaSlug: string;
  type: "Certificación" | "Diploma" | "Programa";
  duration: string;
  language: string;
  description: string;
  goal: string;
  fee?: string;
  courseIds: string[];
};

export const programs: Program[] = [
  {
    id: "operador-uas",
    title: "Operador de Sistemas Aéreos No Tripulados (UAS)",
    area: "UAS/RPAS",
    areaSlug: "uas-rpas",
    type: "Certificación",
    duration: "180 horas",
    language: "Español",
    description:
      "Programa integral de certificación en tres niveles para operar sistemas aéreos no tripulados. Desde fundamentos de vuelo y regulación DGAC hasta operaciones BVLOS, vuelo nocturno y gestión de flota profesional. Incluye formación práctica en campo con evaluaciones según estándares de la autoridad aeronáutica.",
    goal: "Formar operadores RPAS certificados capaces de ejecutar operaciones seguras en todos los escenarios operacionales, cumpliendo con la normativa DGAC vigente y las mejores prácticas internacionales.",
    fee: "USD 2.800",
    courseIds: [
      "uas-basico",
      "uas-industrial",
      "uas-profesional",
      "vuelo-nocturno",
      "bvlos",
      "mantenimiento-uas",
    ],
  },
  {
    id: "instructor-uas",
    title: "Instructor y Examinador RPAS",
    area: "UAS/RPAS",
    areaSlug: "uas-rpas",
    type: "Certificación",
    duration: "88 horas",
    language: "Español",
    description:
      "Programa de formación de formadores en el ámbito de sistemas aéreos no tripulados. Combina la habilitación como instructor/examinador RPAS con competencias en operaciones especializadas como entregas médicas y eVTOL.",
    goal: "Certificar instructores y examinadores RPAS con las competencias pedagógicas y técnicas necesarias para formar nuevos operadores según los estándares DGAC.",
    fee: "USD 1.950",
    courseIds: ["instructor-rpas", "evtol", "entrega-medica"],
  },
  {
    id: "navegacion-aerea",
    title: "Navegación Aérea y Control de Tránsito",
    area: "ATM & Navegación",
    areaSlug: "atm-navegacion",
    type: "Programa",
    duration: "64 horas",
    language: "Español",
    description:
      "Programa de especialización en gestión del tránsito aéreo, radiofonía aeronáutica y planificación de vuelo. Integra formación teórica con práctica en simulador de torre de control para desarrollar competencias operacionales en ATM.",
    goal: "Desarrollar profesionales con competencias integrales en navegación aérea, comunicaciones aeronáuticas y gestión del espacio aéreo según estándares OACI.",
    fee: "USD 1.600",
    courseIds: ["radiotelefonia", "planificacion-vuelo", "simulador-atc"],
  },
  {
    id: "seguridad-aeronautica",
    title: "Seguridad Aeronáutica y AVSEC",
    area: "Seguridad/AVSEC",
    areaSlug: "seguridad-avsec",
    type: "Certificación",
    duration: "48 horas",
    language: "Español / Inglés",
    description:
      "Certificación en seguridad de la aviación civil (AVSEC) y manejo de mercancías peligrosas. Cubre protocolos de seguridad aeroportuaria, identificación de amenazas, y cumplimiento de las regulaciones OACI Anexo 17 y normativa DAN aplicable.",
    goal: "Certificar profesionales en seguridad aeronáutica con las competencias necesarias para proteger la aviación civil contra actos de interferencia ilícita.",
    fee: "USD 1.200",
    courseIds: ["avsec-basico", "mercancias-peligrosas"],
  },
  {
    id: "safety-management",
    title: "Gestión de Seguridad Operacional (SMS)",
    area: "Safety & Factores Humanos",
    areaSlug: "safety-ffhh",
    type: "Diploma",
    duration: "96 horas",
    language: "Español",
    description:
      "Diploma en gestión de seguridad operacional que integra los sistemas de gestión de seguridad (SMS), factores humanos en aviación e investigación de accidentes e incidentes. Basado en el Doc 9859 de OACI y las mejores prácticas de la industria.",
    goal: "Formar profesionales capaces de implementar, gestionar y auditar sistemas de gestión de la seguridad operacional en organizaciones aeronáuticas.",
    fee: "USD 2.400",
    courseIds: ["sms", "factores-humanos", "investigacion-accidentes"],
  },
  {
    id: "gestion-aeronautica",
    title: "Gestión y Calidad Aeronáutica",
    area: "Gestión Aeronáutica",
    areaSlug: "gestion-aeronautica",
    type: "Programa",
    duration: "56 horas",
    language: "Español",
    description:
      "Programa de formación en gestión de la calidad y administración de proyectos aeronáuticos. Prepara auditores de calidad en aviación y gestores de proyectos con enfoque en normativa aeronáutica y estándares internacionales.",
    goal: "Desarrollar competencias de gestión, auditoría y administración de proyectos aplicadas al sector aeronáutico.",
    fee: "USD 1.400",
    courseIds: ["auditor-calidad", "gestion-proyectos"],
  },
  {
    id: "simulacion-aeronautica",
    title: "Simulación Aeronáutica Aplicada",
    area: "Simuladores",
    areaSlug: "simuladores",
    type: "Programa",
    duration: "48 horas",
    language: "Español",
    description:
      "Programa de entrenamiento basado en simulación para control de tránsito aéreo y operaciones RPAS. Utiliza simuladores de última generación para desarrollar competencias operacionales en entornos controlados y seguros.",
    goal: "Proporcionar entrenamiento práctico intensivo en simuladores para fortalecer las competencias operacionales de controladores de tránsito aéreo y operadores RPAS.",
    fee: "USD 1.100",
    courseIds: ["simulador-atc", "simulador-rpas"],
  },
];
