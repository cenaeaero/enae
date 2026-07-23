"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

// Reporte de asistencia por curso: % por alumno a las clases sincrónicas,
// con marca de quién cumple el mínimo (ej. 90%). Exportable a Excel (CSV).

type Student = {
  registration_id: string; name: string; email: string; organization: string | null;
  present: number; late: number; excused: number; absent: number;
  attended: number; total: number; pct: number; meets_min: boolean;
};

export default function AsistenciaPage() {
  const [courses, setCourses] = useState<{ id: string; title: string; code: string | null }[]>([]);
  const [courseId, setCourseId] = useState("");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("courses").select("id, title, code").eq("is_active", true).order("title");
      setCourses(data || []);
    })();
  }, []);

  useEffect(() => {
    if (!courseId) { setData(null); return; }
    setLoading(true);
    fetch(`/api/admin/asistencia?course_id=${courseId}`).then((r) => r.json()).then((d) => {
      setData(d); setLoading(false);
    });
  }, [courseId]);

  const students: Student[] = data?.students || [];
  const filtered = useMemo(() => {
    const t = q.toLowerCase();
    return students.filter((s) => !t || s.name.toLowerCase().includes(t) || s.email.toLowerCase().includes(t) || (s.organization || "").toLowerCase().includes(t));
  }, [students, q]);

  const cumplen = students.filter((s) => s.meets_min).length;

  function exportar() {
    const min = data?.min_attendance_pct ?? 90;
    const rows = [["Alumno", "Email", "Empresa", "Presente", "Atrasos", "Justificados", "Ausencias", `Asistencia (%)`, `Cumple ≥${min}%`]];
    for (const s of filtered) rows.push([s.name, s.email, s.organization || "", String(s.present), String(s.late), String(s.excused), String(s.absent), String(s.pct), s.meets_min ? "Sí" : "No"]);
    const esc = (v: string) => /[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
    const csv = "﻿" + rows.map((r) => r.map(esc).join(";")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `asistencia_${(data?.course?.code || "curso").replace(/[^\w]+/g, "_")}.csv`;
    a.click();
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-[#003366]">Control de Asistencia</h1>
        <p className="text-sm text-gray-500">Porcentaje de asistencia a las clases sincrónicas por alumno y cumplimiento del mínimo exigido.</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[240px]">
          <label className="block text-[11px] text-gray-500 mb-1">Curso</label>
          <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className="w-full border border-gray-200 rounded px-3 py-2 text-sm bg-white">
            <option value="">Seleccionar curso…</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.title}{c.code ? ` (${c.code})` : ""}</option>)}
          </select>
        </div>
        {data && (
          <>
            <div className="min-w-[160px]">
              <label className="block text-[11px] text-gray-500 mb-1">Buscar</label>
              <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nombre, email, empresa…" className="w-full border border-gray-200 rounded px-3 py-2 text-sm" />
            </div>
            <button onClick={exportar} className="text-sm bg-[#0072CE] hover:bg-[#005fa3] text-white font-medium px-4 py-2 rounded">⬇️ Excel</button>
          </>
        )}
      </div>

      {loading ? (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-gray-400 text-sm">Cargando…</div>
      ) : !data ? (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-gray-400 text-sm">Selecciona un curso para ver la asistencia.</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <KPI label="Clases dictadas" value={String(data.total_classes)} color="text-[#003366]" />
            <KPI label="Mínimo exigido" value={`${data.min_attendance_pct}%`} color="text-[#0072CE]" />
            <KPI label="Cumplen" value={String(cumplen)} color="text-green-600" />
            <KPI label="No cumplen" value={String(students.length - cumplen)} color="text-red-600" />
          </div>

          {data.total_classes === 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-gray-400 text-sm">Este curso aún no tiene clases sincrónicas registradas.</div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] text-gray-500 uppercase border-b border-gray-100 bg-gray-50">
                      <th className="px-4 py-2">Alumno</th>
                      <th className="px-4 py-2">Empresa</th>
                      <th className="px-4 py-2 text-center">Presente</th>
                      <th className="px-4 py-2 text-center">Atrasos</th>
                      <th className="px-4 py-2 text-center">Ausencias</th>
                      <th className="px-4 py-2 w-40">Asistencia</th>
                      <th className="px-4 py-2 text-center">Cumple</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.map((s) => (
                      <tr key={s.registration_id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5">
                          <span className="font-medium text-[#003366]">{s.name}</span>
                          <span className="block text-[11px] text-gray-400">{s.email}</span>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-gray-600">{s.organization || "—"}</td>
                        <td className="px-4 py-2.5 text-center">{s.present}</td>
                        <td className="px-4 py-2.5 text-center">{s.late}</td>
                        <td className="px-4 py-2.5 text-center">{s.absent}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${s.meets_min ? "bg-green-500" : "bg-red-500"}`} style={{ width: `${s.pct}%` }} />
                            </div>
                            <span className="text-xs font-semibold w-9">{s.pct}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {s.meets_min
                            ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">✓ Sí</span>
                            : <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">✗ No</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function KPI({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-[11px] text-gray-500">{label}</p>
    </div>
  );
}
