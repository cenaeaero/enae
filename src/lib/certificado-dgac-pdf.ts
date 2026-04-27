import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import fs from "fs";
import path from "path";

export type DgacCertificateData = {
  studentName: string;
  rut: string | null;
  courseName: string;
  city: string;
  startDate: string;
  endDate: string;
  totalHours: number;
  folio: string | null;
  year: number;
  habilitaciones?: string | null;
  modules?: { sort_order: number; title: string }[] | null;
  verificationUrl: string;
  verificationCode?: string | null;
  aocNumber?: string;
  resolutionNumber?: string;
  danNorms?: string;
};

const MONTHS_ES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function fmtDate(iso: string) {
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
 * Server-side image loader. Reads a file from the project's `public/` folder
 * and returns a base64 data URL that jsPDF can consume via addImage().
 */
function loadImageDataUrl(relPath: string): string | null {
  try {
    const abs = path.join(process.cwd(), "public", relPath);
    if (!fs.existsSync(abs)) return null;
    const buf = fs.readFileSync(abs);
    const lower = relPath.toLowerCase();
    const ext = lower.endsWith(".jpg") || lower.endsWith(".jpeg") ? "jpeg" : "png";
    return `data:image/${ext};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

/**
 * Generates the ENAE DGAC certificate as an async 2-page PDF with:
 * - Header with ENAE logo + title band
 * - Justified body text (page 1)
 * - Signatures (Vivian García + Iván Araos)
 * - "Pie de página ENAE" footer image
 * - Page 2: course modules + QR code for authenticity verification
 */
export async function generateDgacCertificatePdf(data: DgacCertificateData): Promise<ArrayBuffer> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const mx = 20;
  const contentW = pw - mx * 2;

  const aoc = data.aocNumber || "1521";
  const resolucion = data.resolutionNumber || "08/1/0579/0478 de fecha 08 de abril de 2022";
  const danNorms = data.danNorms || "DAN 119, DAN 137, DAN 91 y DAN 151";
  const habilitaciones = data.habilitaciones || DEFAULT_HABILITACIONES;

  const start = fmtDate(data.startDate);
  const end = fmtDate(data.endDate);

  const logoEnae = loadImageDataUrl("img/logo-enae.png");
  const logoDgac = loadImageDataUrl("img/logo-DGAC.jpg");
  const firmaVivian = loadImageDataUrl("img/Firma Vivian García.png");
  const firmaIvan = loadImageDataUrl("img/Firma Ivan Araos.png");
  const pieEnae = loadImageDataUrl("img/Pie de página ENAE.png");

  // ────────────────────────────────────────
  // PAGE 1
  // ────────────────────────────────────────
  drawHeader(doc, pw, logoEnae);

  let y = 52;

  // Legal header paragraph — justified
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);

  const para1 =
    `El suscrito Director de la Escuela de Navegación Aérea SpA, Centro de Instrucción Aeronáutica ` +
    `autorizado por la Dirección General de Aeronáutica Civil de Chile (DGAC), bajo Certificado de ` +
    `Operador Aéreo (AOC) N° ${aoc}, otorgado mediante Resolución Exenta N° ${resolucion}, conforme a ` +
    `lo dispuesto en las Normas Aeronáuticas ${danNorms}.`;
  y = writeJustified(doc, para1, mx, y, contentW, 4.8);
  y += 4;

  // CERTIFICA QUE:
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text("CERTIFICA QUE:", pw / 2, y, { align: "center" });
  y += 7;

  // Student body paragraph — justified
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const rutText = data.rut ? `RUT N° ${data.rut}` : "identificado(a) en los registros internos";
  const para2 =
    `Que el(la) señor(a) ${data.studentName.toUpperCase()}, identificado(a) con ${rutText}, ha cursado y ` +
    `aprobado en esta institución el ${data.courseName}, desarrollado en la ciudad de ${data.city}, durante ` +
    `el periodo comprendido entre los días ${start.day} de ${start.month} y ${end.day} de ${end.month} de ` +
    `${end.year}, con una carga horaria total de ${data.totalHours} horas de instrucción teórica y práctica.`;
  y = writeJustified(doc, para2, mx, y, contentW, 4.8);
  y += 5;

  // COMPENDIO:
  doc.setFont("helvetica", "bold");
  doc.text("COMPENDIO:", mx, y);
  y += 5;

  doc.setFont("helvetica", "normal");
  const compendio1 =
    `El programa se desarrolla conforme a los requerimientos establecidos por la Dirección General de ` +
    `Aeronáutica Civil (DGAC) mediante la Norma Aeronáutica DAN 151, que regula la formación y evaluación ` +
    `para la obtención de la Credencial de Operador de Aeronaves Pilotadas a Distancia (RPA).`;
  y = writeJustified(doc, compendio1, mx, y, contentW, 4.8);
  y += 3;

  const compendio2 =
    `El curso contempla los contenidos mínimos exigidos por la autoridad aeronáutica y establece las ` +
    `responsabilidades del piloto a distancia conforme al Código Aeronáutico de Chile, en relación con la ` +
    `seguridad operacional, la protección de personas y bienes, y el cumplimiento de las normas aplicables ` +
    `al espacio aéreo nacional.`;
  y = writeJustified(doc, compendio2, mx, y, contentW, 4.8);
  y += 4;

  // Habilitaciones bullet
  const bullet = `•  Habilitación de tipo ${habilitaciones}.`;
  y = writeJustified(doc, bullet, mx + 2, y, contentW - 2, 4.8);
  y += 5;

  // Closing statement
  const closing =
    `Se extiende el presente certificado en ${data.city} de Chile, a los ${end.day} días del mes de ` +
    `${end.month} de ${end.year}, para ser presentado a la DIRECCIÓN GENERAL DE AERONÁUTICA CIVIL y los ` +
    `fines que el interesado estime pertinentes.`;
  y = writeJustified(doc, closing, mx, y, contentW, 4.8);
  y += 10;

  // Signature block header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text("ESCUELA DE NAVEGACIÓN AÉREA SpA", pw / 2, y, { align: "center" });
  y += 6;

  // Signature images (two columns)
  const leftX = mx + 25;
  const rightX = pw - mx - 25;
  const sigW = 40;
  const sigH = 15;
  const sigY = y;

  if (firmaVivian) {
    try { doc.addImage(firmaVivian, "PNG", leftX - sigW / 2, sigY, sigW, sigH); } catch {}
  }
  if (firmaIvan) {
    try { doc.addImage(firmaIvan, "PNG", rightX - sigW / 2, sigY, sigW, sigH); } catch {}
  }

  y = sigY + sigH + 2;

  // Signature lines
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.line(leftX - 22, y, leftX + 22, y);
  doc.line(rightX - 22, y, rightX + 22, y);

  y += 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Vivian García Lopera", leftX, y, { align: "center" });
  doc.text("Iván Araos Mancilla", rightX, y, { align: "center" });

  y += 4;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.text("Oficina de Grados y Certificaciones – ENAE", leftX, y, { align: "center" });
  doc.text("Director – ENAE", rightX, y, { align: "center" });

  y += 9;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(0, 0, 0);
  const folioText = `Anotado en el Folio N° ${data.folio || "____"}/${data.year} del Registro de Certificaciones ENAE.`;
  doc.text(folioText, mx, y);
  y += 5;
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text("Preparó: IAM/VGL", mx, y);

  drawFooter(doc, pw, ph, pieEnae, logoDgac);

  // ────────────────────────────────────────
  // PAGE 2 — Course modules + QR
  // ────────────────────────────────────────
  doc.addPage();
  drawHeader(doc, pw, logoEnae);

  let y2 = 55;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(0, 0, 0);
  doc.text("CONTENIDOS PRINCIPALES DEL CURSO", mx, y2);
  y2 += 8;

  const modulesList = (data.modules && data.modules.length > 0)
    ? data.modules.sort((a, b) => a.sort_order - b.sort_order).map((m) => m.title)
    : DEFAULT_CONTENTS;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  for (const item of modulesList) {
    const line = `•  ${item}`;
    y2 = writeJustified(doc, line, mx + 2, y2, contentW - 2, 4.8);
    y2 += 1.5;
  }
  y2 += 5;

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.line(mx, y2, pw - mx, y2);
  y2 += 6;

  const macParagraph =
    `El curso cumple con los requisitos académicos y técnicos establecidos por la Escuela de Navegación ` +
    `Aérea SpA (ENAE) como Medio Aceptable de Cumplimiento (MAC) relativo a la formación, habilitación y ` +
    `certificación de pilotos que operen Aeronaves Pilotadas a Distancia (RPAS), conforme a la Norma ` +
    `Aeronáutica DAN 151 vigente.`;
  y2 = writeJustified(doc, macParagraph, mx, y2, contentW, 4.8);
  y2 += 12;

  // QR Code
  try {
    const qrDataUrl = await QRCode.toDataURL(data.verificationUrl, {
      margin: 1,
      width: 400,
      color: { dark: "#001d3d", light: "#ffffff" },
    });
    const qrSize = 32;
    const qrX = (pw - qrSize) / 2;
    doc.addImage(qrDataUrl, "PNG", qrX, y2, qrSize, qrSize);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(0, 29, 61);
    doc.text("Verificación de Autenticidad", pw / 2, y2 + qrSize + 5, { align: "center" });

    // Verification code (large, monospace, prominent)
    if (data.verificationCode) {
      doc.setFont("courier", "bold");
      doc.setFontSize(11);
      doc.setTextColor(0, 51, 102);
      doc.text(`Código: ${data.verificationCode}`, pw / 2, y2 + qrSize + 10, { align: "center" });
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    const urlYOffset = data.verificationCode ? 15 : 10;
    doc.text("Escanee el código QR o ingrese el código en", pw / 2, y2 + qrSize + urlYOffset, { align: "center" });
    doc.setTextColor(0, 114, 206);
    doc.text(data.verificationUrl, pw / 2, y2 + qrSize + urlYOffset + 4, { align: "center" });
  } catch (err) {
    // QR code generation failed — just show the URL
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    if (data.verificationCode) {
      doc.text(`Código: ${data.verificationCode}`, pw / 2, y2, { align: "center" });
      doc.text(`URL: ${data.verificationUrl}`, pw / 2, y2 + 4, { align: "center" });
    } else {
      doc.text(`Verificación: ${data.verificationUrl}`, pw / 2, y2, { align: "center" });
    }
  }

  drawFooter(doc, pw, ph, pieEnae, logoDgac);

  return doc.output("arraybuffer");
}

// ────────────────────────────────────────────────────────────
// Drawing helpers
// ────────────────────────────────────────────────────────────

function drawHeader(doc: jsPDF, pw: number, logoEnaeDataUrl: string | null) {
  doc.setFillColor(0, 29, 61); // #001d3d
  doc.rect(0, 0, pw, 32, "F");

  if (logoEnaeDataUrl) {
    try { doc.addImage(logoEnaeDataUrl, "PNG", 12, 6, 20, 20); } catch {}
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  doc.text("ESCUELA DE NAVEGACIÓN AÉREA SpA", pw / 2 + 8, 18, { align: "center" });

  doc.setFillColor(0, 114, 206);
  doc.rect(0, 32, pw, 1.5, "F");
}

function drawFooter(
  doc: jsPDF,
  pw: number,
  ph: number,
  pieEnaeDataUrl: string | null,
  logoDgacDataUrl: string | null,
) {
  const footerH = 22;
  const footerY = ph - footerH;

  if (pieEnaeDataUrl) {
    try { doc.addImage(pieEnaeDataUrl, "PNG", 0, footerY, pw, footerH); return; } catch {}
  }

  // Fallback: minimal footer if image missing
  doc.setFillColor(0, 29, 61);
  doc.rect(0, ph - 10, pw, 10, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(30, 30, 30);
  doc.text("MIEMBROS:", 20, footerY + 4);
  doc.text("APROBADO POR:", pw - 45, footerY + 4);

  doc.setFontSize(9);
  doc.setTextColor(0, 29, 61);
  doc.text("ESCUELA DE NAVEGACIÓN AÉREA SpA", pw / 2, footerY + 4, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(30, 30, 30);
  doc.text("Email: escuela@enae.cl", pw / 2, footerY + 9, { align: "center" });
  doc.text("www.enae.cl", pw / 2, footerY + 13, { align: "center" });

  if (logoDgacDataUrl) {
    try { doc.addImage(logoDgacDataUrl, "JPEG", pw - 25, footerY + 2, 10, 10); } catch {}
  }
}

/**
 * Writes a paragraph with full justification by manually distributing the
 * residual horizontal space evenly between words on every line except the
 * last. Works reliably with jsPDF (its native align:"justify" is inconsistent
 * for already-wrapped lines). Returns the new y after drawing.
 */
function writeJustified(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  width: number,
  lineHeight: number,
): number {
  const lines = doc.splitTextToSize(text, width) as string[];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isLast = i === lines.length - 1;
    const words = line.split(/\s+/).filter(Boolean);

    if (isLast || words.length <= 1) {
      // Last line or single-word line → left aligned
      doc.text(line, x, y);
    } else {
      const wordsTotalWidth = words.reduce(
        (sum, w) => sum + doc.getTextWidth(w),
        0
      );
      // Only justify if there's meaningful slack (avoid over-stretching short lines)
      const slack = width - wordsTotalWidth;
      const naturalSpace = doc.getTextWidth(" ");
      const extra = slack - naturalSpace * (words.length - 1);
      // If the line naturally fills <75% of width, left-align instead to avoid
      // ugly stretched gaps (typically happens on paragraphs with a hard break).
      const fillRatio = wordsTotalWidth / width;
      if (extra < 0 || fillRatio < 0.65) {
        doc.text(line, x, y);
      } else {
        const gap = slack / (words.length - 1);
        let xCursor = x;
        for (let j = 0; j < words.length; j++) {
          doc.text(words[j], xCursor, y);
          xCursor += doc.getTextWidth(words[j]) + gap;
        }
      }
    }
    y += lineHeight;
  }
  return y;
}
