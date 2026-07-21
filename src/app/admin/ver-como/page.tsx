"use client";

import { useEffect, useMemo, useState } from "react";

// Consola de Super Admin: ver la plataforma "como" cualquier usuario.
//   - Instructor  → portal /instructor en modo previsualización (?as_instructor)
//   - Supervisor  → portal /supervisor filtrado por su empresa (?as_company)
//   - Alumno      → vista de soporte de su curso (solo lectura) + ficha completa

type Instructor = { id: string; name: string; email: string };
type SupervisorRow = { id: string; name: string; email: string; companies: { id: string; name: string }[] };
type Student = { registration_id: string; name: string; email: string; organization: string | null; status: string; course: string | null };

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendiente", confirmed: "En curso", completed: "Completado", rejected: "Rechazado", cancelled: "Cancelado",
};

export default function VerComoPage() {
  const [role, setRole] = useState<"alumno" | "instructor" | "supervisor">("alumno");
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [supervisors, setSupervisors] = useState<SupervisorRow[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/admin/impersonar").then((r) => r.json());
      setInstructors(res.instructors || []);
      setSupervisors(res.supervisors || []);
      setLoading(false);
    })();
  }, []);

  // Búsqueda de alumnos con debounce simple
  useEffect(() => {
    if (role !== "alumno" || q.trim().length < 2) { setStudents([]); return; }
    let cancel = false;
    setSearching(true);
    const t = setTimeout(async () => {
      const res = await fetch(`/api/admin/impersonar?q=${encodeURIComponent(q.trim())}`).then((r) => r.json());
      if (!cancel) { setStudents(res.students || []); setSearching(false); }
    }, 350);
    return () => { cancel = true; clearTimeout(t); };
  }, [q, role]);

  const instFiltered = useMemo(() => {
    const t = q.toLowerCase();
    return instructors.filter((i) => !t || i.name.toLowerCase().includes(t) || i.email.toLowerCase().includes(t));
  }, [instructors, q]);

  const supFiltered = useMemo(() => {
    const t = q.toLowerCase();
    return supervisors.filter((s) => !t || s.name.toLowerCase().includes(t) || s.email.toLowerCase().includes(t) ||
      s.companies.some((c) => c.name.toLowerCase().includes(t)));
  }, [supervisors, q]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-[#003366]">Ver como · Suplantar usuario</h1>
        <p className="text-sm text-gray-500">Ingresa a la plataforma tal como la ve cualquier alumno, instructor o supervisor (solo lectura).</p>
      </div>

      <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg px-4 py-2 mb-5">
        🔒 Estás usando una función de administrador. Las vistas se abren en modo previsualización; no modifican datos del usuario.
      </div>

      {/* Selector de rol */}
      <div className="flex gap-2 mb-4">
        {([["alumno", "🎓 Alumnos"], ["instructor", "🧑‍🏫 Instructores"], ["supervisor", "🧑‍💼 Supervisores"]] as const).map(([key, label]) => (
          <button key={key} onClick={() => { setRole(key); setQ(""); }}
            className={`text-sm font-medium px-4 py-2 rounded-lg transition ${role === key ? "bg-[#0072CE] text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
            {label}
          </button>
        ))}
      </div>

      <input type="search" value={q} onChange={(e) => setQ(e.target.value)}
        placeholder={role === "alumno" ? "Buscar alumno por nombre, email o empresa (mín. 2 letras)…" : "Filtrar por nombre, email o empresa…"}
        className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-[#0072CE]" />

      {loading ? (
        <p className="text-gray-400 text-sm">Cargando…</p>
      ) : role === "instructor" ? (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {instFiltered.length === 0 ? <p className="p-6 text-sm text-gray-400">Sin instructores.</p> : (
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-50">
                {instFiltered.map((i) => (
                  <tr key={i.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <p className="font-medium text-[#003366]">{i.name}</p>
                      <p className="text-xs text-gray-400">{i.email}</p>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <a href={`/instructor?as_instructor=${encodeURIComponent(i.email)}`} target="_blank" rel="noopener noreferrer"
                        className="text-xs bg-[#0072CE] hover:bg-[#005fa3] text-white font-medium px-4 py-1.5 rounded">👁 Ver su portal</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : role === "supervisor" ? (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {supFiltered.length === 0 ? <p className="p-6 text-sm text-gray-400">Sin supervisores. Créalos y asócialos en <a href="/admin/supervisores" className="text-[#0072CE] hover:underline">Supervisores</a>.</p> : (
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-50">
                {supFiltered.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <p className="font-medium text-[#003366]">{s.name}</p>
                      <p className="text-xs text-gray-400">{s.email}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {s.companies.map((c) => <span key={c.id} className="text-[10px] bg-blue-50 text-[#003366] px-1.5 py-0.5 rounded">{c.name}</span>)}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right">
                      {s.companies.length === 0 ? (
                        <span className="text-xs text-gray-400">Sin empresa asociada</span>
                      ) : (
                        <a href={`/supervisor?as_company=${s.companies[0].id}`} target="_blank" rel="noopener noreferrer"
                          className="text-xs bg-[#0072CE] hover:bg-[#005fa3] text-white font-medium px-4 py-1.5 rounded">👁 Ver su portal</a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        // Alumnos
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {q.trim().length < 2 ? (
            <p className="p-6 text-sm text-gray-400">Escribe al menos 2 letras para buscar un alumno.</p>
          ) : searching ? (
            <p className="p-6 text-sm text-gray-400">Buscando…</p>
          ) : students.length === 0 ? (
            <p className="p-6 text-sm text-gray-400">Sin coincidencias para "{q}".</p>
          ) : (
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-50">
                {students.map((s) => (
                  <tr key={s.registration_id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <p className="font-medium text-[#003366]">{s.name}</p>
                      <p className="text-xs text-gray-400">{s.email}{s.organization ? ` · ${s.organization}` : ""}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">{s.course || "—"} · {STATUS_LABEL[s.status] || s.status}</p>
                    </td>
                    <td className="px-5 py-3 text-right space-x-2 whitespace-nowrap">
                      <a href={`/admin/registros/inscripcion/${s.registration_id}/soporte`} target="_blank" rel="noopener noreferrer"
                        className="text-xs bg-[#0072CE] hover:bg-[#005fa3] text-white font-medium px-3 py-1.5 rounded">👁 Ver su curso</a>
                      <a href={`/admin/registros/inscripcion/${s.registration_id}`}
                        className="text-xs text-[#0072CE] hover:underline">Ficha completa</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
