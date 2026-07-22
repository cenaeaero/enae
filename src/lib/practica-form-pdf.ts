import { jsPDF } from "jspdf";
import fs from "fs";
import path from "path";
import { PHASES, GRADE_PASS, computePracticalScore, getExamScore, type ItemState } from "@/lib/practical-eval-format";

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

// ─────────────────────────────────────────────────────────────────────────────
// Formato N1 COMPLETADO Y FIRMADO — para archivo ISO 9001 / DGAC.
// Incluye las notas por maniobra, el promedio con su resultado, el examen NIST,
// las observaciones y el bloque de firmas (instructor + firma electrónica del
// alumno con su fecha y hora).
// ─────────────────────────────────────────────────────────────────────────────

export type CompletedEvalData = {
  student_name: string;
  student_document: string;
  folio: string;
  course: string;
  course_code: string;
  city: string;
  date: string;          // fecha de la evaluación (YYYY-MM-DD)
  time: string;
  location: string;
  instructor_name: string;
  instructor_email: string;
  items: Record<string, ItemState>;
  pre_solo_result: string | null;
  observations: string | null;
  status: string;
  completed_at: string | null;
  signature_name: string | null;
  signed_at: string | null;
};

const fechaCL = (iso: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "—" : d.toLocaleString("es-CL", { dateStyle: "long", timeStyle: "short" });
};

