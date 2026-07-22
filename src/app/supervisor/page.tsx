"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

// Dashboard del Supervisor (estilo Dynamics): KPIs, avance por curso,
// actividad reciente e informes descargables (CSV compatible con Excel).

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendiente", confirmed: "En curso", completed: "Completado",
  rejected: "Rechazado", cancelled: "Cancelado",
};

export default function SupervisorDashboard() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [regs, setRegs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [asCompany, setAsCompany] = useState<string | null>(null);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("as_company");
    setAsCompany(q);
    const suffix = q ? `?as_company=${q}` : "";
    (async () => {
      const data = await fetch(`/api/supervisor/dashboard${suffix}`).then((r) => r.json());
      setCompanies(data.companies || []);
      setRegs(data.registrations || []);
      setLoading(false);
    })();
  }, []);

  const stats = useMemo(() => {
    const notas = regs.filter((r) => r.final_score != null).map((r) => Number(r.final_score));
    return {
      total: regs.length,
      enCurso: regs.filter((r) => r.status === "confirmed").length,
      completados: regs.filter((r) => r.status === "completed").length,
      pendientes: regs.filter((r) => r.status === "pending").length,
      promedio: notas.length > 0 ? Math.round(notas.reduce((a, b) => a + b, 0) / notas.length) : null,
    };
  }, [regs]);

  // Desglose por curso
  const porCurso = useMemo(() => {
    const m: Record<string, { curso: string; codigo: string; total: number; enCurso: number; completados: number; notas: number[] }> = {};
    for (const r of regs) {
      const key = r.courses?.title || "Sin curso";
      if (!m[key]) m[key] = { curso: key, codigo: r.courses?.code || "", total: 0, enCurso: 0, completados: 0, notas: [] };
      m[key].total++;
      if (r.status === "confirmed") m[key].enCurso++;
      if (r.status === "completed") m[key].completados++;
      if (r.final_score != null) m[key].notas.push(Number(r.final_score));
    }
    return Object.values(m).sort((a, b) => b.total - a.total);
  }, [regs]);

  // Actividad reciente (últimos accesos)
  const recientes = useMemo(() =>
    regs.filter((r) => r.last_access)
      .sort((a, b) => (b.last_access || "").localeCompare(a.last_access || ""))
      .slice(0, 5),
  [regs]);

  // ── Informes CSV (BOM + ; para Excel es-CL) ──
  function downloadCsv(filename: string, headers: string[], rows: (string | number | null)[][]) {
    const esc = (v: string | number | null) => {
      const s = v == null ? "" : String(v);
      return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = "﻿" + [headers, ...rows].map((r) => r.map(esc).join(";")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const hoyStr = new Date().toISOString().slice(0, 10);
  const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString("es-CL") : "");

  function informeNotas() {
    downloadCsv(`informe_notas_${hoyStr}.csv`,
      ["Alumno", "Email", "Empresa", "Curso", "Código", "Nota final (%)", "Libro de notas", "Estado"],
      regs.map((r) => [
        `${r.last_name || ""}, ${r.first_name || ""}`.replace(/^, /, ""),
        r.email, r.organization || "", r.courses?.title || "", r.courses?.code || "",
        r.final_score != null ? r.final_score : "",
        r.grade_status === "approved" ? "Aprobado" : (r.grade_status || ""),
        STATUS_LABEL[r.status] || r.status,
      ]));
  }

  function informeEstado() {
    downloadCsv(`informe_estado_${hoyStr}.csv`,
      ["Alumno", "Email", "Empresa", "Curso", "Estado", "Folio ENAE", "Inscrito el", "Completado el", "Último acceso"],
      regs.map((r) => [
        `${r.last_name || ""}, ${r.first_name || ""}`.replace(/^, /, ""),
        r.email, r.organization || "", r.courses?.title || "",
        STATUS_LABEL[r.status] || r.status,
        r.folio_enae || "",
        fmt(r.created_at), fmt(r.completed_at), r.last_access ? new Date(r.last_access).toLocaleString("es-CL") : "",
      ]));
  }

  function informePorCurso() {
    const ordenados = [...regs].sort((a, b) =>
      `${a.courses?.title || ""}${a.last_name || ""}`.localeCompare(`${b.courses?.title || ""}${b.last_name || ""}`));
    downloadCsv(`listado_por_curso_${hoyStr}.csv`,
      ["Curso", "Código", "Alumno", "Email", "Estado", "Nota final (%)"],
      ordenados.map((r) => [
        r.courses?.title || "Sin curso", r.courses?.code || "",
        `${r.last_name || ""}, ${r.first_name || ""}`.replace(/^, /, ""),
        r.email, STATUS_LABEL[r.status] || r.status,
        r.final_score != null ? r.final_score : "",
      ]));
  }

  const suffix = asCompany ? `?as_company=${asCompany}` : "";

  return (
    <div className="max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <h1 className="text-2xl font-bold text-[#003366]">Panel del Supervisor</h1>
        <div className="flex flex-wrap gap-1.5">
          {companies.map((c) => (
            <span key={c.id} className="text-xs bg-blue-50 text-[#003366] border border-blue-100 px-2.5 py-1 rounded-full">🏢 {c.name}</span>
          ))}
        </div>
      </div>
      {asCompany && (
        <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2 rounded text-xs">
          🔍 Modo previsualización admin · viendo solo empresa filtrada.{" "}
          <a href="/admin/supervisores" className="underline">Volver al admin</a>
        </div>
      )}

      {loading ? <p className="text-gray-400">Cargando…</p> : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5 mt-3">
            <Card label="Total alumnos" value={String(stats.total)} color="text-[#003366]" />
            <Card label="En curso" value={String(stats.enCurso)} color="text-[#0072CE]" />
            <Card label="Completados" value={String(stats.completados)} color="text-green-700" />
            <Card label="Pendientes" value={String(stats.pendientes)} color="text-amber-700" />
            <Card label="Promedio notas" value={stats.promedio != null ? `${stats.promedio}%` : "—"} color="text-purple-700" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
            {/* Avance por curso */}
            <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-[#003366]">📚 Avance por curso</h2>
                <Link href={`/supervisor/alumnos${suffix}`} className="text-xs text-[#0072CE] hover:underline">Ver alumnos →</Link>
              </div>
              {porCurso.length === 0 ? (
                <p className="p-5 text-sm text-gray-400">Aún no hay alumnos registrados.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                      <th className="px-5 py-2">Curso</th>
                      <th className="px-3 py-2 text-center">Alumnos</th>
                      <th className="px-3 py-2 text-center">En curso</th>
                      <th className="px-3 py-2 text-center">Completados</th>
                      <th className="px-3 py-2 text-center">Promedio</th>
                      <th className="px-5 py-2 w-32">Avance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {porCurso.map((c) => {
                      const pct = c.total > 0 ? Math.round((c.completados / c.total) * 100) : 0;
                      const prom = c.notas.length > 0 ? Math.round(c.notas.reduce((a, b) => a + b, 0) / c.notas.length) : null;
                      return (
                        <tr key={c.curso} className="hover:bg-gray-50">
                          <td className="px-5 py-2.5">
                            <p className="font-medium text-gray-800 text-xs">{c.curso}</p>
                            {c.codigo && <p className="text-[10px] text-gray-400 font-mono">{c.codigo}</p>}
                          </td>
                          <td className="px-3 py-2.5 text-center font-semibold">{c.total}</td>
                          <td className="px-3 py-2.5 text-center text-[#0072CE]">{c.enCurso}</td>
                          <td className="px-3 py-2.5 text-center text-green-700">{c.completados}</td>
                          <td className="px-3 py-2.5 text-center">{prom != null ? `${prom}%` : "—"}</td>
                          <td className="px-5 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-[10px] text-gray-500 w-8">{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Actividad reciente */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-[#003366]">🕐 Actividad reciente</h2>
              </div>
              {recientes.length === 0 ? (
                <p className="p-5 text-sm text-gray-400">Sin accesos registrados aún.</p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {recientes.map((r) => (
                    <div key={r.id} className="px-5 py-2.5">
                      <p className="text-xs font-medium text-gray-800">{r.last_name}, {r.first_name}</p>
                      <p className="text-[10px] text-gray-400">
                        Último acceso: {new Date(r.last_access).toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Informes */}
          <div className="bg-white border border-gray-200 rounded-lg p-5 mb-4">
            <h2 className="text-sm font-semibold text-[#003366] mb-1">⬇️ Informes descargables</h2>
            <p className="text-xs text-gray-400 mb-3">Archivos CSV compatibles con Excel, con los datos actuales de tus {stats.total} alumno{stats.total !== 1 ? "s" : ""}.</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={informeNotas} disabled={regs.length === 0}
                className="text-sm bg-[#0072CE] hover:bg-[#005fa3] disabled:opacity-40 text-white font-medium px-4 py-2 rounded">
                📊 Informe de notas
              </button>
              <button onClick={informeEstado} disabled={regs.length === 0}
                className="text-sm bg-[#003366] hover:bg-[#001d3d] disabled:opacity-40 text-white font-medium px-4 py-2 rounded">
                📋 Informe de estado
              </button>
              <button onClick={informePorCurso} disabled={regs.length === 0}
                className="text-sm bg-gray-700 hover:bg-gray-800 disabled:opacity-40 text-white font-medium px-4 py-2 rounded">
                📚 Listado por curso
              </button>
            </div>
            <p className="text-[11px] text-gray-400 mt-3">
              ¿Necesitas informes con filtros por curso, fecha o estado de avance, o descargar certificados en lote?
              Entra al <Link href={`/supervisor/informes${suffix}`} className="text-[#0072CE] hover:underline font-medium">Centro de Informes</Link>.
            </p>
          </div>

          {/* Accesos rápidos */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Link href={`/supervisor/alumnos${suffix}`} className="block bg-[#0072CE] hover:bg-[#005fa3] text-white px-4 py-3 rounded-lg text-sm font-medium text-center">🎓 Mis Alumnos</Link>
            <Link href={`/supervisor/informes${suffix}`} className="block bg-[#003366] hover:bg-[#001d3d] text-white px-4 py-3 rounded-lg text-sm font-medium text-center">📊 Informes</Link>
            <Link href={`/supervisor/finanzas${suffix}`} className="block bg-gray-700 hover:bg-gray-800 text-white px-4 py-3 rounded-lg text-sm font-medium text-center">💰 Finanzas</Link>
            <Link href={`/supervisor/informes${suffix}`} className="block bg-gray-500 hover:bg-gray-600 text-white px-4 py-3 rounded-lg text-sm font-medium text-center">✉️ Contactar a ENAE</Link>
          </div>
        </>
      )}
    </div>
  );
}

function Card({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <p className="text-xs text-gray-500 uppercase">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  );
}
