import { jsPDF } from "jspdf";

export type DgacCertificateData = {
  studentName: string;
  rut: string | null;
  courseName: string;
  city: string;
  startDate: string; // ISO
  endDate: string;   // ISO
  totalHours: number;
  folio: string | null;
  year: number;
  habilitaciones?: string | null; // free text, e.g. "MAVIC SERIES, PHANTOM SERIES..."
  contentList?: string[] | null;  // bulleted items for page 2
  aocNumber?: string; // default 1521
  resolutionNumber?: string; // default "08/1/0579/0478 de fecha 08 de abril de 2022"
  danNorms?: string; // default "DAN 119, DAN 137, DAN 91 y DAN 151"
};

const MONTHS_ES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function formatDateLong(iso: string): { day: string; month: string; year: number } {
  const d = new Date(iso);
  return { day: String(d.getDate()).padStart(2, "0"), month: MONTHS_ES[d.getMonth()], year: d.getFullYear() };
}

const DEFAULT_HABILITACIONES =
  "MAVIC SERIES, PHANTOM SERIES, MATRICE SERIES, AUTEL EVO SERIES, AIR SERIES, INSPIRE SERIES";

const DEFAULT_CONTENTS = [
  "Introducción al sistema de la Organización de Aviación Civil Internacional (OACI).",
  "Uso de la Plataforma SIPA – DGAC.",
  "Normativa Aeronáutica DAN 151 y DAN 91.",
  "Meteorología y Aerodinámica al vuelo RPAS.",
  "Interpretación de claves METAR y NOTAM.",
  "Servicio de información aeronáutica (AIS).",
  "Factores humanos.",
  "Seguridad Operacional – Sistema de Gestión de la Seguridad (SMS).",
  "Procedimientos de emergencia.",
  "Familiarización con aeronaves utilizadas: DJI Mavic, Phantom, Matrice, Autel EVO, Air e Inspire Series.",
];

/**
 * Generates the DGAC certificate PDF matching the ENAE template (2 pages).
 * Returns the PDF as a Buffer (Node) or ArrayBuffer-compatible for server responses.
 */
