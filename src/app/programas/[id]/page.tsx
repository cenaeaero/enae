"use client";

import { useParams } from "next/navigation";
import { programs } from "@/data/programs";
import { courses } from "@/data/courses";
import Link from "next/link";

const areaColors: Record<string, string> = {
  "uas-rpas": "bg-sky-500",
  "atm-navegacion": "bg-indigo-500",
  "seguridad-avsec": "bg-red-500",
  simuladores: "bg-teal-500",
  "safety-ffhh": "bg-amber-500",
  "gestion-aeronautica": "bg-emerald-500",
};

export default function ProgramDetailPage() {
  const params = useParams();
  const program = programs.find((p) => p.id === params.id);

  if (!program) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-500">
          Programa no encontrado
        </h1>
        <Link
          href="/programas"
          className="mt-4 inline-block text-[#0072CE] hover:underline"
        >
          Volver a programas
        </Link>
      </div>
    );
  }

  const programCourses = program.courseIds
    .map((id) => courses.find((c) => c.id === id))
    .filter(Boolean);

  return (
    <>
      {/* Header */}
      <section className="bg-[#003366] text-white py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">
                {program.title}
              </h1>
              <p className="text-blue-200 mt-1">
                {program.type} — {program.area}
              </p>
            </div>
            <span
              className={`${areaColors[program.areaSlug] || "bg-gray-500"} text-white text-sm font-medium px-4 py-1.5 rounded-full shrink-0 self-start`}
            >
              {program.area}
            </span>
          </div>
        </div>
      </section>

      {/* Breadcrumb */}
      <section className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <nav className="text-sm text-gray-500">
            <Link href="/programas" className="hover:text-[#0072CE]">
              Programas
            </Link>
            <span className="mx-2">/</span>
            <span className="text-gray-700">{program.title}</span>
          </nav>
        </div>
      </section>

      {/* Content */}
      <section className="bg-[#F8F9FA] py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Main content */}
            <div className="flex-1 min-w-0">
              {/* Description card */}
              <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                <h2 className="text-xl font-light text-gray-700 mb-4">
                  Descripción
                </h2>
                <p className="text-gray-600 leading-relaxed">
                  {program.description}
                </p>

                <hr className="my-6 border-gray-100" />

                <h2 className="text-xl font-light text-gray-700 mb-4">
                  Objetivo
                </h2>
                <p className="text-gray-600 leading-relaxed">{program.goal}</p>

                <div className="mt-6">
                  <Link
                    href="/admision"
                    className="inline-flex items-center gap-2 text-[#0072CE] hover:text-[#004B87] font-medium border border-[#0072CE] rounded-full px-5 py-2 text-sm hover:bg-blue-50 transition"
                  >
                    Postular al programa
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </Link>
                </div>
              </div>

              {/* Programme Courses */}
              <h2 className="text-xl font-light text-gray-700 mb-4">
                Cursos del Programa
              </h2>
              <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
                {programCourses.map((course) => (
                  <div
                    key={course!.id}
                    className="flex items-center gap-4 p-4 hover:bg-gray-50 transition"
                  >
                    {/* Thumbnail */}
                    <div className="w-20 h-14 bg-gradient-to-br from-[#003366] to-[#004B87] rounded flex items-center justify-center shrink-0">
                      <span className="text-white text-xs font-medium text-center leading-tight px-1">
                        {course!.area}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/cursos/${course!.id}`}
                        className="text-sm font-semibold text-[#003366] hover:text-[#0072CE] transition"
                      >
                        {course!.title}
                      </Link>
                      {course!.code && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {course!.code}
                        </p>
                      )}
                    </div>

                    {/* Badge */}
                    <span className="text-xs font-medium text-blue-600 border border-blue-200 bg-blue-50 px-2.5 py-1 rounded-full shrink-0 hidden sm:block">
                      Obligatorio
                    </span>

                    {/* Detail link */}
                    <Link
                      href={`/cursos/${course!.id}`}
                      className="text-xs text-[#0072CE] border border-[#0072CE] rounded-full px-3 py-1.5 hover:bg-blue-50 transition shrink-0 hidden sm:flex items-center gap-1"
                    >
                      Detalles
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            {/* Sidebar */}
            <aside className="lg:w-80 shrink-0">
              {/* Institution card */}
              <div className="bg-white rounded-lg border border-gray-200 p-6 text-center mb-4">
                <p className="text-xs text-gray-400 mb-3">Desarrollado por:</p>
                <img
                  src="/img/logo-enae.png"
                  alt="ENAE"
                  className="w-16 h-16 mx-auto mb-2 rounded-full"
                />
                <p className="font-semibold text-[#003366] text-sm">
                  Escuela de Navegación Aérea
                </p>
                <p className="text-xs text-gray-400 mt-0.5">Santiago, Chile</p>
              </div>

              {/* Details table */}
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-gray-100">
                    <tr>
                      <td className="px-4 py-3 font-medium text-gray-700">
                        Tipo:
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-right">
                        {program.type}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-medium text-gray-700">
                        Idioma:
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-right">
                        {program.language}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-medium text-gray-700">
                        Duración:
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-right">
                        {program.duration}
                      </td>
                    </tr>
                    {program.fee && (
                      <tr>
                        <td className="px-4 py-3 font-medium text-gray-700">
                          Arancel:
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-right">
                          {program.fee}
                        </td>
                      </tr>
                    )}
                    <tr>
                      <td className="px-4 py-3 font-medium text-gray-700">
                        Cursos:
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-right">
                        {program.courseIds.length}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* CTA */}
              <div className="mt-4">
                <Link
                  href="/admision"
                  className="block w-full text-center py-3 bg-[#0072CE] hover:bg-[#005fa3] text-white font-medium rounded-lg transition text-sm"
                >
                  Postular ahora
                </Link>
                <Link
                  href="/contacto"
                  className="block w-full text-center py-3 mt-2 border border-gray-300 text-gray-600 hover:bg-gray-50 font-medium rounded-lg transition text-sm"
                >
                  Solicitar información
                </Link>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}
