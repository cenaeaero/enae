import { jsPDF } from "jspdf";
import fs from "fs";
import path from "path";
import { PHASES, GRADE_PASS } from "@/lib/practical-eval-format";

// Genera el "Formato Cumplimiento de Ejercicios Prácticos" (ENAE-CHL-N1) en
// blanco, prellenado con los datos del alumno, para que el instructor lo lleve
// impreso a la clase. Una página por alumno.

export type PracticaFormData = {
  student_name: string;
  student_document: string;
  folio: string;
  course: string;
  course_code: string;
  city: string;
  date: string;
  time: string;
  location: string;
};

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

const NAVY: [number, number, number] = [0, 51, 102];

export function generatePracticaFormsPdf(forms: PracticaFormData[]): ArrayBuffer {
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  const PW = 216;          // ancho carta
  const M = 12;            // margen
  const W = PW - M * 2;    // ancho útil
  const logo = loadImageDataUrl("img/logo-enae.png");

  forms.forEach((f, idx) => {
    if (idx > 0) doc.addPage();
    let y = M;

    // ── Encabezado ──
    if (logo) {
      try { doc.addImage(logo, "PNG", M, y, 14, 14); } catch { /* sin logo */ }
    }
    doc.setTextColor(...NAVY);
    doc.setFont("helvetica", "bold").setFontSize(12);
    doc.text("ESCUELA DE NAVEGACIÓN AÉREA — ENAE", M + 17, y + 5);
    doc.setFont("helvetica", "normal").setFontSize(7.5);
    doc.setTextColor(60, 60, 60);
    doc.text("Formato Cumplimiento de Ejercicios Prácticos · Apéndice 1", M + 17, y + 9.5);
    doc.text("Programa de capacitación para la obtención de la Credencial de Operador RPAS", M + 17, y + 13);
    doc.setFont("helvetica", "bold").setFontSize(8);
    doc.setTextColor(...NAVY);
    doc.text("ENAE-CHL-N1", PW - M, y + 5, { align: "right" });
    y += 16;
    doc.setDrawColor(...NAVY).setLineWidth(0.6);
    doc.line(M, y, PW - M, y);
    y += 4;

    // ── Datos del alumno ──
    doc.setDrawColor(140).setLineWidth(0.2);
    const rowH = 6.5;
    const labelW = 30;
    const dataRows: [string, string, string, string][] = [
      ["Nombre", f.student_name || "", "", ""],
      ["RUT / Pasaporte", f.student_document || "", "Folio ENAE", f.folio || ""],
      ["Curso", `${f.course}${f.course_code ? ` (${f.course_code})` : ""}`, "", ""],
      ["Fecha", `${f.date || "___/___/______"}${f.time ? `   ${f.time} hrs` : ""}`, "Lugar", f.location || f.city || ""],
    ];
    doc.setFontSize(8.5);
    for (const [l1, v1, l2, v2] of dataRows) {
      const full = !l2;
      // etiqueta 1
      doc.setFillColor(243, 244, 246).rect(M, y, labelW, rowH, "F");
      doc.rect(M, y, labelW, rowH);
      doc.setFont("helvetica", "bold").setTextColor(60, 60, 60);
      doc.text(l1, M + 1.5, y + 4.4);
      // valor 1
      const v1W = full ? W - labelW : (W / 2) - labelW;
      doc.rect(M + labelW, y, v1W, rowH);
      doc.setFont("helvetica", "normal").setTextColor(0, 0, 0);
      doc.text(String(v1).slice(0, full ? 95 : 42), M + labelW + 1.5, y + 4.4);
      if (!full) {
        const x2 = M + W / 2;
        doc.setFillColor(243, 244, 246).rect(x2, y, labelW, rowH, "F");
        doc.rect(x2, y, labelW, rowH);
        doc.setFont("helvetica", "bold").setTextColor(60, 60, 60);
        doc.text(l2, x2 + 1.5, y + 4.4);
        doc.rect(x2 + labelW, y, W / 2 - labelW, rowH);
        doc.setFont("helvetica", "normal").setTextColor(0, 0, 0);
        doc.text(String(v2).slice(0, 40), x2 + labelW + 1.5, y + 4.4);
      }
      y += rowH;
    }
    y += 3;

    // ── Fases y ejercicios ──
    const ansW = 42;                 // columna de respuesta
    const exW = W - ansW;
    for (const phase of PHASES) {
      // barra de fase
      doc.setFillColor(...NAVY).rect(M, y, W, 6, "F");
      doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(255, 255, 255);
      doc.text(phase.title, M + 2, y + 4.1);
      const soloCheck = phase.items.every((i) => i.kind === "check");
      doc.text(soloCheck ? "SÍ / NO / N-A" : "Nota (%) / N-A", PW - M - 2, y + 4.1, { align: "right" });
      y += 6;

      for (const it of phase.items) {
        doc.setTextColor(0, 0, 0).setFont("helvetica", "normal").setFontSize(8);
        const titleLines = doc.splitTextToSize(it.label, exW - 3) as string[];
        let detailLines: string[] = [];
        if (it.detail) {
          doc.setFontSize(6.2);
          detailLines = doc.splitTextToSize(it.detail, exW - 3) as string[];
          doc.setFontSize(8);
        }
        const h = Math.max(7, titleLines.length * 3.6 + detailLines.length * 2.6 + 3);

        doc.setDrawColor(140).rect(M, y, exW, h);
        doc.rect(M + exW, y, ansW, h);

        let ty = y + 4;
        doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(0, 0, 0);
        for (const line of titleLines) { doc.text(line, M + 1.5, ty); ty += 3.6; }
        if (detailLines.length) {
          doc.setFontSize(6.2).setTextColor(110, 110, 110);
          for (const line of detailLines) { doc.text(line, M + 1.5, ty); ty += 2.6; }
        }

        // celda de respuesta
        doc.setTextColor(90, 90, 90).setFontSize(8);
        const cy = y + h / 2 + 1;
        if (it.kind === "check") {
          doc.text("[  ] SÍ    [  ] NO    [  ] N-A", M + exW + 2, cy);
        } else {
          doc.text("________ %      [  ] N-A", M + exW + 2, cy);
        }
        y += h;
      }
    }

    y += 3;

    // ── Resultado y firmas ──
    doc.setDrawColor(140);
    doc.setFontSize(8.5).setTextColor(0, 0, 0);
    doc.rect(M, y, W, rowH);
    doc.setFont("helvetica", "bold").text("Chequeo Pre-Solo:", M + 1.5, y + 4.4);
    doc.setFont("helvetica", "normal").text("[  ] Aprobado        [  ] Reprobado", M + 34, y + 4.4);
    y += rowH;

    doc.rect(M, y, W, rowH);
    doc.setFont("helvetica", "bold").text("Promedio maniobras:", M + 1.5, y + 4.4);
    doc.setFont("helvetica", "normal").text(`________ %   (aprobación desde ${GRADE_PASS}%)        Examen NIST: ________ %`, M + 38, y + 4.4);
    y += rowH;

    doc.rect(M, y, W, 20);
    doc.setFont("helvetica", "bold").text("Observaciones (indicar el nivel del ejercicio NIST):", M + 1.5, y + 4.4);
    y += 24;

    // firmas
    const sigW = (W - 14) / 2;
    doc.setDrawColor(80).setLineWidth(0.3);
    doc.line(M, y + 10, M + sigW, y + 10);
    doc.line(M + sigW + 14, y + 10, PW - M, y + 10);
    doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(60, 60, 60);
    doc.text("Firma Instructor", M + sigW / 2, y + 14, { align: "center" });
    doc.text("Firma Alumno", M + sigW + 14 + sigW / 2, y + 14, { align: "center" });

    doc.setFontSize(6.2).setTextColor(120, 120, 120);
    const decl = "Declaro haber participado en la capacitación práctica en la fecha señalada y recibido instrucción según el programa del curso de Operador RPAS de ENAE.";
    const declLines = doc.splitTextToSize(decl, W) as string[];
    let dy = y + 20;
    for (const line of declLines) { doc.text(line, M, dy); dy += 2.6; }
    doc.text("Escuela de Navegación Aérea | AOC 1521 DGAC | Certificada ISO 9001:2015", M, 273);
  });

  return doc.output("arraybuffer") as ArrayBuffer;
}
