"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Card = {
  registration_id: string; name: string; email: string; course_id: string; course: string;
  status: string; theory_done: boolean; procedure_type: string | null; done: boolean[];
  steps_done: number; stage: string; exam_datetime: string | null; exam_unit_city: string | null;
  city: string | null; days_idle: number | null;
};
type Step = { key: string; label: string };

const COLUMNS: { key: string; label: string; hint: string }[] = [
  { key: "sin_tramite", label: "Sin trámite", hint: "Crear trámite en la ficha" },
  { key: "registro_sipa", label: "Registro SIPA", hint: "" },
  { key: "solicitud_credencial", label: "Solicitud credencial", hint: "" },
  { key: "apendice_c", label: "Apéndice C", hint: "" },
  { key: "cedula_identidad", label: "Cédula", hint: "" },
  { key: "pago_tasa", label: "Pago tasa", hint: "" },
  { key: "examen_practico", label: "Práctico", hint: "" },
  { key: "coordinacion_examen", label: "Coordinación examen", hint: "" },
  { key: "examen_agendado", label: "Examen agendado", hint: "Esperando fecha" },
  { key: "listo_egreso", label: "Listo para egresar", hint: "Checklist completo" },
];

export default function TramitesDgacPage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [steps, setSteps] = useState<Step[]>([]);
  const [courses, setCourses] = useState<{ id: string; title: string; code: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [course, setCourse] = useState("");
  const [theory, setTheory] = useState<"" | "done" | "pending">("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const r = await fetch("/api/admin/tramites-dgac");
    const d = await r.json().catch(() => ({}));
    if (!r.ok) setError(d.error || "Error al cargar");
    else { setCards(d.cards || []); setSteps(d.steps || []); setCourses(d.courses || []); setError(""); }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return cards.filter((c) =>
      (!course || c.course_id === course) &&
      (!theory || (theory === "done" ? c.theory_done : !c.theory_done)) &&
      (!t || [c.name, c.email, c.city].some((v) => (v || "").toLowerCase().includes(t))));
  }, [cards, q, course, theory]);

  const byStage = useMemo(() => {
    const m: Record<string, Card[]> = {};
    for (const c of filtered) (m[c.stage] ||= []).push(c);
    for (const k of Object.keys(m)) m[k].sort((a, b) => (b.days_idle ?? 0) - (a.days_idle ?? 0));
    return m;
  }, [filtered]);

  async function egresar(c: Card) {
    if (!c.theory_done) { alert("El curso aún no está Completado: no se puede egresar."); return; }
    if (!confirm(`¿Pasar a Egresado a ${c.name} (${c.course})? No se le enviará notificación.`)) return;
    setBusy(c.registration_id);
    const r = await fetch("/api/admin/alumnos/egresar", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ registration_ids: [c.registration_id] }),
    });
    const d = await r.json().catch(() => ({}));
    setBusy(null);
    setMsg(r.ok && (d.graduated_registrations || []).includes(c.registration_id) ? `✓ ${c.name} egresado` : `Error: ${d.error || "no se pudo egresar"}`);
    load();
  }

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-[#003366]">Trámites DGAC</h1>
        <p className="text-sm text-gray-500">
          Cada alumno aparece en la columna de su primer paso pendiente del checklist. Los avances se marcan en la ficha de inscripción (clic en el nombre).
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar alumno o ciudad…"
          className="border border-gray-200 rounded px-3 py-2 text-sm w-64" />
        <select value={course} onChange={(e) => setCourse(e.target.value)} className="border border-gray-200 rounded px-3 py-2 text-sm">
          <option value="">Todos los cursos</option>
          {courses.map((c) => <option key={c.id} value={c.id}>{c.code || c.title}</option>)}
        </select>
        <select value={theory} onChange={(e) => setTheory(e.target.value as "" | "done" | "pending")} className="border border-gray-200 rounded px-3 py-2 text-sm">
          <option value="">Teórico: todos</option>
          <option value="done">Teórico completado</option>
          <option value="pending">Teórico en curso</option>
        </select>
        <span className="text-xs text-gray-500">{filtered.length} alumno(s)</span>
        {msg && <span className={`text-xs ${msg.startsWith("Error") ? "text-red-600" : "text-green-700"}`}>{msg}</span>}
      </div>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      {loading ? <p className="text-sm text-gray-400">Cargando…</p> : (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {COLUMNS.map((col) => {
            const list = byStage[col.key] || [];
            return (
              <div key={col.key} className="w-60 shrink-0 bg-gray-100 rounded-lg flex flex-col max-h-[75vh]">
                <div className="px-3 py-2 border-b border-gray-200">
                  <p className="text-xs font-semibold text-[#003366] uppercase">{col.label} <span className="text-gray-400">({list.length})</span></p>
                  {col.hint && <p className="text-[10px] text-gray-400">{col.hint}</p>}
                </div>
                <div className="p-2 space-y-2 overflow-y-auto">
                  {list.map((c) => (
                    <div key={c.registration_id} className="bg-white rounded border border-gray-200 p-2.5 text-xs shadow-sm">
                      <Link href={`/admin/registros/inscripcion/${c.registration_id}`} className="font-medium text-[#0072CE] hover:underline block truncate">{c.name}</Link>
                      <p className="text-[11px] text-gray-500 truncate">{c.course}{c.city ? ` · ${c.city}` : ""}</p>
                      <div className="flex gap-0.5 mt-1.5" title={steps.map((s, i) => `${c.done[i] ? "✓" : "✗"} ${s.label}`).join("\n")}>
                        {c.done.map((d, i) => <span key={i} className={`h-1.5 flex-1 rounded ${d ? "bg-green-500" : "bg-gray-200"}`} />)}
                      </div>
                      <div className="flex items-center justify-between mt-1.5 text-[10px] text-gray-500">
                        <span className={c.theory_done ? "text-green-700" : "text-orange-700"}>{c.theory_done ? "Teórico ✓" : "Teórico en curso"}</span>
                        {c.days_idle != null && (
                          <span className={c.days_idle > 30 ? "text-red-600 font-medium" : c.days_idle > 14 ? "text-orange-600" : ""}>{c.days_idle} d sin cambios</span>
                        )}
                      </div>
                      {c.exam_datetime && (
                        <p className="text-[10px] text-gray-600 mt-1">🛩️ Examen {new Date(c.exam_datetime).toLocaleDateString("es-CL", { day: "2-digit", month: "short" })}{c.exam_unit_city ? ` · ${c.exam_unit_city}` : ""}</p>
                      )}
                      {col.key === "listo_egreso" && (
                        <button onClick={() => egresar(c)} disabled={busy === c.registration_id}
                          className="mt-2 w-full text-[11px] font-medium px-2 py-1 rounded bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50">
                          {busy === c.registration_id ? "Procesando…" : "🎓 Pasar a Egresado"}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
