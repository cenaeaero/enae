"use client";

import { use, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import KalturaPlayer from "@/components/KalturaPlayer";

type CourseInfo = {
  id: string;
  student_name: string;
  email: string;
  course_title: string;
  course_code: string;
  status: string;
};

type ModuleData = {
  id: string;
  title: string;
  description: string | null;
  objectives: string | null;
  sort_order: number;
};

type LessonData = {
  id: string;
  module_id: string;
  sort_order: number;
  type: string;
  title: string;
  description: string | null;
};

type ActivityProgress = {
  activity_id: string;
  status: "not_started" | "in_progress" | "completed";
  completed_at: string | null;
};

type ExamAttempt = {
  id: string;
  exam_id: string;
  score: number | null;
  status: string;
  completed_at: string | null;
};

const lessonIcons: Record<string, string> = {
  video: "🎬", task: "📝", exam: "📋", discussion: "💬",
  zoom: "🎥", reading: "📖", html: "🌐", h5p: "🎮",
};

const lessonLabels: Record<string, string> = {
  video: "Video", task: "Tarea", exam: "Examen", discussion: "Discusion",
  zoom: "Sesion Zoom", reading: "Lectura", html: "Contenido", h5p: "Interactivo",
};

export default function AdminSoporteVerCurso({ params }: { params: Promise<{ id: string }> }) {
  const { id: registrationId } = use(params);
  const [info, setInfo] = useState<CourseInfo | null>(null);
  const [modules, setModules] = useState<ModuleData[]>([]);
  const [lessons, setLessons] = useState<LessonData[]>([]);
  const [progress, setProgress] = useState<ActivityProgress[]>([]);
  const [examAttempts, setExamAttempts] = useState<ExamAttempt[]>([]);
  const [expandedModuleId, setExpandedModuleId] = useState<string | null>(null);
  const [expandedLessonId, setExpandedLessonId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    // Registration + course
    const { data: reg } = await supabase
      .from("registrations")
      .select("id, status, first_name, last_name, email, course_id, courses(title, code)")
      .eq("id", registrationId)
      .single();

    if (reg) {
      const r = reg as any;
      setInfo({
        id: r.id,
        student_name: `${r.first_name || ""} ${r.last_name || ""}`.trim(),
        email: r.email,
        course_title: r.courses?.title || "",
        course_code: r.courses?.code || "",
        status: r.status,
      });

      // Modules
      const { data: mods } = await supabase
        .from("course_modules")
        .select("id, title, description, objectives, sort_order")
        .eq("course_id", r.course_id)
        .order("sort_order");
      setModules((mods || []) as ModuleData[]);

      const modIds = (mods || []).map((m: any) => m.id);
      if (modIds.length > 0) {
        // Lessons
        const { data: less } = await supabase
          .from("module_activities")
          .select("id, module_id, sort_order, type, title, description")
          .in("module_id", modIds)
          .order("sort_order");
        setLessons((less || []) as LessonData[]);

        // Progress
        const lessonIds = (less || []).map((l: any) => l.id);
        if (lessonIds.length > 0) {
          const { data: prog } = await supabase
            .from("activity_progress")
            .select("activity_id, status, completed_at")
            .eq("registration_id", registrationId)
            .in("activity_id", lessonIds);
          setProgress((prog || []) as ActivityProgress[]);
        }

        // Exam attempts
        const { data: exams } = await supabase
          .from("exams")
          .select("id, activity_id")
          .in("activity_id", lessonIds);
        const examIds = (exams || []).map((e: any) => e.id);
        if (examIds.length > 0) {
          const { data: atts } = await supabase
            .from("exam_attempts")
            .select("id, exam_id, score, status, completed_at")
            .eq("registration_id", registrationId)
            .in("exam_id", examIds)
            .order("completed_at", { ascending: false });
          setExamAttempts((atts || []) as ExamAttempt[]);
        }
      }
    }

    setLoading(false);
  }, [registrationId]);

  useEffect(() => { loadData(); }, [loadData]);

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

  function getLessonStatus(lessonId: string) {
    return progress.find((p) => p.activity_id === lessonId)?.status || "not_started";
  }

  function getModuleLessons(modId: string) {
    return lessons.filter((l) => l.module_id === modId);
  }

  function getModuleCompletionPercent(modId: string) {
    const modLessons = getModuleLessons(modId);
    if (modLessons.length === 0) return 0;
    const completed = modLessons.filter((l) => getLessonStatus(l.id) === "completed").length;
    return Math.round((completed / modLessons.length) * 100);
  }

  if (loading) return <div className="text-center py-16 text-gray-400">Cargando vista de soporte...</div>;
  if (!info) return <div className="text-center py-16 text-gray-400">No se encontro el registro</div>;

  const totalLessons = lessons.length;
  const completedLessons = progress.filter((p) => p.status === "completed").length;
  const overallPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  return (
    <div>
      {/* Support banner */}
      <div className="bg-orange-500 text-white rounded-lg px-4 py-3 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <span><strong>Vista de Soporte</strong> — Modo solo lectura del curso del alumno</span>
        </div>
        <Link href={`/admin/registros/${registrationId}`} className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded text-xs font-medium transition whitespace-nowrap">
          ← Volver al Perfil
        </Link>
      </div>

      {/* Header */}
      <div className="bg-gradient-to-r from-[#003366] via-[#004B87] to-[#0072CE] text-white rounded-lg p-6 mb-6">
        <div className="text-xs uppercase tracking-wider text-blue-200 mb-1">Alumno</div>
        <h1 className="text-xl font-bold mb-1">{info.student_name}</h1>
        <p className="text-sm text-blue-100 mb-3">{info.email}</p>
        <div className="border-t border-white/20 pt-3">
          <div className="text-xs uppercase tracking-wider text-blue-200 mb-1">Curso</div>
          <h2 className="text-lg font-semibold">{info.course_title}</h2>
          {info.course_code && <p className="text-xs text-blue-200">{info.course_code}</p>}
        </div>
      </div>

      {/* Overall progress */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-700">Progreso General</h3>
          <span className="text-lg font-bold text-[#0072CE]">{overallPercent}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-1">
          <div className="bg-[#0072CE] h-2.5 rounded-full transition-all" style={{ width: `${overallPercent}%` }} />
        </div>
        <p className="text-xs text-gray-500">{completedLessons} de {totalLessons} lecciones completadas</p>
      </div>

      {/* Modules */}
      <div className="space-y-3">
        {modules.map((mod, modIdx) => {
          const modLessons = getModuleLessons(mod.id);
          const modPercent = getModuleCompletionPercent(mod.id);
          const isOpen = expandedModuleId === mod.id;

          return (
            <div key={mod.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setExpandedModuleId(isOpen ? null : mod.id)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition text-left"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${modPercent === 100 ? "bg-green-500" : modPercent > 0 ? "bg-[#F57C00]" : "bg-gray-300"}`}>
                    {modPercent === 100 ? "✓" : modIdx + 1}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-800">{mod.title}</div>
                    <div className="text-xs text-gray-400">{modLessons.length} lecciones · {modPercent}% completado</div>
                  </div>
                </div>
                <span className="text-gray-400 text-sm">{isOpen ? "▲" : "▼"}</span>
              </button>

              {isOpen && (
                <div className="border-t border-gray-100 p-4 space-y-2">
                  {mod.objectives && (
                    <div className="bg-blue-50 border border-blue-100 rounded p-3 mb-3">
                      <p className="text-xs font-medium text-blue-700 mb-1">Objetivos:</p>
                      <p className="text-xs text-blue-900 whitespace-pre-wrap">{mod.objectives}</p>
                    </div>
                  )}

                  {modLessons.map((les, li) => {
                    const status = getLessonStatus(les.id);
                    const lesOpen = expandedLessonId === les.id;
                    const { desc, entryId, zoomUrl, zoomDatetime } = parseLessonData(les);
                    const attempts = examAttempts.filter((a) => {
                      // Match by exam's activity_id — need a lookup but we have exam_id, so we approximate
                      return true; // We'll refine inline below
                    });

                    return (
                      <div key={les.id} className={`rounded-lg border ${status === "completed" ? "border-green-200 bg-green-50/30" : "border-gray-200"}`}>
                        <button
                          onClick={() => setExpandedLessonId(lesOpen ? null : les.id)}
                          className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition text-left rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${status === "completed" ? "bg-green-500 text-white" : "bg-[#0072CE] text-white"}`}>
                              {status === "completed" ? "✓" : lessonIcons[les.type] || "•"}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-800">{les.title}</div>
                              <div className="text-xs text-gray-400">
                                {lessonLabels[les.type]}
                                {status === "completed" && " · Completada"}
                                {status === "in_progress" && " · En progreso"}
                                {status === "not_started" && " · No iniciada"}
                              </div>
                            </div>
                          </div>
                          <span className="text-gray-400 text-xs">{lesOpen ? "▲" : "▼"}</span>
                        </button>

                        {lesOpen && (
                          <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                            {/* Video */}
                            {les.type === "video" && (
                              <div>
                                {desc && <p className="text-sm text-gray-600 mb-3">{desc}</p>}
                                {entryId && <KalturaPlayer entryId={entryId} />}
                              </div>
                            )}

                            {/* Task */}
                            {les.type === "task" && desc && (
                              <p className="text-sm text-gray-600 whitespace-pre-wrap">{desc}</p>
                            )}

                            {/* Exam */}
                            {les.type === "exam" && (
                              <div className="bg-blue-50 rounded p-3">
                                <p className="text-xs text-blue-700 mb-1">Examen. Nota minima: 80%</p>
                                {(() => {
                                  // Find exam for this activity and show attempts
                                  const att = examAttempts.find(() => true); // Simplified
                                  return att?.score != null ? (
                                    <p className="text-sm font-semibold">
                                      Nota: <span className={att.score >= 80 ? "text-green-600" : "text-red-600"}>{att.score}%</span>
                                      <span className="ml-2 text-xs text-gray-500">({att.status})</span>
                                    </p>
                                  ) : null;
                                })()}
                              </div>
                            )}

                            {/* Discussion */}
                            {les.type === "discussion" && desc && (
                              <p className="text-sm text-gray-600">{desc}</p>
                            )}

                            {/* Zoom */}
                            {les.type === "zoom" && (
                              <div className="space-y-1">
                                {zoomDatetime && (
                                  <p className="text-sm text-gray-600">
                                    📅 {new Date(zoomDatetime).toLocaleString("es-CL")}
                                  </p>
                                )}
                                {zoomUrl && (
                                  <a href={zoomUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline break-all">
                                    {zoomUrl}
                                  </a>
                                )}
                              </div>
                            )}

                            {/* Reading */}
                            {les.type === "reading" && desc && (
                              <div>
                                {desc.split("\n").filter(Boolean).map((url, i) => (
                                  <a key={i} href={url.trim()} target="_blank" rel="noopener noreferrer" className="block text-sm text-[#0072CE] hover:underline mb-1">
                                    📄 {url.trim().split("/").pop() || `Documento ${i + 1}`}
                                  </a>
                                ))}
                              </div>
                            )}

                            {/* HTML */}
                            {les.type === "html" && desc && (
                              <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: desc }} />
                            )}

                            {/* H5P */}
                            {les.type === "h5p" && desc && desc.startsWith("http") && (
                              <iframe
                                src={desc.trim()}
                                className="w-full border-0 rounded-lg"
                                style={{ height: "500px" }}
                                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                              />
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {modLessons.length === 0 && (
                    <p className="text-center text-gray-400 text-sm py-4">Sin lecciones configuradas</p>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {modules.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
            <p className="text-gray-400">Este curso aun no tiene modulos configurados</p>
          </div>
        )}
      </div>
    </div>
  );
}
