import { jsPDF } from "jspdf";

export type ApendiceCData = {
  student_name: string;
  rut: string;
  profession: string;
  address: string;
  city: string;
  date: Date;
  habilitation_text: string;
  company_name?: string;
};

const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

export function generateApendiceCPDF(data: ApendiceCData): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  const pw = doc.internal.pageSize.getWidth();

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
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("APÉNDICE C", pw / 2, 50, { align: "center" });

  doc.setFontSize(13);
  doc.text("DECLARACIÓN JURADA SIMPLE DE HABER RECIBIDO INSTRUCCIÓN", pw / 2, 62, { align: "center" });

  // Lugar y fecha
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  let y = 82;

  const cityVal = data.city || "________________";
  doc.text(`En  ${cityVal}  a  ${day}  de  ${month}  de  ${year}`, left, y);

  y += 12;
  const nameVal = data.student_name || "_____________________________";
  const profVal = data.profession || "_____________________________";
  doc.text(`Yo, ${nameVal}, profesión  ${profVal},`, left, y);
  y += 7;
  const addrVal = data.address || "_____________________________";
  doc.text(`domiciliado en  ${addrVal}, , Ciudad .  ${cityVal}`, left, y);

  y += 14;
  doc.text("DECLARO BAJO JURAMENTO que he recibido instrucción teórica y práctica del curso:", left, y);

  // Habilitation text (numbered)
  y += 12;
  doc.setFont("helvetica", "bold");
  const habText = `1.- ${data.habilitation_text || ""}`.trim();
  const habLines = doc.splitTextToSize(habText, contentW);
  doc.text(habLines, left, y);
  y += habLines.length * 6;

  // Empresa
  y += 10;
  doc.setFont("helvetica", "normal");
  const empresaLine = `Empresa con Certificado de Operador Aéreo (AOC) que impartió la instrucción: ${company}`;
  const empresaLines = doc.splitTextToSize(empresaLine, contentW);
  doc.text(empresaLines, left, y);
  y += empresaLines.length * 6;

  // Firma / RUT / Huella area (right side)
  const sigY = y + 50;
  const sigAreaX = right - 85;

  // Firma line
  doc.setFont("helvetica", "normal");
  doc.text("Firma:", sigAreaX, sigY);
  doc.line(sigAreaX + 14, sigY + 1, sigAreaX + 60, sigY + 1);

  // RUT line
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

  // Footer
  const ph = doc.internal.pageSize.getHeight();
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text("Ap.C. 1", left, ph - 15);
  doc.text("ED.2/SEPTIEMBRE 2015", right, ph - 15, { align: "right" });

  return doc;
}
