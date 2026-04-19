import { jsPDF } from "jspdf";
import QRCode from "qrcode";

export type ApendiceCData = {
  student_name: string;
  rut: string;
  profession: string;
  address: string;
  city: string;
  date: Date;
  habilitation_text: string;
  company_name?: string;
  verification_code: string;
  verification_url: string;
};

const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

export async function generateApendiceCPDF(data: ApendiceCData): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();

  const left = 25;
  const right = pw - 25;
  const contentW = right - left;

  const company = data.company_name || "Escuela de Navegación Aérea SpA";
  const day = data.date.getDate();
  const month = MONTHS[data.date.getMonth()];
  const year = data.date.getFullYear();

  // DAN 151 top-left
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("DAN 151", left, 20);

  // Centered header
  doc.setFontSize(16);
  doc.text("APÉNDICE C", pw / 2, 50, { align: "center" });

  doc.setFontSize(13);
  doc.text("DECLARACIÓN JURADA SIMPLE DE HABER RECIBIDO INSTRUCCIÓN", pw / 2, 62, {
    align: "center",
    maxWidth: contentW,
  });

  // Body — justified paragraphs via maxWidth + align: "justify"
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  let y = 82;

  const cityVal = data.city || "________________";
  const nameVal = data.student_name || "_____________________________";
  const profVal = data.profession || "_____________________________";
  const addrVal = data.address || "_____________________________";

  // Lugar y fecha (short — left align)
  doc.text(`En  ${cityVal}  a  ${day}  de  ${month}  de  ${year}`, left, y, { maxWidth: contentW });
  y += 12;

  // Datos personales — justify
  const personalLine = `Yo, ${nameVal}, profesión ${profVal}, domiciliado en ${addrVal}, Ciudad ${cityVal}.`;
  doc.text(personalLine, left, y, { maxWidth: contentW, align: "justify" });
  y += doc.getTextDimensions(doc.splitTextToSize(personalLine, contentW)).h + 4;

  // Declaración — justify
  const declaration = "DECLARO BAJO JURAMENTO que he recibido instrucción teórica y práctica del curso:";
  doc.text(declaration, left, y, { maxWidth: contentW, align: "justify" });
  y += doc.getTextDimensions(doc.splitTextToSize(declaration, contentW)).h + 6;

  // Habilitation (bold + justify)
  doc.setFont("helvetica", "bold");
  const habText = `1.- ${data.habilitation_text || ""}`.trim();
  doc.text(habText, left, y, { maxWidth: contentW, align: "justify" });
  y += doc.getTextDimensions(doc.splitTextToSize(habText, contentW)).h + 6;

  // Empresa — justify
  doc.setFont("helvetica", "normal");
  const empresaLine = `Empresa con Certificado de Operador Aéreo (AOC) que impartió la instrucción: ${company}`;
  doc.text(empresaLine, left, y, { maxWidth: contentW, align: "justify" });
  y += doc.getTextDimensions(doc.splitTextToSize(empresaLine, contentW)).h + 6;

  // Firma / RUT / Huella block (right side)
  const sigY = Math.max(y + 50, ph - 100);
  const sigAreaX = right - 85;

  doc.text("Firma:", sigAreaX, sigY);
  doc.line(sigAreaX + 14, sigY + 1, sigAreaX + 60, sigY + 1);

  const rutY = sigY + 10;
  const rutVal = data.rut || "________________";
  doc.text(`RUT:  ${rutVal}`, sigAreaX, rutY);

  // Huella placeholder box
  const huellaX = right - 22;
  const huellaY = sigY - 22;
  doc.setDrawColor(170, 170, 170);
  doc.setLineDashPattern([1.2, 1.2], 0);
  doc.rect(huellaX, huellaY, 20, 25);
  doc.setLineDashPattern([], 0);
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text("huella", huellaX + 10, huellaY + 14, { align: "center" });
  doc.text("pulgar", huellaX + 10, huellaY + 18, { align: "center" });
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);

  // QR de verificación DGAC (bottom-left, above footer)
  try {
    const qrDataUrl = await QRCode.toDataURL(data.verification_url, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 200,
    });
    const qrSize = 28;
    const qrX = left;
    const qrY = ph - qrSize - 25;
    doc.addImage(qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize);

    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text("Verificación DGAC", qrX + qrSize + 4, qrY + 6);
    doc.setFontSize(7);
    doc.text(`Código: ${data.verification_code}`, qrX + qrSize + 4, qrY + 12);
    doc.text("Escanea el QR para verificar la autenticidad", qrX + qrSize + 4, qrY + 18, { maxWidth: contentW - qrSize - 10 });
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
  } catch {}

  // Footer
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text("Ap.C. 1", left, ph - 15);
  doc.text("ED.2/SEPTIEMBRE 2015", right, ph - 15, { align: "right" });

  return doc;
}