export function generateDgacCertificatePdf(data: DgacCertificateData): ArrayBuffer {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const mx = 20;
  const contentW = pw - mx * 2;

  const aoc = data.aocNumber || "1521";
  const resolucion = data.resolutionNumber || "08/1/0579/0478 de fecha 08 de abril de 2022";
  const danNorms = data.danNorms || "DAN 119, DAN 137, DAN 91 y DAN 151";
  const habilitaciones = data.habilitaciones || DEFAULT_HABILITACIONES;
  const contents = (data.contentList && data.contentList.length > 0) ? data.contentList : DEFAULT_CONTENTS;

  const start = formatDateLong(data.startDate);
  const end = formatDateLong(data.endDate);

  // ─────────────────────────────────────────────────────────
  // PAGE 1
  // ─────────────────────────────────────────────────────────
  drawHeader(doc, pw);
  drawFooter(doc, pw, ph);

  let y = 50;

  // First paragraph — legal header
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  const para1 =
    `El suscrito Director de la Escuela de Navegación Aérea SpA, Centro de Instrucción Aeronáutica ` +
    `autorizado por la Dirección General de Aeronáutica Civil de Chile (DGAC), bajo Certificado de ` +
    `Operador Aéreo (AOC) N° ${aoc}, otorgado mediante Resolución Exenta N° ${resolucion}, conforme ` +
    `a lo dispuesto en las Normas Aeronáuticas ${danNorms}.`;
  y = drawJustifiedParagraph(doc, para1, mx, y, contentW, 4.5);
  y += 3;

  // CERTIFICA QUE
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text("CERTIFICA QUE:", pw / 2, y, { align: "center" });
  y += 6;

  // Body paragraph with student info
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const rutText = data.rut ? `RUT N° ${data.rut}` : "identificado(a) en los registros internos";
  const para2 =
    `Que el(la) señor(a) ${data.studentName.toUpperCase()}, identificado(a) con ${rutText}, ha cursado y ` +
    `aprobado en esta institución el ${data.courseName}, desarrollado en la ciudad de ${data.city}, ` +
    `durante el periodo comprendido entre los días ${start.day} de ${start.month} y ${end.day} de ${end.month} ` +
    `de ${end.year}, con una carga horaria total de ${data.totalHours} horas de instrucción teórica y práctica.`;
  y = drawJustifiedParagraph(doc, para2, mx, y, contentW, 4.5);
  y += 4;

  // COMPENDIO
  doc.setFont("helvetica", "bold");
  doc.text("COMPENDIO:", mx, y);
  y += 5;

  doc.setFont("helvetica", "normal");
  const compendio1 =
    `El programa se desarrolla conforme a los requerimientos establecidos por la Dirección General de ` +
    `Aeronáutica Civil (DGAC) mediante la Norma Aeronáutica DAN 151, que regula la formación y evaluación ` +
    `para la obtención de la Credencial de Operador de Aeronaves Pilotadas a Distancia (RPA).`;
  y = drawJustifiedParagraph(doc, compendio1, mx, y, contentW, 4.5);
  y += 2;

  const compendio2 =
    `El curso contempla los contenidos mínimos exigidos por la autoridad aeronáutica y establece las ` +
    `responsabilidades del piloto a distancia conforme al Código Aeronáutico de Chile, en relación con la ` +
    `seguridad operacional, la protección de personas y bienes, y el cumplimiento de las normas aplicables ` +
    `al espacio aéreo nacional.`;
  y = drawJustifiedParagraph(doc, compendio2, mx, y, contentW, 4.5);
  y += 3;

  // Habilitación bullet
  const bulletLine = `•  Habilitación de tipo ${habilitaciones}.`;
  y = drawJustifiedParagraph(doc, bulletLine, mx + 2, y, contentW - 2, 4.5);
  y += 4;

  // Closing statement
  const closing =
    `Se extiende el presente certificado en ${data.city} de Chile, a los ${end.day} días del mes de ` +
    `${end.month} de ${end.year}, para ser presentado a la DIRECCIÓN GENERAL DE AERONÁUTICA CIVIL y los ` +
    `fines que el interesado estime pertinentes.`;
  y = drawJustifiedParagraph(doc, closing, mx, y, contentW, 4.5);
  y += 8;

  // Signature block header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text("ESCUELA DE NAVEGACIÓN AÉREA SpA", pw / 2, y, { align: "center" });
  y += 18;

  // Signatures (two columns)
  const leftX = mx + 20;
  const rightX = pw - mx - 20;

  // Signature line
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.line(leftX - 20, y, leftX + 20, y);
  doc.line(rightX - 20, y, rightX + 20, y);

  y += 4;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Vivian García Lopera", leftX, y, { align: "center" });
  doc.text("Iván Araos Mancilla", rightX, y, { align: "center" });

  y += 4;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.text("Oficina de Grados y Certificaciones – ENAE", leftX, y, { align: "center" });
  doc.text("Director – ENAE", rightX, y, { align: "center" });

  y += 10;

  // Folio
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(0, 0, 0);
  const folioText = `Anotado en el Folio N° ${data.folio || "____"}/${data.year} del Registro de Certificaciones ENAE.`;
  doc.text(folioText, mx, y);
  y += 6;

  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text("Preparó:", mx, y);
  y += 3.5;
  doc.text("IAM/VGL", mx, y);

  // ─────────────────────────────────────────────────────────
  // PAGE 2
  // ─────────────────────────────────────────────────────────
  doc.addPage();
  drawHeader(doc, pw);
  drawFooter(doc, pw, ph);

  y = 55;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text("CONTENIDOS PRINCIPALES DEL CURSO", mx, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  for (const item of contents) {
    const line = `•  ${item}`;
    y = drawJustifiedParagraph(doc, line, mx + 2, y, contentW - 2, 4.5);
    y += 1.5;
  }
  y += 5;

  // Separator
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.line(mx, y, pw - mx, y);
  y += 6;

  const macParagraph =
    `El curso cumple con los requisitos académicos y técnicos establecidos por la Escuela de Navegación ` +
    `Aérea SpA (ENAE) como Medio Aceptable de Cumplimiento (MAC) relativo a la formación, habilitación y ` +
    `certificación de pilotos que operen Aeronaves Pilotadas a Distancia (RPAS), conforme a la Norma ` +
    `Aeronáutica DAN 151 vigente.`;
  drawJustifiedParagraph(doc, macParagraph, mx, y, contentW, 4.5);

  return doc.output("arraybuffer");
}

// ──────────────────────────────────────────────────────────────
// Drawing helpers
// ──────────────────────────────────────────────────────────────

function drawHeader(doc: jsPDF, pw: number) {
  // Dark blue top band
  doc.setFillColor(0, 29, 61); // #001d3d
  doc.rect(0, 0, pw, 30, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text("ESCUELA DE NAVEGACIÓN AÉREA SpA", pw / 2, 18, { align: "center" });

  // Subtle accent
  doc.setFillColor(0, 114, 206); // #0072CE
  doc.rect(0, 30, pw, 1.5, "F");
}

function drawFooter(doc: jsPDF, pw: number, ph: number) {
  const footerY = ph - 22;
  doc.setFillColor(0, 29, 61);
  doc.rect(0, ph - 10, pw, 10, "F");

  // Left (MIEMBROS) + Right (APROBADO POR) labels
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(30, 30, 30);
  doc.text("MIEMBROS:", 20, footerY + 2);
  doc.text("APROBADO POR:", pw - 45, footerY + 2);

  // Center ENAE contact
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(0, 29, 61);
  doc.text("ESCUELA DE NAVEGACIÓN AÉREA SpA", pw / 2, footerY + 1, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(30, 30, 30);
  doc.text("Email: escuela@enae.cl", pw / 2, footerY + 5, { align: "center" });
  doc.text("www.enae.cl", pw / 2, footerY + 8.5, { align: "center" });
}

/**
 * Draws a left-aligned (NOT justified, kept simple) wrapped paragraph.
 * Returns the new y position after drawing.
 */
function drawJustifiedParagraph(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  width: number,
  lineHeight: number,
): number {
  const lines = doc.splitTextToSize(text, width) as string[];
  for (const line of lines) {
    doc.text(line, x, y);
    y += lineHeight;
  }
  return y;
}
