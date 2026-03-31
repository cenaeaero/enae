"use client";

import { useEffect, useState } from "react";

type Program = {
  id: string;
  slug: string;
  title: string;
  area: string;
  area_slug: string;
  type: string;
  duration: string;
  language: string;
  description: string;
  goal: string;
  fee: string | null;
  course_ids: string[];
  sort_order: number;
  is_active: boolean;
};

type CourseOption = { id: string; title: string; code: string | null };

const typeOptions = ["Certificacion", "Diploma", "Programa"];

const emptyProgram = (): Omit<Program, "id"> => ({
  slug: "",
  title: "",
  area: "",
  area_slug: "",
  type: "Programa",
  duration: "",
  language: "Espanol",
  description: "",
  goal: "",
  fee: null,
  course_ids: [],
  sort_order: 0,
  is_active: true,
});

export default function AdminProgramasPage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Program | (Omit<Program, "id"> & { id?: string }) | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const res = await fetch("/api/admin/programas");
      if (!res.ok) {
        console.error("Error loading programas:", res.status);
        setLoading(false);
        return;
      }
      const json = await res.json();
      setPrograms(json.programs || []);
      setCourses(json.courses || []);
    } catch (err) {
      console.error("Error loading programas:", err);
    }
    setLoading(false);
  }

  function generateSlug(title: string) {
    return title
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function generateAreaSlug(area: string) {
    return area
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  async function handleSave() {
    if (!editing) return;
    setSaving(true);
    setMessage("");

    const data = {
      slug: editing.slug || generateSlug(editing.title),
      title: editing.title,
      area: editing.area,
      area_slug: editing.area_slug || generateAreaSlug(editing.area),
      type: editing.type,
      duration: editing.duration,
      language: editing.language,
      description: editing.description,
      goal: editing.goal,
      fee: editing.fee || null,
      course_ids: editing.course_ids || [],
      sort_order: editing.sort_order,
      is_active: editing.is_active,
    };

    const isUpdate = "id" in editing && editing.id;
    try {
      const res = await fetch("/api/admin/programas", {
        method: isUpdate ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isUpdate ? { id: editing.id, ...data } : data),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        setMessage("Error: " + (json.error || "Error desconocido"));
      } else {
        setMessage(isUpdate ? "Programa actualizado correctamente" : "Programa creado correctamente");
        setEditing(null);
        await loadData();
      }
    } catch (err) {
      setMessage("Error de conexion: " + (err instanceof Error ? err.message : "desconocido"));
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este programa?")) return;
    try {
      await fetch("/api/admin/programas", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      await loadData();
    } catch (err) {
      console.error("Error deleting program:", err);
    }
  }

  function toggleCourse(courseId: string) {
    if (!editing) return;
    const current = editing.course_ids || [];
    if (current.includes(courseId)) {
      setEditing({ ...editing, course_ids: current.filter((c) => c !== courseId) });
    } else {
      setEditing({ ...editing, course_ids: [...current, courseId] });
    }
  }

  if (loading) return <div className="text-center py-12 text-gray-400">Cargando...</div>;

  // Editing form
  if (editing) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <button onClick={() => { setEditing(null); setMessage(""); }} className="text-sm text-[#0072CE] hover:underline">
              ← Volver a Programas
            </button>
            <h1 className="text-2xl font-bold text-[#003366] mt-1">
              {"id" in editing && editing.id ? "Editar Programa" : "Nuevo Programa"}
            </h1>
          </div>
          <button onClick={handleSave} disabled={saving || !editing.title} className="bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white px-5 py-2 rounded-lg text-sm font-medium transition">
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>

        {message && (
          <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${message.startsWith("Error") ? "bg-red-50 border border-red-200 text-red-700" : "bg-green-50 border border-green-200 text-green-700"}`}>
            {message}
          </div>
        )}

        <div className="space-y-6">
          {/* Basic info */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-800 mb-4">Informacion Basica</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs text-gray-500 uppercase mb-1">Titulo *</label>
                <input
                  type="text"
                  value={editing.title}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value, slug: generateSlug(e.target.value) })}
                  className="w-full border border-gray-200 rounded px-3 py-2 text-sm"
                  placeholder="Nombre del programa"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase mb-1">Slug (URL)</label>
                <input
                  type="text"
                  value={editing.slug}
                  onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
                  className="w-full border border-gray-200 rounded px-3 py-2 text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase mb-1">Tipo</label>
                <select
                  value={editing.type}
                  onChange={(e) => setEditing({ ...editing, type: e.target.value })}
                  className="w-full border border-gray-200 rounded px-3 py-2 text-sm"
                >
                  {typeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase mb-1">Area</label>
                <input
                  type="text"
                  value={editing.area}
                  onChange={(e) => setEditing({ ...editing, area: e.target.value, area_slug: generateAreaSlug(e.target.value) })}
                  className="w-full border border-gray-200 rounded px-3 py-2 text-sm"
                  placeholder="Ej: UAS/RPAS"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase mb-1">Duracion</label>
                <input
                  type="text"
                  value={editing.duration}
                  onChange={(e) => setEditing({ ...editing, duration: e.target.value })}
                  className="w-full border border-gray-200 rounded px-3 py-2 text-sm"
                  placeholder="Ej: 180 horas"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase mb-1">Idioma</label>
                <input
                  type="text"
                  value={editing.language}
                  onChange={(e) => setEditing({ ...editing, language: e.target.value })}
                  className="w-full border border-gray-200 rounded px-3 py-2 text-sm"
                  placeholder="Ej: Espanol"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase mb-1">Precio</label>
                <input
                  type="text"
                  value={editing.fee || ""}
                  onChange={(e) => setEditing({ ...editing, fee: e.target.value || null })}
                  className="w-full border border-gray-200 rounded px-3 py-2 text-sm"
                  placeholder="Ej: USD 2.800"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase mb-1">Orden</label>
                <input
                  type="number"
                  value={editing.sort_order}
                  onChange={(e) => setEditing({ ...editing, sort_order: parseInt(e.target.value) || 0 })}
                  className="w-full border border-gray-200 rounded px-3 py-2 text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editing.is_active}
                  onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
                  className="rounded"
                />
                <label className="text-sm text-gray-700">Programa activo</label>
              </div>
            </div>
          </div>

          {/* Description and goal */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-800 mb-4">Descripcion y Objetivo</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 uppercase mb-1">Descripcion *</label>
                <textarea
                  value={editing.description}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  rows={4}
                  className="w-full border border-gray-200 rounded px-3 py-2 text-sm"
                  placeholder="Descripcion del programa"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase mb-1">Objetivo General</label>
                <textarea
                  value={editing.goal}
                  onChange={(e) => setEditing({ ...editing, goal: e.target.value })}
                  rows={3}
                  className="w-full border border-gray-200 rounded px-3 py-2 text-sm"
                  placeholder="Objetivo del programa"
                />
              </div>
            </div>
          </div>

          {/* Courses selection */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-800 mb-4">
              Cursos del Programa ({(editing.course_ids || []).length} seleccionados)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {courses.map((c) => (
                <label key={c.id} className={`flex items-center gap-3 px-3 py-2 rounded border cursor-pointer transition ${(editing.course_ids || []).includes(c.id) ? "border-[#0072CE] bg-blue-50" : "border-gray-200 hover:bg-gray-50"}`}>
                  <input
                    type="checkbox"
                    checked={(editing.course_ids || []).includes(c.id)}
                    onChange={() => toggleCourse(c.id)}
                    className="rounded text-[#0072CE]"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{c.title}</p>
                    {c.code && <p className="text-xs text-gray-400">{c.code}</p>}
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#003366]">Programas</h1>
        <button
          onClick={() => setEditing(emptyProgram())}
          className="bg-[#003366] hover:bg-[#004B87] text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          + Nuevo Programa
        </button>
      </div>

      {message && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
          {message}
        </div>
      )}

      {programs.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-400 mb-4">No hay programas creados</p>
          <button
            onClick={() => setEditing(emptyProgram())}
            className="text-[#0072CE] hover:underline text-sm font-medium"
          >
            Crear primer programa
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
                <th className="px-4 py-3 font-medium w-8">#</th>
                <th className="px-4 py-3 font-medium">Programa</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Area</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Tipo</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">Duracion</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">Precio</th>
                <th className="px-4 py-3 font-medium">Cursos</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {programs.map((p) => (
                <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs text-gray-400">{p.sort_order}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{p.title}</p>
                    <p className="text-xs text-gray-400 font-mono">{p.slug}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{p.area}</td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className={`text-xs font-medium px-2 py-1 rounded ${
                      p.type === "Certificacion" ? "bg-blue-100 text-blue-800" :
                      p.type === "Diploma" ? "bg-purple-100 text-purple-800" :
                      "bg-gray-100 text-gray-700"
                    }`}>{p.type}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{p.duration}</td>
                  <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{p.fee || "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{(p.course_ids || []).length}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded ${p.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-500"}`}>
                      {p.is_active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => setEditing(p)} className="text-xs text-[#0072CE] hover:underline">Editar</button>
                      <button onClick={() => handleDelete(p.id)} className="text-xs text-red-500 hover:underline">Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
