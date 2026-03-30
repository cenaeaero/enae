// ============================================
// Survey Questions - Fixed questionnaires (TRAINAIR PLUS style)
// ============================================

export type LikertValue =
  | "muy_de_acuerdo"
  | "de_acuerdo"
  | "neutral"
  | "desacuerdo"
  | "muy_en_desacuerdo"
  | "na";

export const LIKERT_OPTIONS: { value: LikertValue; label: string }[] = [
  { value: "muy_de_acuerdo", label: "Muy de acuerdo" },
  { value: "de_acuerdo", label: "De acuerdo" },
  { value: "neutral", label: "Neutral" },
  { value: "desacuerdo", label: "Desacuerdo" },
  { value: "muy_en_desacuerdo", label: "Muy en desacuerdo" },
  { value: "na", label: "N/A" },
];

export type QuestionType = "likert" | "text";

export type SurveyQuestion = {
  id: string;
  section: string;
  sectionLabel: string;
  text: string;
  type: QuestionType;
  required: boolean;
};

export type QuestionnaireType = "module" | "course" | "instructor";

export type QuestionnaireConfig = {
  type: QuestionnaireType;
  title: string;
  titlePrefix: string;
  sections: string[];
  sectionLabels: Record<string, string>;
  questions: SurveyQuestion[];
};

// ============================================
// 1. CUESTIONARIO DE OPINION SOBRE EL MODULO
// ============================================
export const MODULE_QUESTIONNAIRE: QuestionnaireConfig = {
  type: "module",
  title: "Cuestionario de Opinión sobre el Módulo",
  titlePrefix: "CUESTIONARIO DE OPINIÓN SOBRE EL",
  sections: ["structure", "teaching", "material", "comments"],
  sectionLabels: {
    structure: "A. Estructura del Módulo y Prueba de Dominio",
    teaching: "B. Actividades Docentes",
    material: "C. Material Didáctico",
    comments: "D. Comentarios",
  },
  questions: [
    {
      id: "m1",
      section: "structure",
      sectionLabel: "A. Estructura del Módulo y Prueba de Dominio",
      text: "Al comienzo de este módulo se indicó claramente el objetivo de final del módulo",
      type: "likert",
      required: true,
    },
    {
      id: "m2",
      section: "structure",
      sectionLabel: "A. Estructura del Módulo y Prueba de Dominio",
      text: "El módulo está bien estructurado para lograr el objetivo final",
      type: "likert",
      required: true,
    },
    {
      id: "m3",
      section: "structure",
      sectionLabel: "A. Estructura del Módulo y Prueba de Dominio",
      text: "El contenido del módulo facilitó la realización exitosa de la prueba de dominio",
      type: "likert",
      required: true,
    },
    {
      id: "m4",
      section: "teaching",
      sectionLabel: "B. Actividades Docentes",
      text: "Las actividades docentes (p. ej. clase, discusiones en grupo, etc.) respaldaron los objetivos del módulo",
      type: "likert",
      required: true,
    },
    {
      id: "m5",
      section: "teaching",
      sectionLabel: "B. Actividades Docentes",
      text: "Los ejercicios prácticos (p. ej. juego de roles, estudio de casos, etc.) permitieron aplicar los objetivos de aprendizaje",
      type: "likert",
      required: true,
    },
    {
      id: "m6",
      section: "teaching",
      sectionLabel: "B. Actividades Docentes",
      text: "Se asignó suficiente tiempo para preguntas y discusiones",
      type: "likert",
      required: true,
    },
    {
      id: "m7",
      section: "material",
      sectionLabel: "C. Material Didáctico",
      text: "El material didáctico fue pertinente para los objetivos de aprendizaje",
      type: "likert",
      required: true,
    },
    {
      id: "m8",
      section: "material",
      sectionLabel: "C. Material Didáctico",
      text: "Las instrucciones escritas para los ejercicios fueron claras",
      type: "likert",
      required: true,
    },
    {
      id: "m9",
      section: "material",
      sectionLabel: "C. Material Didáctico",
      text: "Las instrucciones escritas para las pruebas fueron claras",
      type: "likert",
      required: true,
    },
    {
      id: "m10",
      section: "material",
      sectionLabel: "C. Material Didáctico",
      text: "Los materiales visuales ilustraron los objetivos de aprendizaje",
      type: "likert",
      required: true,
    },
    {
      id: "m11",
      section: "comments",
      sectionLabel: "D. Comentarios",
      text: "¿Qué fue lo que más le gustó del módulo?",
      type: "text",
      required: false,
    },
    {
      id: "m12",
      section: "comments",
      sectionLabel: "D. Comentarios",
      text: "¿Tiene alguna sugerencia para mejorar este módulo?",
      type: "text",
      required: false,
    },
  ],
};

