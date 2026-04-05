"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import KalturaPlayer from "@/components/KalturaPlayer";
import ExamPlayer from "@/components/ExamPlayer";
import DiscussionPanel from "@/components/DiscussionPanel";
import { jsPDF } from "jspdf";
import QRCode from "qrcode";

type CourseDelivery = {
  id: string;
  status: string;
  course_id: string;
  course_title: string;
  course_code: string;
  course_duration: string;
  course_description: string;
  course_modules: string[];
  session_dates: string;
  session_location: string;
  session_modality: string;
  moodle_url: string | null;
  instructor_name: string | null;
  instructor_whatsapp: string | null;
  student_name: string;
};

type CourseModule = {
  id: string;
  sort_order: number;
  title: string;
  description: string | null;
  video_entry_id: string | null;
  video_title: string | null;
  activities: { type: string; title: string; description?: string; url?: string }[];
};

type ModuleProgress = {
  module_id: string;
  status: "not_started" | "in_progress" | "completed";
};

type SurveyResponse = {
  id: string;
  questionnaire_type: string;
  module_name: string | null;
  created_at: string;
};

type Message = {
  id: string;
  message: string;
  created_at: string;
  profiles: { first_name: string; last_name: string; role: string } | null;
};

type Tab = "info" | "modules" | "grades" | "evaluation" | "messages";

type GradeItemRow = { id: string; name: string; weight: number };
type GradeRow = { grade_item_id: string; score: number | null };
type DiplomaRow = { verification_code: string; final_score: number | null; status: string; issued_date: string };

type LessonData = {
  id: string;
  sort_order: number;
  type: string;
  title: string;
  description: string | null;
  module_id: string;
};

type ActivityProgress = {
  activity_id: string;
  status: "not_started" | "in_progress" | "completed";
};

const lessonIcons: Record<string, string> = {
  video: "🎬",
  task: "📝",
  exam: "📋",
  discussion: "💬",
  zoom: "🎥",
  reading: "📖",
  html: "🌐",
  h5p: "🎮",
};

const lessonLabels: Record<string, string> = {
  video: "Video",
  task: "Tarea",
  exam: "Examen",
  discussion: "Discusion",
  zoom: "Session Zoom",
  reading: "Lectura",
  html: "Contenido",
  h5p: "Interactivo",
};

