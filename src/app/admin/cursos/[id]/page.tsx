"use client";

import { use, useEffect, useState, useCallback } from "react";
import { areas } from "@/data/courses";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  getCourse,
  updateCourse,
  deleteCourse,
  createSession,
  updateSession,
  deleteSession,
  uploadCourseImage,
} from "@/lib/supabase-admin";

type SessionData = {
  id?: string;
  dates: string;
  location: string;
  modality: string;
  fee: string;
  seats: number | null;
  is_new?: boolean;
};

export default function EditCoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Course fields
  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [area, setArea] = useState("");
  const [areaSlug, setAreaSlug] = useState("");
  const [subarea, setSubarea] = useState("");
  const [level, setLevel] = useState("Basico");
  const [duration, setDuration] = useState("");
  const [modality, setModality] = useState("Presencial");
  const [language, setLanguage] = useState("Espanol");
  const [goal, setGoal] = useState("");
  const [objectives, setObjectives] = useState<string[]>([""]);
  const [modules, setModules] = useState<string[]>([""]);
  const [targetAudience, setTargetAudience] = useState<string[]>([""]);
  const [prerequisites, setPrerequisites] = useState<string[]>([""]);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [apendiceCRequired, setApendiceCRequired] = useState(false);
  const [apendiceCHabilitationText, setApendiceCHabilitationText] = useState("");
  const [hasDgacCertificate, setHasDgacCertificate] = useState(false);

  // Sessions
  const [sessions, setSessions] = useState<SessionData[]>([]);

  // Image upload
  const [uploading, setUploading] = useState(false);

  const loadCourse = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getCourse(id);
      setTitle(data.title);
      setCode(data.code || "");
      setDescription(data.description);
      setArea(data.area);
      setAreaSlug(data.area_slug);
      setSubarea(data.subarea || "");
      setLevel(data.level);
      setDuration(data.duration);
      setModality(data.modality);
      setLanguage(data.language || "Espanol");
      setGoal(data.goal || "");
      setObjectives(data.objectives?.length ? data.objectives : [""]);
      setModules(data.modules?.length ? data.modules : [""]);
      setTargetAudience(
        data.target_audience?.length ? data.target_audience : [""]
      );
      setPrerequisites(data.prerequisites?.length ? data.prerequisites : [""]);
      setImageUrl(data.image_url || null);
      setIsActive(data.is_active);
      setApendiceCRequired(!!data.apendice_c_required);
      setApendiceCHabilitationText(data.apendice_c_habilitation_text || "");
      setHasDgacCertificate(!!data.has_dgac_certificate);
      setSessions(
        data.sessions?.map((s: SessionData) => ({
          id: s.id,
          dates: s.dates,
          location: s.location,
          modality: s.modality,
          fee: s.fee || "",
          seats: s.seats,
        })) || []
      );
    } catch (err) {
      setError("Error cargando curso. Verifica la conexion a Supabase.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadCourse();
  }, [loadCourse]);

  async function handleSave() {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      // Find area name from slug
      const selectedArea = areas.find((a) => a.slug === areaSlug);

      await updateCourse(id, {
        title,
        code: code || null,
        description,
        area: selectedArea?.name || area,
        area_slug: areaSlug,
        subarea: subarea || null,
        level,
        duration,
        modality,
        language,
        goal: goal || null,
        objectives: objectives.filter((o) => o.trim()),
        modules: modules.filter((m) => m.trim()),
        target_audience: targetAudience.filter((t) => t.trim()),
        prerequisites: prerequisites.filter((p) => p.trim()),
        is_active: isActive,
        apendice_c_required: apendiceCRequired,
        apendice_c_habilitation_text: apendiceCRequired ? (apendiceCHabilitationText || null) : null,
        has_dgac_certificate: hasDgacCertificate,
      });

      // Sync module names with course_modules table (LMS)
      // Match by title to preserve activities when modules are reordered/deleted
      const cleanModules = modules.filter((m) => m.trim());
      const { data: existingCM } = await supabase
        .from("course_modules")
        .select("id, title, sort_order")
        .eq("course_id", id)
        .order("sort_order");

      if (existingCM) {
        const matched = new Set<string>();

        // Update existing modules that still exist (match by title, case-insensitive)
        for (let i = 0; i < cleanModules.length; i++) {
          const existing = existingCM.find((cm) => cm.title.toLowerCase() === cleanModules[i].toLowerCase() && !matched.has(cm.id));
          if (existing) {
            matched.add(existing.id);
            // Update sort_order and sync title to match course definition
            await supabase.from("course_modules").update({ sort_order: i, title: cleanModules[i] }).eq("id", existing.id);
          }
        }

        // Only delete orphaned course_modules that have NO lessons (safe delete)
        const toDelete = existingCM.filter((cm) => !matched.has(cm.id));
        for (const cm of toDelete) {
          const cleanLower = cleanModules.map((m) => m.toLowerCase());
          if (!cleanLower.includes(cm.title.toLowerCase())) {
            const { count } = await supabase.from("module_activities").select("id", { count: "exact", head: true }).eq("module_id", cm.id);
            if (count === 0) {
              await supabase.from("course_modules").delete().eq("id", cm.id);
            }
          }
        }
      }

      // Save sessions
      for (const session of sessions) {
        if (session.is_new) {
          await createSession({
            course_id: id,
            dates: session.dates,
            location: session.location,
            modality: session.modality,
            fee: session.fee || null,
            seats: session.seats,
          });
        } else if (session.id) {
          await updateSession(session.id, {
            dates: session.dates,
            location: session.location,
            modality: session.modality,
            fee: session.fee || null,
            seats: session.seats,
          });
        }
      }

      setSuccess("Curso guardado exitosamente");
      await loadCourse();
    } catch (err) {
      setError("Error guardando curso: " + (err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const url = await uploadCourseImage(file, id);
      setImageUrl(url);
      setSuccess("Imagen subida exitosamente");
    } catch (err) {
      setError("Error subiendo imagen: " + (err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteSession(index: number) {
    const session = sessions[index];
    if (session.id && !session.is_new) {
      await deleteSession(session.id);
    }
    setSessions(sessions.filter((_, i) => i !== index));
  }

  async function handleDelete() {
    if (!confirm("¿Estás seguro de que quieres eliminar este curso?")) return;
    try {
      await deleteCourse(id);
      window.location.href = "/admin/cursos";
    } catch (err) {
      setError("Error eliminando: " + (err as Error).message);
    }
  }

  function addListItem(
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) {
    setter((prev) => [...prev, ""]);
  }

  function updateListItem(
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    index: number,
    value: string
  ) {
    setter((prev) => prev.map((v, i) => (i === index ? value : v)));
  }

  function removeListItem(
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    index: number
  ) {
    setter((prev) => prev.filter((_, i) => i !== index));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-gray-400">Cargando curso...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/cursos"
            className="text-gray-400 hover:text-gray-600"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Link>
          <h1 className="text-2xl font-bold text-[#003366]">Editar Curso</h1>
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
          >
            {isActive ? "Activo" : "Inactivo"}
          </span>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/admin/cursos/${id}/modulos`}
            className="px-3 py-2 text-sm bg-[#0072CE] text-white rounded-lg hover:bg-[#005BA1]"
          >
            Módulos LMS
          </Link>
          <Link
            href={`/admin/cursos/${id}/evaluaciones`}
            className="px-3 py-2 text-sm bg-[#F57C00] text-white rounded-lg hover:bg-[#E65100]"
          >
            Evaluaciones
          </Link>
          <Link
            href={`/cursos/${id}`}
            target="_blank"
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Ver público ↗
          </Link>
          <button
            onClick={handleDelete}
            className="px-3 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
          >
            Eliminar
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6 text-sm">
          {success}
        </div>
      )}

      <div className="space-y-6 max-w-5xl">
        {/* Image */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-[#003366] mb-4">
            Imagen del Curso
          </h2>
          <div className="flex items-start gap-6">
            <div className="w-48 h-32 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 shrink-0 flex items-center justify-center">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-4xl">
                  {areaSlug === "uas-rpas"
                    ? "🛩️"
                    : areaSlug === "atm-navegacion"
                      ? "🗼"
                      : areaSlug === "seguridad-avsec"
                        ? "🛡️"
                        : "📋"}
                </span>
              )}
            </div>
            <div>
              <label className="inline-flex items-center px-4 py-2 bg-[#0072CE] text-white text-sm font-medium rounded-lg hover:bg-[#005fa3] transition cursor-pointer">
                {uploading ? "Subiendo..." : "Subir Imagen"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
              <p className="text-xs text-gray-400 mt-2">
                JPG, PNG o WebP. Recomendado: 800x400px
              </p>
              {imageUrl && (
                <button
                  onClick={() => setImageUrl(null)}
                  className="text-xs text-red-500 hover:underline mt-1"
                >
                  Eliminar imagen
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Basic info */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-[#003366] mb-4">
            Información Básica
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Título *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full py-2.5 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0072CE]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Código
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full py-2.5 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0072CE]"
                placeholder="ENAE/UAS/001"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Área *
              </label>
              <select
                value={areaSlug}
                onChange={(e) => {
                  setAreaSlug(e.target.value);
                  const a = areas.find((a) => a.slug === e.target.value);
                  if (a) setArea(a.name);
                }}
                className="w-full py-2.5 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0072CE]"
              >
                {areas
                  .filter((a) => a.slug !== "todos")
                  .map((a) => (
                    <option key={a.slug} value={a.slug}>
                      {a.name}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subárea
              </label>
              <input
                type="text"
                value={subarea}
                onChange={(e) => setSubarea(e.target.value)}
                className="w-full py-2.5 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0072CE]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nivel
              </label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="w-full py-2.5 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0072CE]"
              >
                <option>Basico</option>
                <option>Intermedio</option>
                <option>Avanzado</option>
                <option>Especializacion</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duración
              </label>
              <input
                type="text"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full py-2.5 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0072CE]"
                placeholder="40 horas"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Modalidad
              </label>
              <select
                value={modality}
                onChange={(e) => setModality(e.target.value)}
                className="w-full py-2.5 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0072CE]"
              >
                <option>Presencial</option>
                <option>Hibrido</option>
                <option>Online</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Idioma
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full py-2.5 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0072CE]"
              >
                <option>Espanol</option>
                <option>Ingles</option>
                <option>Espanol/Ingles</option>
              </select>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded border-gray-300 text-[#0072CE]"
                />
                <span className="text-sm text-gray-700">Curso activo</span>
              </label>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripción *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full py-2.5 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0072CE]"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Objetivo General
              </label>
              <textarea
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                rows={3}
                className="w-full py-2.5 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0072CE]"
              />
            </div>
          </div>
        </div>

        {/* Apéndice C (DGAC) */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-[#003366] mb-4">
            Documentación DGAC
          </h2>
          <label className="flex items-center gap-2 cursor-pointer mb-3">
            <input
              type="checkbox"
              checked={hasDgacCertificate}
              onChange={(e) => setHasDgacCertificate(e.target.checked)}
              className="rounded border-gray-300 text-[#0072CE]"
            />
            <span className="text-sm text-gray-700">Este curso emite Certificado DGAC</span>
          </label>
          <p className="text-xs text-gray-500 mb-4 ml-6">
            Si está activo, el curso aparecerá en la sección Certificados y los alumnos podrán descargar el Certificado DGAC al completar el 100% del curso.
          </p>
          <label className="flex items-center gap-2 cursor-pointer mb-4">
            <input
              type="checkbox"
              checked={apendiceCRequired}
              onChange={(e) => setApendiceCRequired(e.target.checked)}
              className="rounded border-gray-300 text-[#0072CE]"
            />
            <span className="text-sm text-gray-700">Este curso requiere Apéndice C</span>
          </label>
          {apendiceCRequired && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Texto de habilitación
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Texto que aparece en el punto 1 del Apéndice C. Ejemplo: <em>&quot;INSTRUCCIÓN TEÓRICA DE OPERADOR RPAS Y PRÁCTICA RESPECTO AL USO DE UNA AERONAVE NO TRIPULADA RPA MODELO: MAVIC SERIES, PHANTOM SERIES...&quot;</em>
              </p>
              <textarea
                value={apendiceCHabilitationText}
                onChange={(e) => setApendiceCHabilitationText(e.target.value)}
                rows={4}
                className="w-full py-2.5 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0072CE]"
                placeholder="INSTRUCCIÓN TEÓRICA..."
              />
            </div>
          )}
        </div>

        {/* Dynamic lists */}
        {[
          {
            title: "Objetivos de Aprendizaje",
            state: objectives,
            setter: setObjectives,
            placeholder: "Objetivo",
          },
          {
            title: "Módulos del Curso",
            state: modules,
            setter: setModules,
            placeholder: "Nombre del módulo",
          },
          {
            title: "Dirigido a",
            state: targetAudience,
            setter: setTargetAudience,
            placeholder: "Público objetivo",
          },
          {
            title: "Requisitos de Ingreso",
            state: prerequisites,
            setter: setPrerequisites,
            placeholder: "Requisito",
          },
        ].map((section) => (
          <div
            key={section.title}
            className="bg-white rounded-lg border border-gray-200 p-6"
          >
            <h2 className="text-lg font-semibold text-[#003366] mb-4">
              {section.title}
            </h2>
            <div className="space-y-2">
              {section.state.map((item, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-sm text-gray-400 mt-2.5 w-6 shrink-0">
                    {i + 1}.
                  </span>
                  <input
                    type="text"
                    value={item}
                    onChange={(e) =>
                      updateListItem(section.setter, i, e.target.value)
                    }
                    className="flex-1 py-2 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0072CE]"
                    placeholder={section.placeholder}
                  />
                  {section.state.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeListItem(section.setter, i)}
                      className="text-red-400 hover:text-red-600 px-2"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => addListItem(section.setter)}
                className="text-sm text-[#0072CE] hover:underline"
              >
                + Agregar
              </button>
            </div>
          </div>
        ))}

        {/* Sessions */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-[#003366]">
              Sesiones Programadas
            </h2>
            <button
              type="button"
              onClick={() =>
                setSessions([
                  ...sessions,
                  {
                    dates: "",
                    location: "Santiago, Chile",
                    modality: "Presencial",
                    fee: "",
                    seats: null,
                    is_new: true,
                  },
                ])
              }
              className="px-3 py-1.5 text-sm bg-[#0072CE] text-white rounded-lg hover:bg-[#005fa3]"
            >
              + Nueva Sesión
            </button>
          </div>

          {sessions.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">
              No hay sesiones programadas
            </p>
          ) : (
            <div className="space-y-4">
              {sessions.map((session, i) => (
                <div
                  key={session.id || `new-${i}`}
                  className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-xs font-medium text-gray-500">
                      Sesión {i + 1}
                      {session.is_new && (
                        <span className="ml-2 text-blue-500">(nueva)</span>
                      )}
                    </span>
                    <button
                      onClick={() => handleDeleteSession(i)}
                      className="text-xs text-red-400 hover:text-red-600"
                    >
                      Eliminar
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        Fechas *
                      </label>
                      <input
                        type="text"
                        value={session.dates}
                        onChange={(e) => {
                          const updated = [...sessions];
                          updated[i] = { ...updated[i], dates: e.target.value };
                          setSessions(updated);
                        }}
                        className="w-full py-2 px-3 border border-gray-300 rounded text-sm"
                        placeholder="14 Abr - 25 Abr 2026"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        Sede *
                      </label>
                      <input
                        type="text"
                        value={session.location}
                        onChange={(e) => {
                          const updated = [...sessions];
                          updated[i] = {
                            ...updated[i],
                            location: e.target.value,
                          };
                          setSessions(updated);
                        }}
                        className="w-full py-2 px-3 border border-gray-300 rounded text-sm"
                        placeholder="Santiago, Chile"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        Modalidad
                      </label>
                      <select
                        value={session.modality}
                        onChange={(e) => {
                          const updated = [...sessions];
                          updated[i] = {
                            ...updated[i],
                            modality: e.target.value,
                          };
                          setSessions(updated);
                        }}
                        className="w-full py-2 px-3 border border-gray-300 rounded text-sm"
                      >
                        <option>Presencial</option>
                        <option>Hibrido</option>
                        <option>Online</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        Precio
                      </label>
                      <input
                        type="text"
                        value={session.fee}
                        onChange={(e) => {
                          const updated = [...sessions];
                          updated[i] = { ...updated[i], fee: e.target.value };
                          setSessions(updated);
                        }}
                        className="w-full py-2 px-3 border border-gray-300 rounded text-sm"
                        placeholder="CLP $850.000"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        Cupos
                      </label>
                      <input
                        type="number"
                        value={session.seats ?? ""}
                        onChange={(e) => {
                          const updated = [...sessions];
                          updated[i] = {
                            ...updated[i],
                            seats: e.target.value
                              ? parseInt(e.target.value)
                              : null,
                          };
                          setSessions(updated);
                        }}
                        className="w-full py-2 px-3 border border-gray-300 rounded text-sm"
                        placeholder="20"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Save bar */}
        <div className="flex gap-4 justify-between items-center bg-white rounded-lg border border-gray-200 p-4 sticky bottom-0">
          <Link
            href="/admin/cursos"
            className="px-4 py-2.5 text-sm text-gray-600 hover:text-gray-800"
          >
            Cancelar
          </Link>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-8 py-2.5 bg-[#0072CE] text-white rounded-lg hover:bg-[#005fa3] text-sm font-medium transition disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Guardar Cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}