// ============================================
// 2. CUESTIONARIO INTEGRAL DEL CURSO
// ============================================
export const COURSE_QUESTIONNAIRE: QuestionnaireConfig = {
  type: "course",
  title: "Cuestionario Integral del Curso",
  titlePrefix: "CUESTIONARIO INTEGRAL",
  sections: ["environment", "course", "expectations", "comments"],
  sectionLabels: {
    environment: "A. Entorno del curso",
    course: "B. Curso",
    expectations: "C. Expectativas",
    comments: "D. Comentarios",
  },
  questions: [
    {
      id: "c1",
      section: "environment",
      sectionLabel: "A. Entorno del curso",
      text: "El entorno del curso fue propicio para el aprendizaje",
      type: "likert",
      required: true,
    },
    {
      id: "c2",
      section: "course",
      sectionLabel: "B. Curso",
      text: "El curso siguió una secuencia lógica",
      type: "likert",
      required: true,
    },
    {
      id: "c3",
      section: "course",
      sectionLabel: "B. Curso",
      text: "El material docente fue apropiado y completo",
      type: "likert",
      required: true,
    },
    {
      id: "c4",
      section: "course",
      sectionLabel: "B. Curso",
      text: "Las actividades docentes me permitieron alcanzar los objetivos de aprendizaje",
      type: "likert",
      required: true,
    },
    {
      id: "c5",
      section: "course",
      sectionLabel: "B. Curso",
      text: "El equipo y las herramientas utilizadas en el curso fueron apropiadas y funcionales",
      type: "likert",
      required: true,
    },
    {
      id: "c6",
      section: "expectations",
      sectionLabel: "C. Expectativas",
      text: "El curso me permitió adquirir las competencias apropiadas para realizar mejor mi trabajo",
      type: "likert",
      required: true,
    },
    {
      id: "c7",
      section: "expectations",
      sectionLabel: "C. Expectativas",
      text: "El curso me ayudará a mejorar mi rendimiento en el trabajo",
      type: "likert",
      required: true,
    },
    {
      id: "c8",
      section: "expectations",
      sectionLabel: "C. Expectativas",
      text: "El curso cumplió mis expectativas",
      type: "likert",
      required: true,
    },
    {
      id: "c_comments",
      section: "comments",
      sectionLabel: "D. Comentarios",
      text: "General",
      type: "text",
      required: false,
    },
  ],
};

// ============================================
// 3. CUESTIONARIO DE EVALUACION DEL INSTRUCTOR
// ============================================
export const INSTRUCTOR_QUESTIONNAIRE: QuestionnaireConfig = {
  type: "instructor",
  title: "Cuestionario de Evaluación del Instructor",
  titlePrefix: "CUESTIONARIO DE EVALUACIÓN DEL INSTRUCTOR",
  sections: ["management", "delivery", "experience", "comments"],
  sectionLabels: {
    management: "A. Gestión del curso",
    delivery: "B. Impartición del curso",
    experience: "C. Experiencia",
    comments: "D. Comentarios",
  },
  questions: [
    {
      id: "i1",
      section: "management",
      sectionLabel: "A. Gestión del curso",
      text: "Se adapta a las necesidades de instrucción de los alumnos",
      type: "likert",
      required: true,
    },
    {
      id: "i2",
      section: "management",
      sectionLabel: "A. Gestión del curso",
      text: "Estimuló y mantuvo el interés de los alumnos",
      type: "likert",
      required: true,
    },
    {
      id: "i3",
      section: "management",
      sectionLabel: "A. Gestión del curso",
      text: "Administró bien el tiempo",
      type: "likert",
      required: true,
    },
    {
      id: "i4",
      section: "management",
      sectionLabel: "A. Gestión del curso",
      text: "Hizo comentarios oportunos sobre los resultados de los ejercicios y las pruebas",
      type: "likert",
      required: true,
    },
    {
      id: "i5",
      section: "management",
      sectionLabel: "A. Gestión del curso",
      text: "Respetó los aspectos culturales de los alumnos",
      type: "likert",
      required: true,
    },
    {
      id: "i6",
      section: "delivery",
      sectionLabel: "B. Impartición del curso",
      text: "Explicó claramente los objetivos del curso",
      type: "likert",
      required: true,
    },
    {
      id: "i7",
      section: "delivery",
      sectionLabel: "B. Impartición del curso",
      text: "Estimuló a los alumnos a que participaran en las discusiones y en otras actividades docentes",
      type: "likert",
      required: true,
    },
    {
      id: "i8",
      section: "delivery",
      sectionLabel: "B. Impartición del curso",
      text: "Se aseguró de que los alumnos entendieran el contenido del curso",
      type: "likert",
      required: true,
    },
    {
      id: "i9",
      section: "delivery",
      sectionLabel: "B. Impartición del curso",
      text: "Respondió a las preguntas adecuadamente",
      type: "likert",
      required: true,
    },
    {
      id: "i10",
      section: "delivery",
      sectionLabel: "B. Impartición del curso",
      text: "Dio instrucciones claras para los ejercicios y las pruebas",
      type: "likert",
      required: true,
    },
    {
      id: "i11",
      section: "delivery",
      sectionLabel: "B. Impartición del curso",
      text: "Usó un lenguaje claro para impartir el curso",
      type: "likert",
      required: true,
    },
    {
      id: "i12",
      section: "experience",
      sectionLabel: "C. Experiencia",
      text: "Gestionó los aspectos técnicos del aula virtual sin problemas (si procede)",
      type: "likert",
      required: true,
    },
    {
      id: "i_comments",
      section: "comments",
      sectionLabel: "D. Comentarios",
      text: "General",
      type: "text",
      required: false,
    },
  ],
};

// Helper to get questionnaire config by type
export function getQuestionnaireConfig(
  type: QuestionnaireType
): QuestionnaireConfig {
  switch (type) {
    case "module":
      return MODULE_QUESTIONNAIRE;
    case "course":
      return COURSE_QUESTIONNAIRE;
    case "instructor":
      return INSTRUCTOR_QUESTIONNAIRE;
  }
}