export default function TpemsCourseDetail() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as Tab) || "info";

  const [course, setCourse] = useState<CourseDelivery | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [progress, setProgress] = useState<ModuleProgress[]>([]);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [surveyResponses, setSurveyResponses] = useState<SurveyResponse[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [updatingProgress, setUpdatingProgress] = useState(false);
  const [lessons, setLessons] = useState<LessonData[]>([]);
  const [activityProgress, setActivityProgress] = useState<ActivityProgress[]>([]);
  const [expandedLessonId, setExpandedLessonId] = useState<string | null>(null);
  const [gradeItems, setGradeItems] = useState<GradeItemRow[]>([]);
  const [studentGrades, setStudentGrades] = useState<GradeRow[]>([]);
  const [diploma, setDiploma] = useState<DiplomaRow | null>(null);

  const registrationId = params.id as string;

  // Content protection: block print, view source, save, copy, devtools
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Block Ctrl+P (print), Ctrl+U (source), Ctrl+S (save), Ctrl+Shift+I (devtools), F12
      if ((e.ctrlKey || e.metaKey) && (e.key === "p" || e.key === "u" || e.key === "s")) {
        e.preventDefault();
        e.stopPropagation();
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "I" || e.key === "i" || e.key === "J" || e.key === "j" || e.key === "C" || e.key === "c")) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (e.key === "F12") {
        e.preventDefault();
        e.stopPropagation();
      }
      // Block Ctrl+A (select all) in lesson area
      if ((e.ctrlKey || e.metaKey) && e.key === "a") {
        const target = e.target as HTMLElement;
        if (!target.closest("input") && !target.closest("textarea")) {
          e.preventDefault();
        }
      }
    }
    function handleBeforePrint() {
      document.body.style.visibility = "hidden";
    }
    function handleAfterPrint() {
      document.body.style.visibility = "visible";
    }
    function handleCopy(e: ClipboardEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest("input") && !target.closest("textarea")) {
        e.preventDefault();
      }
    }
    function handleContextMenu(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest("input") && !target.closest("textarea")) {
        e.preventDefault();
      }
    }
    document.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("copy", handleCopy, true);
    document.addEventListener("contextmenu", handleContextMenu, true);
    window.addEventListener("beforeprint", handleBeforePrint);
    window.addEventListener("afterprint", handleAfterPrint);
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      document.removeEventListener("copy", handleCopy, true);
      document.removeEventListener("contextmenu", handleContextMenu, true);
      window.removeEventListener("beforeprint", handleBeforePrint);
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, []);

  async function downloadGradesPDF() {
    if (!course) return;
    const doc = new jsPDF();
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    const mx = 25; // margin x
    const contentW = pw - mx * 2;

    // Helper to load images
    function loadImg(src: string): Promise<HTMLImageElement> {
      return new Promise((resolve, reject) => {
        const img = new window.Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = () => reject();
        img.src = src;
      });
    }

    // ── Top accent bar ──
    doc.setFillColor(0, 51, 102);
    doc.rect(0, 0, pw, 4, "F");

    // ── Logo (left) + Title (right of logo) ──
    let headerBottom = 30;
    try {
      const logoImg = await loadImg("/img/logo-enae.png");
      const logoH = 22;
      const logoW = (logoImg.width / logoImg.height) * logoH;
      doc.addImage(logoImg, "PNG", mx, 12, logoW, logoH);

      const textX = mx + logoW + 8;
      doc.setFontSize(14);
      doc.setTextColor(0, 51, 102);
      doc.text("Escuela de Navegacion Aerea", textX, 22);
      doc.setFontSize(9);
      doc.setTextColor(120, 120, 120);
      doc.text("Centro de formacion aeronautica", textX, 28);
      headerBottom = 38;
    } catch {
      doc.setFontSize(16);
      doc.setTextColor(0, 51, 102);
      doc.text("ENAE - Escuela de Navegacion Aerea", pw / 2, 20, { align: "center" });
      headerBottom = 28;
    }

    // ── Title ──
    doc.setFillColor(240, 244, 248);
    doc.roundedRect(mx, headerBottom, contentW, 14, 2, 2, "F");
    doc.setFontSize(13);
    doc.setTextColor(0, 51, 102);
    doc.text("CERTIFICADO DE CALIFICACIONES", pw / 2, headerBottom + 9, { align: "center" });

    // ── Student info card ──
    const infoY = headerBottom + 22;
    doc.setDrawColor(220, 225, 230);
    doc.setLineWidth(0.3);
    doc.roundedRect(mx, infoY, contentW, 32, 2, 2, "S");

    // Row 1: Alumno + Fecha
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text("ALUMNO", mx + 5, infoY + 6);
    doc.text("FECHA", pw - mx - 5, infoY + 6, { align: "right" });

    doc.setFontSize(10);
    doc.setTextColor(30, 30, 30);
    doc.text(course.student_name, mx + 5, infoY + 12);
    doc.text(new Date().toLocaleDateString("es-CL"), pw - mx - 5, infoY + 12, { align: "right" });

    // Separator line
    doc.setDrawColor(235, 238, 241);
    doc.line(mx + 5, infoY + 16, pw - mx - 5, infoY + 16);

    // Row 2: Curso + Codigo
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text("CURSO", mx + 5, infoY + 21);
    doc.text("CODIGO", pw - mx - 5, infoY + 21, { align: "right" });

    doc.setFontSize(9);
    doc.setTextColor(30, 30, 30);
    // Truncate course title if too long
    const maxTitleW = contentW - 60;
    let titleText = course.course_title;
    while (doc.getTextWidth(titleText) > maxTitleW && titleText.length > 10) {
      titleText = titleText.substring(0, titleText.length - 2);
    }
    if (titleText !== course.course_title) titleText += "...";
    doc.text(titleText, mx + 5, infoY + 27);
    doc.setTextColor(0, 51, 102);
    doc.text(course.course_code || "", pw - mx - 5, infoY + 27, { align: "right" });

    // ── Build module data ──
    type PdfRow = { name: string; hasExam: boolean; score: number | null; weight: number };
    const rows: PdfRow[] = [];
    const examGradeItems: { weight: number; score: number | null }[] = [];

    modules.forEach((mod, idx) => {
      const modLessons = lessons.filter((l) => l.module_id === mod.id);
      const hasExam = modLessons.some((l) => l.type === "exam");
      const gradeItem = gradeItems.find((gi) =>
        gi.name.toLowerCase().includes(mod.title.toLowerCase()) ||
        gi.name.toLowerCase().includes(`modulo ${idx + 1}`) ||
        gi.name.toLowerCase().includes(`módulo ${idx + 1}`)
      );
      const grade = gradeItem ? studentGrades.find((g) => g.grade_item_id === gradeItem.id) : null;
      rows.push({ name: `${idx + 1}. ${mod.title}`, hasExam, score: hasExam && grade ? grade.score : null, weight: gradeItem?.weight || 0 });
      if (hasExam && gradeItem) examGradeItems.push({ weight: gradeItem.weight, score: grade?.score ?? null });
    });

    // ── Table ──
    const tableX = mx;
    const tableRight = pw - mx;
    const tipoCenterX = 118;
    const notaCenterX = 148;
    const estadoCenterX = 175;
    const rowH = 10;
    let y = infoY + 40;

    // Section label
    doc.setFontSize(9);
    doc.setTextColor(0, 51, 102);
    doc.text("DETALLE DE MODULOS", tableX, y);
    y += 5;

    // Table header
    const headerH = 12;
    doc.setFillColor(0, 51, 102);
    doc.roundedRect(tableX, y, contentW, headerH, 2, 2, "F");
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text("Modulo", tableX + 6, y + 8);
    doc.text("Tipo", tipoCenterX, y + 8, { align: "center" });
    doc.text("Nota", notaCenterX, y + 8, { align: "center" });
    doc.text("Estado", estadoCenterX, y + 8, { align: "center" });
    y += headerH + 3;

    // Table rows
    rows.forEach((row, i) => {
      // Alternating background
      if (i % 2 === 0) {
        doc.setFillColor(247, 249, 252);
        doc.rect(tableX, y - 6, contentW, rowH, "F");
      }
      // Row border bottom
      doc.setDrawColor(235, 238, 241);
      doc.setLineWidth(0.2);
      doc.line(tableX, y + rowH - 6, tableRight, y + rowH - 6);

      // Left border accent for exam rows
      if (row.hasExam) {
        doc.setFillColor(0, 114, 206);
        doc.rect(tableX, y - 6, 2, rowH, "F");
      }

      // Module name
      doc.setFontSize(8.5);
      doc.setTextColor(40, 40, 40);
      const maxLen = 38;
      const name = row.name.length > maxLen ? row.name.substring(0, maxLen) + "..." : row.name;
      doc.text(name, tableX + 6, y);

      // Tipo badge (centered)
      doc.setFontSize(7);
      const tipoText = row.hasExam ? "Examen" : "Contenido";
      const tipoBadgeW = doc.getTextWidth(tipoText) + 5;
      if (row.hasExam) {
        doc.setFillColor(219, 234, 254);
        doc.roundedRect(tipoCenterX - tipoBadgeW / 2, y - 4, tipoBadgeW, 6, 1, 1, "F");
        doc.setTextColor(30, 64, 175);
      } else {
        doc.setFillColor(229, 231, 235);
        doc.roundedRect(tipoCenterX - tipoBadgeW / 2, y - 4, tipoBadgeW, 6, 1, 1, "F");
        doc.setTextColor(75, 85, 99);
      }
      doc.text(tipoText, tipoCenterX, y, { align: "center" });

      // Nota (centered)
      doc.setFontSize(9);
      if (row.hasExam && row.score != null) {
        doc.setTextColor(row.score >= 80 ? 22 : 220, row.score >= 80 ? 163 : 38, row.score >= 80 ? 74 : 38);
        doc.text(`${row.score}%`, notaCenterX, y, { align: "center" });
      } else {
        doc.setTextColor(180, 180, 180);
        doc.text("—", notaCenterX, y, { align: "center" });
      }

      // Estado badge (centered)
      doc.setFontSize(7);
      let estadoText = "";
      if (row.hasExam && row.score != null) {
        estadoText = row.score >= 80 ? "Aprobado" : "Reprobado";
        const estadoBadgeW = doc.getTextWidth(estadoText) + 5;
        if (row.score >= 80) {
          doc.setFillColor(220, 252, 231);
          doc.setTextColor(22, 101, 52);
        } else {
          doc.setFillColor(254, 226, 226);
          doc.setTextColor(153, 27, 27);
        }
        doc.roundedRect(estadoCenterX - estadoBadgeW / 2, y - 4, estadoBadgeW, 6, 1, 1, "F");
        doc.text(estadoText, estadoCenterX, y, { align: "center" });
      } else if (row.hasExam) {
        doc.setTextColor(150, 150, 150);
        doc.text("Pendiente", estadoCenterX, y, { align: "center" });
      } else {
        estadoText = "Aprobado";
        const estadoBadgeW = doc.getTextWidth(estadoText) + 5;
        doc.setFillColor(220, 252, 231);
        doc.roundedRect(estadoCenterX - estadoBadgeW / 2, y - 4, estadoBadgeW, 6, 1, 1, "F");
        doc.setTextColor(22, 101, 52);
        doc.text(estadoText, estadoCenterX, y, { align: "center" });
      }

      y += rowH;
    });

    // Table bottom border
    doc.setDrawColor(200, 205, 210);
    doc.setLineWidth(0.3);
    doc.line(tableX, y - 4, tableRight, y - 4);

    // ── Final score box ──
    if (examGradeItems.length > 0) {
      const scoredExams = examGradeItems.filter((e) => e.score !== null);
      if (scoredExams.length > 0) {
        let finalScore: number;
        if (scoredExams.length === 1) {
          finalScore = scoredExams[0].score!;
        } else {
          let wSum = 0, totalW = 0;
          scoredExams.forEach((e) => { wSum += e.score! * e.weight; totalW += e.weight; });
          finalScore = totalW > 0 ? Math.round((wSum / totalW) * 100) / 100 : 0;
        }

        y += 4;
        const boxH = 16;
        const passed = finalScore >= 80;
        doc.setFillColor(passed ? 240 : 254, passed ? 253 : 242, passed ? 244 : 242);
        doc.roundedRect(mx, y, contentW, boxH, 2, 2, "F");
        doc.setDrawColor(passed ? 34 : 239, passed ? 197 : 68, passed ? 94 : 68);
        doc.setLineWidth(0.5);
        doc.roundedRect(mx, y, contentW, boxH, 2, 2, "S");

        // Left accent
        doc.setFillColor(passed ? 34 : 239, passed ? 197 : 68, passed ? 94 : 68);
        doc.rect(mx, y + 1, 3, boxH - 2, "F");

        doc.setFontSize(10);
        doc.setTextColor(0, 51, 102);
        doc.text(scoredExams.length > 1 ? "NOTA FINAL (Promedio Ponderado)" : "NOTA FINAL", mx + 8, y + 10);

        doc.setFontSize(14);
        doc.setTextColor(passed ? 22 : 185, passed ? 101 : 28, passed ? 52 : 28);
        doc.text(`${finalScore}%`, notaCenterX, y + 11, { align: "center" });

        doc.setFontSize(9);
        doc.text(passed ? "APROBADO" : "REPROBADO", estadoCenterX, y + 11, { align: "center" });

        if (scoredExams.length > 1) {
          y += boxH + 3;
          doc.setFontSize(7);
          doc.setTextColor(150, 150, 150);
          doc.text(`Ponderacion: ${examGradeItems.map((e, i) => `Examen ${i + 1}: ${e.weight}%`).join("  |  ")}`, mx + 4, y);
        }
      }
    }

    // ── Footer ──
    doc.setDrawColor(0, 51, 102);
    doc.setLineWidth(0.3);
    doc.line(mx, ph - 18, pw - mx, ph - 18);
    doc.setFontSize(7);
    doc.setTextColor(160, 160, 160);
    doc.text("ENAE - Escuela de Navegacion Aerea  |  www.enae.cl", pw / 2, ph - 13, { align: "center" });
    doc.text("Documento generado automaticamente por el sistema TPEMS", pw / 2, ph - 9, { align: "center" });

    doc.save(`Calificaciones_${course.course_code || "curso"}.pdf`);
  }

  async function downloadDiplomaPDF() {
    if (!diploma || !course) return;
    const doc = new jsPDF("landscape");
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    const cx = pw / 2;

    // Helper to load images
    function loadImg(src: string): Promise<HTMLImageElement> {
      return new Promise((resolve, reject) => {
        const img = new window.Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = () => reject();
        img.src = src;
      });
    }

    // Try to load diploma template
    let hasTemplate = false;
    try {
      const tpl = await loadImg("/img/diploma-template.png");
      doc.addImage(tpl, "PNG", 0, 0, pw, ph);
      hasTemplate = true;
    } catch {
      // Default design
      // Outer border - navy
      doc.setDrawColor(0, 51, 102);
      doc.setLineWidth(3);
      doc.rect(8, 8, pw - 16, ph - 16);
      // Gold inner border
      doc.setDrawColor(180, 160, 100);
      doc.setLineWidth(1);
      doc.rect(13, 13, pw - 26, ph - 26);
      // Thin navy inner
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

    // Gold line
    doc.setDrawColor(180, 160, 100);
    doc.setLineWidth(1);
    doc.line(cx - 65, 60, cx + 65, 60);

    // "Se certifica que"
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text("Se certifica que", cx, 72, { align: "center" });

    // Student name
    doc.setFontSize(26);
    doc.setTextColor(0, 51, 102);
    doc.text(course.student_name || "Alumno", cx, 87, { align: "center" });

    // "ha completado satisfactoriamente el curso"
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text("ha completado satisfactoriamente el curso", cx, 98, { align: "center" });

    // Course title
    doc.setFontSize(20);
    doc.setTextColor(0, 75, 135);
    doc.text(course.course_title, cx, 113, { align: "center" });

    // Course code
    if (course.course_code) {
      doc.setFontSize(9);
      doc.setTextColor(140, 140, 140);
      doc.text(`Codigo: ${course.course_code}`, cx, 120, { align: "center" });
    }

    // Score and status
    doc.setFontSize(11);
    doc.setTextColor(60, 60, 60);
    doc.text(`Calificacion Final: ${diploma.final_score}%   |   Estado: ${diploma.status === "approved" ? "APROBADO" : "REPROBADO"}`, cx, 131, { align: "center" });

    // Issue date
    const issuedDate = new Date(diploma.issued_date).toLocaleDateString("es-CL", { day: "2-digit", month: "long", year: "numeric" });
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Fecha de Emision: ${issuedDate}`, cx, 139, { align: "center" });

    // Verification code
    doc.setFontSize(9);
    doc.setTextColor(0, 51, 102);
    doc.text(`Codigo de Verificacion: ${diploma.verification_code}`, cx, 147, { align: "center" });

    // Signatures with images
    const sigY = ph - 42;
    doc.setDrawColor(150, 150, 150);
    doc.setLineWidth(0.3);

    // Left signature - Vivian Garcia (Directora Academica)
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

    // Right signature - Ivan Araos (Director)
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
      const qrDataUrl = await QRCode.toDataURL(verifyUrl, { width: 300, margin: 1, color: { dark: "#003366", light: "#FFFFFF" } });
      doc.addImage(qrDataUrl, "PNG", cx - 12, ph - 40, 24, 24);
      doc.setFontSize(6);
      doc.setTextColor(150, 150, 150);
      doc.text("Escanea para verificar", cx, ph - 15, { align: "center" });
    } catch (e) {
      console.error("QR generation failed:", e);
    }

    // Footer
    doc.setFontSize(7);
    doc.setTextColor(170, 170, 170);
    doc.text(`www.enae.cl/verificar?code=${diploma.verification_code}`, cx, ph - 11, { align: "center" });

    doc.save(`Diploma_${course.course_code || "curso"}_${diploma.verification_code}.pdf`);
  }

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("registrations")
        .select(
          `
          id,
          status,
          first_name,
          last_name,
          course_id,
          courses (title, code, duration, description, modules, moodle_url, instructor_name, instructor_whatsapp),
          sessions (dates, location, modality)
        `
        )
        .eq("id", registrationId)
        .single();

      if (!error && data) {
        const r = data as any;
        const courseData: CourseDelivery = {
          id: r.id,
          status: r.status,
          course_id: r.course_id,
          course_title: r.courses?.title || "",
          course_code: r.courses?.code || "",
          course_duration: r.courses?.duration || "",
          course_description: r.courses?.description || "",
          course_modules: r.courses?.modules || [],
          session_dates: r.sessions?.dates || "",
          session_location: r.sessions?.location || "",
          session_modality: r.sessions?.modality || "",
          moodle_url: r.courses?.moodle_url || null,
          instructor_name: r.courses?.instructor_name || null,
          instructor_whatsapp: r.courses?.instructor_whatsapp || null,
          student_name: `${r.first_name || ""} ${r.last_name || ""}`.trim(),
        };
        setCourse(courseData);

        // Load course modules
        const { data: modulesData } = await supabase
          .from("course_modules")
          .select("*")
          .eq("course_id", r.course_id)
          .order("sort_order");

        if (modulesData && modulesData.length > 0) {
          setModules(modulesData as CourseModule[]);

          // Load progress
          const { data: progressData } = await supabase
            .from("module_progress")
            .select("module_id, status")
            .eq("registration_id", r.id);

          if (progressData) {
            setProgress(progressData as ModuleProgress[]);
          }

          // Load lessons (module_activities) for all modules
          const modIds = modulesData.map((m: any) => m.id);
          const { data: lessonsData } = await supabase
            .from("module_activities")
            .select("*")
            .in("module_id", modIds)
            .order("sort_order");
          if (lessonsData) setLessons(lessonsData as LessonData[]);

          // Load activity progress
          const lessonIds = (lessonsData || []).map((l: any) => l.id);
          if (lessonIds.length > 0) {
            const { data: actProg } = await supabase
              .from("activity_progress")
              .select("activity_id, status")
              .eq("registration_id", r.id)
              .in("activity_id", lessonIds);
            if (actProg) setActivityProgress(actProg as ActivityProgress[]);
          }

          // Auto-select last in-progress or first module
          const inProgressMod = progressData?.find(
            (p: any) => p.status === "in_progress"
          );
          if (inProgressMod) {
            setSelectedModuleId((inProgressMod as any).module_id);
          } else {
            setSelectedModuleId(modulesData[0].id);
          }
        }

        // Load grades and diploma
        const { data: gItems } = await supabase
          .from("grade_items")
          .select("id, name, weight")
          .eq("course_id", r.course_id)
          .order("sort_order");
        if (gItems) setGradeItems(gItems as GradeItemRow[]);

        if (gItems && gItems.length > 0) {
          const { data: grades } = await supabase
            .from("student_grades")
            .select("grade_item_id, score")
            .eq("registration_id", r.id);
          if (grades) setStudentGrades(grades as GradeRow[]);
        }

        const { data: diplomaData } = await supabase
          .from("diplomas")
          .select("verification_code, final_score, status, issued_date")
          .eq("registration_id", r.id)
          .maybeSingle();
        if (diplomaData) setDiploma(diplomaData as DiplomaRow);

        // Load survey responses if completed
        if (r.status === "completed") {
          const { data: responses } = await supabase
            .from("survey_responses")
            .select("id, questionnaire_type, module_name, created_at")
            .eq("registration_id", r.id);
          if (responses) setSurveyResponses(responses);
        }
      }
      setLoading(false);
    }
    load();
  }, [registrationId]);

  const loadMessages = useCallback(async () => {
    const res = await fetch(`/api/mensajes?registrationId=${registrationId}`);
    const data = await res.json();
    if (data.messages) setMessages(data.messages);
  }, [registrationId]);

  useEffect(() => {
    if (activeTab === "messages") loadMessages();
  }, [activeTab, loadMessages]);

  async function updateModuleProgress(
    moduleId: string,
    status: "in_progress" | "completed"
  ) {
    setUpdatingProgress(true);
    await fetch("/api/modulos/progreso", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ registrationId, moduleId, status }),
    });

    setProgress((prev) => {
      const existing = prev.find((p) => p.module_id === moduleId);
      if (existing) {
        return prev.map((p) =>
          p.module_id === moduleId ? { ...p, status } : p
        );
      }
      return [...prev, { module_id: moduleId, status }];
    });

    // If completed, auto-advance to next module
    if (status === "completed") {
      const currentIdx = modules.findIndex((m) => m.id === moduleId);
      if (currentIdx < modules.length - 1) {
        const nextModule = modules[currentIdx + 1];
        setSelectedModuleId(nextModule.id);
        // Auto-mark next as in_progress
        await fetch("/api/modulos/progreso", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            registrationId,
            moduleId: nextModule.id,
            status: "in_progress",
          }),
        });
        setProgress((prev) => {
          const ex = prev.find((p) => p.module_id === nextModule.id);
          if (ex) {
            return prev.map((p) =>
              p.module_id === nextModule.id
                ? { ...p, status: "in_progress" }
                : p
            );
          }
          return [
            ...prev,
            { module_id: nextModule.id, status: "in_progress" },
          ];
        });
      }
    }
    setUpdatingProgress(false);
  }

  async function sendMessage() {
    if (!newMessage.trim()) return;
    setSendingMessage(true);
    await fetch("/api/mensajes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ registrationId, message: newMessage }),
    });
    setNewMessage("");
    await loadMessages();
    setSendingMessage(false);
  }

  function getModuleStatus(moduleId: string): string {
    return progress.find((p) => p.module_id === moduleId)?.status || "not_started";
  }

  // Progress calculation
  const completedCount = progress.filter((p) => p.status === "completed").length;
  const totalModules = modules.length;
  const progressPercent = totalModules > 0 ? Math.round((completedCount / totalModules) * 100) : 0;

  const selectedModule = modules.find((m) => m.id === selectedModuleId);

  if (loading) {
    return <div className="text-center py-16 text-gray-400">Cargando...</div>;
  }

  if (!course) {
    return (
      <div className="text-center py-16">
        <h2 className="text-lg text-gray-500">Curso no encontrado</h2>
        <Link href="/tpems" className="text-[#0072CE] hover:underline text-sm mt-2 inline-block">
          Volver al dashboard
        </Link>
      </div>
    );
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "info", label: "Info" },
    ...(modules.length > 0 && lessons.length > 0 ? [{ key: "modules" as Tab, label: `Módulos (${totalModules})` }] : []),
    { key: "grades", label: "Calificaciones" },
    { key: "evaluation", label: "Encuesta" },
    { key: "messages", label: "Mensajes" },
  ];

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("es-CL", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function buildQuestionnaireList() {
    const items: { name: string; type: string; moduleName?: string; completed: boolean; dateCompleted?: string }[] = [];
    const courseResponse = surveyResponses.find((r) => r.questionnaire_type === "course");
    items.push({ name: "Encuesta de satisfacción del curso", type: "course", completed: !!courseResponse, dateCompleted: courseResponse?.created_at });
    return items;
  }

  const tabIcons: Record<Tab, string> = {
    info: "ℹ️",
    modules: "📚",
    grades: "📊",
    evaluation: "📋",
    messages: "💬",
  };

  return (
    <>
      {/* Course header */}
      <div className="bg-gradient-to-r from-[#003366] via-[#004B87] to-[#0072CE] text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/tpems")}
              className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center hover:bg-white/20 transition shrink-0"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold leading-tight truncate">{course.course_title}</h1>
              <div className="flex items-center gap-2 mt-1 text-white/60 text-xs">
                <span className="bg-white/10 px-2 py-0.5 rounded">{course.course_code}</span>
                <span className="hidden sm:inline">{course.session_dates}</span>
                <span className="hidden sm:inline">·</span>
                <span className="hidden sm:inline">{course.session_location}</span>
              </div>
            </div>
            {modules.length > 0 && (
              <div className="hidden sm:flex items-center gap-3 bg-white/10 backdrop-blur rounded-xl px-4 py-2.5">
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-wider text-white/50 font-medium">Progreso</p>
                  <p className="text-lg font-bold leading-none">{progressPercent}%</p>
                </div>
                <div className="w-16 h-16 relative">
                  <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                    <path d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3" />
                    <path d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="white" strokeWidth="3" strokeDasharray={`${progressPercent}, 100`} strokeLinecap="round" />
                  </svg>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex gap-1 overflow-x-auto scrollbar-hide -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-3.5 text-sm font-medium whitespace-nowrap transition-all border-b-2 ${
                  activeTab === tab.key
                    ? "text-[#003366] border-[#F57C00]"
                    : "text-gray-400 border-transparent hover:text-gray-600 hover:border-gray-300"
                }`}
              >
                <span className="text-xs">{tabIcons[tab.key]}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* ============ INFO TAB ============ */}
        {activeTab === "info" && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-[#003366] to-[#004B87] px-6 py-8 sm:py-10">
              <div className="flex flex-col sm:flex-row items-start gap-5">
                <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center shrink-0">
                  <svg className="w-8 h-8 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{course.course_title}</h2>
                  <p className="text-white/50 text-sm mt-1">{course.course_code}</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 text-sm">⏱</div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Duración</p>
                    <p className="text-sm font-semibold text-gray-800">{course.course_duration}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                  <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600 text-sm">🎓</div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Modalidad</p>
                    <p className="text-sm font-semibold text-gray-800">{course.session_modality}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 text-sm">👨‍🏫</div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Instructor</p>
                    <p className="text-sm font-semibold text-gray-800">{course.instructor_name || "Por confirmar"}</p>
                  </div>
                </div>
              </div>
              {course.course_description && (
                <p className="text-sm text-gray-600 leading-relaxed mb-6">{course.course_description}</p>
              )}
              {modules.length > 0 && (
                <button onClick={() => setActiveTab("modules")} className="inline-flex items-center gap-2 bg-gradient-to-r from-[#0072CE] to-[#005BA1] hover:from-[#005BA1] hover:to-[#003366] text-white text-sm font-semibold px-6 py-3 rounded-xl transition shadow-sm shadow-blue-200">
                  {completedCount > 0 ? "Continuar Curso" : "Iniciar Curso"}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                </button>
              )}
            </div>
          </div>
        )}

        {/* ============ MODULES TAB ============ */}
        {activeTab === "modules" && modules.length > 0 && (() => {
          const moduleLessons = selectedModuleId ? lessons.filter((l) => l.module_id === selectedModuleId) : [];

          function getLessonStatus(lessonId: string) {
            return activityProgress.find((p) => p.activity_id === lessonId)?.status || "not_started";
          }

          function isLessonUnlocked(lessonIdx: number) {
            if (lessonIdx === 0) return true;
            const prevLesson = moduleLessons[lessonIdx - 1];
            return prevLesson ? getLessonStatus(prevLesson.id) === "completed" : true;
          }

          async function completeLesson(lessonId: string) {
            setUpdatingProgress(true);
            await fetch("/api/actividades/progreso", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ registration_id: registrationId, activity_id: lessonId, status: "completed" }),
            });
            setActivityProgress((prev) => {
              const exists = prev.find((p) => p.activity_id === lessonId);
              if (exists) return prev.map((p) => p.activity_id === lessonId ? { ...p, status: "completed" as const } : p);
              return [...prev, { activity_id: lessonId, status: "completed" as const }];
            });
            // Refresh module progress
            const { data: mp } = await supabase.from("module_progress").select("module_id, status").eq("registration_id", registrationId);
            if (mp) setProgress(mp as ModuleProgress[]);
            setUpdatingProgress(false);
          }

          function parseLessonData(les: LessonData) {
            let desc = les.description || "";
            let entryId = "";
            let zoomUrl = "";
            let zoomDatetime = "";
            if ((les.type === "video" || les.type === "zoom") && desc.startsWith("{")) {
              try {
                const p = JSON.parse(desc);
                if (les.type === "video") { desc = p.text || ""; entryId = p.entry_id || ""; }
                if (les.type === "zoom") { zoomUrl = p.url || ""; zoomDatetime = p.datetime || ""; desc = ""; }
              } catch {}
            }
            return { desc, entryId, zoomUrl, zoomDatetime };
          }

          return (
          <div className="flex gap-6">
            {/* Module sidebar */}
            <div className="w-72 shrink-0 hidden lg:block">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Progreso</span>
                  <span className="text-sm font-bold text-[#0072CE]">{progressPercent}%</span>
                </div>
                <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#0072CE] to-[#4FC3F7] rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }} />
                </div>
                <p className="text-xs text-gray-400 mt-2">{completedCount} de {totalModules} modulos completados</p>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Contenido del curso</h3>
                </div>
                {modules.map((mod, idx) => {
                  const status = getModuleStatus(mod.id);
                  const isSelected = mod.id === selectedModuleId;
                  const modLessons = lessons.filter((l) => l.module_id === mod.id);
                  const completedLessons = modLessons.filter((l) => getLessonStatus(l.id) === "completed").length;
                  const prevModuleCompleted = idx === 0 || getModuleStatus(modules[idx - 1].id) === "completed";
                  const isModuleLocked = !prevModuleCompleted;
                  const lessonPercent = modLessons.length > 0 ? Math.round((completedLessons / modLessons.length) * 100) : 0;
                  return (
                    <button key={mod.id}
                      onClick={() => { if (!isModuleLocked) { setSelectedModuleId(mod.id); setExpandedLessonId(null); } }}
                      disabled={isModuleLocked}
                      className={`w-full text-left px-4 py-3.5 flex items-start gap-3 transition border-b border-gray-50 last:border-0 ${isSelected ? "bg-blue-50/80 border-l-[3px] border-l-[#0072CE]" : isModuleLocked ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-50"}`}>
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold ${status === "completed" ? "bg-green-500 text-white" : status === "in_progress" ? "bg-[#F57C00] text-white" : "bg-gray-100 text-gray-400"}`}>
                        {status === "completed" ? (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                        ) : isModuleLocked ? "🔒" : (idx + 1)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm leading-tight truncate ${isSelected ? "font-semibold text-[#003366]" : isModuleLocked ? "text-gray-400" : "text-gray-700"}`}>{mod.title}</p>
                        {isModuleLocked ? (
                          <span className="text-[11px] text-gray-400">Completa el modulo anterior</span>
                        ) : (
                          <div className="flex items-center gap-2 mt-1.5">
                            <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all ${status === "completed" ? "bg-green-400" : "bg-[#0072CE]"}`} style={{ width: `${lessonPercent}%` }} />
                            </div>
                            <span className="text-[11px] text-gray-400 shrink-0">{completedLessons}/{modLessons.length}</span>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Module content */}
            <div className="flex-1 min-w-0">
              <div className="lg:hidden mb-4">
                <select value={selectedModuleId || ""} onChange={(e) => setSelectedModuleId(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium bg-white shadow-sm">
                  {modules.map((mod, idx) => (<option key={mod.id} value={mod.id}>{idx + 1}. {mod.title} {getModuleStatus(mod.id) === "completed" ? "✓" : ""}</option>))}
                </select>
              </div>

              {selectedModule && (
                <div className="space-y-5">
                  <div className="bg-gradient-to-r from-[#003366] to-[#004B87] rounded-2xl p-6 text-white">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 text-lg font-bold">
                        {modules.findIndex(m => m.id === selectedModuleId) + 1}
                      </div>
                      <div>
                        <h2 className="text-lg font-bold">{selectedModule.title}</h2>
                        {selectedModule.description && <p className="text-sm text-white/60 mt-1 leading-relaxed">{selectedModule.description}</p>}
                        <div className="flex items-center gap-4 mt-3">
                          <span className="text-xs text-white/40">{moduleLessons.length} lecciones</span>
                          <span className="text-xs text-white/40">·</span>
                          <span className="text-xs text-white/40">{moduleLessons.filter(l => getLessonStatus(l.id) === "completed").length} completadas</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Lessons list */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-800">Lecciones</h3>
                      <span className="text-xs text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full">
                        {moduleLessons.filter(l => getLessonStatus(l.id) === "completed").length}/{moduleLessons.length}
                      </span>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {moduleLessons.map((les, idx) => {
                        const status = getLessonStatus(les.id);
                        const unlocked = isLessonUnlocked(idx);
                        const expanded = expandedLessonId === les.id;
                        const { desc, entryId, zoomUrl, zoomDatetime } = parseLessonData(les);

                        return (
                          <div key={les.id} className={`transition ${!unlocked ? "opacity-50" : ""}`}>
                            {/* Lesson header */}
                            <button
                              onClick={() => unlocked && setExpandedLessonId(expanded ? null : les.id)}
                              disabled={!unlocked}
                              className={`w-full text-left px-5 py-4 flex items-center gap-4 transition ${unlocked && !expanded ? "hover:bg-gray-50" : ""} ${expanded ? "bg-blue-50/50" : ""}`}
                            >
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-sm ${status === "completed" ? "bg-green-100 text-green-600" : unlocked ? "bg-blue-100 text-[#0072CE]" : "bg-gray-100 text-gray-300"}`}>
                                {status === "completed" ? (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                ) : lessonIcons[les.type] || "•"}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-medium ${status === "completed" ? "text-green-700" : "text-gray-800"}`}>{les.title}</p>
                                <span className={`text-xs ${status === "completed" ? "text-green-500" : "text-gray-400"}`}>{lessonLabels[les.type] || les.type}</span>
                              </div>
                              {!unlocked && <span className="text-xs text-gray-300">🔒</span>}
                              {unlocked && (
                                <svg className={`w-4 h-4 text-gray-300 transition-transform ${expanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              )}
                            </button>

                            {/* Lesson expanded content */}
                            {expanded && unlocked && (
                              <div className="px-5 pb-5 pt-1 bg-gray-50/50">
                                {/* Video lesson */}
                                {les.type === "video" && (
                                  <div>
                                    {desc && <p className="text-sm text-gray-600 mb-3">{desc}</p>}
                                    {entryId && <KalturaPlayer entryId={entryId} />}
                                    {status !== "completed" && (
                                      <button onClick={() => completeLesson(les.id)} disabled={updatingProgress} className="mt-3 bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded-lg transition disabled:opacity-50">
                                        {updatingProgress ? "Guardando..." : "Marcar como completado"}
                                      </button>
                                    )}
                                  </div>
                                )}

                                {/* Task lesson */}
                                {les.type === "task" && (
                                  <div>
                                    {desc && <p className="text-sm text-gray-600 mb-3">{desc}</p>}
                                    {status !== "completed" && (
                                      <button onClick={() => completeLesson(les.id)} disabled={updatingProgress} className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded-lg transition disabled:opacity-50">
                                        {updatingProgress ? "Guardando..." : "Marcar tarea como completada"}
                                      </button>
                                    )}
                                  </div>
                                )}

                                {/* Exam lesson */}
                                {les.type === "exam" && (
                                  <ExamPlayer
                                    examId={les.id}
                                    registrationId={registrationId}
                                    onComplete={(score, passed) => {
                                      if (passed) completeLesson(les.id);
                                    }}
                                  />
                                )}

                                {/* Discussion lesson */}
                                {les.type === "discussion" && (
                                  <div>
                                    {desc && <p className="text-sm text-gray-600 mb-3">{desc}</p>}
                                    <DiscussionPanel
                                      activityId={les.id}
                                      registrationId={registrationId}
                                      onPostSubmitted={() => {
                                        if (status !== "completed") completeLesson(les.id);
                                      }}
                                    />
                                  </div>
                                )}

                                {/* Zoom lesson */}
                                {les.type === "zoom" && (
                                  <div>
                                    {zoomDatetime && (
                                      <p className="text-sm text-gray-600 mb-2">
                                        📅 {new Date(zoomDatetime).toLocaleString("es-CL", { weekday: "long", day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                                      </p>
                                    )}
                                    {zoomUrl && (
                                      <a href={zoomUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition">
                                        🎥 Unirse a la sesion Zoom
                                      </a>
                                    )}
                                    {status !== "completed" && (
                                      <button onClick={() => completeLesson(les.id)} disabled={updatingProgress} className="ml-3 bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded-lg transition disabled:opacity-50">
                                        Marcar como completado
                                      </button>
                                    )}
                                  </div>
                                )}

                                {/* Reading lesson */}
                                {les.type === "reading" && (
                                  <div>
                                    {desc && desc.split("\n").filter(Boolean).map((url, i) => (
                                      <a key={i} href={url.trim()} target="_blank" rel="noopener noreferrer" className="block text-sm text-[#0072CE] hover:underline mb-2">
                                        📄 {url.trim().split("/").pop() || `Documento ${i + 1}`}
                                      </a>
                                    ))}
                                    {status !== "completed" && (
                                      <button onClick={() => completeLesson(les.id)} disabled={updatingProgress} className="mt-2 bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded-lg transition disabled:opacity-50">
                                        Marcar lectura como completada
                                      </button>
                                    )}
                                  </div>
                                )}

                                {/* HTML content lesson — protected via sandboxed iframe */}
                                {les.type === "html" && (
                                  <div>
                                    {desc && (() => {
                                      const protectionCSS = `<style>
*{-webkit-user-select:none!important;user-select:none!important;-webkit-touch-callout:none!important;}
img,video,canvas,svg{pointer-events:none!important;-webkit-user-drag:none!important;}
iframe{pointer-events:auto!important;}
@media print{html,body{display:none!important;visibility:hidden!important;}}
::selection{background:transparent!important;color:inherit!important;}
::-moz-selection{background:transparent!important;color:inherit!important;}
</style>`;
                                      const protectionJS = `<script>(function(){
var d=document;
d.addEventListener('contextmenu',function(e){e.preventDefault();},true);
d.addEventListener('copy',function(e){e.preventDefault();},true);
d.addEventListener('cut',function(e){e.preventDefault();},true);
d.addEventListener('selectstart',function(e){e.preventDefault();},true);
d.addEventListener('dragstart',function(e){e.preventDefault();},true);
d.addEventListener('keydown',function(e){
  var k=e.key,c=e.ctrlKey||e.metaKey;
  if(c&&(k==='p'||k==='u'||k==='s'||k==='a'||k==='c'))e.preventDefault();
  if(c&&e.shiftKey&&(k==='I'||k==='i'||k==='J'||k==='j'||k==='C'||k==='c'))e.preventDefault();
  if(k==='F12')e.preventDefault();
},true);
d.addEventListener('mousedown',function(e){if(e.detail>1)e.preventDefault();},true);
})();</script>`;
                                      const isFullDoc = desc.trim().toLowerCase().startsWith("<!doctype") || desc.trim().toLowerCase().startsWith("<html");
                                      // Auto-resize script that posts height to parent
                                      const resizeJS = `<script>
(function r(){
  var h=document.documentElement.scrollHeight;
  window.parent.postMessage({type:'iframe-height',height:h,id:'${les.id}'},'*');
  setTimeout(r,1000);
})();
</script>`;
                                      const fullProtectionJS = protectionJS + resizeJS;
                                      const htmlDoc = isFullDoc
                                        ? desc.replace(/<\/head>/i, `${protectionCSS}</head>`).replace(/<\/body>/i, `${fullProtectionJS}</body>`)
                                        : `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">${protectionCSS}</head><body>${desc}${fullProtectionJS}</body></html>`;
                                      // Use Blob URL for cross-origin isolation (prevents parent from reading iframe content)
                                      const blob = new Blob([htmlDoc], { type: "text/html" });
                                      const blobUrl = URL.createObjectURL(blob);
                                      return (
                                        <iframe
                                          src={blobUrl}
                                          className="w-full border-0 rounded-lg mb-3"
                                          style={{ minHeight: "500px" }}
                                          sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-presentation"
                                          allow="autoplay; fullscreen; encrypted-media"
                                          ref={(el) => {
                                            if (!el) return;
                                            // Listen for height messages from iframe
                                            const handler = (e: MessageEvent) => {
                                              if (e.data?.type === 'iframe-height' && e.data?.id === les.id) {
                                                el.style.height = `${e.data.height + 20}px`;
                                              }
                                            };
                                            window.addEventListener('message', handler);
                                            // Cleanup blob URL on unmount
                                            el.addEventListener('load', () => {
                                              setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
                                            }, { once: true });
                                          }}
                                        />
                                      );
                                    })()}
                                    {status !== "completed" && (
                                      <button onClick={() => completeLesson(les.id)} disabled={updatingProgress} className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded-lg transition disabled:opacity-50">
                                        {updatingProgress ? "Guardando..." : "Marcar como completado"}
                                      </button>
                                    )}
                                  </div>
                                )}

                                {/* HTML5 interactive content */}
                                {les.type === "h5p" && (
                                  <div>
                                    {desc && desc.startsWith("http") && (
                                      <div className="rounded-lg overflow-hidden border border-gray-200 mb-3">
                                        <iframe
                                          src={desc.trim()}
                                          className="w-full border-0"
                                          style={{ height: "500px" }}
                                          sandbox="allow-scripts allow-popups allow-forms"
                                          allowFullScreen
                                        />
                                      </div>
                                    )}
                                    {status !== "completed" && (
                                      <button onClick={() => completeLesson(les.id)} disabled={updatingProgress} className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded-lg transition disabled:opacity-50">
                                        {updatingProgress ? "Guardando..." : "Marcar como completado"}
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {moduleLessons.length === 0 && (
                        <div className="px-5 py-8 text-center">
                          <p className="text-gray-400 text-sm">Este modulo aun no tiene lecciones configuradas.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Module status */}
                  <div className="flex items-center justify-between">
                    {getModuleStatus(selectedModule.id) === "not_started" && moduleLessons.length > 0 && (
                      <button onClick={() => updateModuleProgress(selectedModule.id, "in_progress")} disabled={updatingProgress}
                        className="bg-gradient-to-r from-[#F57C00] to-[#E65100] hover:from-[#E65100] hover:to-[#BF360C] text-white text-sm font-semibold px-6 py-3 rounded-xl transition disabled:opacity-50 shadow-sm shadow-orange-200">
                        Iniciar modulo
                      </button>
                    )}
                    {getModuleStatus(selectedModule.id) === "completed" && (
                      <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 text-sm font-semibold px-4 py-2.5 rounded-xl border border-green-200">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Modulo completado
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          );
        })()}

        {/* ============ GRADES TAB ============ */}
        {activeTab === "grades" && (
          <div className="space-y-6">
            {modules.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
                <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl">📊</div>
                <p className="text-gray-500 font-medium">Las calificaciones estarán disponibles una vez que completes los módulos.</p>
              </div>
            ) : (() => {
              // Build module rows with exam info
              const moduleRows = modules.map((mod, idx) => {
                const modLessons = lessons.filter((l) => l.module_id === mod.id);
                const hasExam = modLessons.some((l) => l.type === "exam");
                const gradeItem = gradeItems.find((gi) =>
                  gi.name.toLowerCase().includes(mod.title.toLowerCase()) ||
                  gi.name.toLowerCase().includes(`modulo ${idx + 1}`) ||
                  gi.name.toLowerCase().includes(`módulo ${idx + 1}`)
                );
                const grade = gradeItem ? studentGrades.find((g) => g.grade_item_id === gradeItem.id) : null;
                return { mod, idx, hasExam, gradeItem, score: hasExam && grade ? grade.score : null, weight: gradeItem?.weight || 0 };
              });
              const examModules = moduleRows.filter((r) => r.hasExam && r.score !== null);
              let finalScore: number | null = null;
              if (examModules.length > 0) {
                if (examModules.length === 1) {
                  finalScore = examModules[0].score;
                } else {
                  let wSum = 0, totalW = 0;
                  examModules.forEach((e) => { wSum += e.score! * e.weight; totalW += e.weight; });
                  finalScore = totalW > 0 ? Math.round((wSum / totalW) * 100) / 100 : 0;
                }
              }

              return (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-sm">📊</div>
                    <h3 className="font-semibold text-gray-800">Mis Calificaciones</h3>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
                        <th className="px-6 py-3 font-medium">Módulo</th>
                        <th className="px-6 py-3 font-medium text-center">Tipo</th>
                        <th className="px-6 py-3 font-medium text-center">Nota</th>
                        <th className="px-6 py-3 font-medium text-center">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {moduleRows.map((row) => (
                        <tr key={row.mod.id} className={`border-t border-gray-50 ${row.hasExam ? "bg-blue-50/30" : ""}`}>
                          <td className="px-6 py-3 text-gray-700">
                            <span className="text-gray-400 mr-1">{row.idx + 1}.</span>
                            {row.mod.title}
                          </td>
                          <td className="px-6 py-3 text-center">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded ${row.hasExam ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"}`}>
                              {row.hasExam ? "Examen" : "Contenido"}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-center">
                            {row.hasExam ? (
                              row.score !== null ? (
                                <span className={`font-bold ${row.score >= 80 ? "text-green-600" : "text-red-600"}`}>{row.score}%</span>
                              ) : (
                                <span className="text-gray-300">—</span>
                              )
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                          <td className="px-6 py-3 text-center">
                            {row.hasExam ? (
                              row.score !== null ? (
                                <span className={`text-xs font-medium px-2 py-1 rounded ${row.score >= 80 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                                  {row.score >= 80 ? "Aprobado" : "Reprobado"}
                                </span>
                              ) : (
                                <span className="text-xs text-gray-400">Pendiente</span>
                              )
                            ) : (
                              <span className="text-xs font-medium px-2 py-1 rounded bg-green-100 text-green-800">Aprobado</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Download grades button */}
                  <div className="px-6 py-3 border-t border-gray-100">
                    <button
                      onClick={downloadGradesPDF}
                      className="inline-flex items-center gap-2 text-sm text-[#003366] hover:text-[#004B87] font-medium transition"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                      Descargar Calificaciones (PDF)
                    </button>
                  </div>

                  {/* Final score */}
                  {finalScore !== null && (
                    <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                      <span className="font-semibold text-gray-800">
                        {examModules.length > 1 ? "Nota Final (Promedio Ponderado)" : "Nota Final"}
                      </span>
                      <span className={`text-xl font-bold ${finalScore >= 80 ? "text-green-600" : "text-red-600"}`}>{finalScore}%</span>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Diploma */}
            {diploma && (() => {
              const surveys = buildQuestionnaireList();
              const allSurveysCompleted = surveys.length > 0 && surveys.every((s) => s.completed);
              const pendingSurveys = surveys.filter((s) => !s.completed);

              return (
                <div className="bg-white rounded-2xl border border-green-200 shadow-sm overflow-hidden">
                  <div className="bg-green-50 px-6 py-4 flex items-center gap-3">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                    <div>
                      <h3 className="font-bold text-green-800">Diploma Emitido</h3>
                      <p className="text-sm text-green-600">Tu certificado ha sido emitido exitosamente.</p>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Código de Verificación</p>
                        <p className="font-mono font-bold text-[#003366] text-lg">{diploma.verification_code}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Calificación Final</p>
                        <p className="font-bold text-lg text-green-600">{diploma.final_score}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Estado</p>
                        <span className="text-xs font-medium px-2.5 py-1 rounded bg-green-100 text-green-800">
                          {diploma.status === "approved" ? "Aprobado" : "Reprobado"}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Fecha de Emisión</p>
                        <p className="text-gray-700">{new Date(diploma.issued_date).toLocaleDateString("es-CL", { day: "2-digit", month: "long", year: "numeric" })}</p>
                      </div>
                    </div>

                    {!allSurveysCompleted ? (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                          <div className="flex items-start gap-3">
                            <span className="text-xl shrink-0">📋</span>
                            <div>
                              <p className="text-sm font-semibold text-amber-800">Para descargar tu diploma debes completar las encuestas de evaluación</p>
                              <p className="text-xs text-amber-600 mt-1">Tienes {pendingSurveys.length} encuesta{pendingSurveys.length > 1 ? "s" : ""} pendiente{pendingSurveys.length > 1 ? "s" : ""}:</p>
                              <ul className="mt-2 space-y-1">
                                {pendingSurveys.map((s, i) => (
                                  <li key={i}>
                                    <Link
                                      href={`/tpems/curso/${course.id}/encuesta/${s.type}${s.moduleName ? `?module=${encodeURIComponent(s.moduleName)}` : ""}`}
                                      className="text-xs text-[#0072CE] hover:underline"
                                    >
                                      → {s.name}
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 pt-4 border-t border-gray-100 flex gap-3 flex-wrap">
                        <a
                          href={`/verificar?code=${diploma.verification_code}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 bg-[#003366] hover:bg-[#004B87] text-white text-sm font-medium px-4 py-2 rounded-lg transition"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                          Verificar Diploma
                        </a>
                        <button
                          onClick={downloadDiplomaPDF}
                          className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                          Descargar Diploma (PDF)
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* ============ EVALUATION TAB ============ */}
        {activeTab === "evaluation" && (
          <>
            {course.status !== "completed" ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
                <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl">🔒</div>
                <p className="text-gray-700 font-semibold">Los cuestionarios estarán disponibles al finalizar el curso</p>
                <p className="text-sm text-gray-400 mt-2 max-w-md mx-auto">Una vez que el curso sea marcado como completado, podrás responder las encuestas de evaluación.</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left px-6 py-4 font-medium text-gray-500 uppercase text-xs tracking-wider">Encuesta</th>
                      <th className="text-left px-6 py-4 font-medium text-gray-500 uppercase text-xs tracking-wider">Estado</th>
                      <th className="text-left px-6 py-4 font-medium text-gray-500 uppercase text-xs tracking-wider">Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {buildQuestionnaireList().map((item, idx) => (
                      <tr key={idx} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition">
                        <td className="px-6 py-4">
                          {item.completed ? (
                            <span className="text-gray-600">{item.name}</span>
                          ) : (
                            <Link href={`/tpems/curso/${course.id}/encuesta/${item.type}${item.moduleName ? `?module=${encodeURIComponent(item.moduleName)}` : ""}`} className="text-[#0072CE] hover:underline">{item.name}</Link>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex text-xs font-medium px-2.5 py-1 rounded border ${item.completed ? "bg-green-100 text-green-800 border-green-200" : "bg-yellow-100 text-yellow-800 border-yellow-200"}`}>
                            {item.completed ? "Completada" : "Pendiente"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-500">{item.dateCompleted ? formatDate(item.dateCompleted) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ============ MESSAGES TAB ============ */}
        {activeTab === "messages" && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Instructor contact */}
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-800">Mensajería</h3>
                {course.instructor_name && (
                  <p className="text-xs text-gray-500">Instructor: {course.instructor_name}</p>
                )}
              </div>
              {course.instructor_whatsapp && (
                <a
                  href={`https://wa.me/${course.instructor_whatsapp.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`Hola, soy alumno del curso ${course.course_title} (${course.course_code})`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  WhatsApp
                </a>
              )}
            </div>

            {/* Messages list */}
            <div className="h-80 overflow-y-auto px-5 py-4 space-y-3 bg-gray-50">
              {messages.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-8">No hay mensajes aún. Escribe al instructor.</p>
              ) : (
                messages.map((msg) => {
                  const isStudent = (msg.profiles as any)?.role === "student";
                  return (
                    <div key={msg.id} className={`flex ${isStudent ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[75%] rounded-lg px-3 py-2 ${isStudent ? "bg-[#0072CE] text-white" : "bg-white border border-gray-200"}`}>
                        <p className={`text-xs font-medium mb-0.5 ${isStudent ? "text-white/70" : "text-gray-500"}`}>
                          {(msg.profiles as any)?.first_name} {(msg.profiles as any)?.last_name}
                        </p>
                        <p className="text-sm">{msg.message}</p>
                        <p className={`text-xs mt-1 ${isStudent ? "text-white/50" : "text-gray-400"}`}>
                          {new Date(msg.created_at).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Message input */}
            <div className="px-5 py-3 border-t border-gray-100 flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Escribe un mensaje..."
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0072CE]"
              />
              <button
                onClick={sendMessage}
                disabled={sendingMessage || !newMessage.trim()}
                className="bg-[#0072CE] hover:bg-[#005BA1] disabled:bg-blue-300 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
              >
                {sendingMessage ? "..." : "Enviar"}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
