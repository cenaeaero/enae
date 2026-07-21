"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { PHASES, GRADE_KEYS, computePracticalScore, getExamScore, type ItemState } from "@/lib/practical-eval-format";

// Vista del ALUMNO: evaluación práctica ENAE-CHL-N1 (solo lectura) + firma electrónica.

export default function PracticaAlumnoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [signName, setSignName] = useState("");
  const [signing, setSigning] = useState(false);
  const [msg, setMsg] = useState("");

  async function load() {
    const res = await fetch(`/api/practica-alumno?assignment_id=${id}`).then((r) => r.json());
    if (res.error) { setMsg(`Error: ${res.error}`); setLoading(false); return; }
    setData(res);
    setLoading(false);
  }
  useEffect(() => { load(); }, [id]);

  async function firmar() {
    if (signName.trim().length < 5) { setMsg("Error: escribe tu nombre completo para firmar"); return; }
    if (!confirm("Al firmar declaras haber participado en la capacitación práctica en la fecha señalada y haber recibido instrucción según el programa del curso de Operador RPAS de ENAE. ¿Confirmar firma?")) return;
    setSigning(true);
    setMsg("");
    const res = await fetch("/api/practica-alumno", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignment_id: id, signature_name: signName.trim() }),
    });
    const d = await res.json();
    setSigning(false);
    if (!res.ok) { setMsg(`Error: ${d.error || "No se pudo firmar"}`); return; }
    setMsg("✓ Evaluación firmada. ¡Gracias!");
    load();
  }

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-16 text-center text-gray-400">Cargando…</div>;
  if (!data?.assignment) return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-center">
      <p className="text-red-600">{msg || "Práctica no encontrada"}</p>
      <Link href="/tpems" className="text-sm text-[#0072CE] hover:underline">← Volver al portal</Link>
    </div>
  );

  const a = data.assignment;
  const ev = data.evaluation;
  const items: Record<string, ItemState> = ev?.items || {};
  const evaluadas = GRADE_KEYS.filter((k) => items[k]?.na || typeof items[k]?.grade === "number").length;
  const score = computePracticalScore(items);
  const examScore = getExamScore(items);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 pb-16">
      <Link href="/tpems" className="text-xs text-[#0072CE] hover:underline">← Volver al portal</Link>

      {/* Datos de la práctica */}
      <div className="bg-white border border-gray-200 rounded-lg mt-2 overflow-hidden">
        <div className="bg-[#003366] text-white px-5 py-3">
          <h1 className="font-bold text-sm md:text-base">Clase Práctica de Vuelo · {a.course || "Operador RPAS"}</h1>
          <p className="text-[11px] text-blue-200">Formato Cumplimiento de Ejercicios Prácticos · ENAE-CHL-N1</p>
        </div>
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm text-gray-700">
          <p>📅 <strong>{a.scheduled_date ? new Date(a.scheduled_date + "T12:00:00").toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "Fecha por confirmar"}</strong>{a.start_time ? ` · ${a.start_time} hrs` : ""}</p>
          <p>🧑‍🏫 Instructor: <strong>{data.instructor?.name}</strong></p>
          <p>📍 {a.location_name || a.city || "Lugar por confirmar"}{" "}
            {a.location_url && <a href={a.location_url} target="_blank" rel="noopener noreferrer" className="text-[#0072CE] hover:underline">Ver en Google Maps</a>}
          </p>
          <p className="text-gray-500">{data.instructor?.phone && <span>📞 {data.instructor.phone} · </span>}<span className="break-all">{data.instructor?.email}</span></p>
        </div>
      </div>

      {!ev ? (
        <div className="bg-white border border-gray-200 rounded-lg mt-4 p-8 text-center text-gray-400 text-sm">
          Tu instructor aún no registra la evaluación práctica. Cuando la complete podrás revisarla y firmarla aquí.
        </div>
      ) : (
        <>
          <div className="mt-4 flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-sm font-bold text-[#003366]">Evaluación registrada por el instructor</h2>
            <div className="flex items-center gap-2 flex-wrap">
              {ev.status === "completed" && score != null && (
                <span className="text-xs px-2 py-0.5 rounded bg-[#003366] text-white">Promedio maniobras: {score.toFixed(1)}</span>
              )}
              {ev.status === "completed" && examScore != null && (
                <span className="text-xs px-2 py-0.5 rounded bg-[#0072CE] text-white">Examen: {examScore.toFixed(1)}</span>
              )}
              <span className={`text-xs px-2 py-0.5 rounded ${ev.status === "completed" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                {ev.status === "completed" ? `✓ Completada${ev.completed_at ? " el " + new Date(ev.completed_at).toLocaleDateString("es-CL") : ""}` : `En proceso · ${evaluadas}/${GRADE_KEYS.length} maniobras`}
              </span>
            </div>
          </div>

          {PHASES.map((phase) => (
            <div key={phase.title} className="bg-white border border-gray-200 rounded-lg mt-3 overflow-hidden">
              <div className="bg-gray-100 border-b border-gray-200 px-4 py-2">
                <h3 className="text-xs font-bold text-[#003366]">{phase.title}</h3>
              </div>
              <div className="divide-y divide-gray-50">
                {phase.items.map((it) => {
                  const st = items[it.key];
                  return (
                    <div key={it.key} className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-sm">
                      <div className="min-w-0 flex-1">
                        <p className="text-gray-800">{it.label}</p>
                      </div>
                      {st?.na ? (
                        <span className="text-xs font-semibold bg-gray-200 text-gray-600 px-2.5 py-0.5 rounded">No aplica</span>
                      ) : it.kind === "check" ? (
                        st?.done === true ? (
                          <span className="text-xs font-semibold bg-green-100 text-green-700 px-2.5 py-0.5 rounded">SÍ ✓</span>
                        ) : st?.done === false ? (
                          <span className="text-xs font-semibold bg-red-100 text-red-600 px-2.5 py-0.5 rounded">NO</span>
                        ) : <span className="text-xs text-gray-300">—</span>
                      ) : typeof st?.grade === "number" ? (
                        <span className={`text-xs font-bold px-2.5 py-0.5 rounded ${st.grade >= 4 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>Nota {st.grade.toFixed(1)}</span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </div>
                  );
                })}
              </div>
              {phase.title.startsWith("FASE PRE-SOLO") && ev.pre_solo_result && (
                <div className="border-t border-gray-200 px-4 py-2 bg-blue-50/50 text-sm">
                  Chequeo Pre-Solo: {ev.pre_solo_result === "aprobado"
                    ? <strong className="text-green-700">Aprobado</strong>
                    : <strong className="text-red-700">Reprobado</strong>}
                </div>
              )}
            </div>
          ))}

          {ev.observations && (
            <div className="bg-white border border-gray-200 rounded-lg mt-3 p-4">
              <p className="text-xs font-bold text-[#003366] mb-1">Observaciones del instructor</p>
              <p className="text-sm text-gray-700 italic">"{ev.observations}"</p>
            </div>
          )}

          {/* Firma */}
          <div className="bg-white border border-gray-200 rounded-lg mt-4 p-5">
            <h2 className="text-sm font-bold text-[#003366] mb-2">Firma del alumno</h2>
            {ev.student_signed_at ? (
              <div className="bg-green-50 border border-green-200 rounded px-4 py-3 text-sm text-green-800">
                ✍️ Firmada por <strong>{ev.student_signature_name}</strong> el {new Date(ev.student_signed_at).toLocaleString("es-CL")}.
              </div>
            ) : ev.status !== "completed" ? (
              <p className="text-sm text-gray-400">Podrás firmar cuando el instructor complete la evaluación.</p>
            ) : (
              <>
                <p className="text-xs text-gray-500 mb-3">
                  Declaro haber participado en la capacitación práctica en la fecha señalada y recibido instrucción
                  según el programa del curso de Operador RPAS de ENAE.
                </p>
                <div className="flex flex-wrap gap-2">
                  <input type="text" placeholder="Escribe tu nombre completo" value={signName}
                    onChange={(e) => setSignName(e.target.value)}
                    className="flex-1 min-w-[240px] border border-gray-300 rounded px-3 py-2 text-sm" />
                  <button onClick={firmar} disabled={signing}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white text-sm font-semibold px-5 py-2 rounded">
                    {signing ? "Firmando…" : "✍️ Firmar evaluación"}
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {msg && (
        <div className={`mt-4 px-4 py-2 rounded text-sm border ${msg.startsWith("Error") ? "bg-red-50 border-red-200 text-red-700" : "bg-green-50 border-green-200 text-green-800"}`}>
          {msg}
        </div>
      )}
    </div>
  );
}
