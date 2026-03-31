"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import KalturaPlayer from "@/components/KalturaPlayer";
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

const activityIcons: Record<string, string> = {
  task: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
  exam: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
  discussion: "M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z",
  zoom: "M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z",
  reading: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
};

const activityLabels: Record<string, string> = {
  task: "Tarea",
  exam: "Examen",
  discussion: "Discusión",
  zoom: "Sesión Zoom",
  reading: "Lectura",
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
  const [gradeItems, setGradeItems] = useState<GradeItemRow[]>([]);
  const [studentGrades, setStudentGrades] = useState<GradeRow[]>([]);
  const [diploma, setDiploma] = useState<DiplomaRow | null>(null);

  const registrationId = params.id as string;

  function downloadGradesPDF() {
    if (!course || gradeItems.length === 0) return;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(18);
    doc.setTextColor(0, 51, 102);
    doc.text("ENAE - Escuela de Navegacion Aerea", pageWidth / 2, 25, { align: "center" });
    doc.setFontSize(14);
    doc.setTextColor(60, 60, 60);
    doc.text("Certificado de Calificaciones", pageWidth / 2, 35, { align: "center" });

    // Student and course info
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Alumno: ${course.student_name}`, 20, 50);
    doc.text(`Curso: ${course.course_title}`, 20, 57);
    doc.text(`Codigo: ${course.course_code || ""}`, 20, 64);
    doc.text(`Fecha: ${new Date().toLocaleDateString("es-CL")}`, 20, 71);

    // Table header
    let y = 85;
    doc.setFillColor(0, 51, 102);
    doc.rect(20, y - 5, pageWidth - 40, 10, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.text("Evaluacion", 25, y + 1);
    doc.text("Peso", 120, y + 1);
    doc.text("Nota", 145, y + 1);
    doc.text("Estado", 170, y + 1);

    // Table rows
    y += 12;
    doc.setTextColor(50, 50, 50);
    gradeItems.forEach((item) => {
      const grade = studentGrades.find((g) => g.grade_item_id === item.id);
      const score = grade?.score;
      doc.text(item.name, 25, y);
      doc.text(`${item.weight}%`, 120, y);
      doc.text(score != null ? `${score}%` : "-", 145, y);
      doc.text(score != null ? (score >= 80 ? "Aprobado" : "Reprobado") : "Pendiente", 170, y);
      y += 8;
    });

    // Final score
    const gradedItems = gradeItems.filter((item) => {
      const g = studentGrades.find((sg) => sg.grade_item_id === item.id);
      return g?.score != null;
    });
    if (gradedItems.length > 0) {
      let totalW = 0, wSum = 0;
      gradedItems.forEach((item) => {
        const g = studentGrades.find((sg) => sg.grade_item_id === item.id);
        if (g?.score != null) { wSum += g.score * item.weight; totalW += item.weight; }
      });
      const final_ = totalW > 0 ? Math.round((wSum / totalW) * 100) / 100 : 0;
      y += 5;
      doc.setDrawColor(200, 200, 200);
      doc.line(20, y - 3, pageWidth - 20, y - 3);
      doc.setFontSize(11);
      doc.setTextColor(0, 51, 102);
      doc.text("Nota Final (Promedio Ponderado):", 25, y + 5);
      doc.text(`${final_}%`, 145, y + 5);
    }

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
    ...(modules.length > 0 ? [{ key: "modules" as Tab, label: `Módulos (${totalModules})` }] : []),
    { key: "grades", label: "Calificaciones" },
    { key: "evaluation", label: "Evaluation" },
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
    if (course!.course_modules && course!.course_modules.length > 0) {
      course!.course_modules.forEach((mod) => {
        const response = surveyResponses.find((r) => r.questionnaire_type === "module" && r.module_name === mod);
        items.push({ name: `Cuestionario de opinión sobre el módulo - ${mod}`, type: "module", moduleName: mod, completed: !!response, dateCompleted: response?.created_at });
      });
    }
    const courseResponse = surveyResponses.find((r) => r.questionnaire_type === "course");
    items.push({ name: "Cuestionario integral del curso", type: "course", completed: !!courseResponse, dateCompleted: courseResponse?.created_at });
    const instructorResponse = surveyResponses.find((r) => r.questionnaire_type === "instructor");
    items.push({ name: "Cuestionario de evaluación del instructor", type: "instructor", completed: !!instructorResponse, dateCompleted: instructorResponse?.created_at });
    return items;
  }

  return (
    <>
      {/* Course header */}
      <div className="bg-[#4FC3F7] text-white">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/tpems")}
              className="w-9 h-9 rounded-full border-2 border-white/40 flex items-center justify-center hover:bg-white/10 transition shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex-1">
              <h1 className="text-base font-semibold leading-tight">{course.course_title}</h1>
              <p className="text-white/70 text-xs mt-0.5">
                {course.course_code} | {course.session_dates} | {course.session_location}
              </p>
            </div>
            {/* Progress badge */}
            {modules.length > 0 && (
              <div className="hidden sm:flex items-center gap-2 bg-white/20 rounded-full px-3 py-1">
                <div className="w-20 h-1.5 bg-white/30 rounded-full overflow-hidden">
                  <div className="h-full bg-white rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
                </div>
                <span className="text-xs font-medium">{progressPercent}%</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex gap-0 border-b border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-3 text-sm font-medium transition ${
                activeTab === tab.key
                  ? "text-gray-800 border-b-2 border-[#F57C00]"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* ============ INFO TAB ============ */}
        {activeTab === "info" && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="sm:w-40 shrink-0">
                <div className="bg-gradient-to-br from-[#003366] to-[#004B87] rounded-lg aspect-[3/4] flex items-center justify-center">
                  <div className="text-center text-white p-4">
                    <svg className="w-10 h-10 mx-auto mb-2 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <p className="text-xs text-white/60">ENAE</p>
                  </div>
                </div>
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-medium text-gray-800 mb-1">{course.course_title}</h2>
                <p className="text-sm text-gray-400 mb-4">{course.course_code}</p>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium text-gray-700">Duración:</span> <span className="text-gray-600">{course.course_duration}</span></p>
                  <p><span className="font-medium text-gray-700">Modalidad:</span> <span className="text-gray-600">{course.session_modality}</span></p>
                  <p><span className="font-medium text-gray-700">Instructor:</span> <span className="text-gray-600">{course.instructor_name || "Por confirmar"}</span></p>
                </div>
                {course.moodle_url && (
                  <a href={course.moodle_url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 bg-[#F57C00] hover:bg-[#E65100] text-white text-sm font-medium px-4 py-2 rounded-lg transition">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                    Abrir en Moodle
                  </a>
                )}
                {modules.length > 0 && (
                  <button onClick={() => setActiveTab("modules")} className="mt-4 ml-2 inline-flex items-center gap-2 bg-[#0072CE] hover:bg-[#005BA1] text-white text-sm font-medium px-4 py-2 rounded-lg transition">
                    {completedCount > 0 ? "Continuar Curso" : "Iniciar Curso"}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============ MODULES TAB ============ */}
        {activeTab === "modules" && modules.length > 0 && (
          <div className="flex gap-6">
            {/* Module sidebar */}
            <div className="w-72 shrink-0 hidden lg:block">
              {/* Progress bar */}
              <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-600">Progreso del curso</span>
                  <span className="text-xs font-bold text-[#0072CE]">{progressPercent}%</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#0072CE] rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }} />
                </div>
                <p className="text-xs text-gray-400 mt-1">{completedCount} de {totalModules} módulos</p>
              </div>

              {/* Module list */}
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                {modules.map((mod, idx) => {
                  const status = getModuleStatus(mod.id);
                  const isSelected = mod.id === selectedModuleId;
                  return (
                    <button
                      key={mod.id}
                      onClick={() => setSelectedModuleId(mod.id)}
                      className={`w-full text-left px-4 py-3 flex items-start gap-3 transition border-b border-gray-50 last:border-0 ${
                        isSelected ? "bg-blue-50" : "hover:bg-gray-50"
                      }`}
                    >
                      {/* Status indicator */}
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                        status === "completed" ? "bg-green-500" :
                        status === "in_progress" ? "bg-[#F57C00]" :
                        "bg-gray-200"
                      }`}>
                        {status === "completed" ? (
                          <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                        ) : (
                          <span className="text-xs font-bold text-white">{idx + 1}</span>
                        )}
                      </div>
                      <div>
                        <p className={`text-sm leading-tight ${isSelected ? "font-semibold text-[#003366]" : "text-gray-700"}`}>
                          {mod.title}
                        </p>
                        {mod.video_entry_id && (
                          <span className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                            Video
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Module content */}
            <div className="flex-1 min-w-0">
              {/* Mobile module selector */}
              <div className="lg:hidden mb-4">
                <select
                  value={selectedModuleId || ""}
                  onChange={(e) => setSelectedModuleId(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                >
                  {modules.map((mod, idx) => (
                    <option key={mod.id} value={mod.id}>
                      {idx + 1}. {mod.title} {getModuleStatus(mod.id) === "completed" ? "✓" : ""}
                    </option>
                  ))}
                </select>
              </div>

              {selectedModule && (
                <div className="space-y-4">
                  {/* Module title */}
                  <div className="bg-white rounded-lg border border-gray-200 p-5">
                    <h2 className="text-lg font-semibold text-gray-800">{selectedModule.title}</h2>
                    {selectedModule.description && (
                      <p className="text-sm text-gray-500 mt-1">{selectedModule.description}</p>
                    )}
                  </div>

                  {/* Video */}
                  {selectedModule.video_entry_id && (
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                      <h3 className="text-sm font-medium text-gray-700 mb-3">
                        {selectedModule.video_title || "Video del módulo"}
                      </h3>
                      <KalturaPlayer entryId={selectedModule.video_entry_id} />
                    </div>
                  )}

                  {/* Activities */}
                  {selectedModule.activities && selectedModule.activities.length > 0 && (
                    <div className="bg-white rounded-lg border border-gray-200 p-5">
                      <h3 className="text-sm font-semibold text-gray-800 mb-3">Actividades</h3>
                      <div className="space-y-3">
                        {selectedModule.activities.map((act, idx) => (
                          <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                            <div className="w-8 h-8 rounded-lg bg-[#0072CE]/10 flex items-center justify-center shrink-0">
                              <svg className="w-4 h-4 text-[#0072CE]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={activityIcons[act.type] || activityIcons.task} />
                              </svg>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-[#0072CE] uppercase">{activityLabels[act.type] || act.type}</span>
                              </div>
                              <p className="text-sm font-medium text-gray-800">{act.title}</p>
                              {act.description && <p className="text-xs text-gray-500 mt-0.5">{act.description}</p>}
                              {act.url && (
                                <a href={act.url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#0072CE] hover:underline mt-1 inline-flex items-center gap-1">
                                  Abrir enlace <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Module actions */}
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      {getModuleStatus(selectedModule.id) !== "completed" && (
                        <>
                          {getModuleStatus(selectedModule.id) === "not_started" && (
                            <button
                              onClick={() => updateModuleProgress(selectedModule.id, "in_progress")}
                              disabled={updatingProgress}
                              className="bg-[#F57C00] hover:bg-[#E65100] disabled:bg-orange-300 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
                            >
                              Iniciar módulo
                            </button>
                          )}
                          {getModuleStatus(selectedModule.id) === "in_progress" && (
                            <button
                              onClick={() => updateModuleProgress(selectedModule.id, "completed")}
                              disabled={updatingProgress}
                              className="bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
                            >
                              {updatingProgress ? "Guardando..." : "Marcar como completado"}
                            </button>
                          )}
                        </>
                      )}
                      {getModuleStatus(selectedModule.id) === "completed" && (
                        <span className="inline-flex items-center gap-1 text-sm text-green-600 font-medium">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          Módulo completado
                        </span>
                      )}
                    </div>
                    {course.moodle_url && (
                      <a href={course.moodle_url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#F57C00] hover:underline flex items-center gap-1">
                        Ir a Moodle <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============ GRADES TAB ============ */}
        {activeTab === "grades" && (
          <div className="space-y-6">
            {/* Grades table */}
            {gradeItems.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <p className="text-gray-500">Las calificaciones estarán disponibles una vez que el instructor las registre.</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-800">Mis Calificaciones</h3>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
                      <th className="px-6 py-3 font-medium">Evaluación</th>
                      <th className="px-6 py-3 font-medium text-center">Ponderación</th>
                      <th className="px-6 py-3 font-medium text-center">Nota</th>
                      <th className="px-6 py-3 font-medium text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gradeItems.map((item) => {
                      const grade = studentGrades.find((g) => g.grade_item_id === item.id);
                      const score = grade?.score;
                      return (
                        <tr key={item.id} className="border-t border-gray-50">
                          <td className="px-6 py-3 text-gray-700">{item.name}</td>
                          <td className="px-6 py-3 text-center text-gray-500">{item.weight}%</td>
                          <td className="px-6 py-3 text-center">
                            {score !== null && score !== undefined ? (
                              <span className={`font-bold ${score >= 80 ? "text-green-600" : "text-red-600"}`}>{score}%</span>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                          <td className="px-6 py-3 text-center">
                            {score !== null && score !== undefined ? (
                              <span className={`text-xs font-medium px-2 py-1 rounded ${score >= 80 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                                {score >= 80 ? "Aprobado" : "Reprobado"}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">Pendiente</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {/* Download grades button */}
                {studentGrades.length > 0 && (
                  <div className="px-6 py-3 border-t border-gray-100">
                    <button
                      onClick={downloadGradesPDF}
                      className="inline-flex items-center gap-2 text-sm text-[#003366] hover:text-[#004B87] font-medium transition"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                      Descargar Calificaciones (PDF)
                    </button>
                  </div>
                )}
                {/* Final score */}
                {(() => {
                  const gradedItems = gradeItems.filter((item) => {
                    const g = studentGrades.find((sg) => sg.grade_item_id === item.id);
                    return g?.score !== null && g?.score !== undefined;
                  });
                  if (gradedItems.length === 0) return null;
                  let totalW = 0, wSum = 0;
                  gradedItems.forEach((item) => {
                    const g = studentGrades.find((sg) => sg.grade_item_id === item.id);
                    if (g?.score != null) { wSum += g.score * item.weight; totalW += item.weight; }
                  });
                  const final_ = totalW > 0 ? Math.round((wSum / totalW) * 100) / 100 : 0;
                  return (
                    <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                      <span className="font-semibold text-gray-800">Nota Final (Promedio Ponderado)</span>
                      <span className={`text-xl font-bold ${final_ >= 80 ? "text-green-600" : "text-red-600"}`}>{final_}%</span>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Diploma */}
            {diploma && (
              <div className="bg-white rounded-lg border border-green-200 overflow-hidden">
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
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============ EVALUATION TAB ============ */}
        {activeTab === "evaluation" && (
          <>
            {course.status !== "completed" ? (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <p className="text-gray-500 font-medium">Los cuestionarios estarán disponibles al finalizar el curso</p>
                <p className="text-sm text-gray-400 mt-1">Una vez que el curso sea marcado como completado, podrás responder las encuestas de evaluación.</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left px-6 py-4 font-medium text-gray-500 uppercase text-xs tracking-wider">Questionnaire</th>
                      <th className="text-left px-6 py-4 font-medium text-gray-500 uppercase text-xs tracking-wider">Status</th>
                      <th className="text-left px-6 py-4 font-medium text-gray-500 uppercase text-xs tracking-wider">Date Completed</th>
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
                            {item.completed ? "Completed" : "Pending"}
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
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
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
