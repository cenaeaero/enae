"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";

type Student = {
  registration_id: string;
  name: string;
  email: string;
  status: string;
  has_rut: boolean;
  has_account: boolean;
  is_staff: boolean;
  prepared: boolean;
  exam_status: "pendiente" | "en curso" | "rendido";
  exam_score: number | null;
};

type Data = {
  course: { id: string; title: string; code: string | null };
  exam: {
    activityTitle: string;
    questionCount: number;
    questionsPerAttempt: number | null;
    timeLimitMinutes: number | null;
    passingScore: number;
    maxAttempts: number;
    isFinalExam: boolean;
  } | null;
  modules: { id: string; title: string; is_exam_module: boolean }[];
  grade_items: { id: string; name: string; weight: number; is_exam: boolean }[];
  exam_grade_item_found: boolean;
  min_exam_score: number | null;
  students: Student[];
};

type KeyResult = { name: string; email: string; resultado: "rut" | "generada" | "omitido" | "error"; clave?: string; detalle?: string };

export default function AccesoExamenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: courseId } = use(params);
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [keyResults, setKeyResults] = useState<KeyResult[] | null>(null);
  const [presenting, setPresenting] = useState(false);
  const [qr, setQr] = useState("");
  const [examUrl, setExamUrl] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/acceso-examen?course_id=${courseId}`);
    const json = await res.json();
    if (!res.ok) setError(json.error || "Error al cargar");
    else setData(json);
  }, [courseId]);

  useEffect(() => {
    load();
    const url = `${window.location.origin}/tpems/examen/${courseId}`;
    setExamUrl(url);
    QRCode.toDataURL(url, { width: 720, margin: 1, errorCorrectionLevel: "M" }).then(setQr).catch(() => {});
  }, [courseId, load]);

  // En modo presentación, refrescar el avance cada 20 s
  useEffect(() => {
    if (!presenting) return;
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [presenting, load]);

  async function run(action: "preparar" | "asignar_claves") {
    setBusy(action);
    setMessage("");
    try {
      const res = await fetch("/api/admin/acceso-examen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ course_id: courseId, action }),
      });
      const json = await res.json();
      if (!res.ok) setMessage("Error: " + (json.error || "no se pudo completar"));
      else if (action === "preparar") {
        setMessage(json.aviso || `Listo: ${json.alumnos} alumnos con ${json.modulos} módulo(s) previo(s) aprobados y ${json.notas} nota(s) 100 registradas.`);
      } else {
        setKeyResults(json.results);
        const ok = json.results.filter((r: KeyResult) => r.resultado === "rut").length;
        setMessage(`Claves asignadas: ${ok} con RUT, ${json.results.length - ok} requieren atención (ver detalle).`);
      }
      await load();
    } catch {
      setMessage("Error de conexión");
    }
    setBusy("");
  }

  if (error) return <div className="p-8 text-red-600">{error}</div>;
  if (!data) return <div className="p-8 text-gray-500">Cargando…</div>;

  const students = data.students;
  const pendingPrep = students.filter((s) => s.status === "confirmed" && !s.prepared).length;
  const withoutRut = students.filter((s) => !s.has_rut && !s.is_staff);
  const done = students.filter((s) => s.exam_status === "rendido").length;
  const prevModules = data.modules.filter((m) => !m.is_exam_module);
  const otherItems = data.grade_items.filter((g) => !g.is_exam);
  const weakFinal = data.exam && data.min_exam_score !== null && otherItems.length > 0 && data.min_exam_score < data.exam.passingScore;

  // ───────────── Modo presentación (para compartir pantalla en Teams) ─────────────
  if (presenting) {
    return (
      <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-sm font-semibold text-[#F57C00] uppercase tracking-wider">Examen final</p>
              <h1 className="text-3xl font-bold text-[#003366]">{data.course.title}</h1>
            </div>
            <button onClick={() => setPresenting(false)} className="text-sm text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50">
              Salir de presentación
            </button>
          </div>

          <div className="grid lg:grid-cols-[380px_1fr] gap-10">
            <div>
              {qr && <img src={qr} alt="Código QR del examen" className="w-full rounded-2xl border border-gray-200" />}
              <p className="mt-3 text-center text-lg font-mono text-[#003366] break-all">{examUrl.replace(/^https?:\/\//, "")}</p>
              <ol className="mt-6 space-y-3 text-lg text-gray-700">
                <li><span className="font-bold text-[#0072CE]">1.</span> Escanea el código QR (o escribe la dirección).</li>
                <li><span className="font-bold text-[#0072CE]">2.</span> Ingresa con tu <strong>correo</strong> de la lista.</li>
                <li><span className="font-bold text-[#0072CE]">3.</span> Tu <strong>contraseña es tu RUT</strong>, sin puntos ni guion.<br /><span className="text-base text-gray-500">Ejemplo: 12.345.678-K → <span className="font-mono">12345678K</span></span></li>
                <li><span className="font-bold text-[#0072CE]">4.</span> El examen se abre de inmediato{data.exam?.timeLimitMinutes ? ` (${data.exam.timeLimitMinutes} minutos)` : ""}.</li>
              </ol>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold text-gray-700">Alumnos ({students.length})</h2>
                <span className="text-sm text-gray-500">{done} de {students.length} ya rindieron</span>
              </div>
              <table className="w-full text-base">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-gray-500 border-b border-gray-200">
                    <th className="py-2 pr-4">Alumno</th>
                    <th className="py-2 pr-4">Correo (usuario)</th>
                    <th className="py-2 pr-4">Contraseña</th>
                    <th className="py-2">Examen</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s.registration_id} className="border-b border-gray-100">
                      <td className="py-2 pr-4 font-medium text-gray-800">{s.name}</td>
                      <td className="py-2 pr-4 font-mono text-[#003366]">{s.email}</td>
                      <td className="py-2 pr-4 text-gray-600">{s.is_staff ? "Su clave habitual" : s.has_rut ? "Tu RUT" : "Pídela al instructor"}</td>
                      <td className="py-2">
                        {s.exam_status === "rendido" ? <span className="text-green-700 font-semibold">✓ Rendido</span>
                          : s.exam_status === "en curso" ? <span className="text-[#F57C00] font-semibold">En curso</span>
                          : <span className="text-gray-400">Pendiente</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ───────────── Panel de preparación ─────────────
  return (
    <div className="max-w-5xl">
      <div className="flex items-center gap-3 mb-1">
        <Link href={`/admin/cursos/${courseId}`} className="text-gray-400 hover:text-gray-600">←</Link>
        <h1 className="text-2xl font-bold text-[#003366]">Acceso directo al examen final</h1>
      </div>
      <p className="text-sm text-gray-500 mb-6">{data.course.title}</p>

      {message && <div className="mb-4 text-sm bg-blue-50 border border-blue-200 text-blue-900 rounded-lg px-4 py-3">{message}</div>}

      <div className="grid md:grid-cols-[1fr_240px] gap-6 mb-6">
        <div className="space-y-4">
          {/* Examen */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-2">1. Examen</h2>
            {data.exam ? (
              <ul className="text-sm text-gray-700 space-y-1">
                <li><strong>{data.exam.activityTitle}</strong>{!data.exam.isFinalExam && <span className="text-amber-700"> — no está marcado como “examen final”; se usa por ser el último examen del curso</span>}</li>
                <li>{data.exam.questionCount} preguntas cargadas{data.exam.questionsPerAttempt ? ` (${data.exam.questionsPerAttempt} por intento)` : ""} · {data.exam.timeLimitMinutes ? `${data.exam.timeLimitMinutes} min` : "sin límite de tiempo"} · aprueba con {data.exam.passingScore}% · {data.exam.maxAttempts} intento(s)</li>
                {data.exam.questionCount === 0 && <li className="text-red-600 font-medium">El examen no tiene preguntas: los alumnos no podrán iniciarlo.</li>}
              </ul>
            ) : (
              <p className="text-sm text-red-600">Este curso no tiene ningún examen configurado en sus módulos.</p>
            )}
          </div>

          {/* Módulos previos */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-2">2. Módulos previos aprobados con 100%</h2>
            <p className="text-sm text-gray-600 mb-3">
              {prevModules.length === 0 && otherItems.length === 0
                ? "El curso no tiene módulos ni notas previas al examen: no hay nada que preparar."
                : <>Marca como completados {prevModules.length} módulo(s) previo(s){otherItems.length > 0 && <> y registra nota 100 en: {otherItems.map((g) => g.name).join(", ")}</>}. No modifica notas ya existentes.</>}
            </p>
            {otherItems.length > 0 && !data.exam_grade_item_found && (
              <p className="text-sm text-red-600 mb-3">No se pudo identificar qué ítem de nota corresponde al examen final. Enlázalo en la configuración del examen antes de preparar.</p>
            )}
            {weakFinal && (
              <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
                Ojo: con los demás ítems en 100, por la ponderación un alumno aprueba el curso sacando solo {data.min_exam_score}% en el examen (el examen exige {data.exam!.passingScore}%). Si el certificado debe depender solo del examen, deja el examen con 100% de la ponderación en Evaluaciones.
              </p>
            )}
            <button
              onClick={() => run("preparar")}
              disabled={!!busy || (prevModules.length === 0 && otherItems.length === 0)}
              className="px-4 py-2 text-sm bg-[#0072CE] text-white rounded-lg hover:bg-[#005BA1] disabled:opacity-40"
            >
              {busy === "preparar" ? "Preparando…" : pendingPrep > 0 ? `Preparar ${pendingPrep} alumno(s)` : "Volver a preparar"}
            </button>
            {pendingPrep === 0 && students.length > 0 && <span className="ml-3 text-sm text-green-700">✓ Todos listos</span>}
          </div>

          {/* Claves */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-2">3. Claves de acceso = RUT</h2>
            <p className="text-sm text-gray-600 mb-3">
              Reemplaza la contraseña de cada alumno inscrito por su RUT sin puntos ni guion (K en mayúscula). Quien ya tenía una clave propia deja de poder usarla.
              {withoutRut.length > 0 && <> <strong>{withoutRut.length} alumno(s) sin RUT registrado</strong> recibirán una clave generada que se muestra aquí una sola vez.</>}
            </p>
            <button
              onClick={() => { if (confirm(`Se cambiará la contraseña de ${students.filter((s) => !s.is_staff).length} alumno(s) por su RUT. ¿Continuar?`)) run("asignar_claves"); }}
              disabled={!!busy || students.length === 0}
              className="px-4 py-2 text-sm bg-[#F57C00] text-white rounded-lg hover:bg-[#E65100] disabled:opacity-40"
            >
              {busy === "asignar_claves" ? "Asignando…" : "Asignar claves por RUT"}
            </button>
            {keyResults && keyResults.some((r) => r.resultado !== "rut") && (
              <table className="w-full text-sm mt-4">
                <tbody>
                  {keyResults.filter((r) => r.resultado !== "rut").map((r) => (
                    <tr key={r.email} className="border-t border-gray-100">
                      <td className="py-1.5 pr-3">{r.name}</td>
                      <td className="py-1.5 pr-3 font-mono text-xs">{r.email}</td>
                      <td className="py-1.5 pr-3 font-mono font-semibold">{r.clave || "—"}</td>
                      <td className={`py-1.5 ${r.resultado === "error" ? "text-red-600" : "text-gray-500"}`}>{r.detalle}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* QR */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 h-fit text-center">
          {qr && <img src={qr} alt="Código QR del examen" className="w-full" />}
          <p className="text-xs font-mono text-gray-600 break-all mt-2">{examUrl}</p>
          {qr && <a href={qr} download="qr-examen-final.png" className="block mt-3 text-sm text-[#0072CE] hover:underline">Descargar QR</a>}
          <button
            onClick={() => setPresenting(true)}
            className="mt-3 w-full px-4 py-2.5 text-sm bg-[#003366] text-white rounded-lg hover:bg-[#004B87]"
          >
            Modo presentación
          </button>
          <p className="text-[11px] text-gray-400 mt-2">Pantalla para compartir en Teams: QR, instrucciones y lista de alumnos (sin claves).</p>
        </div>
      </div>

      {/* Alumnos */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Alumnos inscritos ({students.length})</h2>
          <button onClick={load} className="text-sm text-[#0072CE] hover:underline">Actualizar</button>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
            <tr>
              <th className="px-5 py-2">Alumno</th>
              <th className="px-3 py-2">Correo</th>
              <th className="px-3 py-2">RUT</th>
              <th className="px-3 py-2">Cuenta</th>
              <th className="px-3 py-2">Módulos previos</th>
              <th className="px-3 py-2">Examen</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.registration_id} className="border-t border-gray-100">
                <td className="px-5 py-2 font-medium text-gray-800">
                  <Link href={`/admin/registros/inscripcion/${s.registration_id}`} className="hover:underline">{s.name}</Link>
                </td>
                <td className="px-3 py-2 font-mono text-xs">{s.email}</td>
                <td className="px-3 py-2">{s.has_rut ? <span className="text-green-700">✓</span> : <span className="text-red-600">Falta</span>}</td>
                <td className="px-3 py-2">{s.is_staff ? <span className="text-gray-500">Equipo</span> : s.has_account ? <span className="text-green-700">✓</span> : <span className="text-amber-700">Se creará</span>}</td>
                <td className="px-3 py-2">{s.prepared ? <span className="text-green-700">✓</span> : <span className="text-amber-700">Pendiente</span>}</td>
                <td className="px-3 py-2">{s.exam_status === "rendido" ? `Rendido · ${s.exam_score}%` : s.exam_status}</td>
              </tr>
            ))}
            {students.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-6 text-center text-gray-500">No hay alumnos con inscripción confirmada en este curso.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
