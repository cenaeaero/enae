import { jsPDF } from "jspdf";
import QRCode from "qrcode";

export type DiplomaData = {
  verification_code: string;
  student_name: string;
  course_title: string;
  course_code: string | null;
  final_score: number | null;
  status: string;
  issued_date: string;
};

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject();
    img.src = src;
  });
}

export async function generateDiplomaPDF(diploma: DiplomaData): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: "landscape", compress: true });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const cx = pw / 2;

  // Try to load diploma template
  try {
    const tpl = await loadImg("/img/diploma-template.png");
    doc.addImage(tpl, "PNG", 0, 0, pw, ph);
  } catch {
    // Default design
    doc.setDrawColor(0, 51, 102);
    doc.setLineWidth(3);
    doc.rect(8, 8, pw - 16, ph - 16);
    doc.setDrawColor(180, 160, 100);
    doc.setLineWidth(1);
    doc.rect(13, 13, pw - 26, ph - 26);
    doc.setDrawColor(0, 51, 102);
    doc.setLineWidth(0.3);
    doc.rect(16, 16, pw - 32, ph - 32);
  }

  // Load logos
  try {
    const logoEnae = await loadImg("/img/logo-enae.png");
    doc.addImage(logoEnae, "PNG", 30, 22, 22, 22);
  } catch {}
  try {
    const logoDgac = await loadImg("/img/logo-DGAC.jpg");
    doc.addImage(logoDgac, "JPEG", pw - 52, 22, 22, 22);
  } catch {}

  // Institution name
  doc.setFontSize(11);
  doc.setTextColor(100, 100, 100);
  doc.text("ESCUELA DE NAVEGACION AEREA SpA", cx, 30, { align: "center" });
  doc.setFontSize(8);
  doc.setTextColor(140, 140, 140);
  doc.text("AOC 1521 - DGAC Chile", cx, 36, { align: "center" });

  // CERTIFICADO
  doc.setFontSize(36);
  doc.setTextColor(0, 51, 102);
  doc.text("CERTIFICADO", cx, 55, { align: "center" });

  doc.setDrawColor(180, 160, 100);
  doc.setLineWidth(1);
  doc.line(cx - 65, 60, cx + 65, 60);

  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text("Se certifica que", cx, 72, { align: "center" });

  doc.setFontSize(26);
  doc.setTextColor(0, 51, 102);
  doc.text(diploma.student_name || "Alumno", cx, 87, { align: "center" });

  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text("ha completado satisfactoriamente el curso", cx, 98, { align: "center" });

  doc.setFontSize(20);
  doc.setTextColor(0, 75, 135);
  doc.text(diploma.course_title, cx, 113, { align: "center" });

  if (diploma.course_code) {
    doc.setFontSize(9);
    doc.setTextColor(140, 140, 140);
    doc.text(`Codigo: ${diploma.course_code}`, cx, 120, { align: "center" });
  }

  doc.setFontSize(11);
  doc.setTextColor(60, 60, 60);
  doc.text(
    `Calificacion Final: ${diploma.final_score}%   |   Estado: ${diploma.status === "approved" ? "APROBADO" : "REPROBADO"}`,
    cx,
    131,
    { align: "center" }
  );

  const issuedDate = new Date(diploma.issued_date).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Fecha de Emision: ${issuedDate}`, cx, 139, { align: "center" });

  doc.setFontSize(9);
  doc.setTextColor(0, 51, 102);
  doc.text(`Codigo de Verificacion: ${diploma.verification_code}`, cx, 147, { align: "center" });

  // Signatures
  const sigY = ph - 42;
  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.3);

  try {
    const firmaVivian = await loadImg("/img/Firma Vivian García.png");
    doc.addImage(firmaVivian, "PNG", 55, sigY - 20, 50, 18);
  } catch {}
  doc.line(40, sigY, 125, sigY);
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  doc.text("Vivian Garcia Lopera", 82.5, sigY + 5, { align: "center" });
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text("Directora Academica", 82.5, sigY + 10, { align: "center" });
  doc.text("Escuela de Navegacion Aerea SpA", 82.5, sigY + 14, { align: "center" });

  try {
    const firmaIvan = await loadImg("/img/Firma Ivan Araos.png");
    doc.addImage(firmaIvan, "PNG", pw - 105, sigY - 20, 50, 18);
  } catch {}
  doc.line(pw - 125, sigY, pw - 40, sigY);
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  doc.text("Ivan Araos Mancilla", pw - 82.5, sigY + 5, { align: "center" });
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text("Director", pw - 82.5, sigY + 10, { align: "center" });
  doc.text("Escuela de Navegacion Aerea SpA", pw - 82.5, sigY + 14, { align: "center" });

  // QR code
  try {
    const verifyUrl = `https://www.enae.cl/verificar?code=${diploma.verification_code}`;
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
      width: 300,
      margin: 1,
      color: { dark: "#003366", light: "#FFFFFF" },
    });
    doc.addImage(qrDataUrl, "PNG", cx - 12, ph - 40, 24, 24);
    doc.setFontSize(6);
    doc.setTextColor(150, 150, 150);
    doc.text("Escanea para verificar", cx, ph - 15, { align: "center" });
  } catch {}

  doc.setFontSize(7);
  doc.setTextColor(170, 170, 170);
  doc.text(`www.enae.cl/verificar?code=${diploma.verification_code}`, cx, ph - 11, { align: "center" });

  return doc;
}

export async function downloadDiplomaPDF(diploma: DiplomaData, courseCode?: string | null) {
  const doc = await generateDiplomaPDF(diploma);
  doc.save(`Diploma_${courseCode || diploma.course_code || "curso"}_${diploma.verification_code}.pdf`);
}

export async function getDiplomaPDFBase64(diploma: DiplomaData): Promise<string> {
  const doc = await generateDiplomaPDF(diploma);
  // Returns base64 without the data: prefix
  return doc.output("datauristring").split(",")[1];
}
