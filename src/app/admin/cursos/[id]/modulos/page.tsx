"use client";

import { use, useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

type Lesson = {
  id?: string;
  sort_order: number;
  type: string;
  title: string;
  description?: string;
  video_entry_id?: string;
  zoom_url?: string;
  zoom_datetime?: string;
  is_new?: boolean;
};

type Material = { title: string; url: string };

type Module = {
  id?: string;
  sort_order: number;
  title: string;
  description: string;
  objectives: string;
  materials: Material[];
  lessons: Lesson[];
  synced?: boolean;
};

const lessonTypes = [
  { value: "video", label: "Video", icon: "🎬" },
  { value: "task", label: "Tarea", icon: "📝" },
  { value: "exam", label: "Examen", icon: "📋" },
  { value: "discussion", label: "Discusion", icon: "💬" },
  { value: "zoom", label: "Session Zoom", icon: "🎥" },
  { value: "reading", label: "Lectura", icon: "📖" },
  { value: "html", label: "Contenido HTML", icon: "🌐" },
  { value: "h5p", label: "HTML5 Interactivo", icon: "🎮" },
];

export default function AdminModulosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: courseId } = use(params);
  const [courseTitle, setCourseTitle] = useState("");
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [expandedLessonKey, setExpandedLessonKey] = useState<string | null>(null);
  const [deletedLessonIds, setDeletedLessonIds] = useState<string[]>([]);
  const [instructorName, setInstructorName] = useState("");
  const [instructorWhatsapp, setInstructorWhatsapp] = useState("");
  const [moodleUrl, setMoodleUrl] = useState(""); // kept for backward compat

  const loadData = useCallback(async () => {
    const { data: course } = await supabase
      .from("courses")
      .select("title, modules, instructor_name, instructor_whatsapp, moodle_url")
      .eq("id", courseId)
      .single();

    if (!course) { setLoading(false); return; }
    setCourseTitle(course.title);
    setInstructorName(course.instructor_name || "");
    setInstructorWhatsapp(course.instructor_whatsapp || "");
    setMoodleUrl(course.moodle_url || "");

    const courseModuleNames: string[] = course.modules || [];

    const { data: existingModules } = await supabase
      .from("course_modules")
      .select("*")
      .eq("course_id", courseId)
      .order("sort_order");

    const moduleIds = (existingModules || []).map((m: any) => m.id);
    let dbLessons: any[] = [];
    if (moduleIds.length > 0) {
      const { data } = await supabase.from("module_activities").select("*").in("module_id", moduleIds).order("sort_order");
      dbLessons = data || [];
    }

    const usedIds = new Set<string>();
    const merged: Module[] = courseModuleNames.map((name, idx) => {
      const byTitle = (existingModules || []).find((m: any) => m.title.toLowerCase() === name.toLowerCase() && !usedIds.has(m.id));
      const existing = byTitle || (existingModules || []).find((m: any) => m.sort_order === idx && !usedIds.has(m.id));
      if (existing) usedIds.add(existing.id);

      if (existing) {
        return {
          id: existing.id,
          sort_order: idx,
          title: existing.title || name,
          description: existing.description || "",
          objectives: existing.objectives || "",
          materials: existing.materials || [],
          lessons: dbLessons
            .filter((l: any) => l.module_id === existing.id)
            .map((l: any) => {
              let desc = l.description || "";
              let videoEntryId = "";
              let zoomUrl = "";
              let zoomDatetime = "";
              // Decode JSON description for video/zoom types
              if ((l.type === "video" || l.type === "zoom") && desc.startsWith("{")) {
                try {
                  const parsed = JSON.parse(desc);
                  if (l.type === "video") { desc = parsed.text || ""; videoEntryId = parsed.entry_id || ""; }
                  if (l.type === "zoom") { zoomUrl = parsed.url || ""; zoomDatetime = parsed.datetime || ""; desc = ""; }
                } catch {}
              }
              return { id: l.id, sort_order: l.sort_order, type: l.type, title: l.title, description: desc, video_entry_id: videoEntryId, zoom_url: zoomUrl, zoom_datetime: zoomDatetime };
            }),
          synced: true,
        };
      }

      return { sort_order: idx, title: name, description: "", objectives: "", materials: [], lessons: [], synced: false };
    });

    setModules(merged);
    setLoading(false);
  }, [courseId]);

  useEffect(() => { loadData(); }, [loadData]);

  function updateModule(idx: number, field: string, value: any) {
    setModules((prev) => prev.map((m, i) => (i === idx ? { ...m, [field]: value } : m)));
  }

  function addMaterial(idx: number) { updateModule(idx, "materials", [...modules[idx].materials, { title: "", url: "" }]); }
  function updateMaterial(mi: number, matI: number, field: string, value: string) {
    const mats = [...modules[mi].materials]; mats[matI] = { ...mats[matI], [field]: value }; updateModule(mi, "materials", mats);
  }
  function removeMaterial(mi: number, matI: number) { updateModule(mi, "materials", modules[mi].materials.filter((_, i) => i !== matI)); }

  function addLesson(mi: number, type: string) {
    updateModule(mi, "lessons", [...modules[mi].lessons, { sort_order: modules[mi].lessons.length, type, title: "", description: "", video_entry_id: "", is_new: true }]);
  }
  function updateLesson(mi: number, li: number, field: string, value: any) {
    const ls = [...modules[mi].lessons]; ls[li] = { ...ls[li], [field]: value }; updateModule(mi, "lessons", ls);
  }
  function removeLesson(mi: number, li: number) {
    const lesson = modules[mi].lessons[li];
    // Track deleted lessons that exist in DB for deletion on save
    if (lesson.id) {
      setDeletedLessonIds((prev) => [...prev, lesson.id!]);
    }
    updateModule(mi, "lessons", modules[mi].lessons.filter((_, i) => i !== li));
  }
  function moveLessonUp(mi: number, li: number) {
    if (li === 0) return;
    const ls = [...modules[mi].lessons];
    [ls[li - 1], ls[li]] = [ls[li], ls[li - 1]];
    updateModule(mi, "lessons", ls);
  }
  function moveLessonDown(mi: number, li: number) {
    const ls = [...modules[mi].lessons];
    if (li >= ls.length - 1) return;
    [ls[li], ls[li + 1]] = [ls[li + 1], ls[li]];
    updateModule(mi, "lessons", ls);
  }

  async function saveAll() {
    setSaving(true); setError(""); setSuccess("");
    try {
      await supabase.from("courses").update({ instructor_name: instructorName, instructor_whatsapp: instructorWhatsapp }).eq("id", courseId);

      // Delete removed lessons from DB (CASCADE deletes exams, discussions, etc.)
      if (deletedLessonIds.length > 0) {
        await supabase.from("module_activities").delete().in("id", deletedLessonIds);
        setDeletedLessonIds([]);
      }

      // Clean up orphaned course_modules only if they have NO lessons (safe delete)
      const activeModuleIds = modules.filter((m) => m.id).map((m) => m.id!);
      const { data: allDbModules } = await supabase.from("course_modules").select("id").eq("course_id", courseId);
      const orphanIds = (allDbModules || []).filter((m: any) => !activeModuleIds.includes(m.id)).map((m: any) => m.id);
      if (orphanIds.length > 0) {
        for (const oid of orphanIds) {
          const { count } = await supabase.from("module_activities").select("id", { count: "exact", head: true }).eq("module_id", oid);
          if (count === 0) {
            await supabase.from("course_modules").delete().eq("id", oid);
          }
        }
      }

      for (let i = 0; i < modules.length; i++) {
        const m = modules[i];
        let moduleId = m.id;

        if (!moduleId) {
          const { data, error: err } = await supabase.from("course_modules").insert({ course_id: courseId, sort_order: i, title: m.title, description: m.description, objectives: m.objectives, materials: m.materials }).select().single();
          if (err) throw new Error(err.message);
          moduleId = data.id;
        } else {
          await supabase.from("course_modules").update({ sort_order: i, title: m.title, description: m.description, objectives: m.objectives, materials: m.materials }).eq("id", moduleId);
        }

        for (let j = 0; j < m.lessons.length; j++) {
          const l = m.lessons[j];
          // Encode extra data into description for video/zoom types
          let desc = l.description || null;
          if (l.type === "video") desc = JSON.stringify({ text: l.description || "", entry_id: l.video_entry_id || "" });
          if (l.type === "zoom") desc = JSON.stringify({ url: l.zoom_url || "", datetime: l.zoom_datetime || "" });

          if (l.is_new || !l.id) {
            const { data: lData, error: lErr } = await supabase.from("module_activities").insert({ module_id: moduleId, sort_order: j, type: l.type, title: l.title, description: desc }).select().single();
            if (lErr) throw new Error(lErr.message);

            if (l.type === "discussion" && l.title) await supabase.from("discussion_threads").upsert({ activity_id: lData.id, topic: l.title }, { onConflict: "activity_id" });
            if (l.type === "exam") await supabase.from("exams").upsert({ activity_id: lData.id }, { onConflict: "activity_id" });
          } else {
            await supabase.from("module_activities").update({ sort_order: j, title: l.title, description: desc }).eq("id", l.id);
          }
        }
      }

      setSuccess("Modulos y lecciones guardados correctamente");
      await loadData();
    } catch (err: any) { setError(err.message || "Error al guardar"); }
    setSaving(false);
  }

  if (loading) return <div className="text-center py-16 text-gray-400">Cargando...</div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/admin/cursos/${courseId}`} className="text-sm text-[#0072CE] hover:underline">← Volver</Link>
        <h1 className="text-2xl font-bold text-[#003366]">Modulos LMS</h1>
        <span className="text-sm text-gray-400">{courseTitle}</span>
      </div>

      <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-xs text-blue-800">
          Los modulos ya estan definidos en el curso. Selecciona cada modulo para agregar sus lecciones: video (Kaltura Entry ID), tareas, examenes (aprobacion 80%), discusiones, sesiones Zoom y lecturas.
          Al completar todos los modulos, el alumno tendra un examen final y un simulador DGAC (100 preguntas, aprobacion 75%).
        </p>
      </div>

      {/* Instructor / Moodle */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <h2 className="font-semibold text-gray-800 mb-3">Configuracion del Curso</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div><label className="block text-xs text-gray-500 mb-1">Instructor</label><input value={instructorName} onChange={(e) => setInstructorName(e.target.value)} className="w-full border border-gray-200 rounded px-3 py-2 text-sm" placeholder="Nombre del instructor" /></div>
          <div><label className="block text-xs text-gray-500 mb-1">WhatsApp Instructor</label><input value={instructorWhatsapp} onChange={(e) => setInstructorWhatsapp(e.target.value)} className="w-full border border-gray-200 rounded px-3 py-2 text-sm" placeholder="+56912345678" /></div>
        </div>
      </div>

      {modules.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-400 mb-2">No hay modulos definidos en este curso.</p>
          <Link href={`/admin/cursos/${courseId}`} className="text-sm text-[#0072CE] hover:underline">Ir a editar el curso para definir los modulos →</Link>
        </div>
      ) : (
        <div className="space-y-3 mb-6">
          {modules.map((mod, mi) => (
            <div key={mi} className={`bg-white rounded-lg border overflow-hidden ${mod.synced ? "border-gray-200" : "border-orange-300"}`}>
              <div className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50" onClick={() => setExpandedIdx(expandedIdx === mi ? null : mi)}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${mod.synced ? "bg-[#003366]" : "bg-orange-500"}`}>{mi + 1}</div>
                  <div>
                    <span className="font-medium text-gray-800">{mod.title}</span>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-gray-400">{mod.lessons.length} lecciones</span>
                      {!mod.synced && <span className="text-xs text-orange-600 font-medium">Sin configurar</span>}
                    </div>
                  </div>
                </div>
                <span className="text-gray-400">{expandedIdx === mi ? "▲" : "▼"}</span>
              </div>

              {expandedIdx === mi && (
                <div className="border-t border-gray-100 px-5 py-4 space-y-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Titulo del Modulo</label>
                    <input
                      type="text"
                      value={mod.title}
                      onChange={(e) => updateModule(mi, "title", e.target.value)}
                      className="w-full border border-gray-200 rounded px-3 py-2 text-sm font-medium"
                      placeholder="Nombre del modulo"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">Este es el nombre que veran los alumnos en el LMS. Se guarda al presionar &quot;Guardar Todo&quot;.</p>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Objetivos del Modulo</label>
                    <textarea value={mod.objectives} onChange={(e) => updateModule(mi, "objectives", e.target.value)} rows={2} className="w-full border border-gray-200 rounded px-3 py-2 text-sm" placeholder="Objetivos de aprendizaje..." />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Descripcion</label>
                    <textarea value={mod.description} onChange={(e) => updateModule(mi, "description", e.target.value)} rows={2} className="w-full border border-gray-200 rounded px-3 py-2 text-sm" />
                  </div>

                  {/* Materials */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-medium text-gray-500">Material de Descarga del Modulo</label>
                      <button onClick={() => addMaterial(mi)} className="text-xs text-[#0072CE] hover:underline">+ Agregar</button>
                    </div>
                    {mod.materials.map((mat, matI) => (
                      <div key={matI} className="flex gap-2 mb-2">
                        <input value={mat.title} onChange={(e) => updateMaterial(mi, matI, "title", e.target.value)} placeholder="Titulo" className="flex-1 border border-gray-200 rounded px-3 py-1.5 text-sm" />
                        <input value={mat.url} onChange={(e) => updateMaterial(mi, matI, "url", e.target.value)} placeholder="URL del archivo" className="flex-[2] border border-gray-200 rounded px-3 py-1.5 text-sm" />
                        <button onClick={() => removeMaterial(mi, matI)} className="text-red-400 hover:text-red-600 text-sm px-2">✕</button>
                      </div>
                    ))}
                  </div>

                  {/* Lessons */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-xs font-medium text-gray-500">Lecciones del Modulo</label>
                      <div className="flex gap-1 flex-wrap">
                        {lessonTypes.map((lt) => (
                          <button key={lt.value} onClick={() => addLesson(mi, lt.value)} className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-1 rounded transition" title={lt.label}>
                            {lt.icon} {lt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      {mod.lessons.map((les, li) => {
                        const lesKey = `${mi}-${li}`;
                        const isLessonOpen = expandedLessonKey === lesKey;
                        return (
                        <div key={li} className="bg-gray-50 rounded-lg border border-gray-100 overflow-hidden">
                          {/* Lesson header — always visible */}
                          <div
                            className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-100 transition"
                            onClick={() => setExpandedLessonKey(isLessonOpen ? null : lesKey)}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-sm">{lessonTypes.find((t) => t.value === les.type)?.icon}</span>
                              <span className="text-sm font-medium text-gray-700">{les.title || "Sin titulo"}</span>
                              <span className="text-xs text-gray-400">({lessonTypes.find((t) => t.value === les.type)?.label})</span>
                            </div>
                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              <button onClick={() => moveLessonUp(mi, li)} disabled={li === 0} className="text-xs text-gray-400 hover:text-gray-700 disabled:opacity-30 px-1" title="Mover arriba">▲</button>
                              <button onClick={() => moveLessonDown(mi, li)} disabled={li === mod.lessons.length - 1} className="text-xs text-gray-400 hover:text-gray-700 disabled:opacity-30 px-1" title="Mover abajo">▼</button>
                              <button onClick={() => removeLesson(mi, li)} className="text-xs text-red-500 hover:underline">Eliminar</button>
                              <span className="text-gray-400 text-xs ml-1">{isLessonOpen ? "▲" : "▼"}</span>
                            </div>
                          </div>

                          {/* Lesson content — collapsible */}
                          {isLessonOpen && (
                          <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-2">
                            <input value={les.title} onChange={(e) => updateLesson(mi, li, "title", e.target.value)} placeholder="Titulo de la leccion" className="w-full border border-gray-200 rounded px-3 py-2 text-sm" />

                            {les.type === "video" && (
                              <div className="space-y-2">
                                <textarea value={les.description || ""} onChange={(e) => updateLesson(mi, li, "description", e.target.value)} placeholder="Descripcion del video..." rows={2} className="w-full border border-gray-200 rounded px-3 py-2 text-sm" />
                                <input value={les.video_entry_id || ""} onChange={(e) => updateLesson(mi, li, "video_entry_id", e.target.value)} placeholder="Kaltura Entry ID (ej: 1_abc123)" className="w-full border border-gray-200 rounded px-3 py-2 text-sm" />
                              </div>
                            )}

                            {les.type === "task" && (
                              <div>
                                <textarea value={les.description || ""} onChange={(e) => updateLesson(mi, li, "description", e.target.value)} placeholder="Descripcion de la tarea..." rows={3} className="w-full border border-gray-200 rounded px-3 py-2 text-sm" />
                                <p className="text-xs text-gray-400 mt-1">Plazo de entrega: 2 dias desde la apertura del modulo</p>
                              </div>
                            )}

                            {les.type === "exam" && (
                              <div className="bg-blue-50 rounded p-3">
                                <p className="text-xs text-blue-700 mb-1">Nota de aprobacion: 80%. Configura las preguntas despues de guardar.</p>
                                {les.id && (
                                  <Link href={`/admin/cursos/${courseId}/examenes?activity_id=${les.id}`} className="text-xs text-[#0072CE] hover:underline font-medium">
                                    Editar preguntas del examen →
                                  </Link>
                                )}
                              </div>
                            )}

                            {les.type === "discussion" && (
                              <textarea value={les.description || ""} onChange={(e) => updateLesson(mi, li, "description", e.target.value)} placeholder="Tema de discusion para los alumnos..." rows={3} className="w-full border border-gray-200 rounded px-3 py-2 text-sm" />
                            )}

                            {les.type === "zoom" && (
                              <div className="space-y-2">
                                <input value={les.zoom_url || ""} onChange={(e) => updateLesson(mi, li, "zoom_url", e.target.value)} placeholder="Link de Zoom (ej: https://zoom.us/j/123456)" className="w-full border border-gray-200 rounded px-3 py-2 text-sm" />
                                <input type="datetime-local" value={les.zoom_datetime || ""} onChange={(e) => updateLesson(mi, li, "zoom_datetime", e.target.value)} className="w-full border border-gray-200 rounded px-3 py-2 text-sm" />
                                <p className="text-xs text-gray-400">El alumno vera el link de Zoom y la fecha/hora para conectarse</p>
                              </div>
                            )}

                            {les.type === "reading" && (
                              <div>
                                <textarea value={les.description || ""} onChange={(e) => updateLesson(mi, li, "description", e.target.value)} placeholder="URLs de los PDFs (una por linea)" rows={3} className="w-full border border-gray-200 rounded px-3 py-2 text-sm" />
                                <p className="text-xs text-gray-400 mt-1">Ingresa las URLs de los archivos PDF separadas por linea</p>
                              </div>
                            )}

                            {les.type === "html" && (
                              <div>
                                <textarea value={les.description || ""} onChange={(e) => updateLesson(mi, li, "description", e.target.value)} placeholder="<h2>Titulo</h2><p>Contenido HTML...</p>" rows={8} className="w-full border border-gray-200 rounded px-3 py-2 text-sm font-mono text-xs" />
                                <p className="text-xs text-gray-400 mt-1">Ingresa codigo HTML. Se renderizara tal cual en la vista del alumno.</p>
                                {les.description && (
                                  <div className="mt-2 border border-gray-200 rounded-lg overflow-hidden bg-white">
                                    <p className="text-xs text-gray-400 px-3 pt-2">Vista previa:</p>
                                    <iframe
                                      srcDoc={les.description}
                                      className="w-full border-0"
                                      style={{ minHeight: "400px" }}
                                      sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-presentation"
                                      onLoad={(e) => {
                                        const iframe = e.target as HTMLIFrameElement;
                                        try {
                                          const h = iframe.contentDocument?.documentElement?.scrollHeight;
                                          if (h) iframe.style.height = `${h + 20}px`;
                                        } catch {}
                                      }}
                                    />
                                  </div>
                                )}
                              </div>
                            )}

                            {les.type === "h5p" && (
                              <div className="space-y-2">
                                <textarea value={les.description || ""} onChange={(e) => updateLesson(mi, li, "description", e.target.value)} placeholder="URL del contenido HTML5 interactivo (ej: https://supabase.co/storage/.../actividad.html)" rows={2} className="w-full border border-gray-200 rounded px-3 py-2 text-sm" />
                                <div className="bg-purple-50 rounded p-3">
                                  <p className="text-xs text-purple-700 mb-1">Ingresa la URL de un archivo HTML5 interactivo alojado en Supabase Storage u otro servicio.</p>
                                  <p className="text-xs text-purple-600">El contenido se mostrara en un iframe dentro de la leccion del alumno.</p>
                                </div>
                                {les.description && les.description.startsWith("http") && (
                                  <div className="mt-2 border border-gray-200 rounded-lg overflow-hidden bg-white">
                                    <p className="text-xs text-gray-400 px-3 pt-2">Vista previa:</p>
                                    <iframe src={les.description.trim()} className="w-full border-0" style={{ height: "400px" }} sandbox="allow-scripts allow-popups allow-forms" />
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          )}
                        </div>
                        );
                      })}

                      {mod.lessons.length === 0 && (
                        <div className="text-center py-6 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-lg">
                          Sin lecciones. Usa los botones de arriba para agregar.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {modules.length > 0 && (
        <button onClick={saveAll} disabled={saving} className="bg-[#0072CE] hover:bg-[#005fa3] text-white px-6 py-2.5 rounded-lg text-sm font-medium transition disabled:opacity-50">
          {saving ? "Guardando..." : "Guardar Todo"}
        </button>
      )}

      {error && <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
      {success && <div className="mt-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">{success}</div>}
    </div>
  );
}
