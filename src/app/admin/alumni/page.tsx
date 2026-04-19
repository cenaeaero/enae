"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type AlumniRow = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  final_score: number | null;
  grade_status: string | null;
  completed_at: string | null;
  alumni_at: string | null;
  instruction_city: string | null;
  folio_enae: string | null;
  course: { id: string; title: string; code: string | null; has_dgac_certificate?: boolean } | null;
};

type CourseOption = { id: string; title: string };

export default function AdminAlumniPage() {
  const [rows, setRows] = useState<AlumniRow[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    // Wait for session to hydrate
    await supabase.auth.getSession();

    const { data } = await supabase
      .from("registrations")
      .select(
        "id, first_name, last_name, email, final_score, grade_status, completed_at, alumni_at, instruction_city, folio_enae, course:courses(id, title, code, has_dgac_certificate)",
      )
      .eq("is_alumni", true)
      .order("alumni_at", { ascending: false });

    setRows((data as any) || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    supabase
      .from("courses")
      .select("id, title")
      .eq("is_active", true)
      .order("title")
      .then(({ data }) => setCourses((data as CourseOption[]) || []));
  }, []);

  const filtered = rows.filter((r) => {
    if (selectedCourse && r.course?.id !== selectedCourse) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const full = `${r.first_name} ${r.last_name} ${r.email}`.toLowerCase();
      if (!full.includes(q)) return false;
    }
    return true;
  });

  function downloadCert(type: "dgac", rowId: string) {
    if (type === "dgac") window.open(`/api/certificado-dgac?registration_id=${rowId}`, "_blank");
  }

  async function sendCert(rowId: string, email: string) {
    if (!confirm(`Enviar el Certificado DGAC por email a ${email}?`)) return;
    setMessage("");
    const res = await fetch("/api/admin/enviar-certificado-dgac", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ registration_id: rowId }),
    });
    const json = await res.json();
    if (!res.ok) setMessage(`Error: ${json.error || "No se pudo enviar"}`);
    else setMessage(`Certificado enviado a ${json.sent_to}.`);
  }

  async function unmarkAlumni(rowId: string) {
    if (!confirm("Quitar el estado de Egresado? Volverá a 'Confirmado' en registros.")) return;
    const { error } = await supabase
      .from("registrations")
      .update({ is_alumni: false, alumni_at: null })
      .eq("id", rowId);
    if (error) setMessage(`Error: ${error.message}`);
    else {
      setMessage("Estado revertido.");
      await load();
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Alumni (Egresados)</h1>
        <p className="text-gray-500 text-sm mt-1">
          Alumnos que han completado su curso y fueron marcados como egresados. Desde aquí puedes descargar y enviar
          diplomas, certificados de calificaciones y certificados DGAC.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 grid grid-cols-1 md:grid-cols-3 gap-3">
        <input
          type="text"
          placeholder="Buscar por nombre o email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border border-gray-200 rounded px-3 py-2 text-sm"
        />
        <select
          value={selectedCourse}
          onChange={(e) => setSelectedCourse(e.target.value)}
          className="border border-gray-200 rounded px-3 py-2 text-sm"
        >
          <option value="">Todos los cursos</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
        <div className="text-sm text-gray-500 flex items-center">
          <strong className="mr-2">{filtered.length}</strong> egresados
        </div>
      </div>

      {message && (
        <div className={`p-3 rounded mb-4 text-sm ${message.startsWith("Error") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
          {message}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Cargando...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            {rows.length === 0
              ? "Aún no hay alumnos marcados como Egresados. En cada registro completado, usa la acción \"Pasar a Egresado\"."
              : "No hay egresados que coincidan con el filtro."}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-gray-500 text-xs uppercase">
                <th className="text-left px-4 py-3 font-medium">Alumno</th>
                <th className="text-left px-4 py-3 font-medium">Curso</th>
                <th className="text-left px-4 py-3 font-medium">Folio / Ciudad</th>
                <th className="text-left px-4 py-3 font-medium">Nota Final</th>
                <th className="text-left px-4 py-3 font-medium">Egresado</th>
                <th className="px-4 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-800">{r.first_name} {r.last_name}</div>
                    <div className="text-xs text-gray-500">{r.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-gray-700">{r.course?.title || "—"}</div>
                    {r.course?.code && <div className="text-xs text-gray-400">{r.course.code}</div>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    <div>Folio: {r.folio_enae || "—"}</div>
                    <div>{r.instruction_city || "—"}</div>
                  </td>
                  <td className="px-4 py-3">
                    {r.final_score != null ? (
                      <span className={`font-bold ${r.final_score >= 80 ? "text-green-600" : "text-red-600"}`}>
                        {r.final_score}%
                      </span>
                    ) : "—"}
                    {r.grade_status === "approved" && (
                      <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">Aprobado</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {r.alumni_at ? new Date(r.alumni_at).toLocaleDateString("es-CL") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1 justify-end">
                      <Link
                        href={`/admin/registros/${r.id}`}
                        className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded"
                      >
                        Ver detalle
                      </Link>
                      {r.course?.has_dgac_certificate && (
                        <>
                          <button
                            onClick={() => downloadCert("dgac", r.id)}
                            className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded"
                          >
                            DGAC
                          </button>
                          <button
                            onClick={() => sendCert(r.id, r.email)}
                            className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded"
                          >
                            Enviar DGAC
                          </button>
                        </>
                      )}
                      <Link
                        href={`/admin/diplomas`}
                        className="text-xs bg-amber-600 hover:bg-amber-700 text-white px-2 py-1 rounded"
                      >
                        Diploma
                      </Link>
                      <button
                        onClick={() => unmarkAlumni(r.id)}
                        className="text-xs bg-red-50 hover:bg-red-100 text-red-700 px-2 py-1 rounded"
                      >
                        Quitar
                      </button>
                    </div>
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
