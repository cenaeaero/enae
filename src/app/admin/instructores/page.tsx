"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Course = { id: string; title: string; code: string | null };
type Assignment = {
  id: string;
  instructor_email: string;
  course_id: string;
  created_at: string;
  course?: { title: string; code: string | null } | null;
};

export default function AdminInstructoresPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [email, setEmail] = useState("");
  const [courseId, setCourseId] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function loadAll() {
    setLoading(true);
    const [{ data: c }, { data: a }] = await Promise.all([
      supabase.from("courses").select("id, title, code").eq("is_active", true).order("title"),
      supabase
        .from("course_instructors")
        .select("id, instructor_email, course_id, created_at, course:courses(title, code)")
        .order("created_at", { ascending: false }),
    ]);
    setCourses((c as Course[]) || []);
    setAssignments((a as any) || []);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    if (!email || !courseId) return;

    const res = await fetch("/api/admin/instructores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ instructor_email: email.trim().toLowerCase(), course_id: courseId }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || "Error al asignar");
      return;
    }
    setEmail("");
    setCourseId("");
    setMessage("Instructor asignado correctamente.");
    await loadAll();
  }

  async function handleDelete(id: string) {
    if (!confirm("Quitar asignación de este instructor al curso?")) return;
    const res = await fetch(`/api/admin/instructores?id=${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      setMessage(data.error || "Error al eliminar");
      return;
    }
    await loadAll();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Instructores</h1>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="font-semibold text-gray-700 mb-4">Asignar instructor a curso</h2>
        <form onSubmit={handleAdd} className="flex flex-col md:flex-row gap-3">
          <input
            type="email"
            placeholder="email@instructor.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="flex-1 border border-gray-200 rounded px-3 py-2 text-sm"
          />
          <select
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            required
            className="flex-1 border border-gray-200 rounded px-3 py-2 text-sm"
          >
            <option value="">Selecciona un curso...</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title} {c.code ? `(${c.code})` : ""}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="bg-[#003366] hover:bg-[#004B87] text-white px-6 py-2 rounded text-sm font-medium"
          >
            Asignar
          </button>
        </form>
        {message && (
          <p className={`mt-3 text-sm ${message.startsWith("Error") || message.startsWith("error") ? "text-red-600" : "text-green-700"}`}>
            {message}
          </p>
        )}
        <p className="text-xs text-gray-500 mt-3">
          El instructor podrá ingresar a <code>/instructor</code> con su email y ver solo los cursos que le asignes.
          Podrá editar únicamente las calificaciones marcadas como evaluación práctica.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
          <h2 className="font-semibold text-gray-700 text-sm">Asignaciones actuales ({assignments.length})</h2>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Cargando...</div>
        ) : assignments.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">Sin asignaciones.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-gray-500">
                <th className="text-left px-5 py-3 font-medium">Instructor</th>
                <th className="text-left px-5 py-3 font-medium">Curso</th>
                <th className="text-left px-5 py-3 font-medium">Asignado</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((a) => (
                <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-800">{a.instructor_email}</td>
                  <td className="px-5 py-3 text-gray-600">
                    {a.course?.title || "—"}
                    {a.course?.code && <span className="text-gray-400 ml-1">({a.course.code})</span>}
                  </td>
                  <td className="px-5 py-3 text-gray-500 text-xs">
                    {new Date(a.created_at).toLocaleDateString("es-CL")}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => handleDelete(a.id)}
                      className="text-red-600 hover:text-red-700 text-xs"
                    >
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
