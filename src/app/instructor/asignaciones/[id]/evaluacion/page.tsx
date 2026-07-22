"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { PHASES, ALL_KEYS, GRADE_KEYS, GRADE_PASS, emptyItems, computePracticalScore, getExamScore, type ItemState } from "@/lib/practical-eval-format";

export default function EvaluacionPracticaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [status, setStatus] = useState<"draft" | "completed">("draft");
  const [completedAt, setCompletedAt] = useState<string | null>(null);

  const [studentName, setStudentName] = useState("");
  const [studentDoc, setStudentDoc] = useState("");
  const [city, setCity] = useState("");
  const [evalDate, setEvalDate] = useState("");
  const [studentFolio, setStudentFolio] = useState("");
  const [studentPhone, setStudentPhone] = useState("");
  const [startTime, setStartTime] = useState("");
  const [locationName, setLocationName] = useState("");
  const [signedBy, setSignedBy] = useState<string | null>(null);
  const [signedAt, setSignedAt] = useState<string | null>(null);
  const [items, setItems] = useState<Record<string, ItemState>>(emptyItems());
  const [preSolo, setPreSolo] = useState<"" | "aprobado" | "reprobado">("");
  const [obs, setObs] = useState("");

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/instructor/practical-eval?assignment_id=${id}`).then((r) => r.json());
      if (res.error) { setMsg(`Error: ${res.error}`); setLoading(false); return; }
      const ev = res.evaluation;
      const d = res.defaults || {};
      setStudentName(ev?.student_name ?? d.student_name ?? "");
      setStudentDoc(ev?.student_document ?? d.student_document ?? "");
      setCity(ev?.city ?? d.city ?? "");
      setEvalDate((ev?.eval_date ?? d.eval_date ?? "") || "");
      setPreSolo(ev?.pre_solo_result ?? "");
      setObs(ev?.observations ?? "");
      setStatus(ev?.status === "completed" ? "completed" : "draft");
      setCompletedAt(ev?.completed_at || null);
      setStudentFolio(d.student_folio || "");
      setStudentPhone(d.student_phone || "");
      setStartTime(d.start_time || "");
      setLocationName(d.location_name || "");
      setSignedBy(ev?.student_signature_name || null);
      setSignedAt(ev?.student_signed_at || null);
      const base = emptyItems();
      if (ev?.items && typeof ev.items === "object") {
        for (const k of ALL_KEYS) {
          if (ev.items[k]) base[k] = { ...base[k], ...ev.items[k] };
        }
      }
      setItems(base);
      setLoading(false);
    })();
  }, [id]);

  function setItem(key: string, patch: Partial<ItemState>) {
    setItems((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  }

  const score = computePracticalScore(items);       // promedio maniobras (%)
  const examScore = getExamScore(items);            // nota examen NIST (%)
  const maniobrasEvaluadas = GRADE_KEYS.filter((k) => items[k]?.na || typeof items[k]?.grade === "number").length;

  async function save(complete: boolean) {
    if (complete) {
      const faltantes = GRADE_KEYS.filter((k) => !items[k]?.na && typeof items[k]?.grade !== "number").length;
      if (faltantes > 0 && !confirm(`Hay ${faltantes} maniobra(s) sin nota ni N/A. ¿Completar de todas formas?`)) return;
      if (!preSolo && !confirm("No has registrado el resultado del Chequeo Pre-Solo. ¿Completar de todas formas?")) return;
      if (!confirm(`Promedio de maniobras: ${score != null ? score + "%" : "—"} (${score != null && score >= GRADE_PASS ? "APROBADO" : "reprobado"}, aprobación ≥ ${GRADE_PASS}%)${examScore != null ? ` · Examen NIST: ${examScore}%` : ""}.\n\nEl promedio se registrará como nota práctica del alumno. ¿Continuar?`)) return;
    }
    setSaving(true);
    setMsg("");
    const res = await fetch("/api/instructor/practical-eval", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assignment_id: id,
        student_name: studentName,
        student_document: studentDoc,
        city,
        eval_date: evalDate || null,
        items,
        pre_solo_result: preSolo || null,
        observations: obs,
        complete,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setMsg(`Error: ${data.error || "No se pudo guardar"}`); return; }
    setStatus(data.evaluation?.status === "completed" ? "completed" : "draft");
    setCompletedAt(data.evaluation?.completed_at || null);
    setMsg(complete
      ? `✓ Evaluación completada. Promedio de maniobras ${data.practical_avg != null ? data.practical_avg + "%" : "—"} registrado como nota práctica del alumno.`
      : "✓ Borrador guardado.");
  }

  if (loading) return <p className="text-center py-16 text-gray-400">Cargando…</p>;

  return (
    <div className="max-w-5xl pb-10">
      <Link href={`/instructor/asignaciones/${id}`} className="text-xs text-[#0072CE] hover:underline">← Volver a la asignación</Link>

      {/* Encabezado del formato */}
      <div className="bg-white border border-gray-200 rounded-lg mt-2 overflow-hidden">
        <div className="bg-[#003366] text-white px-5 py-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="font-bold text-sm md:text-base">FORMATO CUMPLIMIENTO DE EJERCICIOS PRÁCTICOS</h1>
            <p className="text-[11px] text-blue-200">Programa de capacitación para la obtención de la credencial de Operador RPAS · Apéndice 1</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-mono">ENAE-CHL-N1</p>
            {status === "completed" ? (
              <span className="text-[10px] bg-green-500/20 text-green-200 px-2 py-0.5 rounded">✓ Completada {completedAt ? new Date(completedAt).toLocaleDateString("es-CL") : ""}</span>
            ) : (
              <span className="text-[10px] bg-amber-500/20 text-amber-200 px-2 py-0.5 rounded">Borrador · {maniobrasEvaluadas}/{GRADE_KEYS.length} maniobras</span>
            )}
            <span className="block text-[11px] text-blue-100 mt-1">Promedio maniobras: <strong className={score != null && score >= GRADE_PASS ? "text-green-300" : "text-white"}>{score != null ? `${score}%` : "—"}</strong>{score != null && <span className="ml-1">{score >= GRADE_PASS ? "✓ Aprobado" : `(mín. ${GRADE_PASS}%)`}</span>}{examScore != null ? <> · Examen NIST: <strong className="text-white">{examScore}%</strong></> : null}</span>
          </div>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Nombres y Apellidos</label>
            <input type="text" value={studentName} onChange={(e) => setStudentName(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">N° de documento (RUT/Pasaporte)</label>
            <input type="text" value={studentDoc} onChange={(e) => setStudentDoc(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Ciudad</label>
              <input type="text" value={city} onChange={(e) => setCity(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Fecha</label>
              <input type="date" value={evalDate} onChange={(e) => setEvalDate(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
            </div>
          </div>
        </div>
        <div className="px-5 pb-4 flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-600 border-t border-gray-100 pt-3">
          <span><span className="text-gray-400">Folio ENAE:</span> <strong>{studentFolio || "—"}</strong></span>
          <span><span className="text-gray-400">Teléfono alumno:</span> <strong>{studentPhone || "—"}</strong></span>
          {startTime && <span><span className="text-gray-400">Hora de inicio:</span> <strong>{startTime}</strong></span>}
          {locationName && <span><span className="text-gray-400">Lugar:</span> <strong>{locationName}</strong></span>}
          {signedAt ? (
            <span className="text-green-700">✍️ Firmada por el alumno ({signedBy}) el {new Date(signedAt).toLocaleString("es-CL")}</span>
          ) : (
            <span className="text-gray-400">Sin firma del alumno aún</span>
          )}
        </div>
      </div>

      {/* Fases */}
      {PHASES.map((phase) => (
        <div key={phase.title} className="bg-white border border-gray-200 rounded-lg mt-4 overflow-hidden">
          <div className="bg-gray-100 border-b border-gray-200 px-5 py-2">
            <h2 className="text-sm font-bold text-[#003366]">{phase.title}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] text-gray-500 border-b border-gray-100">
                  <th className="px-5 py-2">Ejercicio</th>
                  <th className="px-3 py-2 w-64 text-center">Evaluación · nota 0 a 100%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {phase.items.map((it) => {
                  const st = items[it.key];
                  return (
                    <tr key={it.key} className="align-top">
                      <td className="px-5 py-2.5">
                        <p className="font-medium text-gray-800">{it.label}</p>
                        {it.detail && <p className="text-[11px] text-gray-500 mt-0.5">{it.detail}</p>}
                      </td>
                      <td className="px-3 py-2.5 text-center whitespace-nowrap">
                        {it.kind === "check" ? (
                          <>
                            <button onClick={() => setItem(it.key, { done: true, na: false })}
                              className={`text-xs font-semibold px-2.5 py-1 rounded-l border ${st?.done === true && !st?.na ? "bg-green-600 text-white border-green-600" : "bg-white text-gray-500 border-gray-300 hover:bg-green-50"}`}>SÍ</button>
                            <button onClick={() => setItem(it.key, { done: false, na: false })}
                              className={`text-xs font-semibold px-2.5 py-1 border -ml-px ${st?.done === false && !st?.na ? "bg-red-600 text-white border-red-600" : "bg-white text-gray-500 border-gray-300 hover:bg-red-50"}`}>NO</button>
                            <button onClick={() => setItem(it.key, { na: true, done: null })}
                              className={`text-xs font-semibold px-2.5 py-1 rounded-r border -ml-px ${st?.na ? "bg-gray-500 text-white border-gray-500" : "bg-white text-gray-400 border-gray-300 hover:bg-gray-100"}`}
                              title="No Aplica — no cuenta en el promedio">N/A</button>
                          </>
                        ) : (
                          <div className="flex items-center justify-center gap-1.5">
                            <input type="number" min={0} max={100} step={1} inputMode="numeric"
                              placeholder="0 – 100"
                              disabled={st?.na}
                              value={st?.grade ?? ""}
                              onChange={(e) => setItem(it.key, { grade: e.target.value === "" ? null : Number(e.target.value), na: false })}
                              className="w-24 border border-gray-300 rounded px-2 py-1 text-sm text-center placeholder:text-gray-300 disabled:bg-gray-100 disabled:text-gray-400" />
                            <span className="text-xs text-gray-400">%</span>
                            <button onClick={() => setItem(it.key, { na: !st?.na, grade: null })}
                              className={`text-xs font-semibold px-2.5 py-1 rounded border ${st?.na ? "bg-gray-500 text-white border-gray-500" : "bg-white text-gray-400 border-gray-300 hover:bg-gray-100"}`}
                              title="No Aplica — no cuenta en el promedio">N/A</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Chequeo Pre-Solo al final de la primera fase */}
          {phase.title.startsWith("FASE PRE-SOLO") && (
            <div className="border-t border-gray-200 px-5 py-3 bg-blue-50/50 flex flex-wrap items-center gap-4">
              <p className="text-sm font-semibold text-[#003366]">Chequeo Pre-Solo · RESULTADO:</p>
              <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                <input type="radio" name="presolo" checked={preSolo === "aprobado"} onChange={() => setPreSolo("aprobado")} />
                <span className={preSolo === "aprobado" ? "text-green-700 font-semibold" : "text-gray-600"}>Aprobado</span>
              </label>
              <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                <input type="radio" name="presolo" checked={preSolo === "reprobado"} onChange={() => setPreSolo("reprobado")} />
                <span className={preSolo === "reprobado" ? "text-red-700 font-semibold" : "text-gray-600"}>Reprobado</span>
              </label>
            </div>
          )}
        </div>
      ))}

      {/* Observaciones */}
      <div className="bg-white border border-gray-200 rounded-lg mt-4 p-5">
        <h2 className="text-sm font-bold text-[#003366] mb-2">Observaciones del instructor</h2>
        <textarea rows={4} value={obs} onChange={(e) => setObs(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
        <p className="text-[11px] text-gray-400 mt-2">
          Al completar la evaluación declaras que el alumno participó en la capacitación práctica en la fecha señalada y
          recibió instrucción según el programa del curso de Operador RPAS de ENAE.
        </p>
      </div>

      {msg && (
        <div className={`mt-4 px-4 py-2 rounded text-sm border ${msg.startsWith("Error") ? "bg-red-50 border-red-200 text-red-700" : "bg-green-50 border-green-200 text-green-800"}`}>
          {msg}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={() => save(false)} disabled={saving}
          className="bg-[#0072CE] hover:bg-[#005fa3] disabled:bg-blue-300 text-white text-sm font-semibold px-5 py-2 rounded">
          {saving ? "Guardando…" : "Guardar borrador"}
        </button>
        <button onClick={() => save(true)} disabled={saving}
          className="bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white text-sm font-semibold px-5 py-2 rounded">
          {saving ? "Guardando…" : "Guardar y completar evaluación"}
        </button>
        <a href={`/api/practica-evaluacion-pdf?assignment_id=${id}`}
          className="bg-[#003366] hover:bg-[#00254d] text-white text-sm font-semibold px-5 py-2 rounded"
          title="Descarga el formato N1 con las notas y las firmas (archivo ISO/DGAC)">
          ⬇️ PDF firmado
        </a>
        {status === "completed" && (
          <span className="text-xs text-gray-500 self-center">La evaluación quedó registrada; puedes seguir editándola si necesitas corregir algo.</span>
        )}
      </div>
    </div>
  );
}
