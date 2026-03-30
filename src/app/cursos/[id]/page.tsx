import { courses } from "@/data/courses";
import Link from "next/link";
import { notFound } from "next/navigation";

const areaIcons: Record<string, string> = {
  "uas-rpas": "🛩️",
  "atm-navegacion": "🗼",
  "seguridad-avsec": "🛡️",
  simuladores: "🖥️",
  "safety-ffhh": "⚕️",
  "gestion-aeronautica": "📋",
};

const levelColors: Record<string, string> = {
  Básico: "bg-green-100 text-green-800",
  Intermedio: "bg-blue-100 text-blue-800",
  Avanzado: "bg-purple-100 text-purple-800",
  Especialización: "bg-orange-100 text-orange-800",
};

export function generateStaticParams() {
  return courses.map((c) => ({ id: c.id }));
}

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const course = courses.find((c) => c.id === id);

  if (!course) {
    notFound();
  }

  return (
    <>
      {/* Cover image / color block */}
      <section className="bg-gradient-to-br from-[#003366] to-[#004B87] text-white">
        <div className="max-w-7xl mx-auto px-4 py-10">
          {/* Breadcrumbs */}
          <nav className="text-sm text-blue-200 mb-4 flex items-center gap-2 flex-wrap">
            <Link href="/" className="hover:text-white transition">
              Inicio
            </Link>
            <span>/</span>
            <Link href="/cursos" className="hover:text-white transition">
              Cursos
            </Link>
            <span>/</span>
            <Link
              href={`/cursos?area=${course.areaSlug}`}
              className="hover:text-white transition"
            >
              {course.area}
            </Link>
            {course.subarea && (
              <>
                <span>/</span>
                <span>{course.subarea}</span>
              </>
            )}
          </nav>

          {/* Course code */}
          {course.code && (
            <p className="text-blue-300 text-sm font-mono mb-2">
              {course.code}
            </p>
          )}

          {/* Title */}
          <div className="flex items-start gap-4">
            <div className="text-5xl hidden sm:block">
              {areaIcons[course.areaSlug] || "📋"}
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-3">
                {course.title}
              </h1>
              <p className="text-blue-200 text-lg max-w-3xl">
                {course.description}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Main content */}
      <section className="bg-[#F8F9FA] py-10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Main content area */}
            <div className="flex-1 min-w-0 space-y-8">
              {/* Goal */}
              {course.goal && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h2 className="text-xl font-bold text-[#003366] mb-3 flex items-center gap-2">
                    <svg
                      className="w-5 h-5 text-[#0072CE]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                    Objetivo
                  </h2>
                  <p className="text-gray-600 leading-relaxed">{course.goal}</p>
                </div>
              )}

              {/* Learning objectives */}
              {course.objectives && course.objectives.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h2 className="text-xl font-bold text-[#003366] mb-4 flex items-center gap-2">
                    <svg
                      className="w-5 h-5 text-[#0072CE]"
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
                    Objetivos de Aprendizaje
                  </h2>
                  <ul className="space-y-3">
                    {course.objectives.map((obj, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="w-6 h-6 bg-blue-50 text-[#0072CE] rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <span className="text-gray-600">{obj}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Modules / Course structure */}
              {course.modules && course.modules.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h2 className="text-xl font-bold text-[#003366] mb-4 flex items-center gap-2">
                    <svg
                      className="w-5 h-5 text-[#0072CE]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                      />
                    </svg>
                    Estructura del Curso
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {course.modules.map((mod, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100"
                      >
                        <span className="w-8 h-8 bg-[#003366] text-white rounded flex items-center justify-center text-sm font-bold shrink-0">
                          {i + 1}
                        </span>
                        <span className="text-sm text-gray-700">{mod}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Target audience & Prerequisites */}
              {(course.targetAudience || course.prerequisites) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {course.targetAudience &&
                    course.targetAudience.length > 0 && (
                      <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <h2 className="text-lg font-bold text-[#003366] mb-3 flex items-center gap-2">
                          <svg
                            className="w-5 h-5 text-[#0072CE]"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                            />
                          </svg>
                          Dirigido a
                        </h2>
                        <ul className="space-y-2">
                          {course.targetAudience.map((t, i) => (
                            <li
                              key={i}
                              className="flex items-start gap-2 text-sm text-gray-600"
                            >
                              <span className="text-[#0072CE] mt-1">•</span>
                              {t}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                  {course.prerequisites && course.prerequisites.length > 0 && (
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                      <h2 className="text-lg font-bold text-[#003366] mb-3 flex items-center gap-2">
                        <svg
                          className="w-5 h-5 text-[#0072CE]"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                          />
                        </svg>
                        Requisitos de Ingreso
                      </h2>
                      <ul className="space-y-2">
                        {course.prerequisites.map((p, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2 text-sm text-gray-600"
                          >
                            <svg
                              className="w-4 h-4 text-green-500 mt-0.5 shrink-0"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                            {p}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Sessions table */}
              {course.sessions && course.sessions.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h2 className="text-xl font-bold text-[#003366] mb-4 flex items-center gap-2">
                    <svg
                      className="w-5 h-5 text-[#0072CE]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    Sesiones Programadas
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50 text-left text-sm text-gray-500">
                          <th className="px-4 py-3 font-medium">Fechas</th>
                          <th className="px-4 py-3 font-medium">Sede</th>
                          <th className="px-4 py-3 font-medium">Modalidad</th>
                          {course.sessions.some((s) => s.fee) && (
                            <th className="px-4 py-3 font-medium">Valor</th>
                          )}
                          <th className="px-4 py-3 font-medium"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {course.sessions.map((session, i) => (
                          <tr key={i} className="hover:bg-blue-50/50 transition">
                            <td className="px-4 py-3 text-sm font-medium text-gray-700">
                              {session.dates}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {session.location}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                {session.modality}
                              </span>
                            </td>
                            {course.sessions!.some((s) => s.fee) && (
                              <td className="px-4 py-3 text-sm font-medium text-gray-700">
                                {session.fee || "-"}
                              </td>
                            )}
                            <td className="px-4 py-3">
                              <Link
                                href={`/registro/${course.id}`}
                                className="inline-flex items-center px-4 py-1.5 bg-[#0072CE] text-white text-xs font-medium rounded hover:bg-[#005fa3] transition"
                              >
                                Inscribirse
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <Link
                      href="/contacto"
                      className="text-sm text-[#0072CE] hover:text-[#004B87] font-medium"
                    >
                      ¿No encuentras fecha? Solicita información →
                    </Link>
                  </div>
                </div>
              )}

              {/* Fallback sessions from dates array */}
              {(!course.sessions || course.sessions.length === 0) &&
                course.dates.length > 0 && (
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h2 className="text-xl font-bold text-[#003366] mb-4">
                      Sesiones Programadas
                    </h2>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gray-50 text-left text-sm text-gray-500">
                            <th className="px-4 py-3 font-medium">Fechas</th>
                            <th className="px-4 py-3 font-medium">Sede</th>
                            <th className="px-4 py-3 font-medium">Modalidad</th>
                            <th className="px-4 py-3 font-medium"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {course.dates.map((date, i) => (
                            <tr key={i} className="hover:bg-blue-50/50 transition">
                              <td className="px-4 py-3 text-sm font-medium text-gray-700">
                                {date}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {course.locations.join(", ")}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                  {course.modality}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <Link
                                  href="/contacto"
                                  className="inline-flex items-center px-4 py-1.5 bg-[#0072CE] text-white text-xs font-medium rounded hover:bg-[#005fa3] transition"
                                >
                                  Inscribirse
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
            </div>

            {/* Sidebar - Course info card (ICAO style) */}
            <aside className="lg:w-80 shrink-0">
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden sticky top-28">
                {/* Header */}
                <div className="bg-[#003366] text-white p-5">
                  <h3 className="font-semibold text-sm uppercase tracking-wider mb-3">
                    Información del Curso
                  </h3>
                  <div className="text-4xl text-center py-2">
                    {areaIcons[course.areaSlug] || "📋"}
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  {/* Info rows */}
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-xs text-gray-400 uppercase tracking-wider">
                      Modalidad
                    </span>
                    <span className="text-sm font-medium text-gray-700">
                      {course.modality}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-xs text-gray-400 uppercase tracking-wider">
                      Duración
                    </span>
                    <span className="text-sm font-medium text-gray-700">
                      {course.duration}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-xs text-gray-400 uppercase tracking-wider">
                      Nivel
                    </span>
                    <span
                      className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${levelColors[course.level] || "bg-gray-100 text-gray-800"}`}
                    >
                      {course.level}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-xs text-gray-400 uppercase tracking-wider">
                      Idioma
                    </span>
                    <span className="text-sm font-medium text-gray-700">
                      {course.language || "Español"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-xs text-gray-400 uppercase tracking-wider">
                      Área
                    </span>
                    <span className="text-sm font-medium text-gray-700 text-right">
                      {course.area}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-xs text-gray-400 uppercase tracking-wider">
                      Sede
                    </span>
                    <span className="text-sm font-medium text-gray-700 text-right">
                      {course.locations.join(", ")}
                    </span>
                  </div>

                  {course.sessions?.[0]?.fee && (
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-xs text-gray-400 uppercase tracking-wider">
                        Valor
                      </span>
                      <span className="text-sm font-bold text-[#003366]">
                        {course.sessions[0].fee}
                      </span>
                    </div>
                  )}

                  {/* CTA buttons */}
                  <div className="space-y-3 pt-2">
                    <Link
                      href={`/registro/${course.id}`}
                      className="block w-full py-3 bg-[#0072CE] text-white text-center font-semibold rounded-lg hover:bg-[#005fa3] transition"
                    >
                      Registrarse
                    </Link>
                    <Link
                      href="/contacto"
                      className="block w-full py-3 border-2 border-[#003366] text-[#003366] text-center font-semibold rounded-lg hover:bg-blue-50 transition"
                    >
                      Más Información
                    </Link>
                  </div>
                </div>

                {/* Developer */}
                <div className="bg-gray-50 px-5 py-3 border-t border-gray-200">
                  <p className="text-xs text-gray-400">Desarrollado por</p>
                  <p className="text-sm font-medium text-gray-600">
                    Escuela de Navegación Aérea (ENAE)
                  </p>
                </div>
              </div>
            </aside>
          </div>

          {/* Back button */}
          <div className="mt-8">
            <Link
              href="/cursos"
              className="inline-flex items-center gap-2 text-[#0072CE] hover:text-[#004B87] font-medium transition"
            >
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
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Volver al catálogo
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
