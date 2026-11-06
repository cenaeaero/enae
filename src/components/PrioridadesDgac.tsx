"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Base = {
  registration_id: string;
  name: string;
  email: string;
  course: string;
  course_code: string | null;
  practical_date: string | null;
  days_since_practical: number | null;
};
type Teorico = Base & { theory_progress: number | null };
type Tramite = Base & { procedure_type: string | null; missing: string[]; steps_done: number; steps_total: number };

function fmt(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" });
}

function Age({ days }: { days: number | null }) {
  if (days == null) return <span className="text-gray-400">sin fecha</span>;
  const cls = days > 30 ? "bg-red-100 text-red-700" : days > 14 ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-600";
  return <span className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${cls}`}>{days} d</span>;
}

export default function PrioridadesDgac() {
  const [data, setData] = useState<{ teorico_pendiente: Teorico[]; tramite_pendiente: Tramite[] } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/prioridades-dgac")
      .then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error || "Error");
        setData(j);
      })
      .catch((e) => setError(e.message || "Error"));
  }, []);

  if (error) return <div className="text-xs text-red-600 mb-6">Prioridades DGAC: {error}</div>;
  if (!data) return <div className="text-xs text-gray-400 mb-6">Cargando prioridades DGAC…</div>;

  const total = data.teorico_pendiente.length + data.tramite_pendiente.length;
  if (total === 0) return null;

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-5 mb-6">
      <h2 className="font-semibold text-red-800 mb-1 flex items-center gap-2">
        🚩 Prioridades DGAC ({total})
      </h2>
      <p className="text-xs text-red-700/80 mb-4">
        Alumnos con el examen práctico ya realizado que aún no cierran el proceso. Ordenados por días desde el práctico.
      </p>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* B) Nuestra parte administrativa */}
        <div className="bg-white rounded-lg border border-red-100">
          <div className="px-4 py-2 border-b border-red-100">
            <p className="text-sm font-semibold text-[#003366]">
              Trámite DGAC pendiente — acción ENAE ({data.tramite_pendiente.length})
            </p>
            <p className="text-[11px] text-gray-500">Práctico y teórico listos; falta completar el checklist administrativo.</p>
          </div>
          {data.tramite_pendiente.length === 0 ? (
            <p className="px-4 py-3 text-xs text-gray-400">Sin pendientes.</p>
          ) : (
            <ul className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
              {data.tramite_pendiente.map((t) => (
                <li key={t.registration_id} className="px-4 py-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/admin/registros/inscripcion/${t.registration_id}`} className="text-sm font-medium text-[#0072CE] hover:underline">
                      {t.name}
                    </Link>
                    <span className="flex items-center gap-2 shrink-0 text-[11px] text-gray-500">
                      {t.steps_done}/{t.steps_total} <Age days={t.days_since_practical} />
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500">{t.course_code || t.course} · práctico {fmt(t.practical_date)}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {t.missing.map((m) => (
                      <span key={m} className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700">{m}</span>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* A) Teórico pendiente del alumno */}
        <div className="bg-white rounded-lg border border-red-100">
          <div className="px-4 py-2 border-b border-red-100">
            <p className="text-sm font-semibold text-[#003366]">
              Práctico hecho, teórico sin terminar ({data.teorico_pendiente.length})
            </p>
            <p className="text-[11px] text-gray-500">Hacer seguimiento al alumno para que complete el curso en línea.</p>
          </div>
          {data.teorico_pendiente.length === 0 ? (
            <p className="px-4 py-3 text-xs text-gray-400">Sin pendientes.</p>
          ) : (
            <ul className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
              {data.teorico_pendiente.map((t) => (
                <li key={t.registration_id} className="px-4 py-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/admin/registros/inscripcion/${t.registration_id}`} className="text-sm font-medium text-[#0072CE] hover:underline">
                      {t.name}
                    </Link>
                    <span className="shrink-0"><Age days={t.days_since_practical} /></span>
                  </div>
                  <p className="text-[11px] text-gray-500">{t.course_code || t.course} · práctico {fmt(t.practical_date)} · {t.email}</p>
                  {t.theory_progress != null && (
                    <div className="mt-1 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded">
                        <div className="h-1.5 rounded bg-orange-400" style={{ width: `${t.theory_progress}%` }} />
                      </div>
                      <span className="text-[11px] text-gray-600 w-9 text-right">{t.theory_progress}%</span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
