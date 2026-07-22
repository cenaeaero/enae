"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import ScheduleClassModal, { type ScheduleFields } from "@/components/ScheduleClassModal";

type Row = {
  id: string;
  kind: string;
  city: string | null;
  scheduled_date: string | null;
  start_time: string | null;
  notified_at: string | null;
  status: string;
  grade_theoretical: number | null;
  grade_practical: number | null;
  evaluation_file_url: string | null;
  completed_at: string | null;
  registrations: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    rut: string | null;
    folio_enae: string | null;
    organization: string | null;
    courses?: { title: string; code: string | null } | null;
    sessions?: { dates: string; location: string } | null;
  } | null;
};

const STATUS_LABELS: Record<string, string> = {
  assigned: "Asignado",
  in_progress: "En proceso",
  completed: "Completado",
  cancelled: "Cancelado",
};

const STATUS_COLORS: Record<string, string> = {
  assigned: "bg-amber-100 text-amber-700",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-500",
};

export default function AsignacionesPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [fStatus, setFStatus] = useState("all");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [showSchedule, setShowSchedule] = useState(false);
  const [msg, setMsg] = useState("");

  async function load() {
    const p = new URLSearchParams(window.location.search).get("as_instructor");
    const suffix = p ? `?as_instructor=${p}` : "";
    const res = await fetch(`/api/instructor/asignaciones${suffix}`).then((r) => r.json());
    setRows(res.assignments || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  // Más próximos primero; sin fecha al final
  const filtered = useMemo(() => {
    const term = q.toLowerCase();
    return rows
      .filter((r) => {
        if (fStatus !== "all" && r.status !== fStatus) return false;
        if (!term) return true;
        const s = r.registrations;
        if (!s) return false;
        return (
          s.first_name.toLowerCase().includes(term) ||
          s.last_name.toLowerCase().includes(term) ||
          (s.email || "").toLowerCase().includes(term) ||
          (s.rut || "").toLowerCase().includes(term) ||
          (s.organization || "").toLowerCase().includes(term) ||
          (s.courses?.title || "").toLowerCase().includes(term)
        );
      })
      .sort((a, b) => {
        if (!a.scheduled_date && !b.scheduled_date) return 0;
        if (!a.scheduled_date) return 1;
        if (!b.scheduled_date) return -1;
        return a.scheduled_date.localeCompare(b.scheduled_date);
      });
  }, [rows, q, fStatus]);

  const hoy = new Date().toISOString().slice(0, 10);
  const kpi = useMemo(() => ({
    proximas: rows.filter((r) => r.scheduled_date && r.scheduled_date >= hoy && r.status !== "completed" && r.status !== "cancelled").length,
    porEvaluar: rows.filter((r) => r.status !== "cancelled" && r.grade_theoretical == null && r.grade_practical == null && !r.evaluation_file_url).length,
    enProceso: rows.filter((r) => r.status === "assigned" || r.status === "in_progress").length,
    completados: rows.filter((r) => r.status === "completed").length,
  }), [rows, hoy]);

  return (
    <div className="max-w-6xl">
      <h1 className="text-2xl font-bold text-[#003366] mb-4">Mis Alumnos Asignados</h1>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {[
          { label: "Próximas clases", value: kpi.proximas, color: "text-[#0072CE]" },
          { label: "Por evaluar", value: kpi.porEvaluar, color: "text-amber-600" },
          { label: "En proceso", value: kpi.enProceso, color: "text-[#003366]" },
          { label: "Completados", value: kpi.completados, color: "text-green-600" },
        ].map((k) => (
          <div key={k.label} className="bg-white rounded-lg border border-gray-200 p-3 text-center">
            <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
            <p className="text-[11px] text-gray-500">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <input type="text" placeholder="Buscar por nombre, RUT, curso, empresa…"
          value={q} onChange={(e) => setQ(e.target.value)}
          className="flex-1 min-w-[260px] py-2 px-3 border border-gray-300 rounded text-sm" />
        <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className="py-2 px-3 border border-gray-300 rounded text-sm">
          <option value="all">Todos</option>
          <option value="assigned">Asignados</option>
          <option value="in_progress">En proceso</option>
          <option value="completed">Completados</option>
        </select>
        <button onClick={() => setShowSchedule(true)} disabled={sel.size === 0}
          className="text-sm bg-[#0072CE] hover:bg-[#005fa3] text-white font-medium px-4 py-2 rounded disabled:opacity-40">
          📅 Programar clase ({sel.size})
        </button>
        <button onClick={() => { window.location.href = `/api/instructor/practical-eval/batch?format=pdf&ids=${Array.from(sel).join(",")}`; }}
          disabled={sel.size === 0}
          className="text-sm bg-[#003366] hover:bg-[#00254d] text-white font-medium px-4 py-2 rounded disabled:opacity-40"
          title="Descarga en PDF el formulario de evaluación prellenado para llevar a la clase">
          ⬇️ Descargar formularios ({sel.size})
        </button>
      </div>

      {msg && (
        <div className={`mb-4 px-4 py-2 rounded text-sm border ${msg.startsWith("Error") ? "bg-red-50 border-red-200 text-red-700" : "bg-green-50 border-green-200 text-green-800"}`}>
          {msg}
        </div>
      )}

      {loading ? <p className="text-gray-400">Cargando…</p> : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="text-left px-4 py-3 w-8">
                  <input type="checkbox"
                    checked={filtered.length > 0 && filtered.every((r) => sel.has(r.id))}
                    onChange={(e) => setSel(e.target.checked ? new Set(filtered.map((r) => r.id)) : new Set())}
                    className="rounded" />
                </th>
                <th className="text-left px-4 py-3">Alumno</th>
                <th className="text-left px-4 py-3">Curso</th>
                <th className="text-left px-4 py-3">Tipo</th>
                <th className="text-left px-4 py-3">Ciudad / Fecha ↑</th>
                <th className="text-left px-4 py-3">Estado</th>
                <th className="text-left px-4 py-3">Evaluación</th>
                <th className="text-right px-4 py-3">N. Teo</th>
                <th className="text-right px-4 py-3">N. Prá</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((r) => {
                const proxima = !!r.scheduled_date && r.scheduled_date >= hoy && r.status !== "completed" && r.status !== "cancelled";
                const evaluado = r.grade_theoretical != null || r.grade_practical != null || !!r.evaluation_file_url;
                return (
                <tr key={r.id} className="hover:bg-blue-50 cursor-pointer">
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={sel.has(r.id)}
                      onChange={() => setSel((prev) => { const n = new Set(prev); if (n.has(r.id)) n.delete(r.id); else n.add(r.id); return n; })}
                      className="rounded" />
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/instructor/asignaciones/${r.id}`} className="block">
                      <p className="font-semibold text-[#003366]">{r.registrations?.last_name}, {r.registrations?.first_name}</p>
                      <p className="text-xs text-gray-500">{r.registrations?.organization || "—"} · {r.registrations?.rut || "—"}</p>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    <p>{r.registrations?.courses?.title}</p>
                    <p className="text-xs text-gray-400 font-mono">{r.registrations?.courses?.code || ""}</p>
                  </td>
                  <td className="px-4 py-3 text-xs">{r.kind === "theoretical" ? "Teórico" : r.kind === "practical" ? "Práctico" : "Teórico + Práctico"}</td>
                  <td className={`px-4 py-3 text-xs ${proxima ? "font-semibold text-[#003366]" : "text-gray-600"}`}>
                    {r.city || "—"}<br/>
                    {r.scheduled_date || "—"}{r.start_time ? ` · ${r.start_time}` : ""}
                    {proxima && r.scheduled_date === hoy && <span className="ml-1.5 text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">HOY</span>}
                    {r.notified_at && <span className="block mt-0.5 text-[10px] text-green-600" title={`Avisado el ${new Date(r.notified_at).toLocaleString("es-CL")}`}>✓ Avisado</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${STATUS_COLORS[r.status]}`}>
                      {STATUS_LABELS[r.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {evaluado ? (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded whitespace-nowrap">✓ Evaluado</span>
                    ) : (
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded whitespace-nowrap">Pendiente</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">{r.grade_theoretical ?? "—"}</td>
                  <td className="px-4 py-3 text-right font-semibold">{r.grade_practical ?? "—"}</td>
                </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">Sin alumnos asignados.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showSchedule && sel.size > 0 && (() => {
        const first = rows.find((r) => sel.has(r.id));
        return (
          <ScheduleClassModal
            count={sel.size}
            initial={{ city: first?.city || "", scheduled_date: first?.scheduled_date || "" }}
            onCancel={() => setShowSchedule(false)}
            onSave={async (fields: ScheduleFields, notify: boolean) => {
              let ok = 0, fail = 0;
              for (const id of sel) {
                const res = await fetch(`/api/instructor/asignaciones/${id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    city: fields.city || null,
                    scheduled_date: fields.scheduled_date || null,
                    start_time: fields.start_time || null,
                    location_name: fields.location_name || null,
                    location_url: fields.location_url || null,
                    notify,
                  }),
                });
                if (res.ok) ok++; else fail++;
              }
              setShowSchedule(false);
              setMsg(fail === 0
                ? `✓ Clase programada para ${ok} alumno${ok !== 1 ? "s" : ""} (${fields.scheduled_date}${fields.start_time ? " · " + fields.start_time : ""})${notify ? " y avisada por correo" : ""}.`
                : `Error: ${fail} asignación(es) no se pudieron actualizar (${ok} ok).`);
              setSel(new Set());
              load();
            }}
          />
        );
      })()}
    </div>
  );
}
