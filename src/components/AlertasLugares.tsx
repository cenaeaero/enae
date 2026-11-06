"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type SiteAlert = { id: string; name: string; city: string | null; state: string; detail: string };
type ClassAlert = { id: string; registration_id: string; student: string; instructor_email: string; date: string; time: string | null; site: string; warnings: string[] };

const label: Record<string, string> = { vencida: "Vencida", por_vencer: "Por vencer", sin_autorizaciones: "Sin autorizaciones" };
const color: Record<string, string> = { vencida: "bg-red-100 text-red-700", por_vencer: "bg-orange-100 text-orange-800", sin_autorizaciones: "bg-gray-100 text-gray-600" };

// Dashboard: autorizaciones de lugares de práctica y clases programadas con advertencias
export default function AlertasLugares() {
  const [data, setData] = useState<{ sites: SiteAlert[]; classes: ClassAlert[] } | null>(null);

  useEffect(() => {
    fetch("/api/admin/alertas-lugares")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setData(j && !j.unavailable ? j : { sites: [], classes: [] }))
      .catch(() => setData({ sites: [], classes: [] }));
  }, []);

  if (!data || (data.sites.length === 0 && data.classes.length === 0)) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-5 mb-6">
      <h2 className="font-semibold text-amber-900 mb-3">📍 Lugares de práctica — atención ({data.sites.length + data.classes.length})</h2>
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-amber-100">
          <p className="px-4 py-2 border-b border-amber-100 text-sm font-semibold text-[#003366]">Autorizaciones ({data.sites.length})</p>
          {data.sites.length === 0 ? <p className="px-4 py-3 text-xs text-gray-400">Todas vigentes.</p> : (
            <ul className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
              {data.sites.map((s) => (
                <li key={s.id} className="px-4 py-2.5 flex items-start justify-between gap-2">
                  <div>
                    <Link href="/admin/lugares-practica" className="text-sm font-medium text-[#0072CE] hover:underline">{s.name}</Link>
                    <p className="text-[11px] text-gray-500">{[s.city, s.detail].filter(Boolean).join(" · ")}</p>
                  </div>
                  <span className={`shrink-0 text-[11px] font-medium px-2 py-0.5 rounded ${color[s.state]}`}>{label[s.state]}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="bg-white rounded-lg border border-amber-100">
          <p className="px-4 py-2 border-b border-amber-100 text-sm font-semibold text-[#003366]">Clases programadas con advertencias ({data.classes.length})</p>
          {data.classes.length === 0 ? <p className="px-4 py-3 text-xs text-gray-400">Sin advertencias.</p> : (
            <ul className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
              {data.classes.map((c) => (
                <li key={c.id} className="px-4 py-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/admin/registros/inscripcion/${c.registration_id}`} className="text-sm font-medium text-[#0072CE] hover:underline">{c.student || "Alumno"}</Link>
                    <span className="shrink-0 text-[11px] text-gray-500">{new Date(c.date + "T12:00:00").toLocaleDateString("es-CL", { day: "2-digit", month: "short" })}{c.time ? ` · ${c.time}` : ""}</span>
                  </div>
                  <p className="text-[11px] text-gray-500">{c.site} · {c.instructor_email}</p>
                  <ul className="mt-1 text-[11px] text-orange-800 list-disc pl-4">
                    {c.warnings.map((w) => <li key={w}>{w}</li>)}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
