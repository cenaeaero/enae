"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

type DiplomaResult = {
  verification_code: string;
  student_name: string;
  course_title: string;
  course_code: string | null;
  final_score: number | null;
  status: string;
  issued_date: string;
  theoretical_start: string | null;
  practical_end: string | null;
};

export default function VerificarPage() {
  const [code, setCode] = useState("");
  const [result, setResult] = useState<DiplomaResult | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [searching, setSearching] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;

    setSearching(true);
    setResult(null);
    setNotFound(false);

    const { data } = await supabase
      .from("diplomas")
      .select(
        "verification_code, student_name, course_title, course_code, final_score, status, issued_date, theoretical_start, practical_end"
      )
      .eq("verification_code", code.trim().toUpperCase())
      .single();

    if (data) {
      setResult(data as DiplomaResult);
    } else {
      setNotFound(true);
    }
    setSearching(false);
  }

  function formatDate(d: string | null) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("es-CL", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }

  return (
    <>
      <section className="bg-gradient-to-br from-[#003366] to-[#004B87] text-white py-16">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold mb-2">
            Verificación de Diploma
          </h1>
          <p className="text-blue-200 mb-8">
            Ingresa el código de verificación para validar la autenticidad del
            certificado emitido por ENAE.
          </p>

          <form onSubmit={handleSearch} className="max-w-md mx-auto">
            <div className="flex gap-2">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Ej: UAS-BVLOS-0104650-2025"
                className="flex-1 px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-white/50 font-mono"
              />
              <button
                type="submit"
                disabled={searching || !code.trim()}
                className="px-6 py-3 bg-[#F57C00] hover:bg-[#E65100] disabled:bg-orange-300 text-white font-medium rounded-lg transition"
              >
                {searching ? "..." : "Verificar"}
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className="py-12 bg-[#F8F9FA]">
        <div className="max-w-3xl mx-auto px-4">
          {result && (
            <div className="bg-white rounded-xl border border-green-200 overflow-hidden shadow-sm">
              <div className="bg-green-50 px-6 py-4 flex items-center gap-3 border-b border-green-200">
                <svg
                  className="w-6 h-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <h2 className="font-bold text-green-800">
                    Diploma Verificado
                  </h2>
                  <p className="text-sm text-green-600">
                    Este certificado es auténtico y fue emitido por ENAE.
                  </p>
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase">
                      Código de Verificación
                    </p>
                    <p className="font-mono font-bold text-[#003366]">
                      {result.verification_code}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Estado</p>
                    <span className="inline-block text-xs font-medium px-2.5 py-1 rounded bg-green-100 text-green-800">
                      {result.status === "approved" ? "Aprobado" : "Reprobado"}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Alumno</p>
                    <p className="font-medium text-gray-800">
                      {result.student_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Curso</p>
                    <p className="font-medium text-gray-800">
                      {result.course_title}
                    </p>
                    {result.course_code && (
                      <p className="text-xs text-gray-400">
                        {result.course_code}
                      </p>
                    )}
                  </div>
                  {result.final_score !== null && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase">
                        Calificación Final
                      </p>
                      <p className="font-bold text-lg text-[#003366]">
                        {result.final_score}%
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-gray-500 uppercase">
                      Fecha de Emisión
                    </p>
                    <p className="text-gray-700">
                      {formatDate(result.issued_date)}
                    </p>
                  </div>
                  {result.theoretical_start && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase">
                        Periodo Teórico
                      </p>
                      <p className="text-gray-700">
                        {formatDate(result.theoretical_start)}
                      </p>
                    </div>
                  )}
                  {result.practical_end && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase">
                        Periodo Práctico
                      </p>
                      <p className="text-gray-700">
                        {formatDate(result.practical_end)}
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-gray-100 text-center">
                  <p className="text-xs text-gray-400">
                    Escuela de Navegación Aérea SpA | AOC 1521 - DGAC Chile
                  </p>
                </div>
              </div>
            </div>
          )}

          {notFound && (
            <div className="bg-white rounded-xl border border-red-200 overflow-hidden">
              <div className="bg-red-50 px-6 py-4 flex items-center gap-3">
                <svg
                  className="w-6 h-6 text-red-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <h2 className="font-bold text-red-800">
                    Diploma No Encontrado
                  </h2>
                  <p className="text-sm text-red-600">
                    El código &quot;{code}&quot; no corresponde a ningún diploma
                    registrado en nuestro sistema. Verifique que el código sea
                    correcto.
                  </p>
                </div>
              </div>
              <div className="p-4 text-center">
                <Link
                  href="/contacto"
                  className="text-sm text-[#0072CE] hover:underline"
                >
                  Contactar a ENAE para más información
                </Link>
              </div>
            </div>
          )}

          {!result && !notFound && (
            <div className="text-center text-gray-400 py-8">
              <p className="text-sm">
                Ingresa un código de verificación para consultar la validez de
                un diploma.
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
