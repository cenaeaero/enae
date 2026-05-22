"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";

type Row = {
  id: string;
  kind: string;
  city: string | null;
  scheduled_date: string | null;
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

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("as_instructor");
    const suffix = q ? `?as_instructor=${q}` : "";
    (async () => {
      const res = await fetch(`/api/instructor/asignaciones${suffix}`).then((r) => r.json());
      setRows(res.assignments || []);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const term = q.toLowerCase();
    return rows.filter((r) => {
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
    });
  }, [rows, q, fStatus]);

  return (
    <div className="max-w-6xl">
      <h1 className="text-2xl font-bold text-[#003366] mb-4">Mis Alumnos Asignados</h1>
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
      </div>

      {loading ? <p className="text-gray-400">Cargando…</p> : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="text-left px-4 py-3">Alumno</th>
                <th className="text-left px-4 py-3">Curso</th>
                <th className="text-left px-4 py-3">Tipo</th>
                <th className="text-left px-4 py-3">Ciudad / Fecha</th>
                <th className="text-left px-4 py-3">Estado</th>
                <th className="text-right px-4 py-3">N. Teo</th>
                <th className="text-right px-4 py-3">N. Prá</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-blue-50 cursor-pointer">
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
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {r.city || "—"}<br/>{r.scheduled_date || ""}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${STATUS_COLORS[r.status]}`}>
                      {STATUS_LABELS[r.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">{r.grade_theoretical ?? "—"}</td>
                  <td className="px-4 py-3 text-right font-semibold">{r.grade_practical ?? "—"}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Sin alumnos asignados.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
