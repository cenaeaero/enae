"use client";

import { use, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

type Activity = {
  type: string;
  title: string;
  description?: string;
  url?: string;
};

type Module = {
  id?: string;
  sort_order: number;
  title: string;
  description: string;
  video_entry_id: string;
  video_title: string;
  activities: Activity[];
  is_new?: boolean;
};

const activityTypes = [
  { value: "task", label: "Tarea" },
  { value: "exam", label: "Examen" },
  { value: "discussion", label: "Discusión" },
  { value: "zoom", label: "Sesión Zoom" },
  { value: "reading", label: "Lectura" },
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

  // Instructor/Moodle fields
  const [instructorName, setInstructorName] = useState("");
  const [instructorWhatsapp, setInstructorWhatsapp] = useState("");
  const [moodleUrl, setMoodleUrl] = useState("");

  useEffect(() => {
    async function load() {
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

      // Load modules
      const { data: mods } = await supabase
        .from("course_modules")
        .select("*")
        .eq("course_id", courseId)
        .order("sort_order");

      if (mods) {
        setModules(
          mods.map((m: any) => ({
            id: m.id,
            sort_order: m.sort_order,
            title: m.title,
            description: m.description || "",
            video_entry_id: m.video_entry_id || "",
            video_title: m.video_title || "",
            activities: m.activities || [],
          }))
        );
      }
      setLoading(false);
    }
    load();
  }, [courseId]);

  function addModule() {
    setModules((prev) => [
      ...prev,
      {
        sort_order: prev.length,
        title: "",
        description: "",
        video_entry_id: "",
        video_title: "",
        activities: [],
        is_new: true,
      },
    ]);
    setExpandedIdx(modules.length);
  }

  function removeModule(idx: number) {
    setModules((prev) => prev.filter((_, i) => i !== idx));
    setExpandedIdx(null);
  }

  function updateModule(idx: number, updates: Partial<Module>) {
    setModules((prev) =>
      prev.map((m, i) => (i === idx ? { ...m, ...updates } : m))
    );
  }

  function addActivity(moduleIdx: number) {
    const mod = modules[moduleIdx];
    updateModule(moduleIdx, {
      activities: [
        ...mod.activities,
        { type: "task", title: "", description: "", url: "" },
      ],
    });
  }

  function updateActivity(
    moduleIdx: number,
    actIdx: number,
    updates: Partial<Activity>
  ) {
    const mod = modules[moduleIdx];
    const newActs = mod.activities.map((a, i) =>
      i === actIdx ? { ...a, ...updates } : a
    );
    updateModule(moduleIdx, { activities: newActs });
  }

  function removeActivity(moduleIdx: number, actIdx: number) {
    const mod = modules[moduleIdx];
    updateModule(moduleIdx, {
      activities: mod.activities.filter((_, i) => i !== actIdx),
    });
  }

  function moveModule(idx: number, direction: "up" | "down") {
    const newIdx = direction === "up" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= modules.length) return;
    const updated = [...modules];
    [updated[idx], updated[newIdx]] = [updated[newIdx], updated[idx]];
    updated.forEach((m, i) => (m.sort_order = i));
    setModules(updated);
    setExpandedIdx(newIdx);
  }

  async function saveAll() {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      // Update course instructor/moodle fields
      await supabase
        .from("courses")
        .update({
          instructor_name: instructorName || null,
          instructor_whatsapp: instructorWhatsapp || null,
          moodle_url: moodleUrl || null,
        })
        .eq("id", courseId);

      // Delete existing modules and re-insert (simpler than upsert for ordering)
      const existingIds = modules.filter((m) => m.id).map((m) => m.id!);

      // Delete removed modules
      const { data: currentMods } = await supabase
        .from("course_modules")
        .select("id")
        .eq("course_id", courseId);

      const toDelete = (currentMods || [])
        .filter((m: any) => !existingIds.includes(m.id))
        .map((m: any) => m.id);

      if (toDelete.length > 0) {
        await supabase
          .from("course_modules")
          .delete()
          .in("id", toDelete);
      }

      // Upsert modules
      for (let i = 0; i < modules.length; i++) {
        const mod = modules[i];
        const data: any = {
          course_id: courseId,
          sort_order: i,
          title: mod.title,
          description: mod.description || null,
          video_entry_id: mod.video_entry_id || null,
          video_title: mod.video_title || null,
          activities: mod.activities.filter((a) => a.title.trim()),
        };

        if (mod.id && !mod.is_new) {
          await supabase
            .from("course_modules")
            .update(data)
            .eq("id", mod.id);
        } else {
          const { data: inserted } = await supabase
            .from("course_modules")
            .insert(data)
            .select()
            .single();
          if (inserted) {
            modules[i].id = inserted.id;
            modules[i].is_new = false;
          }
        }
      }

      setSuccess("Módulos guardados correctamente");
    } catch (err: any) {
      setError("Error al guardar: " + (err?.message || String(err)));
    }
    setSaving(false);
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-400">Cargando...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link
            href={`/admin/cursos/${courseId}`}
            className="text-sm text-[#0072CE] hover:underline"
          >
            ← Volver al curso
          </Link>
          <h1 className="text-2xl font-bold text-[#003366] mt-1">
            Módulos de Capacitación
          </h1>
          <p className="text-sm text-gray-500">{courseTitle}</p>
        </div>
        <button
          onClick={saveAll}
          disabled={saving}
          className="bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white px-5 py-2 rounded-lg text-sm font-medium transition"
        >
          {saving ? "Guardando..." : "Guardar Todo"}
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
          {success}
        </div>
      )}

      {/* Instructor & Moodle settings */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-800 mb-3">
          Configuración del Curso
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-gray-500 uppercase mb-1">
              Nombre del Instructor
            </label>
            <input
              type="text"
              value={instructorName}
              onChange={(e) => setInstructorName(e.target.value)}
              className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0072CE]"
              placeholder="Ej: Juan Pérez"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 uppercase mb-1">
              WhatsApp Instructor
            </label>
            <input
              type="text"
              value={instructorWhatsapp}
              onChange={(e) => setInstructorWhatsapp(e.target.value)}
              className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0072CE]"
              placeholder="Ej: +56912345678"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 uppercase mb-1">
              URL Moodle (opcional)
            </label>
            <input
              type="text"
              value={moodleUrl}
              onChange={(e) => setMoodleUrl(e.target.value)}
              className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0072CE]"
              placeholder="https://cursos.enae.cl/course/..."
            />
          </div>
        </div>
      </div>

      {/* Modules list */}
      <div className="space-y-3">
        {modules.map((mod, idx) => (
          <div
            key={idx}
            className="bg-white rounded-lg border border-gray-200 overflow-hidden"
          >
            {/* Module header */}
            <div
              className="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-gray-50"
              onClick={() =>
                setExpandedIdx(expandedIdx === idx ? null : idx)
              }
            >
              <span className="w-7 h-7 rounded-full bg-[#003366] text-white text-xs font-bold flex items-center justify-center shrink-0">
                {idx + 1}
              </span>
              <input
                type="text"
                value={mod.title}
                onChange={(e) => {
                  e.stopPropagation();
                  updateModule(idx, { title: e.target.value });
                }}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 border-0 bg-transparent text-sm font-medium text-gray-800 focus:outline-none focus:ring-0 placeholder:text-gray-400"
                placeholder="Título del módulo..."
              />
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={(e) => { e.stopPropagation(); moveModule(idx, "up"); }}
                  disabled={idx === 0}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-30 p-1"
                >
                  ▲
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); moveModule(idx, "down"); }}
                  disabled={idx === modules.length - 1}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-30 p-1"
                >
                  ▼
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); removeModule(idx); }}
                  className="text-red-400 hover:text-red-600 p-1 text-sm"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Expanded content */}
            {expandedIdx === idx && (
              <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 uppercase mb-1">
                      Descripción
                    </label>
                    <textarea
                      value={mod.description}
                      onChange={(e) =>
                        updateModule(idx, { description: e.target.value })
                      }
                      rows={2}
                      className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0072CE] resize-none"
                    />
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-500 uppercase mb-1">
                        Kaltura Entry ID
                      </label>
                      <input
                        type="text"
                        value={mod.video_entry_id}
                        onChange={(e) =>
                          updateModule(idx, {
                            video_entry_id: e.target.value,
                          })
                        }
                        className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0072CE]"
                        placeholder="Ej: 1_zbjinjj6"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 uppercase mb-1">
                        Título del video
                      </label>
                      <input
                        type="text"
                        value={mod.video_title}
                        onChange={(e) =>
                          updateModule(idx, { video_title: e.target.value })
                        }
                        className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0072CE]"
                      />
                    </div>
                  </div>
                </div>

                {/* Activities */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-semibold text-gray-600 uppercase">
                      Actividades
                    </h4>
                    <button
                      onClick={() => addActivity(idx)}
                      className="text-xs text-[#0072CE] hover:underline"
                    >
                      + Agregar actividad
                    </button>
                  </div>
                  {mod.activities.length === 0 ? (
                    <p className="text-xs text-gray-400">
                      Sin actividades
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {mod.activities.map((act, actIdx) => (
                        <div
                          key={actIdx}
                          className="flex gap-2 items-start bg-gray-50 rounded p-2"
                        >
                          <select
                            value={act.type}
                            onChange={(e) =>
                              updateActivity(idx, actIdx, {
                                type: e.target.value,
                              })
                            }
                            className="text-xs border border-gray-200 rounded px-2 py-1 bg-white"
                          >
                            {activityTypes.map((t) => (
                              <option key={t.value} value={t.value}>
                                {t.label}
                              </option>
                            ))}
                          </select>
                          <input
                            type="text"
                            value={act.title}
                            onChange={(e) =>
                              updateActivity(idx, actIdx, {
                                title: e.target.value,
                              })
                            }
                            className="flex-1 text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#0072CE]"
                            placeholder="Título"
                          />
                          <input
                            type="text"
                            value={act.url || ""}
                            onChange={(e) =>
                              updateActivity(idx, actIdx, {
                                url: e.target.value,
                              })
                            }
                            className="w-40 text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#0072CE]"
                            placeholder="URL (opcional)"
                          />
                          <button
                            onClick={() => removeActivity(idx, actIdx)}
                            className="text-red-400 hover:text-red-600 text-xs p-1"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add module button */}
      <button
        onClick={addModule}
        className="mt-4 w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-[#0072CE] hover:text-[#0072CE] transition"
      >
        + Agregar módulo
      </button>
    </div>
  );
}
