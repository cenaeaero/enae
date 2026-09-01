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
import { FREE_FEE_LABEL } from "@/lib/fees";

type SessionData = {
  id?: string;
  dates: string;
  location: string;
  modality: string;
  fee: string;
  price_usd?: number | null;
  seats: number | null;
  schedule?: string | null;
  capacity_presencial?: number | null;
  capacity_online?: number | null;
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
  const [theoreticalHours, setTheoreticalHours] = useState<number | "">("");
  const [practicalHours, setPracticalHours] = useState<number | "">("");
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
  const [dgacHabilitaciones, setDgacHabilitaciones] = useState("");
  // Config del Certificado DGAC (fechas/ciudad/horas/textos reales del curso)
  const [certCity, setCertCity] = useState("");
  const [certStartDate, setCertStartDate] = useState("");
  const [certEndDate, setCertEndDate] = useState("");
  const [certHours, setCertHours] = useState<string>("");
  const [certCompendio, setCertCompendio] = useState("");
  const [certMacText, setCertMacText] = useState("");
  const [brochureUrl, setBrochureUrl] = useState<string | null>(null);
  const [allowAttendanceChoice, setAllowAttendanceChoice] = useState(false);
  const [minAttendancePct, setMinAttendancePct] = useState(90);
  const [brochureUploading, setBrochureUploading] = useState(false);
  const [brochureMsg, setBrochureMsg] = useState("");

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
      setTheoreticalHours(data.theoretical_hours ?? data.horas_teoricas ?? "");
      setPracticalHours(data.practical_hours ?? data.horas_practicas ?? "");
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
      setDgacHabilitaciones(data.dgac_habilitaciones || "");
      setCertCity((data as any).cert_city || "");
      setCertStartDate((data as any).cert_start_date || "");
      setCertEndDate((data as any).cert_end_date || "");
      setCertHours((data as any).cert_hours != null ? String((data as any).cert_hours) : "");
      setCertCompendio((data as any).cert_compendio || "");
      setCertMacText((data as any).cert_mac_text || "");
      setBrochureUrl(data.brochure_url || null);
      setAllowAttendanceChoice(!!data.allow_attendance_choice);
      setMinAttendancePct(data.min_attendance_pct ?? 90);
      setSessions(
        data.sessions?.map((s: SessionData) => ({
          id: s.id,
          dates: s.dates,
          location: s.location,
          modality: s.modality,
          fee: s.fee || "",
          price_usd: s.price_usd ?? null,
          seats: s.seats,
          schedule: s.schedule ?? "",
          capacity_presencial: s.capacity_presencial ?? 20,
          capacity_online: s.capacity_online ?? 20,
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
        theoretical_hours: theoreticalHours === "" ? null : Number(theoreticalHours),
        practical_hours: practicalHours === "" ? null : Number(practicalHours),
        modality,
        language,
        goal: goal || null,
        objectives: objectives.filter((o) => o.trim()),
        modules: modules.filter((m) => m.trim()),
        target_audience: targetAudience.filter((t) => t.trim()),
        prerequisites: prerequisites.filter((p) => p.trim()),
        is_active: isActive,
        apendice_c_required: apendiceCRequired,
        // Single source of truth: same habilitation text used by both
        // the Apéndice C document (point 1) and the DGAC certificate
        // (line "Habilitación de tipo XXX").
        apendice_c_habilitation_text: (hasDgacCertificate || apendiceCRequired) ? ((apendiceCHabilitationText || "").trim() || null) : null,
        has_dgac_certificate: hasDgacCertificate,
        allow_attendance_choice: allowAttendanceChoice,
        min_attendance_pct: minAttendancePct,
        dgac_habilitaciones: (hasDgacCertificate || apendiceCRequired) ? ((apendiceCHabilitationText || "").trim() || null) : null,
        // Config del Certificado DGAC por curso
        cert_city: certCity.trim() || null,
        cert_start_date: certStartDate || null,
        cert_end_date: certEndDate || null,
        cert_hours: certHours === "" ? null : Number(certHours),
        cert_compendio: certCompendio.trim() || null,
        cert_mac_text: certMacText.trim() || null,
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
            price_usd: session.price_usd ?? null,
            seats: session.seats,
            schedule: session.schedule || null,
            capacity_presencial: session.capacity_presencial ?? null,
            capacity_online: session.capacity_online ?? null,
          });
        } else if (session.id) {
          await updateSession(session.id, {
            dates: session.dates,
            location: session.location,
            modality: session.modality,
            fee: session.fee || null,
            price_usd: session.price_usd ?? null,
            seats: session.seats,
            schedule: session.schedule || null,
            capacity_presencial: session.capacity_presencial ?? null,
            capacity_online: session.capacity_online ?? null,
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
            href={`/admin/cursos/${id}/biblioteca`}
            className="px-3 py-2 text-sm bg-[#7B1FA2] text-white rounded-lg hover:bg-[#5E1582]"
          >
            Biblioteca
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
                Duración (texto)
              </label>
              <input
                type="text"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full py-2.5 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0072CE]"
                placeholder="3 días / 40 horas"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Horas teóricas
              </label>
              <input
                type="number"
                min={0}
                value={theoreticalHours}
                onChange={(e) => setTheoreticalHours(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full py-2.5 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0072CE]"
                placeholder="20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Horas prácticas
              </label>
              <input
                type="number"
                min={0}
                value={practicalHours}
                onChange={(e) => setPracticalHours(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full py-2.5 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0072CE]"
                placeholder="5"
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Suma teóricas + prácticas se usa en el certificado DGAC.
              </p>
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
          {(hasDgacCertificate || apendiceCRequired) && (
            <div className="ml-6 bg-blue-50 border border-blue-100 rounded-lg p-3">
              <label className="block text-sm font-medium text-gray-800 mb-1">
                Habilitación del curso (Certificado DGAC + Apéndice C)
              </label>
              <p className="text-xs text-gray-600 mb-2">
                Este texto se usa tanto en el <strong>Certificado DGAC</strong> (línea &quot;Habilitación de tipo XXX&quot;) como en el <strong>punto 1 del Apéndice C</strong>.<br />
                Ejemplo: <code className="bg-white px-1.5 py-0.5 rounded">MATRICE 4 SERIES</code> o <code className="bg-white px-1.5 py-0.5 rounded">MAVIC SERIES, PHANTOM SERIES, MATRICE SERIES</code>.
              </p>
              <textarea
                value={apendiceCHabilitationText}
                onChange={(e) => {
                  setApendiceCHabilitationText(e.target.value);
                  setDgacHabilitaciones(e.target.value);
                }}
                rows={3}
                className="w-full py-2.5 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0072CE] bg-white"
                placeholder="MATRICE 4 SERIES"
              />
            </div>
          )}

          {hasDgacCertificate && (
            <div className="mt-4 border-t border-gray-100 pt-4">
              <h3 className="text-sm font-semibold text-[#003366] mb-1">Certificado DGAC — fechas y textos del curso</h3>
              <p className="text-xs text-gray-500 mb-3">
                Estos datos van en el <strong>Certificado DGAC</strong> de este curso. Las fechas y la ciudad son las <strong>reales del curso</strong> (no las de inscripción). Los textos son editables: déjalos vacíos para usar el texto por defecto (credencial DAN 151), o escribe uno propio para cursos técnicos (ej. Termografía).
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Ciudad</label>
                  <input type="text" value={certCity} onChange={(e) => setCertCity(e.target.value)}
                    className="w-full py-2 px-3 border border-gray-300 rounded text-sm" placeholder="Requínoa, O'Higgins" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Fecha inicio</label>
                  <input type="date" value={certStartDate} onChange={(e) => setCertStartDate(e.target.value)}
                    className="w-full py-2 px-3 border border-gray-300 rounded text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Fecha término</label>
                  <input type="date" value={certEndDate} onChange={(e) => setCertEndDate(e.target.value)}
                    className="w-full py-2 px-3 border border-gray-300 rounded text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Horas totales</label>
                  <input type="number" min={0} value={certHours} onChange={(e) => setCertHours(e.target.value)}
                    className="w-full py-2 px-3 border border-gray-300 rounded text-sm" placeholder="12" />
                </div>
              </div>
              <label className="block text-xs text-gray-500 mb-1">Texto COMPENDIO (separa párrafos con línea en blanco)</label>
              <textarea value={certCompendio} onChange={(e) => setCertCompendio(e.target.value)} rows={4}
                className="w-full py-2 px-3 border border-gray-300 rounded text-sm mb-3"
                placeholder="Vacío = texto por defecto (DAN 151, credencial de operador RPA). Para cursos técnicos escribe el compendio propio del curso." />
              <label className="block text-xs text-gray-500 mb-1">Texto de cierre (página 2)</label>
              <textarea value={certMacText} onChange={(e) => setCertMacText(e.target.value)} rows={3}
                className="w-full py-2 px-3 border border-gray-300 rounded text-sm"
                placeholder="Vacío = texto MAC por defecto (DAN 151). Para cursos técnicos: p. ej. 'Curso de especialización técnica complementario a la formación del operador RPAS…'." />
            </div>
          )}
        </div>

        {/* Brochure y modalidad de asistencia */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-[#003366] mb-4">Brochure y modalidad</h2>

          <label className="block text-sm font-medium text-gray-700 mb-1">Brochure del curso (PDF)</label>
          <p className="text-xs text-gray-500 mb-3">Los interesados podrán descargarlo desde la página del curso.</p>
          <div className="flex flex-wrap items-center gap-3">
            <input type="file" accept="application/pdf"
              onChange={async (e) => {
                const f = e.target.files?.[0]; if (!f) return;
                setBrochureUploading(true); setBrochureMsg("");
                const fd = new FormData();
                fd.append("course_id", id as string);
                fd.append("file", f);
                const res = await fetch("/api/admin/curso-brochure", { method: "POST", body: fd });
                const d = await res.json();
                setBrochureUploading(false);
                e.target.value = "";
                if (!res.ok) { setBrochureMsg(`Error: ${d.error || "no se pudo subir"}`); return; }
                setBrochureUrl(d.brochure_url);
                setBrochureMsg("✓ Brochure subido.");
              }}
              className="text-sm" />
            {brochureUploading && <span className="text-xs text-gray-400">Subiendo…</span>}
            {brochureUrl && !brochureUploading && (
              <>
                <a href={brochureUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-[#0072CE] hover:underline">📄 Ver brochure actual</a>
                <button type="button" onClick={async () => {
                  if (!confirm("¿Quitar el brochure?")) return;
                  await fetch(`/api/admin/curso-brochure?course_id=${id}`, { method: "DELETE" });
                  setBrochureUrl(null); setBrochureMsg("Brochure eliminado.");
                }} className="text-sm text-red-500 hover:underline">Quitar</button>
              </>
            )}
          </div>
          {brochureMsg && <p className={`text-xs mt-2 ${brochureMsg.startsWith("Error") ? "text-red-600" : "text-green-700"}`}>{brochureMsg}</p>}

          <label className="flex items-center gap-2 cursor-pointer mt-5">
            <input type="checkbox" checked={allowAttendanceChoice}
              onChange={(e) => setAllowAttendanceChoice(e.target.checked)}
              className="rounded border-gray-300 text-[#0072CE]" />
            <span className="text-sm text-gray-700">El alumno elige su modalidad al inscribirse (Presencial / Online sincrónico)</span>
          </label>
          <p className="text-xs text-gray-500 mt-1 ml-6">
            Actívalo para cursos híbridos como <strong>Metodología SORA 2.5</strong>. Según la elección del alumno le entregas el link de conexión de la clase sincrónica.
          </p>

          <div className="mt-5">
            <label className="block text-sm font-medium text-gray-700 mb-1">Asistencia mínima exigida (%)</label>
            <input type="number" min={0} max={100} value={minAttendancePct}
              onChange={(e) => setMinAttendancePct(e.target.value ? parseInt(e.target.value) : 0)}
              className="w-28 py-2 px-3 border border-gray-300 rounded-lg text-sm" />
            <p className="text-xs text-gray-500 mt-1">Se usa en el reporte de <strong>Asistencia</strong> para marcar quién cumple el mínimo (ej. 90%).</p>
          </div>
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
                    schedule: "",
                    capacity_presencial: 20,
                    capacity_online: 20,
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
                        value={session.fee === FREE_FEE_LABEL ? "" : (session.fee ?? "")}
                        disabled={session.fee === FREE_FEE_LABEL}
                        onChange={(e) => {
                          const updated = [...sessions];
                          updated[i] = { ...updated[i], fee: e.target.value };
                          setSessions(updated);
                        }}
                        className="w-full py-2 px-3 border border-gray-300 rounded text-sm disabled:bg-gray-100 disabled:text-gray-400"
                        placeholder={session.fee === FREE_FEE_LABEL ? FREE_FEE_LABEL : "CLP $850.000"}
                      />
                      <label className="flex items-center gap-1.5 mt-1.5 text-xs text-gray-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={session.fee === FREE_FEE_LABEL}
                          onChange={(e) => {
                            const updated = [...sessions];
                            updated[i] = {
                              ...updated[i],
                              fee: e.target.checked ? FREE_FEE_LABEL : "",
                            };
                            setSessions(updated);
                          }}
                          className="rounded border-gray-300 text-[#0072CE] focus:ring-[#0072CE]"
                        />
                        Curso gratuito
                      </label>
                      <label className="block text-xs text-gray-500 mt-3 mb-1">
                        Precio internacional (USD) 🌎
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={session.price_usd ?? ""}
                        disabled={session.fee === FREE_FEE_LABEL}
                        onChange={(e) => {
                          const updated = [...sessions];
                          const v = e.target.value.trim();
                          updated[i] = { ...updated[i], price_usd: v === "" ? null : parseInt(v) };
                          setSessions(updated);
                        }}
                        className="w-full py-2 px-3 border border-gray-300 rounded text-sm disabled:bg-gray-100 disabled:text-gray-400"
                        placeholder="USD 400 (vacío = sin pago internacional)"
                      />
                      <p className="text-[11px] text-gray-400 mt-1">
                        Habilita el botón &quot;Pagar USD&quot; (Paddle) para alumnos en el extranjero.
                      </p>
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
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Horario</label>
                      <input
                        type="text"
                        value={session.schedule ?? ""}
                        onChange={(e) => {
                          const updated = [...sessions];
                          updated[i] = { ...updated[i], schedule: e.target.value };
                          setSessions(updated);
                        }}
                        className="w-full py-2 px-3 border border-gray-300 rounded text-sm"
                        placeholder="09:00 a 18:00 hrs"
                      />
                    </div>
                  </div>

                  {/* Cupos por modalidad (cursos híbridos) */}
                  {allowAttendanceChoice && (
                    <div className="grid grid-cols-2 gap-3 mt-3 bg-blue-50 border border-blue-100 rounded p-3">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">🏫 Cupos presenciales</label>
                        <input type="number" min={0} value={session.capacity_presencial ?? ""}
                          onChange={(e) => { const u = [...sessions]; u[i] = { ...u[i], capacity_presencial: e.target.value ? parseInt(e.target.value) : null }; setSessions(u); }}
                          className="w-full py-2 px-3 border border-gray-300 rounded text-sm" placeholder="20" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">💻 Cupos online sincrónico</label>
                        <input type="number" min={0} value={session.capacity_online ?? ""}
                          onChange={(e) => { const u = [...sessions]; u[i] = { ...u[i], capacity_online: e.target.value ? parseInt(e.target.value) : null }; setSessions(u); }}
                          className="w-full py-2 px-3 border border-gray-300 rounded text-sm" placeholder="20" />
                      </div>
                      <p className="col-span-2 text-[11px] text-gray-500">Presenciales limitados a este cupo; los online sincrónicos puedes ampliarlos aquí. Al llenarse una modalidad, se bloquea esa opción en la inscripción.</p>
                    </div>
                  )}
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
