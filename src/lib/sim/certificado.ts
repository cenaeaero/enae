// Certificado de capacitación CONDOR SIM — emitido por ENAE (jsPDF, A4 horizontal)

export interface CertOpts {
  studentName: string;
  folio: string;
  score: number;
  scenarioName: string;
  instructorName: string;
  level?: number; // nivel del programa (1..5)
  order?: number; // n° de ejercicio (1..10) — el 10 es la CERTIFICACIÓN
  title?: string;
  role?: string; // OPERADOR UTM / PILOTO UAS / PILOTO RPAS
  minScore?: number;
  comps?: { label: string; score: number }[];
}

export const ROLE_TXT: Record<string, string> = { UTM: 'OPERADOR UTM', UAS: 'PILOTO UAS (VLOS)', RPAS: 'PILOTO RPAS (BVLOS)' };

export async function certificadoPdf(o: CertOpts) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const W = 297;
  const H = 210;

  // marco doble
  doc.setDrawColor(10, 37, 64);
  doc.setLineWidth(1.2);
  doc.rect(8, 8, W - 16, H - 16);
  doc.setLineWidth(0.3);
  doc.rect(11, 11, W - 22, H - 22);

  doc.setTextColor(10, 37, 64);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('ESCUELA DE NAVEGACIÓN AÉREA — ENAE', W / 2, 32, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Centro de Instrucción Aeronáutica · AOC 1521 DGAC', W / 2, 39, { align: 'center' });

  const isCert = o.order === 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(isCert ? 24 : 22);
  doc.text(isCert ? 'CERTIFICADO DE COMPETENCIA UTM' : 'CONSTANCIA DE APROBACIÓN', W / 2, 58, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.text('Se certifica que', W / 2, 72, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(21);
  doc.text(o.studentName.toUpperCase(), W / 2, 85, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  const nivel = o.level ? `Nivel ${o.level} · Ejercicio ${o.order} de 10 — ${o.title ?? o.scenarioName}` : `Ejercicio: ${o.scenarioName}`;
  const cuerpo =
    (isCert
      ? 'ha aprobado el ejercicio de CERTIFICACIÓN del programa de entrenamiento por competencias en gestión de tránsito UAS (UTM)'
      : 'ha aprobado el ejercicio del programa de entrenamiento por competencias en gestión de tránsito UAS (UTM)') +
    '\nSimulador CONDOR SIM' + (o.role ? ` · Rol: ${ROLE_TXT[o.role] ?? o.role}` : '') + '\n' + nivel;
  doc.text(cuerpo, W / 2, 96, { align: 'center', lineHeightFactor: 1.5, maxWidth: W - 50 });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`CALIFICACIÓN: ${o.score} / 100${o.minScore ? ` (mínimo ${o.minScore})` : ''} — APROBADO`, W / 2, 122, { align: 'center' });

  // competencias evaluadas
  if (o.comps?.length) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const line = o.comps.map((c) => `${c.label}: ${c.score}`).join('   ·   ');
    doc.text(line, W / 2, 130, { align: 'center', maxWidth: W - 40 });
  }

  const fecha = new Date().toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Santiago de Chile, ${fecha}`, W / 2, 146, { align: 'center' });

  // firmas
  doc.setLineWidth(0.3);
  doc.line(50, 172, 120, 172);
  doc.line(177, 172, 247, 172);
  doc.setFontSize(9);
  doc.text(o.instructorName.toUpperCase(), 85, 177, { align: 'center' });
  doc.text('INSTRUCTOR UTM', 85, 182, { align: 'center' });
  doc.text('DIRECCIÓN DE INSTRUCCIÓN', 212, 177, { align: 'center' });
  doc.text('ENAE', 212, 182, { align: 'center' });

  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(`Folio: ${o.folio} · Verificación: enae.cl/verificar`, W / 2, H - 16, { align: 'center' });

  doc.save(`Certificado_CONDOR_SIM_${o.folio}.pdf`);
}

// Informe de evaluación por alumno (A4 vertical): puntaje por competencia, errores críticos y observaciones
export interface InformeOpts {
  studentName: string;
  role: string;
  flights: string[];
  score: number;
  minScore: number;
  passed: boolean;
  criticals: string[];
  comps: { label: string; score: number; detail: string }[];
  notes: string[];
  scenarioName: string;
  level?: number;
  order?: number;
  instructorName: string;
  prereq?: string;
}

export async function informePdf(o: InformeOpts) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210;
  let y = 18;
  doc.setTextColor(10, 37, 64);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('ENAE — INFORME DE EVALUACIÓN CONDOR SIM', W / 2, y, { align: 'center' });
  y += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const rows: [string, string][] = [
    ['Alumno', o.studentName],
    ['Rol', `${ROLE_TXT[o.role] ?? o.role}${o.flights.length ? ' · ' + o.flights.join(', ') : ''}`],
    ['Ejercicio', `${o.level ? `N${o.level} · E${o.order} — ` : ''}${o.scenarioName}`],
    ['Instructor', o.instructorName],
    ['Fecha', new Date().toLocaleString('es-CL')],
    ['Prerrequisito', o.prereq ?? '—'],
  ];
  for (const [k, v] of rows) { doc.setFont('helvetica', 'bold'); doc.text(k, 16, y); doc.setFont('helvetica', 'normal'); doc.text(v, 50, y, { maxWidth: W - 66 }); y += 6; }
  y += 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(o.passed ? 10 : 170, o.passed ? 122 : 0, o.passed ? 58 : 0);
  doc.text(`NOTA ${o.score} / 100 · MÍNIMO ${o.minScore} · ${o.passed ? 'APROBADO' : 'NO APROBADO'}`, 16, y);
  doc.setTextColor(10, 37, 64);
  y += 9;
  doc.setFontSize(11);
  doc.text('Competencias', 16, y); y += 6;
  doc.setFontSize(9);
  for (const c of o.comps) {
    doc.setFont('helvetica', 'bold'); doc.text(`${c.label}`, 16, y); doc.text(`${c.score}`, 90, y);
    doc.setFont('helvetica', 'normal'); doc.rect(98, y - 3, 60, 3.5); doc.rect(98, y - 3, 0.6 * c.score, 3.5, 'F');
    y += 4.5; const lines = doc.splitTextToSize(c.detail, W - 34); doc.text(lines, 20, y); y += 4 * lines.length + 2;
  }
  y += 3;
  doc.setFontSize(11); doc.setFont('helvetica', 'bold');
  doc.text('Errores críticos', 16, y); y += 6;
  doc.setFontSize(9); doc.setFont('helvetica', 'normal');
  if (!o.criticals.length) { doc.text('Ninguno.', 20, y); y += 5; }
  for (const c of o.criticals) { const l = doc.splitTextToSize('• ' + c, W - 36); doc.text(l, 20, y); y += 4.2 * l.length + 1; }
  y += 3;
  doc.setFontSize(11); doc.setFont('helvetica', 'bold');
  doc.text('Observaciones', 16, y); y += 6;
  doc.setFontSize(9); doc.setFont('helvetica', 'normal');
  for (const n of o.notes) {
    const l = doc.splitTextToSize('• ' + n, W - 36);
    if (y + 4.2 * l.length > 285) { doc.addPage(); y = 18; }
    doc.text(l, 20, y); y += 4.2 * l.length + 1;
  }
  const safe = o.studentName.replace(/[^A-Za-z0-9]+/g, '_').slice(0, 40);
  doc.save(`Informe_CONDOR_SIM_E${o.order ?? 0}_${safe}.pdf`);
}
