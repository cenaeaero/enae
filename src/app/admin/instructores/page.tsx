"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import NewRoleProfileModal from "@/components/NewRoleProfileModal";

type Course = { id: string; title: string; code: string | null };

type Instructor = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  rut: string | null;
  phone: string | null;
  bank_account_confirmed_at: string | null;
};

type Assignment = {
  id: string;
  instructor_email: string;
  course_id: string;
  created_at: string;
  course?: { title: string; code: string | null } | null;
};

export default function AdminInstructoresPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedInstructor, setSelectedInstructor] = useState("");
  const [courseId, setCourseId] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);

  async function loadAll() {
    setLoading(true);
    const [{ data: c }, profsRes, asgRes] = await Promise.all([
      supabase.from("courses").select("id, title, code").eq("is_active", true).order("title"),
      fetch("/api/admin/perfiles").then((r) => r.json()),
      fetch("/api/admin/instructores").then((r) => r.json()),
    ]);
    setCourses((c as Course[]) || []);

    // Filtrar perfiles que sean instructores
    const insts = (profsRes.profiles || []).filter((p: any) => p.role === "instructor" || p.role === "admin");
    setInstructors(insts.map((p: any) => ({
      id: p.id, first_name: p.first_name || "", last_name: p.last_name || "",
      email: p.email, rut: p.rut, phone: p.phone,
      bank_account_confirmed_at: p.bank_account_confirmed_at,
    })));

    setAssignments(asgRes.assignments || []);
    setLoading(false);
  }

  useEffect(() => { loadAll(); }, []);

  // Mapa email → nombre para mostrar
  const nameByEmail = useMemo(() => {
    const m: Record<string, string> = {};
    for (const i of instructors) {
      m[i.email] = `${i.first_name} ${i.last_name}`.trim() || i.email;
    }
    return m;
  }, [instructors]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    if (!selectedInstructor || !courseId) return;
    const instructor = instructors.find((i) => i.id === selectedInstructor);
    if (!instructor) return;

    const res = await fetch("/api/admin/instructores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ instructor_email: instructor.email.toLowerCase(), course_id: courseId }),
    });
    const data = await res.json();
    if (!res.ok) { setMessage(data.error || "Error al asignar"); return; }
    setSelectedInstructor(""); setCourseId("");
    setMessage("Instructor asignado correctamente.");
    await loadAll();
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Quitar asignación de este instructor al curso?")) return;
    const res = await fetch(`/api/admin/instructores?id=${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      setMessage(data.error || "Error al eliminar");
      return;
    }
    await loadAll();
  }

  const filteredAssignments = useMemo(() => {
    const term = search.toLowerCase();
    return assignments.filter((a) => {
      if (!term) return true;
      const name = (nameByEmail[a.instructor_email] || "").toLowerCase();
      return name.includes(term) ||
        a.instructor_email.toLowerCase().includes(term) ||
        (a.course?.title || "").toLowerCase().includes(term) ||
        (a.course?.code || "").toLowerCase().includes(term);
    });
  }, [assignments, search, nameByEmail]);

  const filteredInstructors = useMemo(() => {
    return [...instructors].sort((a, b) =>
      `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`)
    );
  }, [instructors]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#003366]">Instructores</h1>
          <p className="text-sm text-gray-500">Crea instructores y asígnalos a cursos. {instructors.length} instructor{instructors.length !== 1 ? "es" : ""} registrado{instructors.length !== 1 ? "s" : ""}.</p>
        </div>
        <button onClick={() => setShowNew(true)} className="bg-[#0072CE] hover:bg-[#005fa3] text-white text-sm font-semibold px-4 py-2 rounded">
          + Nuevo instructor
        </button>
      </div>

      {showNew && (
        <NewRoleProfileModal role="instructor" title="Nuevo instructor"
          onClose={() => setShowNew(false)}
          onCreated={() => { setShowNew(false); loadAll(); }} />
      )}

      {/* Lista de instructores */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <h2 className="font-semibold text-gray-700 text-sm">Instructores registrados</h2>
        </div>
        {filteredInstructors.length === 0 ? (
          <p className="p-6 text-sm text-gray-400 text-center">Aún no hay instructores. Click "+ Nuevo instructor" para crear el primero.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-white text-xs text-gray-500 uppercase">
              <tr>
                <th className="text-left px-5 py-2">Nombre</th>
                <th className="text-left px-5 py-2">Email</th>
                <th className="text-left px-5 py-2">RUT</th>
                <th className="text-left px-5 py-2">Teléfono</th>
                <th className="text-left px-5 py-2">Datos bancarios</th>
                <th className="text-right px-5 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredInstructors.map((i) => (
                <tr key={i.id} className="hover:bg-blue-50">
                  <td className="px-5 py-2 font-semibold text-[#003366]">{i.last_name}, {i.first_name}</td>
                  <td className="px-5 py-2 text-gray-600">{i.email}</td>
                  <td className="px-5 py-2 text-gray-600 font-mono text-xs">{i.rut || "—"}</td>
                  <td className="px-5 py-2 text-gray-600">{i.phone || "—"}</td>
                  <td className="px-5 py-2">
                    {i.bank_account_confirmed_at ? (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">✓ Confirmados</span>
                    ) : (
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">Pendientes</span>
                    )}
                  </td>
                  <td className="px-5 py-2 text-right">
                    <a href={`/admin/perfiles?id=${i.id}`} className="text-xs text-[#0072CE] hover:underline">Editar</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Asignar a curso */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="font-semibold text-gray-700 mb-4">Asignar instructor a curso</h2>
        <form onSubmit={handleAdd} className="flex flex-col md:flex-row gap-3">
          <select value={selectedInstructor} onChange={(e) => setSelectedInstructor(e.target.value)}
            required className="flex-1 border border-gray-200 rounded px-3 py-2 text-sm">
            <option value="">Selecciona un instructor…</option>
            {filteredInstructors.map((i) => (
              <option key={i.id} value={i.id}>{i.last_name}, {i.first_name} ({i.email})</option>
            ))}
          </select>
          <select value={courseId} onChange={(e) => setCourseId(e.target.value)}
            required className="flex-1 border border-gray-200 rounded px-3 py-2 text-sm">
            <option value="">Selecciona un curso…</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.title} {c.code ? `(${c.code})` : ""}</option>
            ))}
          </select>
          <button type="submit" className="bg-[#003366] hover:bg-[#004B87] text-white px-6 py-2 rounded text-sm font-medium">
            Asignar
          </button>
        </form>
        {message && (
          <p className={`mt-3 text-sm ${message.startsWith("Error") || message.startsWith("error") ? "text-red-600" : "text-green-700"}`}>{message}</p>
        )}
        <p className="text-xs text-gray-500 mt-3">
          El instructor podrá ingresar a <code>/instructor</code> con su email y ver solo los cursos asignados.
        </p>
      </div>

      {/* Asignaciones actuales */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between gap-3">
          <h2 className="font-semibold text-gray-700 text-sm">Asignaciones actuales ({filteredAssignments.length})</h2>
          <input type="text" placeholder="Buscar por nombre / curso…" value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-xs border border-gray-300 rounded px-3 py-1.5 w-72"/>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Cargando…</div>
        ) : filteredAssignments.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">Sin asignaciones.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-gray-500 text-xs uppercase">
                <th className="text-left px-5 py-3">Instructor</th>
                <th className="text-left px-5 py-3">Curso</th>
                <th className="text-left px-5 py-3">Asignado</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filteredAssignments.map((a) => (
                <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <p className="font-semibold text-[#003366]">{nameByEmail[a.instructor_email] || a.instructor_email}</p>
                    <p className="text-xs text-gray-500">{a.instructor_email}</p>
                  </td>
                  <td className="px-5 py-3 text-gray-600">
                    {a.course?.title || "—"}
                    {a.course?.code && <span className="text-gray-400 ml-1">({a.course.code})</span>}
                  </td>
                  <td className="px-5 py-3 text-gray-500 text-xs">
                    {new Date(a.created_at).toLocaleDateString("es-CL")}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button onClick={() => handleDelete(a.id)} className="text-red-600 hover:text-red-700 text-xs">
                      Quitar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
