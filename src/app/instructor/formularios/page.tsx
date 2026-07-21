"use client";

import { useEffect, useState } from "react";
import { PHASES } from "@/lib/practical-eval-format";

// Página imprimible: formulario de evaluación práctica (formato N1) prellenado
// con los datos del alumno, para que el instructor lo lleve a la clase.
// Uso: /instructor/formularios?ids=a,b,c  → "Imprimir / Guardar PDF".

type Form = {
  assignment_id: string;
  student_name: string;
  student_document: string;
  folio: string;
  course: string;
  course_code: string;
  city: string;
  date: string;
  time: string;
  location: string;
};

export default function FormulariosImprimibles() {
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const ids = new URLSearchParams(window.location.search).get("ids") || "";
    if (!ids) { setError("No se indicaron alumnos."); setLoading(false); return; }
    (async () => {
      const res = await fetch(`/api/instructor/practical-eval/batch?ids=${encodeURIComponent(ids)}`).then((r) => r.json());
      if (res.error) { setError(res.error); setLoading(false); return; }
      setForms(res.forms || []);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="p-10 text-center text-gray-400">Cargando formularios…</div>;
  if (error) return <div className="p-10 text-center text-red-600">{error}</div>;

  return (
    <div className="bg-gray-100 min-h-screen">
      {/* Barra (no se imprime) */}
      <div className="no-print sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <p className="text-sm text-gray-600">{forms.length} formulario{forms.length !== 1 ? "s" : ""} listo{forms.length !== 1 ? "s" : ""} para imprimir</p>
        <button onClick={() => window.print()} className="bg-[#0072CE] hover:bg-[#005fa3] text-white text-sm font-semibold px-5 py-2 rounded">
          🖨️ Imprimir / Guardar PDF
        </button>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          aside { display: none !important; }
          main { padding: 0 !important; overflow: visible !important; }
          .form-page { page-break-after: always; box-shadow: none !important; margin: 0 !important; border: none !important; }
          body { background: white; }
        }
      `}</style>

      <div className="max-w-3xl mx-auto py-6 space-y-6">
        {forms.map((f) => (
          <div key={f.assignment_id} className="form-page bg-white shadow-sm border border-gray-300 p-8 text-[13px] text-black">
            {/* Encabezado */}
            <div className="flex items-center justify-between border-b-2 border-[#003366] pb-2 mb-3">
              <div>
                <p className="font-bold text-[#003366] text-base">ESCUELA DE NAVEGACIÓN AÉREA — ENAE</p>
                <p className="text-[11px]">Formato Cumplimiento de Ejercicios Prácticos · Apéndice 1</p>
              </div>
              <div className="text-right text-[11px]">
                <p className="font-mono font-bold">ENAE-CHL-N1</p>
                <p>Programa Operador RPAS</p>
              </div>
            </div>

            {/* Datos del alumno */}
            <table className="w-full border border-gray-400 border-collapse mb-3 text-[12px]">
              <tbody>
                <tr>
                  <td className="border border-gray-400 px-2 py-1 bg-gray-50 font-semibold w-32">Nombre</td>
                  <td className="border border-gray-400 px-2 py-1" colSpan={3}>{f.student_name || "____________________"}</td>
                </tr>
                <tr>
                  <td className="border border-gray-400 px-2 py-1 bg-gray-50 font-semibold">RUT / Pasaporte</td>
                  <td className="border border-gray-400 px-2 py-1">{f.student_document || "____________"}</td>
                  <td className="border border-gray-400 px-2 py-1 bg-gray-50 font-semibold w-28">Folio ENAE</td>
                  <td className="border border-gray-400 px-2 py-1">{f.folio || "________"}</td>
                </tr>
                <tr>
                  <td className="border border-gray-400 px-2 py-1 bg-gray-50 font-semibold">Curso</td>
                  <td className="border border-gray-400 px-2 py-1" colSpan={3}>{f.course}{f.course_code ? ` (${f.course_code})` : ""}</td>
                </tr>
                <tr>
                  <td className="border border-gray-400 px-2 py-1 bg-gray-50 font-semibold">Fecha</td>
                  <td className="border border-gray-400 px-2 py-1">{f.date || "___/___/______"}{f.time ? ` · ${f.time}` : ""}</td>
                  <td className="border border-gray-400 px-2 py-1 bg-gray-50 font-semibold">Lugar</td>
                  <td className="border border-gray-400 px-2 py-1">{f.location || f.city || "____________"}</td>
                </tr>
              </tbody>
            </table>

            {/* Fases */}
            {PHASES.map((phase) => (
              <table key={phase.title} className="w-full border border-gray-400 border-collapse mb-2 text-[12px]">
                <thead>
                  <tr className="bg-[#003366] text-white">
                    <th className="border border-gray-400 px-2 py-1 text-left" colSpan={2}>{phase.title}</th>
                  </tr>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-400 px-2 py-1 text-left">Ejercicio</th>
                    <th className="border border-gray-400 px-2 py-1 text-center w-40">{phase.items.every((i) => i.kind === "check") ? "SÍ / NO / N/A" : "Nota (%) / N/A"}</th>
                  </tr>
                </thead>
                <tbody>
                  {phase.items.map((it) => (
                    <tr key={it.key}>
                      <td className="border border-gray-400 px-2 py-1.5">
                        {it.label}
                        {it.detail && <span className="block text-[10px] text-gray-500">{it.detail}</span>}
                      </td>
                      <td className="border border-gray-400 px-2 py-1.5 text-center text-gray-400">
                        {it.kind === "check" ? "⬜ SÍ  ⬜ NO  ⬜ N/A" : "______ %   ⬜ N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ))}

            {/* Chequeo Pre-Solo + Observaciones + Firmas */}
            <table className="w-full border border-gray-400 border-collapse mb-3 text-[12px]">
              <tbody>
                <tr>
                  <td className="border border-gray-400 px-2 py-1 bg-gray-50 font-semibold w-40">Chequeo Pre-Solo</td>
                  <td className="border border-gray-400 px-2 py-1">⬜ Aprobado   ⬜ Reprobado</td>
                </tr>
                <tr>
                  <td className="border border-gray-400 px-2 py-1 bg-gray-50 font-semibold">Promedio maniobras</td>
                  <td className="border border-gray-400 px-2 py-1">________ %  (aprobación ≥ 80%) &nbsp;&nbsp; Examen NIST: ________ %</td>
                </tr>
                <tr>
                  <td className="border border-gray-400 px-2 py-1 bg-gray-50 font-semibold align-top">Observaciones</td>
                  <td className="border border-gray-400 px-2 py-6"></td>
                </tr>
              </tbody>
            </table>

            <div className="flex justify-between gap-8 mt-8 text-[12px]">
              <div className="flex-1 text-center">
                <div className="border-t border-gray-500 pt-1">Firma Instructor</div>
              </div>
              <div className="flex-1 text-center">
                <div className="border-t border-gray-500 pt-1">Firma Alumno</div>
              </div>
            </div>
            <p className="text-[10px] text-gray-400 mt-3">Declaro haber participado en la capacitación práctica en la fecha señalada y recibido instrucción según el programa del curso de Operador RPAS de ENAE.</p>
          </div>
        ))}
      </div>
    </div>
  );
}
