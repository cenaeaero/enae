"use client";

import { use, useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

type Activity = {
  id?: string;
  module_id?: string;
  sort_order: number;
  type: string;
  title: string;
  description?: string;
  is_new?: boolean;
  // Zoom fields (local state)
  zoom_topic?: string;
  zoom_start_time?: string;
  zoom_duration?: number;
  zoom_join_url?: string;
  // Discussion fields
  discussion_topic?: string;
  // Reading materials
  reading_urls?: { title: string; url: string }[];
  // Exam link
  exam_id?: string;
};

type Material = { title: string; url: string };

type Module = {
  id?: string;
  sort_order: number;
  title: string;
  description: string;
  objectives: string;
  video_entry_id: string;
  video_title: string;
  materials: Material[];
  module_activities: Activity[];
  is_new?: boolean;
};

const activityTypes = [
  { value: "task", label: "Tarea", icon: "📝" },
  { value: "exam", label: "Examen", icon: "📋" },
  { value: "discussion", label: "Discusion", icon: "💬" },
  { value: "zoom", label: "Session Zoom", icon: "🎥" },
  { value: "reading", label: "Lectura", icon: "📖" },
];

export default function AdminModulosPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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
    // Load course info
    const { data: course } = await supabase
      .from("courses")
      .select("title, instructor_name, instructor_whatsapp, moodle_url")
      .eq("id", courseId)
      .single();

    if (course) {
      setCourseTitle(course.title);
      setInstructorName(course.instructor_name || "");
      setInstructorWhatsapp(course.instructor_whatsapp || "");
      setMoodleUrl(course.moodle_url || "");
    }

    // Load modules with activities via API
    try {
      const res = await fetch(`/api/admin/modulos?course_id=${courseId}`);
      if (res.ok) {
        const json = await res.json();
        setModules(
          (json.modules || []).map((m: any) => ({
            id: m.id,
            sort_order: m.sort_order,
            title: m.title || "",
            description: m.description || "",
            objectives: m.objectives || "",
            video_entry_id: m.video_entry_id || "",
            video_title: m.video_title || "",
            materials: m.materials || [],
            module_activities: (m.module_activities || []).map((a: any) => ({
              id: a.id,
              module_id: a.module_id,
              sort_order: a.sort_order,
              type: a.type,
              title: a.title,
              description: a.description || "",
            })),
          }))
        );
      }
    } catch {
      // Fallback to direct Supabase
      const { data } = await supabase
        .from("course_modules")
        .select("*")
        .eq("course_id", courseId)
        .order("sort_order");
      if (data) {
        setModules(
          data.map((m: any) => ({
            id: m.id,
            sort_order: m.sort_order,
            title: m.title || "",
            description: m.description || "",
            objectives: m.objectives || "",
            video_entry_id: m.video_entry_id || "",
            video_title: m.video_title || "",
            materials: m.materials || [],
            module_activities: [],
          }))
        );
      }
    }
    setLoading(false);
  }, [courseId]);

  useEffect(() => { loadData(); }, [loadData]);

  function addModule() {
    setModules((prev) => [
      ...prev,
      {
        sort_order: prev.length,
        title: "",
        description: "",
        objectives: "",
        video_entry_id: "",
        video_title: "",
        materials: [],
        module_activities: [],
        is_new: true,
      },
    ]);
    setExpandedIdx(modules.length);
  }

  function removeModule(idx: number) {
    setModules((prev) => prev.filter((_, i) => i !== idx));
    setExpandedIdx(null);
  }

  function updateModule(idx: number, field: string, value: any) {
    setModules((prev) => prev.map((m, i) => (i === idx ? { ...m, [field]: value } : m)));
  }

  // Materials management
  function addMaterial(idx: number) {
    const m = modules[idx];
    updateModule(idx, "materials", [...m.materials, { title: "", url: "" }]);
  }

  function updateMaterial(modIdx: number, matIdx: number, field: string, value: string) {
    const m = modules[modIdx];
    const mats = [...m.materials];
    mats[matIdx] = { ...mats[matIdx], [field]: value };
    updateModule(modIdx, "materials", mats);
  }

  function removeMaterial(modIdx: number, matIdx: number) {
    const m = modules[modIdx];
    updateModule(modIdx, "materials", m.materials.filter((_, i) => i !== matIdx));
  }

  // Activities management
  function addActivity(modIdx: number, type: string) {
    const m = modules[modIdx];
    const newAct: Activity = {
      sort_order: m.module_activities.length,
      type,
      title: "",
      description: "",
      is_new: true,
      reading_urls: type === "reading" ? [] : undefined,
    };
    updateModule(modIdx, "module_activities", [...m.module_activities, newAct]);
  }

  function updateActivity(modIdx: number, actIdx: number, field: string, value: any) {
    const m = modules[modIdx];
    const acts = [...m.module_activities];
    acts[actIdx] = { ...acts[actIdx], [field]: value };
    updateModule(modIdx, "module_activities", acts);
  }

  function removeActivity(modIdx: number, actIdx: number) {
    const m = modules[modIdx];
    updateModule(modIdx, "module_activities", m.module_activities.filter((_, i) => i !== actIdx));
  }

  async function saveAll() {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      // Save instructor/moodle settings
      await supabase.from("courses").update({
        instructor_name: instructorName,
        instructor_whatsapp: instructorWhatsapp,
        moodle_url: moodleUrl,
      }).eq("id", courseId);

      // Save each module
      for (let i = 0; i < modules.length; i++) {
        const m = modules[i];
        let moduleId = m.id;

        if (m.is_new || !moduleId) {
          // Create module
          const { data, error: insertErr } = await supabase
            .from("course_modules")
            .insert({
              course_id: courseId,
              sort_order: i,
              title: m.title,
              description: m.description,
              objectives: m.objectives,
              video_entry_id: m.video_entry_id || null,
              video_title: m.video_title || null,
              materials: m.materials,
            })
            .select()
            .single();
          if (insertErr) throw new Error(insertErr.message);
          moduleId = data.id;
        } else {
          // Update module
          await supabase.from("course_modules").update({
            sort_order: i,
            title: m.title,
            description: m.description,
            objectives: m.objectives,
            video_entry_id: m.video_entry_id || null,
            video_title: m.video_title || null,
            materials: m.materials,
          }).eq("id", moduleId);
        }

        // Save activities
        for (let j = 0; j < m.module_activities.length; j++) {
          const a = m.module_activities[j];

          if (a.is_new || !a.id) {
            // Create activity
            const { data: actData, error: actErr } = await supabase
              .from("module_activities")
              .insert({
                module_id: moduleId,
                sort_order: j,
                type: a.type,
                title: a.title,
                description: a.description || null,
              })
              .select()
              .single();
            if (actErr) throw new Error(actErr.message);

            // Create type-specific records
            if (a.type === "discussion" && a.title) {
              await supabase.from("discussion_threads").upsert({
                activity_id: actData.id,
                topic: a.title,
              }, { onConflict: "activity_id" });
            }

            if (a.type === "exam") {
              await supabase.from("exams").upsert({
                activity_id: actData.id,
              }, { onConflict: "activity_id" });
            }

            if (a.type === "zoom" && a.zoom_topic && a.zoom_start_time) {
              try {
                await fetch("/api/admin/zoom", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    activity_id: actData.id,
                    topic: a.zoom_topic,
                    start_time: a.zoom_start_time,
                    duration_minutes: a.zoom_duration || 60,
                  }),
                });
              } catch {}
            }

            if (a.type === "reading" && a.reading_urls?.length) {
              for (const ru of a.reading_urls) {
                await supabase.from("reading_materials").insert({
                  activity_id: actData.id,
                  title: ru.title,
                  url: ru.url,
                });
              }
            }
          } else {
            // Update existing activity
            await supabase.from("module_activities").update({
              sort_order: j,
              title: a.title,
              description: a.description || null,
            }).eq("id", a.id);
          }
        }
      }

      setSuccess("Modulos guardados correctamente");
      await loadData();
    } catch (err: any) {
      setError(err.message || "Error al guardar");
    }
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

      {/* Instructor / Moodle settings */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <h2 className="font-semibold text-gray-800 mb-3">Configuracion del Curso</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Instructor</label>
            <input value={instructorName} onChange={(e) => setInstructorName(e.target.value)} className="w-full border border-gray-200 rounded px-3 py-2 text-sm" placeholder="Nombre del instructor" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">WhatsApp Instructor</label>
            <input value={instructorWhatsapp} onChange={(e) => setInstructorWhatsapp(e.target.value)} className="w-full border border-gray-200 rounded px-3 py-2 text-sm" placeholder="+56912345678" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">URL Moodle</label>
            <input value={moodleUrl} onChange={(e) => setMoodleUrl(e.target.value)} className="w-full border border-gray-200 rounded px-3 py-2 text-sm" placeholder="https://cursos.enae.cl/..." />
          </div>
        </div>
      </div>

      {/* Modules */}
      <div className="space-y-4 mb-6">
        {modules.map((mod, modIdx) => (
          <div key={modIdx} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {/* Module header */}
            <div
              className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50"
              onClick={() => setExpandedIdx(expandedIdx === modIdx ? null : modIdx)}
            >
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400 font-mono">M{modIdx + 1}</span>
                <span className="font-medium text-gray-800">{mod.title || "Nuevo Modulo"}</span>
                <span className="text-xs text-gray-400">{mod.module_activities.length} actividades</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={(e) => { e.stopPropagation(); removeModule(modIdx); }} className="text-xs text-red-500 hover:underline">Eliminar</button>
                <span className="text-gray-400">{expandedIdx === modIdx ? "▲" : "▼"}</span>
              </div>
            </div>

            {/* Module expanded content */}
            {expandedIdx === modIdx && (
              <div className="border-t border-gray-100 px-5 py-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Titulo del Modulo *</label>
                    <input value={mod.title} onChange={(e) => updateModule(modIdx, "title", e.target.value)} className="w-full border border-gray-200 rounded px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Kaltura Entry ID</label>
                    <input value={mod.video_entry_id} onChange={(e) => updateModule(modIdx, "video_entry_id", e.target.value)} className="w-full border border-gray-200 rounded px-3 py-2 text-sm" placeholder="ej: 1_abc123" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">Objetivos del Modulo</label>
                  <textarea value={mod.objectives} onChange={(e) => updateModule(modIdx, "objectives", e.target.value)} rows={3} className="w-full border border-gray-200 rounded px-3 py-2 text-sm" placeholder="Objetivos de aprendizaje del modulo..." />
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">Descripcion</label>
                  <textarea value={mod.description} onChange={(e) => updateModule(modIdx, "description", e.target.value)} rows={2} className="w-full border border-gray-200 rounded px-3 py-2 text-sm" />
                </div>

                {/* Downloadable Materials */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-gray-500">Material de Descarga</label>
                    <button onClick={() => addMaterial(modIdx)} className="text-xs text-[#0072CE] hover:underline">+ Agregar</button>
                  </div>
                  {mod.materials.map((mat, matIdx) => (
                    <div key={matIdx} className="flex gap-2 mb-2">
                      <input value={mat.title} onChange={(e) => updateMaterial(modIdx, matIdx, "title", e.target.value)} placeholder="Titulo" className="flex-1 border border-gray-200 rounded px-3 py-1.5 text-sm" />
                      <input value={mat.url} onChange={(e) => updateMaterial(modIdx, matIdx, "url", e.target.value)} placeholder="URL del archivo" className="flex-[2] border border-gray-200 rounded px-3 py-1.5 text-sm" />
                      <button onClick={() => removeMaterial(modIdx, matIdx)} className="text-red-400 hover:text-red-600 text-sm px-2">✕</button>
                    </div>
                  ))}
                </div>

                {/* Activities */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs font-medium text-gray-500">Actividades</label>
                    <div className="flex gap-1">
                      {activityTypes.map((at) => (
                        <button
                          key={at.value}
                          onClick={() => addActivity(modIdx, at.value)}
                          className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-1 rounded transition"
                          title={at.label}
                        >
                          {at.icon} {at.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    {mod.module_activities.map((act, actIdx) => (
                      <div key={actIdx} className="bg-gray-50 rounded-lg border border-gray-100 p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-medium text-gray-500">
                            {activityTypes.find((t) => t.value === act.type)?.icon} {activityTypes.find((t) => t.value === act.type)?.label} #{actIdx + 1}
                          </span>
                          <button onClick={() => removeActivity(modIdx, actIdx)} className="text-xs text-red-500 hover:underline">Eliminar</button>
                        </div>

                        <div className="space-y-2">
                          <input
                            value={act.title}
                            onChange={(e) => updateActivity(modIdx, actIdx, "title", e.target.value)}
                            placeholder="Titulo de la actividad"
                            className="w-full border border-gray-200 rounded px-3 py-2 text-sm"
                          />

                          {/* Type-specific fields */}
                          {act.type === "task" && (
                            <div>
                              <textarea
                                value={act.description || ""}
                                onChange={(e) => updateActivity(modIdx, actIdx, "description", e.target.value)}
                                placeholder="Descripcion de la tarea..."
                                rows={3}
                                className="w-full border border-gray-200 rounded px-3 py-2 text-sm"
                              />
                              <p className="text-xs text-gray-400 mt-1">Plazo: 2 dias desde la apertura del modulo</p>
                            </div>
                          )}

                          {act.type === "exam" && (
                            <div className="bg-blue-50 rounded p-3">
                              <p className="text-xs text-blue-700 mb-2">El examen se configura despues de guardar.</p>
                              {act.id && (
                                <Link
                                  href={`/admin/cursos/${courseId}/examenes?activity_id=${act.id}`}
                                  className="text-xs text-[#0072CE] hover:underline font-medium"
                                >
                                  Editar preguntas del examen →
                                </Link>
                              )}
                            </div>
                          )}

                          {act.type === "discussion" && (
                            <textarea
                              value={act.description || ""}
                              onChange={(e) => updateActivity(modIdx, actIdx, "description", e.target.value)}
                              placeholder="Tema de discusion para los alumnos..."
                              rows={3}
                              className="w-full border border-gray-200 rounded px-3 py-2 text-sm"
                            />
                          )}

                          {act.type === "zoom" && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                              <input
                                value={act.zoom_topic || act.title}
                                onChange={(e) => updateActivity(modIdx, actIdx, "zoom_topic", e.target.value)}
                                placeholder="Tema de la reunion"
                                className="border border-gray-200 rounded px-3 py-2 text-sm"
                              />
                              <input
                                type="datetime-local"
                                value={act.zoom_start_time || ""}
                                onChange={(e) => updateActivity(modIdx, actIdx, "zoom_start_time", e.target.value)}
                                className="border border-gray-200 rounded px-3 py-2 text-sm"
                              />
                              <input
                                type="number"
                                value={act.zoom_duration || 60}
                                onChange={(e) => updateActivity(modIdx, actIdx, "zoom_duration", parseInt(e.target.value))}
                                placeholder="Duracion (min)"
                                className="border border-gray-200 rounded px-3 py-2 text-sm"
                              />
                              {act.zoom_join_url && (
                                <p className="text-xs text-green-600 col-span-3">Reunion creada: {act.zoom_join_url}</p>
                              )}
                            </div>
                          )}

                          {act.type === "reading" && (
                            <div>
                              <textarea
                                value={act.description || ""}
                                onChange={(e) => updateActivity(modIdx, actIdx, "description", e.target.value)}
                                placeholder="URL del PDF o material de lectura (una URL por linea)"
                                rows={3}
                                className="w-full border border-gray-200 rounded px-3 py-2 text-sm"
                              />
                              <p className="text-xs text-gray-400 mt-1">Ingresa las URLs de los archivos PDF separadas por linea</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button onClick={addModule} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2.5 rounded-lg text-sm font-medium transition">
          + Nuevo Modulo
        </button>
        <button onClick={saveAll} disabled={saving} className="bg-[#0072CE] hover:bg-[#005fa3] text-white px-6 py-2.5 rounded-lg text-sm font-medium transition disabled:opacity-50">
          {saving ? "Guardando..." : "Guardar Todo"}
        </button>
      </div>

      {error && <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
      {success && <div className="mt-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">{success}</div>}
    </div>
  );
}