export function generateCompletedPracticaPdf(d: CompletedEvalData): ArrayBuffer {
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  const PW = 216, PH = 279, M = 12, W = PW - M * 2;
  const logo = loadImageDataUrl("img/logo-enae.png");
  let y = M;

  const ensure = (need: number) => {
    if (y + need > PH - 16) { doc.addPage(); y = M; }
  };

  // ── Encabezado ──
  if (logo) { try { doc.addImage(logo, "PNG", M, y, 14, 14); } catch { /* sin logo */ } }
  doc.setTextColor(...NAVY).setFont("helvetica", "bold").setFontSize(12);
  doc.text("ESCUELA DE NAVEGACIÓN AÉREA — ENAE", M + 17, y + 5);
  doc.setFont("helvetica", "normal").setFontSize(7.5).setTextColor(60, 60, 60);
  doc.text("Formato Cumplimiento de Ejercicios Prácticos · Apéndice 1", M + 17, y + 9.5);
  doc.text("Programa de capacitación para la obtención de la Credencial de Operador RPAS", M + 17, y + 13);
  doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(...NAVY);
  doc.text("ENAE-CHL-N1", PW - M, y + 5, { align: "right" });
  doc.setFontSize(7).setTextColor(21, 128, 61);
  doc.text(d.status === "completed" ? "EVALUACIÓN COMPLETADA" : "BORRADOR", PW - M, y + 9.5, { align: "right" });
  y += 16;
  doc.setDrawColor(...NAVY).setLineWidth(0.6).line(M, y, PW - M, y);
  y += 4;

  // ── Datos del alumno ──
  doc.setDrawColor(140).setLineWidth(0.2);
  const rowH = 6.5, labelW = 30;
  const rows: [string, string, string, string][] = [
    ["Nombre", d.student_name || "—", "", ""],
    ["RUT / Pasaporte", d.student_document || "—", "Folio ENAE", d.folio || "—"],
    ["Curso", `${d.course}${d.course_code ? ` (${d.course_code})` : ""}`, "", ""],
    ["Fecha", `${d.date || "—"}${d.time ? `   ${d.time} hrs` : ""}`, "Lugar", d.location || d.city || "—"],
    ["Instructor", d.instructor_name || d.instructor_email, "", ""],
  ];
  doc.setFontSize(8.5);
  for (const [l1, v1, l2, v2] of rows) {
    const full = !l2;
    doc.setFillColor(243, 244, 246).rect(M, y, labelW, rowH, "F");
    doc.rect(M, y, labelW, rowH);
    doc.setFont("helvetica", "bold").setTextColor(60, 60, 60).text(l1, M + 1.5, y + 4.4);
    const v1W = full ? W - labelW : (W / 2) - labelW;
    doc.rect(M + labelW, y, v1W, rowH);
    doc.setFont("helvetica", "normal").setTextColor(0, 0, 0).text(String(v1).slice(0, full ? 95 : 42), M + labelW + 1.5, y + 4.4);
    if (!full) {
      const x2 = M + W / 2;
      doc.setFillColor(243, 244, 246).rect(x2, y, labelW, rowH, "F");
      doc.rect(x2, y, labelW, rowH);
      doc.setFont("helvetica", "bold").setTextColor(60, 60, 60).text(l2, x2 + 1.5, y + 4.4);
      doc.rect(x2 + labelW, y, W / 2 - labelW, rowH);
      doc.setFont("helvetica", "normal").setTextColor(0, 0, 0).text(String(v2).slice(0, 40), x2 + labelW + 1.5, y + 4.4);
    }
    y += rowH;
  }
  y += 3;

  // ── Fases con resultados ──
  const ansW = 30, exW = W - ansW;
  for (const phase of PHASES) {
    ensure(14);
    doc.setFillColor(...NAVY).rect(M, y, W, 6, "F");
    doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(255, 255, 255).text(phase.title, M + 2, y + 4.1);
    doc.text("Resultado", PW - M - 2, y + 4.1, { align: "right" });
    y += 6;

    for (const it of phase.items) {
      const st = d.items?.[it.key] || {};
      doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(0, 0, 0);
      const titleLines = doc.splitTextToSize(it.label, exW - 3) as string[];
      const h = Math.max(6.5, titleLines.length * 3.6 + 3);
      ensure(h + 4);

      doc.setDrawColor(140).rect(M, y, exW, h);
      doc.rect(M + exW, y, ansW, h);

      let ty = y + 4;
      for (const line of titleLines) { doc.text(line, M + 1.5, ty); ty += 3.6; }

      // resultado
      const cy = y + h / 2 + 1;
      let txt = "—";
      let color: [number, number, number] = [140, 140, 140];
      if (st.na) { txt = "N/A"; color = [110, 110, 110]; }
      else if (it.kind === "check") {
        if (st.done === true) { txt = "SÍ"; color = [21, 128, 61]; }
        else if (st.done === false) { txt = "NO"; color = [190, 30, 45]; }
      } else if (typeof st.grade === "number") {
        txt = `${st.grade} %`;
        color = st.grade >= GRADE_PASS ? [21, 128, 61] : [190, 30, 45];
      }
      doc.setFont("helvetica", "bold").setFontSize(8.5).setTextColor(...color);
      doc.text(txt, M + exW + ansW / 2, cy, { align: "center" });
      y += h;
    }
  }
  y += 3;

  // ── Resultado global ──
  const avg = computePracticalScore(d.items || {});
  const exam = getExamScore(d.items || {});
  const aprobado = avg != null && avg >= GRADE_PASS;

  ensure(30);
  doc.setDrawColor(140).setFontSize(8.5);
  doc.rect(M, y, W, rowH);
  doc.setFont("helvetica", "bold").setTextColor(0, 0, 0).text("Chequeo Pre-Solo:", M + 1.5, y + 4.4);
  doc.setFont("helvetica", "normal");
  const preSolo = d.pre_solo_result === "aprobado" ? "APROBADO" : d.pre_solo_result === "reprobado" ? "REPROBADO" : "—";
  doc.setTextColor(...(d.pre_solo_result === "aprobado" ? [21, 128, 61] : d.pre_solo_result === "reprobado" ? [190, 30, 45] : [140, 140, 140]) as [number, number, number]);
  doc.text(preSolo, M + 34, y + 4.4);
  y += rowH;

  doc.setTextColor(0, 0, 0);
  doc.rect(M, y, W, 9);
  doc.setFont("helvetica", "bold").setFontSize(9).text("Promedio maniobras:", M + 1.5, y + 5.8);
  doc.setFontSize(11).setTextColor(...(aprobado ? [21, 128, 61] : [190, 30, 45]) as [number, number, number]);
  doc.text(avg != null ? `${avg} %` : "—", M + 40, y + 6);
  doc.setFontSize(8).setTextColor(90, 90, 90);
  doc.text(`(aprobación desde ${GRADE_PASS}%)`, M + 56, y + 6);
  doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(...(aprobado ? [21, 128, 61] : [190, 30, 45]) as [number, number, number]);
  doc.text(avg != null ? (aprobado ? "APROBADO" : "REPROBADO") : "", M + 92, y + 6);
  doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(0, 0, 0);
  doc.text("Examen NIST:", M + 122, y + 5.8);
  doc.setFontSize(11).setTextColor(...NAVY);
  doc.text(exam != null ? `${exam} %` : "—", M + 150, y + 6);
  y += 9;

  // ── Observaciones ──
  doc.setTextColor(0, 0, 0).setFont("helvetica", "bold").setFontSize(8.5);
  const obs = (d.observations || "").trim();
  doc.setFont("helvetica", "normal").setFontSize(8);
  const obsLines = obs ? (doc.splitTextToSize(obs, W - 4) as string[]) : ["—"];
  const obsH = Math.max(16, obsLines.length * 3.6 + 8);
  ensure(obsH + 4);
  doc.setDrawColor(140).rect(M, y, W, obsH);
  doc.setFont("helvetica", "bold").setFontSize(8.5).text("Observaciones del instructor (nivel del ejercicio NIST):", M + 1.5, y + 4.6);
  doc.setFont("helvetica", "normal").setFontSize(8);
  let oy = y + 9;
  for (const line of obsLines) { doc.text(line, M + 1.5, oy); oy += 3.6; }
  y += obsH + 6;

  // ── Firmas ──
  ensure(34);
  const sigW = (W - 14) / 2;
  const sigY = y + 12;
  doc.setDrawColor(80).setLineWidth(0.3);
  doc.line(M, sigY, M + sigW, sigY);
  doc.line(M + sigW + 14, sigY, PW - M, sigY);

  doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(0, 0, 0);
  doc.text(d.instructor_name || d.instructor_email, M + sigW / 2, sigY + 4, { align: "center" });
  doc.setFont("helvetica", "normal").setFontSize(7).setTextColor(90, 90, 90);
  doc.text("Instructor de vuelo — ENAE", M + sigW / 2, sigY + 7.5, { align: "center" });
  if (d.completed_at) {
    doc.setFontSize(6.5).text(`Evaluación registrada: ${fechaCL(d.completed_at)}`, M + sigW / 2, sigY + 11, { align: "center" });
  }

  const sx = M + sigW + 14 + sigW / 2;
  if (d.signed_at) {
    doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(0, 0, 0);
    doc.text(d.signature_name || d.student_name, sx, sigY + 4, { align: "center" });
    doc.setFont("helvetica", "normal").setFontSize(7).setTextColor(21, 128, 61);
    doc.text("Firmado electrónicamente por el alumno", sx, sigY + 7.5, { align: "center" });
    doc.setFontSize(6.5).setTextColor(90, 90, 90);
    doc.text(fechaCL(d.signed_at), sx, sigY + 11, { align: "center" });
  } else {
    doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(0, 0, 0);
    doc.text(d.student_name, sx, sigY + 4, { align: "center" });
    doc.setFont("helvetica", "normal").setFontSize(7).setTextColor(150, 150, 150);
    doc.text("Pendiente de firma del alumno", sx, sigY + 7.5, { align: "center" });
  }
  y = sigY + 15;

  // ── Declaración y pie ──
  doc.setFontSize(6.2).setTextColor(120, 120, 120);
  const decl = d.signed_at
    ? "El alumno declara haber participado en la capacitación práctica en la fecha señalada y recibido instrucción según el programa del curso de Operador RPAS de ENAE. Firma electrónica registrada en la plataforma enae.cl con fecha y hora."
    : "Declaro haber participado en la capacitación práctica en la fecha señalada y recibido instrucción según el programa del curso de Operador RPAS de ENAE.";
  for (const line of doc.splitTextToSize(decl, W) as string[]) { doc.text(line, M, y); y += 2.6; }
  doc.text("Escuela de Navegación Aérea | AOC 1521 DGAC | Certificada ISO 9001:2015", M, PH - 6);

  return doc.output("arraybuffer") as ArrayBuffer;
}
