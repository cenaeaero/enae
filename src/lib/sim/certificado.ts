// Certificado de capacitación CONDOR SIM — emitido por ENAE (jsPDF, A4 horizontal)

export interface CertOpts {
  studentName: string;
  folio: string;
  score: number;
  scenarioName: string;
  instructorName: string;
}

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

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.text('CERTIFICADO DE CAPACITACIÓN', W / 2, 62, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.text('Se certifica que', W / 2, 80, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text(o.studentName.toUpperCase(), W / 2, 94, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  const cuerpo =
    'ha completado satisfactoriamente el programa de entrenamiento en operación de sistemas UTM\n' +
    'para la gestión de tránsito aéreo no tripulado — Simulador CONDOR SIM\n' +
    `Ejercicio: ${o.scenarioName}`;
  doc.text(cuerpo, W / 2, 106, { align: 'center', lineHeightFactor: 1.6 });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(`CALIFICACIÓN: ${o.score} / 100 — APROBADO`, W / 2, 132, { align: 'center' });

  const fecha = new Date().toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Santiago de Chile, ${fecha}`, W / 2, 142, { align: 'center' });

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
