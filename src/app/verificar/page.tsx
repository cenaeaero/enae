"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

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
  return (
    <Suspense fallback={<div className="text-center py-16 text-gray-400">Cargando...</div>}>
      <VerificarContent />
    </Suspense>
  );
}

function VerificarContent() {
  const searchParams = useSearchParams();
  const docType = searchParams.get("type") === "certificate" ? "certificate" : "diploma";
  const docLabel = docType === "certificate" ? "Certificado DGAC" : "Diploma";
  const docLabelShort = docType === "certificate" ? "certificado" : "diploma";
  const [code, setCode] = useState("");
  const [result, setResult] = useState<DiplomaResult | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [searching, setSearching] = useState(false);

  async function searchDiploma(searchCode: string) {
    if (!searchCode.trim()) return;
    setSearching(true);
    setResult(null);
    setNotFound(false);
    try {
      const res = await fetch(`/api/verificar?code=${encodeURIComponent(searchCode.trim().toUpperCase())}`);
      const json = await res.json();
      if (json.found && json.result) {
        setResult(json.result as DiplomaResult);
      } else {
        setNotFound(true);
      }
    } catch {
      setNotFound(true);
    }
    setSearching(false);
  }

  // Lookup by registration_id (used by certificates when no diploma exists)
  async function searchByRegistration(regId: string) {
    setSearching(true);
    setResult(null);
    setNotFound(false);
    try {
      const res = await fetch(`/api/verificar?reg=${encodeURIComponent(regId)}`);
      const json = await res.json();
      if (json.found && json.result) {
        setResult(json.result as DiplomaResult);
      } else {
        setNotFound(true);
      }
    } catch {
      setNotFound(true);
    }
    setSearching(false);
  }

  // Auto-search if code or reg is in URL
  useEffect(() => {
    const urlCode = searchParams.get("code");
    const urlReg = searchParams.get("reg");
    if (urlCode) {
      setCode(urlCode.toUpperCase());
      searchDiploma(urlCode);
    } else if (urlReg) {
      // Certificate QR fallback: look up by registration_id
      searchByRegistration(urlReg);
    }
  }, [searchParams]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    searchDiploma(code);
  }

  function formatDate(d: string | null) {
    if (!d) return "\u2014";
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
          <div className="flex items-center justify-center gap-4 mb-6">
            <Image
              src="/img/logo-enae.png"
              alt="ENAE"
              width={48}
              height={48}
              className="object-contain"
            />
            <Image
              src="/img/logo-DGAC.jpg"
              alt="DGAC Chile"
              width={48}
              height={48}
              className="object-contain rounded"
            />
          </div>
          <h1 className="text-3xl font-bold mb-2">
            Verificación de {docLabel}
          </h1>
          <p className="text-blue-200 mb-8">
            Ingresa el código de verificación para validar la autenticidad del{" "}
            {docLabelShort} emitido por la Escuela de Navegación Aérea.
          </p>

          <form onSubmit={handleSearch} className="max-w-md mx-auto">
            <div className="flex gap-2">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Ej: UAS-001-0104650-2026"
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
              {/* Header */}
              <div className="bg-green-50 px-6 py-4 flex items-center gap-3 border-b border-green-200">
                <svg
                  className="w-6 h-6 text-green-600 shrink-0"
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
                    {docLabel} Verificado
                  </h2>
                  <p className="text-sm text-green-600">
                    Este {docLabelShort} es auténtico y fue emitido por la Escuela de Navegación Aérea.
                  </p>
                </div>
              </div>

              {/* Logos */}
              <div className="flex items-center justify-center gap-6 pt-6 pb-2">
                <Image
                  src="/img/logo-enae.png"
                  alt="ENAE"
                  width={56}
                  height={56}
                  className="object-contain"
                />
                <Image
                  src="/img/logo-DGAC.jpg"
                  alt="DGAC Chile"
                  width={56}
                  height={56}
                  className="object-contain rounded"
                />
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">
                      Codigo de Verificacion
                    </p>
                    <p className="font-mono font-bold text-[#003366] text-lg">
                      {result.verification_code}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Estado</p>
                    <span className="inline-block text-xs font-medium px-2.5 py-1 rounded bg-green-100 text-green-800 mt-1">
                      {result.status === "approved" ? "Aprobado" : "Reprobado"}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Alumno</p>
                    <p className="font-semibold text-gray-800 text-lg">
                      {result.student_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Curso</p>
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
                      <p className="text-xs text-gray-500 uppercase tracking-wider">
                        Calificacion Final
                      </p>
                      <p className="font-bold text-2xl text-[#003366]">
                        {result.final_score}%
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">
                      Fecha de Emision
                    </p>
                    <p className="text-gray-700">
                      {formatDate(result.issued_date)}
                    </p>
                  </div>
                  {result.theoretical_start && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider">
                        Periodo Teorico
                      </p>
                      <p className="text-gray-700">
                        {formatDate(result.theoretical_start)}
                      </p>
                    </div>
                  )}
                  {result.practical_end && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider">
                        Periodo Practico
                      </p>
                      <p className="text-gray-700">
                        {formatDate(result.practical_end)}
                      </p>
                    </div>
                  )}
                </div>

                {/* Authorized signatories (without signature images for security) */}
                <div className="mt-8 pt-6 border-t border-gray-100 grid grid-cols-2 gap-8">
                  <div className="text-center">
                    <div className="border-t border-gray-300 pt-1 mx-4">
                      <p className="text-xs font-semibold text-gray-700">Vivian Garcia Lopera</p>
                      <p className="text-[10px] text-gray-500">Directora Academica</p>
                      <p className="text-[10px] text-gray-400">Escuela de Navegacion Aerea SpA</p>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="border-t border-gray-300 pt-1 mx-4">
                      <p className="text-xs font-semibold text-gray-700">Ivan Araos Mancilla</p>
                      <p className="text-[10px] text-gray-500">Director</p>
                      <p className="text-[10px] text-gray-400">Escuela de Navegacion Aerea SpA</p>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-6 pt-4 border-t border-gray-100 text-center">
                  <p className="text-xs text-gray-400">
                    Escuela de Navegacion Aerea SpA | AOC 1521 - DGAC Chile
                  </p>
                </div>
              </div>
            </div>
          )}

          {notFound && (
            <div className="bg-white rounded-xl border border-red-200 overflow-hidden">
              <div className="bg-red-50 px-6 py-4 flex items-center gap-3">
                <svg
                  className="w-6 h-6 text-red-500 shrink-0"
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
                    {docLabel} No Encontrado
                  </h2>
                  <p className="text-sm text-red-600">
                    El código &quot;{code}&quot; no corresponde a ningún {docLabelShort}
                    {" "}registrado en nuestro sistema. Verifique que el código sea
                    correcto.
                  </p>
                </div>
              </div>
              <div className="p-4 text-center">
                <Link
                  href="/contacto"
                  className="text-sm text-[#0072CE] hover:underline"
                >
                  Contactar a ENAE para mas informacion
                </Link>
              </div>
            </div>
          )}

          {!result && !notFound && (
            <div className="text-center text-gray-400 py-8">
              <p className="text-sm">
                Ingresa un código de verificación para consultar la validez de
                un {docLabelShort}.
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
