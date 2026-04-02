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
  video_title?: string;
  is_new?: boolean;
  zoom_topic?: string;
  zoom_start_time?: string;
  zoom_duration?: number;
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
  { value: "task", label: "Tarea", icon: "📝" },
  { value: "exam", label: "Examen", icon: "📋" },
  { value: "discussion", label: "Discusion", icon: "💬" },
  { value: "zoom", label: "Session Zoom", icon: "🎥" },
  { value: "reading", label: "Lectura", icon: "📖" },
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
  const [instructorName, setInstructorName] = useState("");
  const [instructorWhatsapp, setInstructorWhatsapp] = useState("");
  const [moodleUrl, setMoodleUrl] = useState("");

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

    const merged: Module[] = courseModuleNames.map((name, idx) => {
      const existing = (existingModules || []).find((m: any) => m.title === name) || (existingModules || [])[idx];

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
            .map((l: any) => ({ id: l.id, sort_order: l.sort_order, type: l.type, title: l.title, description: l.description || "", video_entry_id: l.video_entry_id || "", video_title: l.video_title || "" })),
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
    updateModule(mi, "lessons", [...modules[mi].lessons, { sort_order: modules[mi].lessons.length, type, title: "", description: "", video_entry_id: "", video_title: "", is_new: true }]);
  }
  function updateLesson(mi: number, li: number, field: string, value: any) {
    const ls = [...modules[mi].lessons]; ls[li] = { ...ls[li], [field]: value }; updateModule(mi, "lessons", ls);
  }
  function removeLesson(mi: number, li: number) { updateModule(mi, "lessons", modules[mi].lessons.filter((_, i) => i !== li)); }

  async function saveAll() {
    setSaving(true); setError(""); setSuccess("");
    try {
      await supabase.from("courses").update({ instructor_name: instructorName, instructor_whatsapp: instructorWhatsapp, moodle_url: moodleUrl }).eq("id", courseId);

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
          if (l.is_new || !l.id) {
            const { data: lData, error: lErr } = await supabase.from("module_activities").insert({ module_id: moduleId, sort_order: j, type: l.type, title: l.title, description: l.description || null }).select().single();
            if (lErr) throw new Error(lErr.message);

            if (l.type === "discussion" && l.title) await supabase.from("discussion_threads").upsert({ activity_id: lData.id, topic: l.title }, { onConflict: "activity_id" });
            if (l.type === "exam") await supabase.from("exams").upsert({ activity_id: lData.id }, { onConflict: "activity_id" });
            if (l.type === "zoom" && l.zoom_topic && l.zoom_start_time) {
              try { await fetch("/api/admin/zoom", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ activity_id: lData.id, topic: l.zoom_topic || l.title, start_time: l.zoom_start_time, duration_minutes: l.zoom_duration || 60 }) }); } catch {}
            }
          } else {
            await supabase.from("module_activities").update({ sort_order: j, title: l.title, description: l.description || null }).eq("id", l.id);
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
          <div><label className="block text-xs text-gray-500 mb-1">URL Moodle</label><input value={moodleUrl} onChange={(e) => setMoodleUrl(e.target.value)} className="w-full border border-gray-200 rounded px-3 py-2 text-sm" placeholder="https://cursos.enae.cl/..." /></div>
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

                    <div className="space-y-3">
                      {mod.lessons.map((les, li) => (
                        <div key={li} className="bg-gray-50 rounded-lg border border-gray-100 p-4">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-medium text-gray-500">
                              {lessonTypes.find((t) => t.value === les.type)?.icon} Leccion {li + 1}: {lessonTypes.find((t) => t.value === les.type)?.label}
                            </span>
                            <button onClick={() => removeLesson(mi, li)} className="text-xs text-red-500 hover:underline">Eliminar</button>
                          </div>

                          <input value={les.title} onChange={(e) => updateLesson(mi, li, "title", e.target.value)} placeholder="Titulo de la leccion" className="w-full border border-gray-200 rounded px-3 py-2 text-sm mb-2" />

                          {/* Kaltura Video — available for all lesson types */}
                          <div className="grid grid-cols-2 gap-2 mb-2">
                            <input value={les.video_entry_id || ""} onChange={(e) => updateLesson(mi, li, "video_entry_id", e.target.value)} placeholder="Kaltura Entry ID (ej: 1_abc123)" className="border border-gray-200 rounded px-3 py-2 text-sm" />
                            <input value={les.video_title || ""} onChange={(e) => updateLesson(mi, li, "video_title", e.target.value)} placeholder="Titulo del video" className="border border-gray-200 rounded px-3 py-2 text-sm" />
                          </div>

                          {/* Type-specific fields */}
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
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                              <input value={les.zoom_topic || les.title} onChange={(e) => updateLesson(mi, li, "zoom_topic", e.target.value)} placeholder="Tema de la reunion" className="border border-gray-200 rounded px-3 py-2 text-sm" />
                              <input type="datetime-local" value={les.zoom_start_time || ""} onChange={(e) => updateLesson(mi, li, "zoom_start_time", e.target.value)} className="border border-gray-200 rounded px-3 py-2 text-sm" />
                              <input type="number" value={les.zoom_duration || 60} onChange={(e) => updateLesson(mi, li, "zoom_duration", parseInt(e.target.value))} placeholder="Duracion (min)" className="border border-gray-200 rounded px-3 py-2 text-sm" />
                            </div>
                          )}

                          {les.type === "reading" && (
                            <div>
                              <textarea value={les.description || ""} onChange={(e) => updateLesson(mi, li, "description", e.target.value)} placeholder="URLs de los PDFs (una por linea)" rows={3} className="w-full border border-gray-200 rounded px-3 py-2 text-sm" />
                              <p className="text-xs text-gray-400 mt-1">Ingresa las URLs de los archivos PDF separadas por linea</p>
                            </div>
                          )}
                        </div>
                      ))}

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
